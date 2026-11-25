import { useState, type ReactNode } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Collapse,
  Group,
  Popover,
  Progress,
  Radio,
  SegmentedControl,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconCamera,
  IconColumns,
  IconDeviceFloppy,
  IconHeadphones,
  IconRefresh,
  IconTrash,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';
import { AiTag, Timecode } from '../../components/common';
import { cornerLabel, cropLabel, subtitleTemplateLabel, transitionLabel } from '../../lib/labels';
import type { AudioLayer, AudioMix, Corner, CropMode, Presentation, Ratio, SubtitleTemplate, Transition } from '../../types/domain';
import { useClock, type Clock } from '../preview/clock';
import { subtitleTextStyle } from '../preview/styles';
import { useViewPrefs } from '../preview/stores';
import {
  gainsAt,
  HORIZONTAL_FRAMES,
  VERTICAL_FRAMES,
  type PlatformFrame,
  type Timeline,
} from '../preview/timeline';
import { BUILT_IN_PRESETS, usePresets, type Preset } from './presets';
import { effectiveGain, TRACKS, type Monitor } from './audio';

type Patch = (fn: (d: Presentation) => void) => void;

function Block({ title, hint, right, children }: { title: string; hint?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <Card padding="sm">
      <Group justify="space-between" mb={6} wrap="nowrap">
        <div>
          <Text fw={600} fz="sm">
            {title}
          </Text>
          {hint && (
            <Text fz="xs" c="gray.6">
              {hint}
            </Text>
          )}
        </div>
        {right}
      </Group>
      {children}
    </Card>
  );
}

const opts = <T extends string>(rec: Record<T, string>) => (Object.keys(rec) as T[]).map((value) => ({ value, label: rec[value] }));

// ---------------------------------------------------------------- Preset
export function PresetBar({ draft, patch, phase, disabled }: { draft: Presentation; patch: Patch; phase: 'video' | 'audio'; disabled?: boolean }) {
  const { saved, save, remove } = usePresets();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const apply = (p: Preset) =>
    patch((d) => {
      d.visual = structuredClone(p.visual);
      if (phase === 'audio' && p.subtitle && d.subtitle) d.subtitle = structuredClone(p.subtitle);
    });
  const all = [...BUILT_IN_PRESETS, ...saved];
  return (
    <Block
      title="Bộ mẫu"
      hint={phase === 'video' ? 'Áp nhanh kiểu hình ảnh theo nền tảng.' : 'Áp nhanh hình ảnh + kiểu phụ đề theo nền tảng.'}
      right={
        <Popover opened={open} onChange={setOpen} position="bottom-end" withArrow trapFocus>
          <Popover.Target>
            <Button size="xs" variant="subtle" leftSection={<IconDeviceFloppy size={14} />} onClick={() => setOpen((o) => !o)} disabled={disabled}>
              Lưu bộ hiện tại
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="xs" w={220}>
              <TextInput size="xs" label="Tên bộ mẫu" value={name} onChange={(e) => setName(e.currentTarget.value)} data-autofocus />
              <Button
                size="xs"
                disabled={!name.trim()}
                onClick={() => {
                  save(name.trim(), draft);
                  setName('');
                  setOpen(false);
                }}
              >
                Lưu
              </Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      }
    >
      <Group gap={6}>
        {all.map((p) => (
          <Group key={p.id} gap={0} wrap="nowrap">
            <Button size="xs" variant="default" onClick={() => apply(p)} disabled={disabled}>
              {p.name}
            </Button>
            {!p.builtIn && (
              <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => remove(p.id)} aria-label={`Xóa bộ mẫu ${p.name}`}>
                <IconTrash size={12} />
              </ActionIcon>
            )}
          </Group>
        ))}
      </Group>
    </Block>
  );
}

