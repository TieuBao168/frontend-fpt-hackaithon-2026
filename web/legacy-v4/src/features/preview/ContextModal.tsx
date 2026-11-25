import { useEffect, useMemo, useRef } from 'react';
import { ActionIcon, Badge, Box, Group, Modal, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconPlayerPauseFilled, IconPlayerPlayFilled } from '@tabler/icons-react';
import { formatTimecode } from '../../lib/time';
import type { Segment } from '../../types/domain';
import { createClock, useClock } from './clock';
import { drawSourceFrame, SRC_H, SRC_W } from './frame';
import { useViewPrefs } from './stores';

interface Props {
  opened: boolean;
  onClose: () => void;
  segment?: Segment;
  index: number;
  vodDurationSec: number;
}

/** Xem đoạn AI chọn kèm ±N giây trong VOD gốc, có đánh dấu điểm cắt. */
export function ContextModal({ opened, onClose, segment, index, vodDurationSec }: Props) {
  const contextSec = useViewPrefs((s) => s.contextSec);
  const setPrefs = useViewPrefs((s) => s.setPrefs);
  const range = useMemo(() => {
    if (!segment) return { from: 0, to: 1 };
    const pad = contextSec * 1000;
    return { from: Math.max(0, segment.startMs - pad), to: Math.min(vodDurationSec * 1000, segment.endMs + pad) };
  }, [segment, contextSec, vodDurationSec]);
  const clock = useMemo(() => createClock(range.to - range.from), [range]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const playing = useClock(clock, (s) => s.playing);
  const t = useClock(clock, (s) => s.timeMs);
  const sourceMs = range.from + t;
  const inside = !!segment && sourceMs >= segment.startMs && sourceMs < segment.endMs;

  useEffect(() => {
    if (!opened || !segment) return;
    let unsub: (() => void) | undefined;
    // đợi Modal gắn canvas vào DOM
    const id = requestAnimationFrame(() => {
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) return;
      const draw = (ms: number) => {
        const src = range.from + ms;
        const isIn = src >= segment.startMs && src < segment.endMs;
        const frame = drawSourceFrame({ seg: segment, index, sourceMs: src, localMs: src - segment.startMs, dim: !isIn, labels: true });
        ctx.drawImage(frame, 0, 0, SRC_W, SRC_H);
      };
      draw(clock.getState().timeMs);
      unsub = clock.subscribe((s, p) => s.timeMs !== p.timeMs && draw(s.timeMs));
      clock.getState().play();
    });
    return () => {
      cancelAnimationFrame(id);
      unsub?.();
      clock.getState().pause();
    };
  }, [opened, segment, index, clock, range]);

  const total = range.to - range.from;
  const cutL = segment ? ((segment.startMs - range.from) / total) * 100 : 0;
  const cutW = segment ? ((segment.endMs - segment.startMs) / total) * 100 : 0;

  return (
    <Modal opened={opened} onClose={onClose} size="xl" title={<Text fw={600}>Đoạn {index + 1} trong ngữ cảnh gốc</Text>}>
      {segment && (
        <Stack gap="sm">
          <Box pos="relative" style={{ aspectRatio: '16 / 9', borderRadius: 8, overflow: 'hidden', background: 'var(--player-bg)' }}>
            <canvas ref={canvas} width={SRC_W} height={SRC_H} style={{ width: '100%', height: '100%', display: 'block' }} />
            <Badge pos="absolute" top={10} left={10} color={inside ? 'orange' : 'gray'} variant="filled">
              {inside ? 'Trong clip' : 'Ngoài clip'}
            </Badge>
          </Box>
          <Box
            pos="relative"
            h={22}
            bg="gray.2"
            style={{ borderRadius: 4, cursor: 'pointer' }}
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              clock.getState().seek(((e.clientX - r.left) / r.width) * total);
            }}
          >
            <Box pos="absolute" top={0} bottom={0} bg="orange.3" style={{ left: `${cutL}%`, width: `${cutW}%`, borderLeft: '2px solid var(--mantine-color-orange-7)', borderRight: '2px solid var(--mantine-color-orange-7)' }} />
            <Box pos="absolute" top={-3} bottom={-3} w={2} bg="gray.9" style={{ left: `${(t / total) * 100}%` }} />
          </Box>
          <Group justify="space-between" wrap="wrap">
            <Group gap="sm">
              <ActionIcon radius="xl" size="lg" onClick={() => clock.getState().toggle()} aria-label={playing ? 'Tạm dừng' : 'Phát'}>
                {playing ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
              </ActionIcon>
              <Text className="mono">{formatTimecode(sourceMs)}</Text>
              <Text fz="sm" c="gray.6">
                Điểm cắt: <span className="mono">{formatTimecode(segment.startMs)}</span> →{' '}
                <span className="mono">{formatTimecode(segment.endMs)}</span>
              </Text>
            </Group>
            <Group gap="xs">
              <Text fz="sm" c="gray.6">
                Xem thêm
              </Text>
              <SegmentedControl
                size="xs"
                value={String(contextSec)}
                onChange={(v) => setPrefs({ contextSec: Number(v) })}
                data={['3', '5', '10'].map((v) => ({ value: v, label: `±${v}s` }))}
              />
            </Group>
          </Group>
          <Text fz="sm" c="gray.7">
            <b>Lý do AI chọn:</b> {segment.reason}
          </Text>
        </Stack>
      )}
    </Modal>
  );
}
