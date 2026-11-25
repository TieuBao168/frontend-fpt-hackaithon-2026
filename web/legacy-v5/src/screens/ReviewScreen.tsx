import { useState } from 'react';
import { Box, Button, Card, Group, Image, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { useNavigate } from 'react-router';
import { useFooter } from '../app/steps';
import { VariantTabs } from '../components/inputs';
import { DurationBudget, FilmTimeline, SegmentCard } from '../components/segments';
import { EmptyState, MeterRow, Notice, ScreenHeader, StageList } from '../components/ui';
import { api } from '../lib/api';
import { hhmmss, mmss, parseTime } from '../lib/format';
import { styleLabel } from '../lib/labels';
import { toast, useProject, useProjectAction } from '../lib/queries';
import { budget, BUDGET_TOLERANCE, canMerge, checkManual, clipSegments, cutsDialogue, templateSec } from '../lib/rules';
import { segmentThumb } from '../player/frame';
import { useApp } from '../store/app';
import type { Project, Segment, Variant, VariantKey } from '../types/domain';

/** Màn 4. Duyệt đoạn AI (UC-C.3, G.1, G.2, J.3) + lớp phủ giai đoạn 2 */
export function ReviewScreen() {
  const { data: p, isLoading } = useProject();
  const navigate = useNavigate();
  const header = <ScreenHeader title="Duyệt đoạn AI" useCases={['C.3', 'G.1', 'G.2', 'J.3']} />;
  if (isLoading) return header;
  if (!p || !p.phase1Done) {
    const running = p?.job?.phase === 1 && p.job.status === 'running';
    return (
      <>
        {header}
        <EmptyState
          message={running ? 'AI đang chọn đoạn. Kết quả sẽ hiện ở đây khi xong.' : 'Chưa có kết quả AI chọn đoạn.'}
          action={<Button onClick={() => navigate('/config')}>{running ? 'Xem tiến trình' : 'Tới bước Cấu hình'}</Button>}
        />
      </>
    );
  }
  if (p.job?.phase === 2 && (p.job.status === 'running' || p.job.status === 'error')) return <Phase2Overlay p={p} />;
  return (
    <>
      {header}
      <ReviewBody p={p} />
    </>
  );
}

function ReviewBody({ p }: { p: Project }) {
  const { activeVariant, setActiveVariant, setAfterPhase2 } = useApp();
  const v = p.variants.find((x) => x.key === activeVariant) ?? p.variants[0];
  const segs = clipSegments(p, v);
  const b = budget(p, v);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [markIn, setMarkIn] = useState<number | null>(null);
  const [markOut, setMarkOut] = useState<number | null>(null);

  const act = useProjectAction((fn: () => Promise<Project>) => fn());
  const confirm = useProjectAction(() => api.confirm(p.id));
  const busy = act.isPending;
  const putOrder = (order: string[], reserve = v.reserve) => act.mutate(() => api.putVariant(p.id, v.key, { order, reserve }));

  const move = (i: number, d: -1 | 1) => {
    const o = [...v.order];
    [o[i], o[i + d]] = [o[i + d], o[i]];
    putOrder(o);
  };
  const remove = (s: Segment) =>
    s.source === 'ai'
      ? putOrder(
          v.order.filter((x) => x !== s.id),
          [s.id, ...v.reserve],
        ) // Loại: đưa về dự phòng
      : putOrder(v.order.filter((x) => x !== s.id)); // Xóa đoạn thủ công

  const addReserve = (id: string) =>
    putOrder(
      [...v.order, id],
      v.reserve.filter((x) => x !== id),
    );

  const onMark = (sec: number) => {
    if (markIn === null || markOut !== null) {
      setMarkIn(sec);
      setMarkOut(null);
    } else if (sec < markIn) {
      setMarkOut(markIn);
      setMarkIn(sec);
    } else setMarkOut(sec);
  };

  const submit = () => {
    for (const x of p.variants) {
      const e = budget(p, x).errors; // V11: kiểm tra mọi phương án
      if (e.length) {
        setActiveVariant(x.key);
        toast(`Phương án ${x.key}: ${e[0]}`, 'bad');
        return;
      }
    }
    setAfterPhase2(p.phase2Done ? 'preview' : 'music');
    confirm.mutate();
  };

  const confirmLabel = p.phase2Done ? 'Duyệt và dựng lại' : p.variants.length > 1 ? `Xác nhận ${p.variants.length} phương án, tạo nhạc và sub` : 'Xác nhận đoạn, tạo nhạc và sub';
  const reserveSegs = v.reserve.map((id) => p.segments[id]).filter(Boolean);
  const deficit = b.targetFilmSec - b.filmSec;
  const fill = deficit > BUDGET_TOLERANCE ? [...reserveSegs].sort((a, c) => Math.abs(a.durSec - deficit) - Math.abs(c.durSec - deficit))[0] : undefined;
  // mốc bắt đầu của từng đoạn trong clip (đã cộng phần đầu clip)
  const starts = segs.reduce<number[]>((acc, _s, i) => [...acc, i === 0 ? (p.intro?.durationSec ?? 0) : acc[i - 1] + segs[i - 1].durSec], []);

  return (
    <Stack gap="md">
      {p.variants.length > 1 && (
        <Box>
          <VariantTabs project={p} active={v.key} onChange={(k: VariantKey) => setActiveVariant(k)} />
          <Text fz={14} c="dimmed">
            Mỗi phương án do AI chọn riêng theo phong cách {p.variants.map((x) => styleLabel[x.style]).join(', ')}. Xác nhận một lần cho cả {p.variants.length} phương án.
          </Text>
        </Box>
      )}
      {p.job?.phase === 2 && p.job.status === 'cancelled' && <Notice tone="warn">Đã hủy giai đoạn 2. Kết quả các việc đã xong được giữ; xác nhận lại để chạy tiếp.</Notice>}

      <FilmTimeline
        durationSec={p.vodDurationSec}
        used={segs}
        reserve={reserveSegs}
        markIn={markIn}
        markOut={markOut}
        onMark={onMark}
      />

      <div className="grid-2">
        <Stack gap="sm">
          {segs.map((s, i) => {
            const start = starts[i];
            return (
              <SegmentCard
                key={s.id}
                seg={s}
                index={i}
                clipStartSec={start}
                expanded={expanded === s.id}
                busy={busy}
                dialogueCut={cutsDialogue(p.dialogueRanges, s.startSec) || cutsDialogue(p.dialogueRanges, s.startSec + s.durSec)}
                actions={{
                  onUp: i > 0 ? () => move(i, -1) : undefined,
                  onDown: i < segs.length - 1 ? () => move(i, 1) : undefined,
                  onRemove: () => remove(s),
                  onToggle: () => setExpanded(expanded === s.id ? null : s.id), // mỗi lần chỉ mở 1 thẻ
                  onTrim: (d) => act.mutate(() => api.trimSegment(p.id, s.id, d)),
                  onSplit: () => act.mutate(() => api.splitSegment(p.id, s.id, v.key)),
                  onMerge: canMerge(s, segs[i + 1]) ? () => act.mutate(() => api.mergeSegments(p.id, { variant: v.key, a: s.id, b: segs[i + 1].id })) : undefined,
                }}
              />
            );
          })}
          {segs.length === 0 && <Notice tone="warn">Phương án này chưa có đoạn nào.</Notice>}

          <Card padding={14} className="tinted">
            <Title order={3} fz={17} mb="sm">
              Đoạn dự phòng do AI chọn
            </Title>
            {fill && (
              <Box mb="sm">
                <Notice action={<Button size="sm" variant="white" onClick={() => addReserve(fill.id)}>Thêm vào clip</Button>}>
                  AI gợi ý bù thời lượng: {fill.title}
                </Notice>
              </Box>
            )}
            {reserveSegs.length === 0 ? (
              <Text c="dimmed">Không còn đoạn dự phòng.</Text>
            ) : (
              <Stack gap={8}>
                {reserveSegs.map((s, i) => (
                  <Group key={s.id} gap="sm" wrap="nowrap" p={8} style={{ background: 'var(--bg)', borderRadius: 9, border: '1px solid var(--line)' }}>
                    <Image className="seg-thumb" src={segmentThumb(s, 100 + i)} alt="" w={80} h={45} radius={6} />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={700} fz={15}>
                        {s.title}{' '}
                        <Text span c="var(--accent)" fz={14} fw={700}>
                          AI {s.score}
                        </Text>
                      </Text>
                      <Text fz={13} c="dimmed" lineClamp={2}>
                        {s.reason} · {s.durSec} giây
                      </Text>
                    </Box>
                    <Button variant="default" onClick={() => addReserve(s.id)} disabled={busy}>
                      Thêm
                    </Button>
                  </Group>
                ))}
              </Stack>
            )}
          </Card>
        </Stack>

        <Stack gap="md" className="sticky-col">
          <DurationBudget b={b} onResuggest={() => act.mutate(() => api.resuggest(p.id, v.key))} resuggesting={busy} />
          <Button size="lg" fullWidth onClick={submit} loading={confirm.isPending} disabled={p.job?.status === 'running'}>
            {confirmLabel}
          </Button>
          <ManualForm p={p} v={v} markIn={markIn} markOut={markOut} setMarkIn={setMarkIn} setMarkOut={setMarkOut} segCount={segs.length} />
        </Stack>
      </div>
    </Stack>
  );
}

/** Form thêm đoạn thủ công (UC-G.2) – mốc đồng bộ với dòng thời gian cả phim */
function ManualForm({
  p,
  v,
  markIn,
  markOut,
  setMarkIn,
  setMarkOut,
  segCount,
}: {
  p: Project;
  v: Variant;
  markIn: number | null;
  markOut: number | null;
  setMarkIn: (s: number | null) => void;
  setMarkOut: (s: number | null) => void;
  segCount: number;
}) {
  const [inText, setInText] = useState<string | null>(null);
  const [outText, setOutText] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [pos, setPos] = useState<string>('end');
  const [tried, setTried] = useState(false);
  const add = useProjectAction(() =>
    api.addSegment(p.id, { variant: v.key, startSec: markIn!, endSec: markOut!, title, afterIndex: pos === 'end' ? null : Number(pos) }),
  );
  const shownIn = inText ?? (markIn !== null ? hhmmss(markIn) : '');
  const shownOut = outText ?? (markOut !== null ? hhmmss(markOut) : '');
  const check = checkManual(p, v, markIn, markOut);
  const clear = () => {
    setMarkIn(null);
    setMarkOut(null);
    setInText(null);
    setOutText(null);
    setTried(false);
  };
  const doAdd = () =>
    add.mutate(undefined, {
      onSuccess: () => {
        toast('Đã thêm đoạn thủ công.', 'ok');
        clear();
        setTitle('');
      },
    });

  return (
    <Card padding={14}>
      <Title order={3} fz={17} mb="sm">
        Thêm đoạn thủ công
      </Title>
      <Stack gap="sm">
        <Group grow>
          <TextInput
            label="Vào"
            placeholder="hh:mm:ss"
            value={shownIn}
            onChange={(e) => {
              setInText(e.currentTarget.value);
              setMarkIn(parseTime(e.currentTarget.value));
            }}
            onBlur={() => setInText(null)}
          />
          <TextInput
            label="Ra"
            placeholder="hh:mm:ss"
            value={shownOut}
            onChange={(e) => {
              setOutText(e.currentTarget.value);
              setMarkOut(parseTime(e.currentTarget.value));
            }}
            onBlur={() => setOutText(null)}
          />
        </Group>
        {markIn !== null && markOut !== null && markOut > markIn && (
          <Text fz={14} c="dimmed" className="num">
            Dài {Math.round(markOut - markIn)} giây · clip sẽ dài {mmss(budget(p, v).totalSec + (markOut - markIn))}
          </Text>
        )}
        <TextInput label="Mô tả đoạn" value={title} onChange={(e) => setTitle(e.currentTarget.value)} placeholder="vd: Cảnh hai nhân vật cãi nhau" />
        <Select
          label="Vị trí trong clip"
          data={[{ value: 'end', label: 'Cuối clip' }, ...Array.from({ length: segCount }, (_, i) => ({ value: String(i), label: `Sau đoạn ${i + 1}` }))]}
          value={pos}
          onChange={(x) => x && setPos(x)}
          allowDeselect={false}
        />
        {tried &&
          check.errors.map((e) => (
            <Notice key={e} tone="warn">
              {e}
            </Notice>
          ))}
        {tried && !check.errors.length && check.warnings.length > 0 && (
          <Notice
            tone="warn"
            action={
              <Button size="sm" variant="white" onClick={doAdd} loading={add.isPending}>
                Vẫn thêm
              </Button>
            }
          >
            {check.warnings.join(' ')}
          </Notice>
        )}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={clear}>
            Xóa mốc
          </Button>
          <Button
            color="blue"
            loading={add.isPending}
            onClick={() => {
              setTried(true);
              if (!check.errors.length && !check.warnings.length) doAdd();
            }}
          >
            Thêm đoạn
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

/** Lớp phủ giai đoạn 2 (UC-D.1, E.1, J.3, F.1) */
function Phase2Overlay({ p }: { p: Project }) {
  const job = p.job!;
  useFooter({ processing: true });
  const background = useProjectAction(async () => {
    await api.setBackground(job.id, true);
    return api.getProject(p.id);
  }, 'Đang chạy nền. Sẽ báo khi xong.');
  const cancel = useProjectAction(() => api.cancelJob(job.id));
  const retry = useProjectAction((key: string) => api.retryStage(job.id, key));
  const pct = (k: string) => job.stages.find((s) => s.key === k)?.pct ?? 0;
  const tpl = templateSec(p.intro, p.outro);
  const musicErr = job.stages.find((s) => s.key === 'music')?.status === 'error';

  return (
    <>
      <ScreenHeader title="Giai đoạn 2: tạo nhạc, sub và dựng clip" useCases={['D.1', 'E.1', 'J.3', 'F.1']} />
      <div className="grid-2 grid-2-even">
        <Card padding={14}>
          <StageList stages={job.stages} onRetry={(k) => retry.mutate(k)} retrying={retry.isPending} />
          {musicErr && (
            <Box mt="md">
              <Notice tone="warn">Không thay bằng nhạc có sẵn. Chạy lại bước tạo nhạc AI.</Notice>
            </Box>
          )}
          {job.status === 'running' && (
            <Group mt="md" justify="flex-end" gap="sm">
              {!job.background && (
                <Button variant="default" onClick={() => background.mutate()}>
                  Chạy nền, báo tôi khi xong
                </Button>
              )}
              <Button variant="default" color="red" onClick={() => cancel.mutate()}>
                Hủy
              </Button>
            </Group>
          )}
        </Card>
        <Card padding={14} className="tinted">
          <Title order={3} fz={17} mb="sm">
            Đang dựng {p.variants.length} phương án đã duyệt
          </Title>
          <Stack gap={6} mb="md">
            {p.variants.map((v) => {
              const b = budget(p, v);
              return (
                <Text key={v.key} fz={15} className="num">
                  <b>Phương án {v.key}</b> · {styleLabel[v.style]} · {v.order.length} đoạn ({b.manualCount} thủ công) · {mmss(b.totalSec)}
                </Text>
              );
            })}
          </Stack>
          <Stack gap={10}>
            <MeterRow label="Bản nhạc AI" pct={pct('music')} value={`${pct('music')}%`} />
            <MeterRow label="Dòng sub" pct={pct('subtitle')} value={`${pct('subtitle')}%`} />
            <MeterRow label="Đầu/cuối" pct={pct('template')} value={`${tpl} giây`} tone="manual" />
            <MeterRow label="Dựng MP4" pct={pct('render')} value={`${pct('render')}%`} />
          </Stack>
        </Card>
      </div>
    </>
  );
}
