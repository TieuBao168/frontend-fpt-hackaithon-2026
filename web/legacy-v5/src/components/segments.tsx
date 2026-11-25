import { useRef, useState } from 'react';
import { ActionIcon, Box, Button, Card, Group, Image, Progress, Stack, Text, Tooltip } from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconCut, IconGitMerge, IconScissors } from '@tabler/icons-react';
import { hhmmss, mmss } from '../lib/format';
import { actLabel } from '../lib/labels';
import { AI_TRIM_LIMIT, canTrim, type Budget } from '../lib/rules';
import { segmentThumb } from '../player/frame';
import type { Segment } from '../types/domain';
import { Notice, SourceTag } from './ui';

// ---------------------------------------------------------------- FilmTimeline
export function FilmTimeline({
  durationSec,
  used,
  reserve,
  markIn,
  markOut,
  onMark,
}: {
  durationSec: number;
  used: Segment[];
  reserve: Segment[];
  markIn: number | null;
  markOut: number | null;
  onMark: (sec: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const pct = (s: number) => `${(s / durationSec) * 100}%`;
  const secAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.max(0, Math.min(durationSec, ((clientX - r.left) / r.width) * durationSec));
  };
  const ticks: number[] = [];
  for (let t = 1800; t < durationSec; t += 1800) ticks.push(t);
  const block = (s: Segment, color: string, key: string) => (
    <Tooltip key={key} label={`${s.title} · ${hhmmss(s.startSec)}`} withArrow>
      <Box pos="absolute" top={8} h={30} style={{ left: pct(s.startSec), width: `max(4px, ${pct(s.durSec)})`, background: color, borderRadius: 3 }} />
    </Tooltip>
  );
  return (
    <Card padding={14}>
      <Group justify="space-between" mb={8} gap="sm">
        <Text fw={700} fz={17}>
          Dòng thời gian cả phim
        </Text>
        <Group gap="md">
          {[
            ['var(--accent)', 'Đoạn AI đang dùng'],
            ['var(--manual)', 'Thủ công'],
            ['#9aa1ad', 'Dự phòng'],
          ].map(([c, l]) => (
            <Group key={l} gap={6}>
              <Box w={12} h={12} style={{ background: c, borderRadius: 3 }} />
              <Text fz={13} c="dimmed">
                {l}
              </Text>
            </Group>
          ))}
        </Group>
      </Group>
      <Box
        ref={ref}
        pos="relative"
        h={58}
        style={{ background: 'var(--panel)', borderRadius: 8, cursor: 'crosshair', touchAction: 'none' }}
        onClick={(e) => onMark(Math.round(secAt(e.clientX)))}
        onMouseMove={(e) => setHover(secAt(e.clientX))}
        onMouseLeave={() => setHover(null)}
        role="slider"
        aria-label="Dòng thời gian cả phim, bấm để đánh dấu vào/ra"
        aria-valuemin={0}
        aria-valuemax={Math.round(durationSec)}
        aria-valuenow={markIn ?? 0}
        tabIndex={0}
      >
        {ticks.map((t) => (
          <Box key={t} pos="absolute" top={0} bottom={0} w={1} style={{ left: pct(t), background: 'var(--line)' }}>
            <Text pos="absolute" bottom={-20} fz={12} c="dimmed" style={{ transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
              {hhmmss(t)}
            </Text>
          </Box>
        ))}
        {reserve.map((s) => block(s, '#9aa1ad', `r-${s.id}`))}
        {used.map((s) => block(s, s.source === 'ai' ? 'var(--accent)' : 'var(--manual)', `u-${s.id}`))}
        {markIn !== null && markOut !== null && (
          <Box pos="absolute" top={0} bottom={0} style={{ left: pct(Math.min(markIn, markOut)), width: pct(Math.abs(markOut - markIn)), background: 'rgba(47,111,219,0.22)' }} />
        )}
        {[markIn, markOut].map((m, i) =>
          m === null ? null : (
            <Box key={i} pos="absolute" top={-4} bottom={-4} w={2} style={{ left: pct(m), background: 'var(--manual)' }}>
              <Text pos="absolute" top={-18} fz={12} fw={700} c="var(--manual)" style={{ transform: 'translateX(-50%)' }}>
                {i === 0 ? 'Vào' : 'Ra'}
              </Text>
            </Box>
          ),
        )}
        {hover !== null && (
          <Box pos="absolute" top={0} bottom={0} w={1} style={{ left: pct(hover), background: 'var(--ink)', opacity: 0.4, pointerEvents: 'none' }} />
        )}
      </Box>
      <Group justify="space-between" mt={26}>
        <Text fz={13} c="dimmed">
          Bấm lần 1 để đánh dấu Vào, lần 2 để đánh dấu Ra (đồng bộ với form Thêm đoạn thủ công).
        </Text>
        <Text fz={13} c="dimmed" className="num">
          {hover !== null ? hhmmss(hover) : `Dài ${hhmmss(durationSec)}`}
        </Text>
      </Group>
    </Card>
  );
}

// ---------------------------------------------------------------- SegmentCard + SegmentEditor
export interface SegmentActions {
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
  onToggle: () => void;
  onTrim: (delta: number) => void;
  onSplit: () => void;
  onMerge?: () => void;
}

export function SegmentCard({
  seg,
  index,
  clipStartSec,
  expanded,
  dialogueCut,
  busy,
  actions,
}: {
  seg: Segment;
  index: number;
  clipStartSec: number;
  expanded: boolean;
  dialogueCut: boolean;
  busy?: boolean;
  actions: SegmentActions;
}) {
  const isAi = seg.source === 'ai';
  return (
    <Card padding={14} style={{ borderLeft: `4px solid ${isAi ? 'var(--accent)' : 'var(--manual)'}`, background: isAi ? undefined : 'var(--manual-soft)' }}>
      <Group gap="md" wrap="nowrap" align="flex-start">
        <Text fw={800} fz={17} w={26} className="num" style={{ flex: 'none' }}>
          {index + 1}
        </Text>
        <Image className="seg-thumb" src={segmentThumb(seg, index)} alt="" w={128} h={72} radius={8} style={{ flex: 'none' }} />
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8} wrap="wrap">
            <Text fw={700} fz={16}>
              {seg.title}
            </Text>
            <SourceTag source={seg.source} score={seg.score} />
          </Group>
          <Text fz={13} c="dimmed" className="num">
            {actLabel(seg.act)} · gốc {hhmmss(seg.startSec)}–{hhmmss(seg.startSec + seg.durSec)} · {seg.durSec.toFixed(1).replace('.0', '')} giây · trong clip {mmss(clipStartSec)}
            {seg.trimSec !== 0 && ` · đã ${seg.trimSec > 0 ? 'nới' : 'cắt'} ${Math.abs(seg.trimSec)} giây`}
          </Text>
          {isAi && seg.reason && <Text fz={15}>{seg.reason}</Text>}
          {dialogueCut && (
            <Text fz={14} c="var(--bad)" fw={600}>
              ⚠ Điểm cắt rơi vào giữa câu thoại
            </Text>
          )}
        </Stack>
      </Group>
      <Group gap={8} mt="sm" justify="flex-end" wrap="wrap">
        <ActionIcon onClick={actions.onUp} disabled={!actions.onUp || busy} aria-label={`Đưa đoạn ${index + 1} lên`}>
          <IconArrowUp size={18} />
        </ActionIcon>
        <ActionIcon onClick={actions.onDown} disabled={!actions.onDown || busy} aria-label={`Đưa đoạn ${index + 1} xuống`}>
          <IconArrowDown size={18} />
        </ActionIcon>
        <Button variant={expanded ? 'light' : 'default'} leftSection={<IconScissors size={16} />} onClick={actions.onToggle} aria-expanded={expanded}>
          Cắt ghép
        </Button>
        <Button variant="default" color="red" onClick={actions.onRemove} disabled={busy}>
          {isAi ? 'Loại' : 'Xóa'}
        </Button>
      </Group>
      {expanded && <SegmentEditor seg={seg} index={index} busy={busy} actions={actions} />}
    </Card>
  );
}

function SegmentEditor({ seg, index, busy, actions }: { seg: Segment; index: number; busy?: boolean; actions: SegmentActions }) {
  const isAi = seg.source === 'ai';
  return (
    <Box mt="sm" p={14} className="tinted" style={{ borderRadius: 9 }}>
      <Stack gap="sm">
        {isAi && seg.signals && (
          <Stack gap={6}>
            {(
              [
                ['Hình ảnh', seg.signals.visual],
                ['Âm thanh', seg.signals.audio],
                ['Thoại', seg.signals.dialogue],
              ] as const
            ).map(([l, v]) => (
              <Group key={l} gap="sm" wrap="nowrap">
                <Text fz={14} w={80}>
                  {l}
                </Text>
                <Progress value={v * 100} color="orange" style={{ flex: 1 }} size={8} />
                <Text fz={14} fw={700} w={40} ta="right" className="num">
                  {Math.round(v * 100)}
                </Text>
              </Group>
            ))}
            {seg.quote && (
              <Text fz={15} fs="italic">
                “{seg.quote}”
              </Text>
            )}
          </Stack>
        )}
        <Group gap={8} wrap="wrap">
          <Button variant="default" leftSection={<IconCut size={16} />} disabled={busy || !canTrim(seg, -1)} onClick={() => actions.onTrim(-1)}>
            Cắt ngắn 1 giây
          </Button>
          <Button variant="default" disabled={busy || !canTrim(seg, 1)} onClick={() => actions.onTrim(1)}>
            Nới 1 giây
          </Button>
          <Button variant="default" disabled={busy || seg.durSec < 2} onClick={actions.onSplit}>
            Chia đôi đoạn
          </Button>
          {actions.onMerge && (
            <Button variant="default" leftSection={<IconGitMerge size={16} />} disabled={busy} onClick={actions.onMerge}>
              Nối với đoạn {index + 2}
            </Button>
          )}
        </Group>
        {isAi && (
          <Text fz={13} c="dimmed">
            Lệch so với gốc: {seg.trimSec > 0 ? '+' : ''}
            {seg.trimSec} giây (đoạn AI tối đa ±{AI_TRIM_LIMIT} giây).
          </Text>
        )}
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------- DurationBudget
export function DurationBudget({ b, onResuggest, resuggesting }: { b: Budget; onResuggest: () => void; resuggesting?: boolean }) {
  const pct = b.targetFilmSec ? Math.min(100, (b.filmSec / b.targetFilmSec) * 100) : 0;
  return (
    <Card padding={14}>
      <Text fz={13} c="dimmed" fw={600}>
        Đoạn phim / mục tiêu
      </Text>
      <Text fz={34} fw={800} className="num" c={b.overTolerance ? 'var(--bad)' : undefined}>
        {mmss(b.filmSec)} / {mmss(b.targetFilmSec)}
      </Text>
      <Text fz={14} c="dimmed">
        Mục tiêu tổng {mmss(b.targetSec)} đã trừ {b.tplSec} giây đầu/cuối, clip cuối dài {mmss(b.totalSec)}
      </Text>
      <Progress mt="sm" value={pct} color={b.overTolerance ? 'red' : 'orange'} size={10} aria-label="Thời lượng so với mục tiêu" />
      <Group mt="md" grow>
        <Box>
          <Text fz={13} c="dimmed">
            AI đề xuất
          </Text>
          <Text fz={21} fw={800} c="var(--accent)" className="num">
            {mmss(b.aiSec)}
          </Text>
          <Text fz={13} c="dimmed">
            {b.aiCount} đoạn
          </Text>
        </Box>
        <Box>
          <Text fz={13} c="dimmed">
            Thủ công
          </Text>
          <Text fz={21} fw={800} c="var(--manual)" className="num">
            {mmss(b.manualSec)}
          </Text>
          <Text fz={13} c="dimmed">
            {b.manualCount} đoạn
          </Text>
        </Box>
      </Group>
      <Stack gap={8} mt="sm">
        {b.errors.map((e) => (
          <Notice
            key={e}
            tone="warn"
            action={
              e.includes('loại hết') ? (
                <Button size="sm" variant="white" onClick={onResuggest} loading={resuggesting}>
                  AI đề xuất lại
                </Button>
              ) : undefined
            }
          >
            {e}
          </Notice>
        ))}
        {b.warnings.map((w) => (
          <Notice key={w} tone="warn">
            {w}
          </Notice>
        ))}
        {b.overTolerance && !b.errors.length && <Notice tone="warn">Đoạn phim lệch mục tiêu quá 5 giây.</Notice>}
      </Stack>
    </Card>
  );
}
