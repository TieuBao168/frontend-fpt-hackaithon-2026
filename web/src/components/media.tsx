import { Box, Group, Image, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { BRAND } from '../app/brand';
import type { ClipItem, ClipTimeline } from '../lib/clip';
import { mmss } from '../lib/format';
import { segmentThumb } from '../lib/thumb';
import type { MusicTrack, Ratio } from '../types/domain';

/**
 * Khung xem tĩnh đúng tỉ lệ (không phát): ảnh khung của đoạn, logo góc, caption ở trên và sub ở dưới.
 * 9:16 bật tự crop thì lấy vùng quanh nhân vật (subjectX), tắt thì giữ cảnh ngang + viền đen.
 */
export function StillFrame({
  ratio,
  item,
  autoCrop,
  subtitle,
  caption,
  maxWidth,
}: {
  ratio: Ratio;
  item?: ClipItem;
  autoCrop: boolean;
  subtitle?: string;
  caption?: string;
  maxWidth?: number;
}) {
  const vertical = ratio === '9:16';
  const fs = (v: number, h: number) => `${vertical ? v : h}cqw`;
  const seg = item?.kind === 'segment' ? item : undefined;

  return (
    <Box w="100%" maw={maxWidth ?? (vertical ? 320 : undefined)} mx="auto">
      <Box
        pos="relative"
        role="img"
        aria-label={seg ? `Khung xem đoạn ${seg.index + 1}: ${seg.seg.title}` : 'Khung xem clip'}
        style={{ aspectRatio: vertical ? '9 / 16' : '16 / 9', background: 'var(--player-bg)', borderRadius: 12, overflow: 'hidden', containerType: 'inline-size' }}
      >
        {item?.kind === 'template' ? (
          <Box
            pos="absolute"
            inset={0}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3cqw', background: '#0b0d12' }}
          >
            <Image src={BRAND.logoUrl} alt={BRAND.logoAlt} w={vertical ? '50cqw' : '26cqw'} fit="contain" />
            {item.type === 'outro' && (
              <Text c="#fff" fw={700} ta="center" px="6cqw" style={{ fontSize: fs(5.5, 3) }}>
                {item.name}
              </Text>
            )}
            <Text pos="absolute" bottom="3cqw" c="#fff" fw={700} px={6} style={{ background: 'var(--template)', borderRadius: 4, fontSize: fs(3.4, 1.8) }}>
              {item.type === 'intro' ? 'Đầu clip' : 'Cuối clip'}: {item.name}
            </Text>
          </Box>
        ) : seg ? (
          <>
            <img
              src={segmentThumb(seg.seg, seg.index, 640)}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: vertical && !autoCrop ? 'contain' : 'cover',
                objectPosition: vertical && autoCrop ? `${(seg.seg.subjectX ?? 0.5) * 100}% 50%` : 'center',
              }}
            />
            <Image src={BRAND.logoUrl} alt={BRAND.logoAlt} pos="absolute" top="4cqw" left="4cqw" w={vertical ? '18cqw' : '10cqw'} fit="contain" style={{ opacity: 0.92 }} />
            {caption && (
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
                {caption}
              </Text>
            )}
            {subtitle && (
              <Box pos="absolute" left="6cqw" right="6cqw" bottom={vertical ? '22%' : '10%'} ta="center">
                <Text
                  span
                  c="#fff"
                  fw={600}
                  px="0.4em"
                  style={{ fontSize: fs(4.8, 2.6), background: 'rgba(0,0,0,0.65)', borderRadius: 4, lineHeight: 1.4, boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}
                >
                  {subtitle}
                </Text>
              </Box>
            )}
            {!seg.seg.thumbnailUrl && (
              <Text pos="absolute" bottom={6} right={8} fz={12} c="rgba(255,255,255,0.6)">
                (ảnh mẫu)
              </Text>
            )}
          </>
        ) : null}
      </Box>
    </Box>
  );
}

/** Dải các mục trong clip để chọn đoạn xem (không phát); đầu/cuối dạng sọc xanh lam */
export function SegmentStrip({ timeline, active, onSelect }: { timeline: ClipTimeline; active: number; onSelect: (i: number) => void }) {
  return (
    <Group gap={3} wrap="nowrap" h={44} role="listbox" aria-label="Các đoạn trong clip">
      {timeline.items.map((it, i) => {
        const on = i === active;
        const tpl = it.kind === 'template';
        const name = tpl ? `${it.type === 'intro' ? 'Đầu' : 'Cuối'} clip: ${it.name} (${it.durSec} giây)` : `Đoạn ${it.index + 1}: ${it.seg.title}`;
        return (
          <Tooltip key={i} label={name} withArrow>
            <UnstyledButton
              onClick={() => onSelect(i)}
              role="option"
              aria-label={name}
              aria-selected={on}
              h="100%"
              style={{
                flex: it.durSec,
                minWidth: 8,
                borderRadius: 4,
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#fff',
                outline: on ? '2px solid var(--ink)' : undefined,
                outlineOffset: 1,
                background: tpl
                  ? 'repeating-linear-gradient(45deg, var(--template) 0 5px, var(--manual-soft) 5px 10px)'
                  : it.seg.source === 'ai'
                    ? 'var(--ai)'
                    : 'var(--manual)',
              }}
            >
              {tpl ? '' : it.index + 1}
            </UnstyledButton>
          </Tooltip>
        );
      })}
    </Group>
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