// ---------------------------------------------------------------- Hình ảnh
export function VisualTab({ draft, patch, ratio, phase, readOnly }: { draft: Presentation; patch: Patch; ratio: Ratio; phase: 'video' | 'audio'; readOnly: boolean }) {
  const v = draft.visual;
  return (
    <Stack gap="sm">
      <PresetBar draft={draft} patch={patch} phase={phase} disabled={readOnly} />
      <Block title="Khung 9:16" hint={ratio === '9:16' ? 'Cách đưa cảnh ngang vào khung dọc.' : 'Video ngang giữ nguyên khung gốc.'}>
        <SegmentedControl
          fullWidth
          disabled={readOnly || ratio !== '9:16'}
          value={v.crop}
          onChange={(x) => patch((d) => void (d.visual.crop = x as CropMode))}
          data={opts(cropLabel)}
        />
      </Block>
      <Block
        title="Logo"
        right={<Switch checked={v.logo.enabled} disabled={readOnly} onChange={(e) => patch((d) => void (d.visual.logo.enabled = e.currentTarget.checked))} aria-label="Bật logo" />}
      >
        <Stack gap={6}>
          <SegmentedControl
            size="xs"
            fullWidth
            disabled={readOnly || !v.logo.enabled}
            value={v.logo.corner}
            onChange={(x) => patch((d) => void (d.visual.logo.corner = x as Corner))}
            data={opts(cornerLabel)}
          />
          <SegmentedControl
            size="xs"
            disabled={readOnly || !v.logo.enabled}
            value={v.logo.size}
            onChange={(x) => patch((d) => void (d.visual.logo.size = x as 'S' | 'M'))}
            data={[
              { value: 'S', label: 'Nhỏ' },
              { value: 'M', label: 'Vừa' },
            ]}
          />
        </Stack>
      </Block>
      <Block
        title="End card"
        hint="Khung kết thúc kêu gọi xem trên FPT Play, không tính vào thời lượng nội dung."
        right={<Switch checked={v.endCard.enabled} disabled={readOnly} onChange={(e) => patch((d) => void (d.visual.endCard.enabled = e.currentTarget.checked))} aria-label="Bật end card" />}
      >
        <Slider
          min={2}
          max={5}
          step={1}
          disabled={readOnly || !v.endCard.enabled}
          value={v.endCard.sec}
          onChange={(x) => patch((d) => void (d.visual.endCard.sec = x))}
          marks={[2, 3, 4, 5].map((x) => ({ value: x, label: `${x}s` }))}
          mb="md"
        />
      </Block>
      <Block title="Chuyển cảnh" hint="Xem trước gần đúng.">
        <SegmentedControl
          fullWidth
          disabled={readOnly}
          value={v.transition}
          onChange={(x) => patch((d) => void (d.visual.transition = x as Transition))}
          data={opts(transitionLabel)}
        />
      </Block>
    </Stack>
  );
}

