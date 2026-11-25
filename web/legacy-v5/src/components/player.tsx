import { useEffect, useRef } from 'react';
import { ActionIcon, Box, Group, Image, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlayerSkipBackFilled } from '@tabler/icons-react';
import { BRAND } from '../app/brand';
import { mmss } from '../lib/format';
import type { Cue } from '../lib/clip';
import { useClock, type Clock } from '../player/clock';
import { drawClipFrame, itemAt, type ClipTimeline } from '../player/frame';
import type { MusicTrack, Ratio } from '../types/domain';

const activeText = (cues: Cue[] | undefined, sec: number) => cues?.find((c) => sec >= c.startSec && sec < c.endSec)?.text;

/** Khung phát đúng tỉ lệ, logo góc, lớp sub và caption (mô phỏng khi chưa có MP4) */
export function ClipPlayer({
  ratio,
  timeline,
  clock,
  subtitles,
  captions,
  autoCrop,
  src,
  maxWidth,
}: {
  ratio: Ratio;
  timeline: ClipTimeline;
  clock: Clock;
  subtitles?: Cue[];
  captions?: Cue[];
  autoCrop: boolean;
  src?: string;
  maxWidth?: number;
}) {
  const vertical = ratio === '9:16';
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    clock.getState().setDuration(timeline.totalSec * 1000);
  }, [clock, timeline.totalSec]);

  useEffect(() => {
    if (src) return;
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const draw = (ms: number) => drawClipFrame(ctx, timeline, ms / 1000, ratio, autoCrop);
    draw(clock.getState().timeMs);
    return clock.subscribe((s, p) => s.timeMs !== p.timeMs && draw(s.timeMs));
  }, [clock, timeline, ratio, autoCrop, src]);

  const sec = useClock(clock, (s) => Math.floor(s.timeMs / 100) / 10);
  const playing = useClock(clock, (s) => s.playing);
  const cur = timeline.items[itemAt(timeline, sec).i];
  const sub = activeText(subtitles, sec);
  const cap = activeText(captions, sec);
  const fs = (v: number, h: number) => `${vertical ? v : h}cqw`;

  return (
    <Box w="100%" maw={maxWidth ?? (vertical ? 320 : undefined)} mx="auto">
      <Box
        pos="relative"
        style={{ aspectRatio: vertical ? '9 / 16' : '16 / 9', background: 'var(--player-bg)', borderRadius: 12, overflow: 'hidden', containerType: 'inline-size' }}
      >
        {src ? (
          <video src={src} style={{ width: '100%', height: '100%' }} controls />
        ) : (
          <canvas ref={canvas} width={vertical ? 360 : 640} height={vertical ? 640 : 360} style={{ width: '100%', height: '100%', display: 'block' }} />
        )}
        {cur?.kind === 'template' ? (
          <Box
            pos="absolute"
            inset={0}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3cqw', background: '#0b0d12' }}
          >
            <Image src={BRAND.logoUrl} alt={BRAND.logoAlt} w={vertical ? '50cqw' : '26cqw'} fit="contain" />
            <Text c="#fff" fw={700} ta="center" px="6cqw" style={{ fontSize: fs(5.5, 3) }}>
              {cur.type === 'outro' ? cur.name : ''}
            </Text>
            <Text pos="absolute" bottom="3cqw" c="#fff" fw={700} px={6} style={{ background: 'var(--manual)', borderRadius: 4, fontSize: fs(3.4, 1.8) }}>
              {cur.type === 'intro' ? 'Đầu clip' : 'Cuối clip'}: {cur.name}
            </Text>
          </Box>
        ) : (
          <>
            <Image src={BRAND.logoUrl} alt={BRAND.logoAlt} pos="absolute" top="4cqw" left="4cqw" w={vertical ? '18cqw' : '10cqw'} fit="contain" style={{ opacity: 0.92 }} />
            {cap && (
              <Text
                pos="absolute"
                top={vertical ? '16cqw' : '8cqw'}
                left="6cqw"
                right="6cqw"
                ta="center"
                fw={800}
                c="#fff"
                style={{ fontSize: fs(6, 3.2), textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}
              >
                {cap}
              </Text>
            )}
            {sub && (
              <Box pos="absolute" left="6cqw" right={vertical ? '16cqw' : '6cqw'} bottom={vertical ? '22%' : '10%'} ta="center">
                <Text
                  span
                  c="#fff"
                  fw={600}
                  px="0.4em"
                  style={{ fontSize: fs(4.8, 2.6), background: 'rgba(0,0,0,0.65)', borderRadius: 4, lineHeight: 1.4, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}
                >
                  {sub}
                </Text>
              </Box>
            )}
          </>
        )}
        {!src && (
          <Text pos="absolute" bottom={6} right={8} fz={12} c="rgba(255,255,255,0.6)">
            (mẫu)
          </Text>
        )}
      </Box>
      <Group mt={8} gap={8} justify="center">
        <ActionIcon onClick={() => clock.getState().seek(0)} aria-label="Về đầu clip">
          <IconPlayerSkipBackFilled size={18} />
        </ActionIcon>
        <ActionIcon variant="filled" color="orange" onClick={() => clock.getState().toggle()} aria-label={playing ? 'Tạm dừng' : 'Phát'}>
          {playing ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
        </ActionIcon>
        <Text fz={15} fw={600} className="num" w={100}>
          {mmss(sec)} / {mmss(timeline.totalSec)}
        </Text>
      </Group>
    </Box>
  );
}

/** Thanh các đoạn trong clip; đầu/cuối dạng sọc xanh lam; bấm để nhảy tới đoạn */
export function SegmentStrip({ timeline, clock, active, onSelect }: { timeline: ClipTimeline; clock: Clock; active: number; onSelect: (i: number) => void }) {
  const progress = useClock(clock, (s) => (timeline.totalSec ? s.timeMs / 1000 / timeline.totalSec : 0));
  return (
    <Box pos="relative">
      <Group gap={3} wrap="nowrap" h={36}>
        {timeline.items.map((it, i) => {
          const on = i === active;
          const tpl = it.kind === 'template';
          return (
            <Tooltip key={i} label={tpl ? `${it.type === 'intro' ? 'Đầu' : 'Cuối'} clip: ${it.name} (${it.durSec}s)` : `Đoạn ${it.index + 1}: ${it.seg.title}`} withArrow>
              <UnstyledButton
                onClick={() => {
                  clock.getState().seek(timeline.starts[i] * 1000);
                  onSelect(i);
                }}
                aria-label={tpl ? `${it.type === 'intro' ? 'Đầu' : 'Cuối'} clip` : `Đoạn ${it.index + 1}`}
                aria-current={on}
                h="100%"
                style={{
                  flex: it.durSec,
                  minWidth: 6,
                  borderRadius: 4,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                  outline: on ? '2px solid var(--ink)' : undefined,
                  outlineOffset: 1,
                  background: tpl
                    ? 'repeating-linear-gradient(45deg, var(--manual) 0 5px, var(--manual-soft) 5px 10px)'
                    : it.seg.source === 'ai'
                      ? 'var(--accent)'
                      : 'var(--manual)',
                }}
              >
                {tpl ? '' : it.index + 1}
              </UnstyledButton>
            </Tooltip>
          );
        })}
      </Group>
      <Box pos="absolute" top={-3} bottom={-3} w={2} bg="var(--ink)" style={{ left: `${Math.min(1, progress) * 100}%`, pointerEvents: 'none' }} />
    </Box>
  );
}

/** Thẻ bản nhạc: dạng sóng 64 cột, vạch đỏ là cao trào, prompt đã gửi */
export function WaveformCard({ track, selected, onSelect }: { track: MusicTrack; selected: boolean; onSelect: () => void }) {
  const climaxIdx = Math.round((track.climaxSec / Math.max(1, track.durationSec)) * 63);
  return (
    <UnstyledButton
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      p={14}
      w="100%"
      style={{ borderRadius: 12, border: `2px solid ${selected ? 'var(--accent)' : 'var(--line)'}`, background: selected ? 'var(--accent-soft)' : 'var(--bg)' }}
    >
      <Group justify="space-between" mb={8}>
        <Text fw={700} fz={17}>
          {track.label}
          {selected && (
            <Text span c="var(--accent)" fz={14} fw={700}>
              {' '}
              · đang dùng
            </Text>
          )}
        </Text>
        <Text fz={14} c="dimmed" className="num">
          {track.bpm} BPM · {mmss(track.durationSec)}
        </Text>
      </Group>
      <Group gap={2} h={56} align="flex-end" wrap="nowrap" pos="relative" aria-hidden>
        {track.waveform.map((v, i) => (
          <Box key={i} style={{ flex: 1, height: `${Math.max(8, v * 100)}%`, background: i === climaxIdx ? 'var(--bad)' : selected ? 'var(--accent)' : 'var(--muted)', borderRadius: 1 }} />
        ))}
      </Group>
      <Text fz={13} c="dimmed" mt={8}>
        Prompt đã gửi: {track.prompt}
      </Text>
    </UnstyledButton>
  );
}
