import { useMemo, useState } from 'react';
import { Box, Button, Card, Checkbox, Code, CopyButton, Group, Stack, Text, Title } from '@mantine/core';
import { IconDownload, IconStar } from '@tabler/icons-react';
import { Phase2Gate } from '../components/Gate';
import { VariantTabs } from '../components/inputs';
import { ClipPlayer, SegmentStrip } from '../components/player';
import { Notice, ScreenHeader } from '../components/ui';
import { api } from '../lib/api';
import { captionCues, clipTimeline, subtitleCues } from '../lib/clip';
import { hhmmss, mmss } from '../lib/format';
import { styleLabel } from '../lib/labels';
import { toast, useProjectAction } from '../lib/queries';
import { budget, LIMITS } from '../lib/rules';
import { createClock } from '../player/clock';
import { useApp } from '../store/app';
import type { Project, VersionFile } from '../types/domain';

/** Màn 7. Xem trước và tải (UC-F.2, F.3, F.4, G.3) */
export function PreviewScreen() {
  return <Phase2Gate header={<ScreenHeader title="Xem trước và tải" useCases={['F.2', 'F.3', 'F.4', 'G.3']} />}>{(p) => <PreviewBody p={p} />}</Phase2Gate>;
}

function save(name: string, content: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PreviewBody({ p }: { p: Project }) {
  const { activeVariant, setActiveVariant } = useApp();
  const v = p.variants.find((x) => x.key === activeVariant) ?? p.variants[0];
  const tl = useMemo(() => clipTimeline(p, v), [p, v]);
  const [clock] = useState(() => createClock(tl.totalSec * 1000));
  const [active, setActive] = useState(p.intro ? 1 : 0);
  const patch = useProjectAction((b: Parameters<typeof api.patchProject>[1]) => api.patchProject(p.id, b));
  const version = p.versions[p.versions.length - 1];
  const file = version?.files.find((f) => f.variant === v.key);
  const b = budget(p, v);
  const rendering = p.job?.phase === 3 && p.job.status === 'running';
  const blocked = p.dirty || rendering; // V15
  const music = v.music?.find((m) => m.id === v.selectedMusicId);
  const cur = tl.items[active];
  const lim = LIMITS[p.config.ratio];

  const downloadMp4 = (f: VersionFile) => {
    if (f.mp4Url) window.open(f.mp4Url, '_blank');
    else toast(`Bản mẫu chưa có file MP4 thật – khi có backend sẽ tải ${f.fileName}.`);
  };

  return (
    <>
      <VariantTabs project={p} active={v.key} onChange={setActiveVariant} />
      {p.dirty && (
        <Box mb="md">
          <Notice tone="warn">Có thay đổi chưa dựng. Bấm Dựng lại để tạo v{p.versions.length + 1}, bản v{p.versions.length} vẫn được giữ.</Notice>
        </Box>
      )}
      <div className="grid-2">
        <Stack gap="md">
          <ClipPlayer
            ratio={p.config.ratio}
            timeline={tl}
            clock={clock}
            autoCrop={p.autoCrop}
            subtitles={p.subtitleEnabled ? subtitleCues(p, tl) : undefined}
            captions={captionCues(p, tl)}
            maxWidth={p.config.ratio === '9:16' ? 300 : undefined}
          />
          <SegmentStrip timeline={tl} clock={clock} active={active} onSelect={setActive} />
          <Text fz={15} className="num">
            {p.intro ? `Đầu ${p.intro.durationSec} giây + ` : ''}đoạn phim {mmss(b.filmSec)}
            {p.outro ? ` + cuối ${p.outro.durationSec} giây` : ''} = <b>{mmss(b.totalSec)}</b>, giới hạn đề {mmss(lim.min)} đến {mmss(lim.max)}
          </Text>
          {cur && (
            <Card padding={12} className="tinted">
              {cur.kind === 'template' ? (
                <Text fz={15}>
                  <b>{cur.type === 'intro' ? 'Đầu clip' : 'Cuối clip'}</b>: {cur.name} · {cur.durSec} giây · trong clip {mmss(tl.starts[active])}
                </Text>
              ) : (
                <Stack gap={4}>
                  <Text fw={700}>
                    Đoạn {cur.index + 1}: {cur.seg.title}
                  </Text>
                  <Text fz={14} c="dimmed" className="num">
                    Trong clip {mmss(tl.starts[active])} · gốc {hhmmss(cur.seg.startSec)}–{hhmmss(cur.seg.startSec + cur.seg.durSec)}
                    {cur.seg.source === 'ai' ? ` · điểm AI ${cur.seg.score}` : ' · thủ công'}
                  </Text>
                  {cur.seg.reason && <Text fz={15}>{cur.seg.reason}</Text>}
                </Stack>
              )}
            </Card>
          )}
        </Stack>

        <Stack gap="md">
          <Card padding={14}>
            <Title order={3} fz={17} mb="sm">
              Phương án {v.key}
              {v.isPrimary ? ' ★ chính' : ''}
            </Title>
            <Stack gap={4} fz={15}>
              <Text>Phong cách: {styleLabel[v.style]}</Text>
              <Text>
                Tỉ lệ: {p.config.ratio} · thời lượng {mmss(b.totalSec)} · {v.order.length} đoạn ({b.manualCount} thủ công)
              </Text>
              <Text>Bản nhạc: {music ? `${music.label} · ${music.bpm} BPM` : '—'}</Text>
              <Text>Phiên bản: v{p.versions.length}</Text>
            </Stack>
            {p.variants.length > 1 && !v.isPrimary && (
              <Button mt="sm" variant="default" leftSection={<IconStar size={18} />} onClick={() => patch.mutate({ primary: v.key })}>
                Đặt làm phương án chính
              </Button>
            )}
            {p.config.ratio === '9:16' && (
              <Box mt="md">
                <Checkbox label="Tự crop theo nhân vật chính" checked={p.autoCrop} onChange={(e) => patch.mutate({ autoCrop: e.currentTarget.checked })} />
                <Text fz={13} c="dimmed" mt={4}>
                  {p.autoCrop ? 'Khung cam là vùng giữ lại trên cảnh ngang.' : 'Tắt: giữ nguyên cảnh ngang, thêm viền đen (letterbox).'}
                </Text>
                <Box mt={6} pos="relative" w={192} h={108} style={{ background: 'var(--player-bg)', borderRadius: 6, overflow: 'hidden' }} aria-hidden>
                  {p.autoCrop ? (
                    <Box pos="absolute" top={0} bottom={0} left={64} w={61} style={{ border: '2px solid var(--accent)', background: 'rgba(242,106,33,0.18)' }} />
                  ) : (
                    <Box pos="absolute" inset={0} style={{ border: '2px solid var(--accent)' }} />
                  )}
                </Box>
              </Box>
            )}
          </Card>

          <Card padding={14}>
            <Stack gap="sm">
              <Button size="lg" leftSection={<IconDownload size={18} />} disabled={blocked || !file} onClick={() => file && downloadMp4(file)}>
                Tải MP4
              </Button>
              {p.variants.length > 1 && (
                <Button variant="default" disabled={blocked || !version} onClick={() => toast('Bản mẫu chưa có file ZIP thật – khi có backend sẽ tải tất cả phương án.')}>
                  Tải tất cả (ZIP)
                </Button>
              )}
              {file && (
                <Text fz={13} c="dimmed" style={{ wordBreak: 'break-all' }}>
                  {file.fileName} · {file.resolution} · H.264/AAC
                </Text>
              )}
              {rendering && <Notice>Đang dựng lại. Tải xuống tạm khóa.</Notice>}
            </Stack>
          </Card>

          {file && (
            <Card padding={14}>
              <Title order={3} fz={17} mb="sm">
                Tệp kèm theo
              </Title>
              <Stack gap={8}>
                <Attachment title="Danh sách đoạn và timestamp (.json)" name={file.fileName.replace('.mp4', '_timestamps.json')} content={file.timestampsJson} type="application/json" copy disabled={blocked} />
                <Attachment title="Phụ đề (.srt)" name={file.fileName.replace('.mp4', '.srt')} content={file.srt || '(không có dòng sub)'} copy disabled={blocked} />
                <Attachment title="Lời dẫn (.txt)" name={file.fileName.replace('.mp4', '_loidan.txt')} content={file.voTxt || '(không dùng lời dẫn)'} disabled={blocked} />
                <Attachment title="Gợi ý caption và hashtag (.txt)" name={file.fileName.replace('.mp4', '_caption.txt')} content={file.captionTxt} disabled={blocked} />
              </Stack>
            </Card>
          )}
        </Stack>
      </div>
    </>
  );
}

function Attachment({ title, name, content, type, copy, disabled }: { title: string; name: string; content: string; type?: string; copy?: boolean; disabled?: boolean }) {
  return (
    <details style={{ border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 600, minHeight: 28 }}>{title}</summary>
      <Code block mt="sm" fz={13} style={{ maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
        {content}
      </Code>
      <Group mt="sm" gap="sm">
        {copy && (
          <CopyButton value={content}>
            {({ copied, copy: doCopy }) => (
              <Button size="sm" variant="default" onClick={doCopy}>
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </Button>
            )}
          </CopyButton>
        )}
        <Button size="sm" variant="default" leftSection={<IconDownload size={16} />} disabled={disabled} onClick={() => save(name, content, type)}>
          Tải {name.split('.').pop()?.toUpperCase()}
        </Button>
      </Group>
    </details>
  );
}
