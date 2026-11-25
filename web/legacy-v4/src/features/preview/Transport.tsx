import { useEffect, useRef } from 'react';
import { ActionIcon, Box, Group, Menu, Text, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconRepeat,
} from '@tabler/icons-react';
import { useClock, type Clock } from './clock';
import { segmentRange, type Timeline } from './timeline';
import { ACT_COLOR, goToSegment, useCurrentIndex } from './playback';
import { useViewPrefs } from './stores';

const fmt = (ms: number) => {
  const s = ms / 1000;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
};

export function Transport({ clock, timeline, compact }: { clock: Clock; timeline: Timeline; compact?: boolean }) {
  const playing = useClock(clock, (s) => s.playing);
  const speed = useClock(clock, (s) => s.speed);
  const index = useCurrentIndex(clock, timeline);
  const loopSegment = useViewPrefs((s) => s.loopSegment);
  const setPrefs = useViewPrefs((s) => s.setPrefs);

  // Lặp đoạn hiện tại
  useEffect(() => {
    const st = clock.getState();
    if (!loopSegment || index < 0) st.setLoop(null);
    else st.setLoop(segmentRange(timeline, index));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopSegment, timeline]);

  useEffect(() => {
    clock.getState().setDuration(timeline.totalMs);
  }, [clock, timeline.totalMs]);

  return (
    <Box>
      <Scrubber clock={clock} timeline={timeline} />
      <Group justify="space-between" mt={6} wrap="nowrap">
        <Group gap={4} wrap="nowrap">
          <Tooltip label="Đoạn trước (←)">
            <ActionIcon variant="subtle" color="gray" onClick={() => goToSegment(clock, timeline, Math.max(0, (index < 0 ? timeline.segments.length : index) - 1))} aria-label="Đoạn trước">
              <IconPlayerSkipBackFilled size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={playing ? 'Tạm dừng (Space)' : 'Phát (Space)'}>
            <ActionIcon size="lg" radius="xl" onClick={() => clock.getState().toggle()} aria-label={playing ? 'Tạm dừng' : 'Phát'}>
              {playing ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Đoạn sau (→)">
            <ActionIcon variant="subtle" color="gray" onClick={() => goToSegment(clock, timeline, index + 1)} aria-label="Đoạn sau">
              <IconPlayerSkipForwardFilled size={16} />
            </ActionIcon>
          </Tooltip>
          {!compact && (
            <Tooltip label="Lặp đoạn đang xem (L)">
              <ActionIcon
                variant={loopSegment ? 'light' : 'subtle'}
                color={loopSegment ? 'blue' : 'gray'}
                onClick={() => setPrefs({ loopSegment: !loopSegment })}
                aria-label="Lặp đoạn"
                aria-pressed={loopSegment}
              >
                <IconRepeat size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <TimeReadout clock={clock} />
        </Group>
        <Group gap={6} wrap="nowrap">
          <Text fz="xs" c="gray.6">
            {index < 0 ? 'End card' : `Đoạn ${index + 1}/${timeline.segments.length}`}
          </Text>
          <Menu position="top-end" withinPortal>
            <Menu.Target>
              <UnstyledButton fz="xs" fw={600} px={6} py={2} c="gray.7" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 4 }}>
                {speed}x
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              {[0.5, 1, 1.5, 2].map((s) => (
                <Menu.Item
                  key={s}
                  onClick={() => {
                    clock.getState().setSpeed(s);
                    setPrefs({ speed: s });
                  }}
                  fw={s === speed ? 700 : 400}
                >
                  {s}x
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Box>
  );
}

function TimeReadout({ clock }: { clock: Clock }) {
  const t = useClock(clock, (s) => Math.floor(s.timeMs / 100));
  const d = useClock(clock, (s) => s.durationMs);
  return (
    <Text className="mono" c="gray.7" ml={4}>
      {fmt(t * 100)} / {fmt(d)}
    </Text>
  );
}

/** Thanh thời gian chia theo đoạn (màu theo Mở/Thân/Kết), kéo để tua. */
export function Scrubber({ clock, timeline }: { clock: Clock; timeline: Timeline }) {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useClock(clock, (s) => (timeline.totalMs ? s.timeMs / timeline.totalMs : 0));
  const index = useCurrentIndex(clock, timeline);

  const seekAt = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const ms = ((clientX - rect.left) / rect.width) * timeline.totalMs;
    const st = clock.getState();
    if (st.loop) st.setLoop(null);
    st.seek(ms);
  };

  return (
    <Box
      ref={ref}
      pos="relative"
      h={18}
      style={{ cursor: 'pointer', touchAction: 'none' }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        seekAt(e.clientX);
      }}
      onPointerMove={(e) => e.buttons === 1 && seekAt(e.clientX)}
      role="slider"
      aria-label="Thanh thời gian"
      aria-valuemin={0}
      aria-valuemax={Math.round(timeline.totalMs / 1000)}
      aria-valuenow={Math.round((progress * timeline.totalMs) / 1000)}
    >
      <Group gap={2} wrap="nowrap" h={10} mt={4}>
        {timeline.segments.map((s, i) => (
          <Box
            key={s.id}
            h="100%"
            style={{
              flex: s.endMs - s.startMs,
              background: i === index ? 'var(--mantine-color-orange-6)' : ACT_COLOR[s.act],
              borderRadius: 2,
            }}
          />
        ))}
        {timeline.endCardMs > 0 && (
          <Box
            h="100%"
            style={{
              flex: timeline.endCardMs,
              borderRadius: 2,
              background: index < 0 ? 'var(--mantine-color-blue-5)' : 'repeating-linear-gradient(45deg, #dee2e6 0 3px, #f1f3f5 3px 6px)',
            }}
          />
        )}
      </Group>
      <Box
        pos="absolute"
        top={0}
        h={18}
        w={2}
        bg="gray.9"
        style={{ left: `calc(${Math.min(1, progress) * 100}% - 1px)`, borderRadius: 1, pointerEvents: 'none' }}
      />
    </Box>
  );
}