// ---------------------------------------------------------------- Âm thanh
export function AudioTab({
  draft,
  patch,
  audio,
  clock,
  timeline,
  monitor,
  setMonitor,
  readOnly,
  onRegenerate,
}: {
  draft: Presentation;
  patch: Patch;
  audio: AudioLayer;
  clock: Clock;
  timeline: Timeline;
  monitor: Monitor;
  setMonitor: (m: Monitor) => void;
  readOnly: boolean;
  onRegenerate: () => void;
}) {
  const mix = draft.mix!;
  const [info, { toggle }] = useDisclosure(false);
  const selected = audio.musicTracks.find((t) => t.id === draft.selectedTrackId) ?? audio.musicTracks[0];
  const loud = mix.musicGain > mix.originalGain * 0.8;
  const hasStems = !!audio.stems;

  return (
    <Stack gap="sm">
      {!hasStems && (
        <Alert color="blue" variant="light" p="xs">
          <Text fz="xs">Backend chưa gửi track âm thanh riêng nên chưa nghe được; mức âm lượng bên dưới là mô phỏng theo thời gian. Âm thanh thật có sau khi Áp dụng.</Text>
        </Alert>
      )}
      <Block
        title="Bản nhạc"
        hint="Nhạc do AI tạo mới cho clip này. Không dùng nhạc có sẵn."
        right={
          <Group gap={4}>
            <Text fz="xs" c="blue.7" style={{ cursor: 'pointer' }} onClick={toggle}>
              {info ? 'Ẩn thông tin' : 'Thông tin tạo nhạc'}
            </Text>
          </Group>
        }
      >
        <Radio.Group value={selected.id} onChange={(id) => patch((d) => void (d.selectedTrackId = id))}>
          <Stack gap={6}>
            {audio.musicTracks.map((t, i) => (
              <Radio
                key={t.id}
                value={t.id}
                disabled={readOnly}
                label={
                  <Group gap={6}>
                    <AiTag />
                    <Text fz="sm">
                      Bản {i + 1} · {String(t.params.tempo)} BPM · {String(t.params.mood)}
                    </Text>
                  </Group>
                }
              />
            ))}
          </Stack>
        </Radio.Group>
        <Collapse expanded={info}>
          <Stack gap={4} mt="sm">
            <Text fz="xs" c="gray.6">
              {selected.tool} · {selected.model} v{selected.version} · seed {selected.seed}
            </Text>
            <Code block fz="xs">
              {selected.prompt}
            </Code>
          </Stack>
        </Collapse>
        <Button mt="sm" size="xs" variant="light" color="blue" leftSection={<IconRefresh size={14} />} onClick={onRegenerate} disabled={readOnly}>
          Yêu cầu AI tạo bản khác
        </Button>
      </Block>

      <Block title="Mix âm thanh" hint="Thoại luôn phải nghe rõ (BR-18).">
        <Stack gap="sm">
          {TRACKS.map((tr) => (
            <Group key={tr.key} gap="xs" wrap="nowrap">
              <Text fz="sm" w={110}>
                {tr.label}
              </Text>
              <Slider
                style={{ flex: 1 }}
                min={0}
                max={100}
                disabled={readOnly}
                value={Math.round((mix[tr.field] as number) * 100)}
                onChange={(x) => patch((d) => void ((d.mix![tr.field] as number) = x / 100))}
                label={(x) => `${x}%`}
                color={tr.key === 'music' ? 'blue' : 'orange'}
              />
              <Tooltip label={monitor.muted[tr.key] ? 'Bật tiếng' : 'Tắt tiếng (chỉ khi xem)'}>
                <ActionIcon
                  variant={monitor.muted[tr.key] ? 'filled' : 'subtle'}
                  color={monitor.muted[tr.key] ? 'red' : 'gray'}
                  onClick={() => setMonitor({ ...monitor, muted: { ...monitor.muted, [tr.key]: !monitor.muted[tr.key] } })}
                  aria-label={`Tắt tiếng ${tr.label}`}
                  aria-pressed={monitor.muted[tr.key]}
                >
                  {monitor.muted[tr.key] ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Nghe riêng track này (chỉ khi xem)">
                <ActionIcon
                  variant={monitor.solo === tr.key ? 'filled' : 'subtle'}
                  color={monitor.solo === tr.key ? 'blue' : 'gray'}
                  onClick={() => setMonitor({ ...monitor, solo: monitor.solo === tr.key ? null : tr.key })}
                  aria-label={`Nghe riêng ${tr.label}`}
                  aria-pressed={monitor.solo === tr.key}
                >
                  <IconHeadphones size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          ))}
          {loud && (
            <Text fz="xs" c="orange.8" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <IconAlertTriangle size={14} /> Nhạc gần bằng hoặc lớn hơn thoại – có thể lấn lời thoại.
            </Text>
          )}
          <Group gap="xs" wrap="nowrap">
            <Text fz="sm" w={110}>
              Giảm nhạc khi có thoại
            </Text>
            <SegmentedControl
              size="xs"
              disabled={readOnly}
              value={mix.ducking}
              onChange={(x) => patch((d) => void (d.mix!.ducking = x as AudioMix['ducking']))}
              data={[
                { value: 'light', label: 'Nhẹ' },
                { value: 'medium', label: 'Vừa' },
                { value: 'strong', label: 'Mạnh' },
              ]}
            />
          </Group>
          <SimpleGrid cols={2}>
            <div>
              <Text fz="xs" c="gray.7">
                Fade in: {mix.fadeInSec.toFixed(1)}s
              </Text>
              <Slider min={0} max={3} step={0.5} disabled={readOnly} value={mix.fadeInSec} onChange={(x) => patch((d) => void (d.mix!.fadeInSec = x))} label={null} />
            </div>
            <div>
              <Text fz="xs" c="gray.7">
                Fade out: {mix.fadeOutSec.toFixed(1)}s
              </Text>
              <Slider min={0} max={3} step={0.5} disabled={readOnly} value={mix.fadeOutSec} onChange={(x) => patch((d) => void (d.mix!.fadeOutSec = x))} label={null} />
            </div>
          </SimpleGrid>
        </Stack>
      </Block>

      <Block title="Mức âm lượng theo thời gian" hint="Phát preview để thấy nhạc tự giảm khi có thoại.">
        <LevelMeters clock={clock} mix={mix} speech={audio.speechRanges} totalMs={timeline.totalMs} monitor={monitor} />
      </Block>
    </Stack>
  );
}

function LevelMeters({ clock, mix, speech, totalMs, monitor }: { clock: Clock; mix: AudioMix; speech: AudioLayer['speechRanges']; totalMs: number; monitor: Monitor }) {
  const t = useClock(clock, (s) => Math.floor(s.timeMs / 50) * 50);
  const g = gainsAt(mix, speech, t, totalMs);
  return (
    <Stack gap={6}>
      {TRACKS.map((tr) => {
        const value = effectiveGain(tr.key, g[tr.key], monitor);
        return (
          <Group key={tr.key} gap="xs" wrap="nowrap">
            <Text fz="xs" w={110} c="gray.7">
              {tr.label}
            </Text>
            <Progress value={value * 100} style={{ flex: 1 }} color={tr.key === 'music' ? 'blue' : 'orange'} transitionDuration={80} />
            <Text fz="xs" className="mono" w={36} ta="right">
              {Math.round(value * 100)}%
            </Text>
          </Group>
        );
      })}
      <Badge color={g.speaking ? 'orange' : 'gray'} variant="light" size="sm">
        {g.speaking ? 'Đang có thoại → nhạc giảm' : 'Không có thoại'}
      </Badge>
    </Stack>
  );
}

// ---------------------------------------------------------------- Phụ đề
export function SubtitleTab({
  draft,
  patch,
  audio,
  onSeek,
  readOnly,
  onRegenerate,
}: {
  draft: Presentation;
  patch: Patch;
  audio: AudioLayer;
  onSeek: (ms: number) => void;
  readOnly: boolean;
  onRegenerate: () => void;
}) {
  const sub = draft.subtitle!;
  return (
    <Stack gap="sm">
      <Block
        title="Phụ đề lời thoại"
        hint="Tối đa 2 dòng, tự ngắt theo tỉ lệ khung."
        right={<Switch checked={sub.enabled} disabled={readOnly} onChange={(e) => patch((d) => void (d.subtitle!.enabled = e.currentTarget.checked))} aria-label="Bật phụ đề" />}
      >
        <Stack gap="sm">
          <SimpleGrid cols={4} spacing={6}>
            {(Object.keys(subtitleTemplateLabel) as SubtitleTemplate[]).map((t) => (
              <UnstyledButton
                key={t}
                disabled={readOnly || !sub.enabled}
                onClick={() => patch((d) => void (d.subtitle!.template = t))}
                aria-pressed={sub.template === t}
                style={{
                  borderRadius: 6,
                  border: `2px solid ${sub.template === t ? 'var(--mantine-color-orange-6)' : 'transparent'}`,
                  overflow: 'hidden',
                }}
              >
                <Box bg="var(--player-bg)" h={48} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ ...subtitleTextStyle(t), fontSize: 13 }}>Phụ đề</span>
                </Box>
                <Text fz="xs" ta="center" py={2} bg="gray.0">
                  {subtitleTemplateLabel[t]}
                </Text>
              </UnstyledButton>
            ))}
          </SimpleGrid>
          <Group grow>
            <Stack gap={2}>
              <Text fz="xs" c="gray.7">
                Cỡ chữ
              </Text>
              <SegmentedControl
                size="xs"
                disabled={readOnly || !sub.enabled}
                value={sub.size}
                onChange={(x) => patch((d) => void (d.subtitle!.size = x as 'S' | 'M' | 'L'))}
                data={[
                  { value: 'S', label: 'Nhỏ' },
                  { value: 'M', label: 'Vừa' },
                  { value: 'L', label: 'Lớn' },
                ]}
              />
            </Stack>
            <Stack gap={2}>
              <Text fz="xs" c="gray.7">
                Vị trí
              </Text>
              <SegmentedControl
                size="xs"
                disabled={readOnly || !sub.enabled}
                value={sub.position}
                onChange={(x) => patch((d) => void (d.subtitle!.position = x as 'top' | 'middle' | 'bottom'))}
                data={[
                  { value: 'top', label: 'Trên' },
                  { value: 'middle', label: 'Giữa' },
                  { value: 'bottom', label: 'Dưới' },
                ]}
              />
            </Stack>
          </Group>
        </Stack>
      </Block>
      <Block
        title={`Câu thoại (${audio.subtitleCues.length})`}
        hint="Do AI nhận dạng từ lời thoại gốc. Bấm để xem."
        right={
          <Button size="xs" variant="light" color="blue" leftSection={<IconRefresh size={14} />} onClick={onRegenerate} disabled={readOnly}>
            Tạo lại phụ đề
          </Button>
        }
      >
        <Table verticalSpacing={4} highlightOnHover>
          <Table.Tbody>
            {audio.subtitleCues.map((c) => (
              <Table.Tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => onSeek(c.startMs)}>
                <Table.Td w={90}>
                  <Timecode ms={c.startMs} />
                </Table.Td>
                <Table.Td fz="sm">{c.text}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Block>
    </Stack>
  );
}

// ---------------------------------------------------------------- Xem
export function ViewTab({ ratio, warnings, onCompare, onSnapshot, canCompare }: { ratio: Ratio; warnings: string[]; onCompare: () => void; onSnapshot: () => void; canCompare: boolean }) {
  const { platformFrame, safeZone, loopSegment, contextSec, setPrefs } = useViewPrefs();
  const frames: PlatformFrame[] = ['none', ...(ratio === '9:16' ? VERTICAL_FRAMES : HORIZONTAL_FRAMES)];
  const frameLabel: Record<PlatformFrame, string> = { none: 'Không', tiktok: 'TikTok', reels: 'Reels', shorts: 'Shorts', youtube: 'YouTube', facebook: 'Facebook' };
  const value = frames.includes(platformFrame) ? platformFrame : 'none';
  return (
    <Stack gap="sm">
      <Block title="Khung nền tảng" hint="Phủ giao diện mô phỏng để thấy clip khi đăng thật. Không ảnh hưởng bản dựng.">
        <SegmentedControl fullWidth value={value} onChange={(x) => setPrefs({ platformFrame: x as PlatformFrame })} data={frames.map((f) => ({ value: f, label: frameLabel[f] }))} />
      </Block>
      <Block title="Vùng an toàn" right={<Switch checked={safeZone} onChange={(e) => setPrefs({ safeZone: e.currentTarget.checked })} aria-label="Hiện vùng an toàn" />}>
        {warnings.length ? (
          <Stack gap={4}>
            {warnings.map((w) => (
              <Text key={w} fz="xs" c="orange.8" style={{ display: 'flex', gap: 4 }}>
                <IconAlertTriangle size={14} style={{ flexShrink: 0 }} /> {w}
              </Text>
            ))}
          </Stack>
        ) : (
          <Text fz="xs" c="green.7">
            Phụ đề và logo đều nằm ngoài vùng bị che.
          </Text>
        )}
      </Block>
      <Block title="Phát">
        <Stack gap="xs">
          <Switch label="Lặp đoạn đang xem (L)" checked={loopSegment} onChange={(e) => setPrefs({ loopSegment: e.currentTarget.checked })} />
          <Group gap="xs">
            <Text fz="sm">Ngữ cảnh gốc</Text>
            <SegmentedControl size="xs" value={String(contextSec)} onChange={(v) => setPrefs({ contextSec: Number(v) })} data={['3', '5', '10'].map((v) => ({ value: v, label: `±${v}s` }))} />
          </Group>
        </Stack>
      </Block>
      <Group grow>
        <Button variant="default" leftSection={<IconColumns size={16} />} onClick={onCompare} disabled={!canCompare}>
          So sánh A/B
        </Button>
        <Button variant="default" leftSection={<IconCamera size={16} />} onClick={onSnapshot}>
          Chụp khung hình
        </Button>
      </Group>
      <Text fz="xs" c="gray.6">
        Phím tắt: Space phát/dừng · ←/→ đoạn trước/sau · L lặp · F toàn màn hình · giữ \ để xem bản đã dựng · Ctrl+Z hoàn tác
      </Text>
    </Stack>
  );
}
