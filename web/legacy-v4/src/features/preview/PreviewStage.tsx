import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { Box, Image, Text } from '@mantine/core';
import {
  IconBookmark,
  IconHeart,
  IconMaximize,
  IconMessageCircle,
  IconMusic,
  IconPlayerPlay,
  IconSettings,
  IconShare3,
  IconVolume,
} from '@tabler/icons-react';
import { BRAND } from '../../app/brand';
import type { Cue, Ratio, SubtitleStyle, VisualSettings } from '../../types/domain';
import { subtitleTextStyle } from './styles';
import { useClock, type Clock } from './clock';
import { drawClipFrame } from './frame';
import {
  activeCue,
  logoRect,
  safeZoneRects,
  subtitleRect,
  type PlatformFrame,
  type Rect,
  type Timeline,
} from './timeline';

export interface StageProps {
  clock: Clock;
  timeline: Timeline;
  ratio: Ratio;
  visual: VisualSettings;
  subtitle?: SubtitleStyle;
  cues?: Cue[];
  vodTitle: string;
  videoUrl?: string;
  platformFrame: PlatformFrame;
  safeZone: boolean;
  canvasRef?: RefObject<HTMLCanvasElement | null>;
  /** Nhãn nhỏ góc trên (vd "A", "B", "Bản đã dựng") */
  badge?: string;
  maxWidth?: number;
}

const pct = (r: Rect): CSSProperties => ({
  position: 'absolute',
  left: `${r.x}%`,
  top: `${r.y}%`,
  width: `${r.w}%`,
  height: `${r.h}%`,
});

/** Khung xem trước: video (hoặc khung mô phỏng) + lớp phụ đề, logo, end card, khung nền tảng, vùng an toàn. */
export function PreviewStage(props: StageProps) {
  const { clock, timeline, ratio, visual, videoUrl, maxWidth } = props;
  const vertical = ratio === '9:16';
  const localCanvas = useRef<HTMLCanvasElement>(null);
  const canvasRef = props.canvasRef ?? localCanvas;
  const videoRef = useRef<HTMLVideoElement>(null);

  // Vẽ khung mô phỏng theo đồng hồ (không re-render React)
  useEffect(() => {
    if (videoUrl) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const draw = (ms: number) => drawClipFrame(ctx, timeline, ms, { ratio, crop: visual.crop, transition: visual.transition });
    draw(clock.getState().timeMs);
    return clock.subscribe((s, prev) => {
      if (s.timeMs !== prev.timeMs) draw(s.timeMs);
    });
  }, [clock, timeline, ratio, visual.crop, visual.transition, videoUrl, canvasRef]);

  // Video thật bám theo đồng hồ
  useEffect(() => {
    const v = videoRef.current;
    if (!videoUrl || !v) return;
    return clock.subscribe((s) => {
      v.playbackRate = s.speed;
      if (Math.abs(v.currentTime * 1000 - s.timeMs) > 300) v.currentTime = s.timeMs / 1000;
      if (s.playing && v.paused) void v.play().catch(() => undefined);
      if (!s.playing && !v.paused) v.pause();
    });
  }, [clock, videoUrl]);

  return (
    <Box
      pos="relative"
      w="100%"
      maw={maxWidth ?? (vertical ? 340 : undefined)}
      mx="auto"
      style={{
        aspectRatio: vertical ? '9 / 16' : '16 / 9',
        background: 'var(--player-bg)',
        borderRadius: 8,
        overflow: 'hidden',
        containerType: 'inline-size',
        userSelect: 'none',
      }}
    >
      {videoUrl ? (
        <video ref={videoRef} src={videoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline />
      ) : (
        <canvas
          ref={canvasRef}
          width={vertical ? 360 : 640}
          height={vertical ? 640 : 360}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      )}

      <LogoAndEndCard {...props} />
      {props.subtitle?.enabled && props.cues && <SubtitleOverlay {...props} subtitle={props.subtitle} cues={props.cues} />}
      {props.platformFrame !== 'none' && <PlatformOverlay frame={props.platformFrame} vertical={vertical} title={props.vodTitle} />}
      {props.safeZone && <SafeZones ratio={ratio} />}
      {props.badge && (
        <Text
          pos="absolute"
          top={8}
          left={8}
          px={6}
          py={1}
          fz={11}
          fw={700}
          c="white"
          bg="rgba(0,0,0,0.6)"
          style={{ borderRadius: 4, zIndex: 5 }}
        >
          {props.badge}
        </Text>
      )}
      {!videoUrl && (
        <Text pos="absolute" bottom={6} right={8} fz={10} c="rgba(255,255,255,0.45)" style={{ zIndex: 5 }}>
          Khung mô phỏng
        </Text>
      )}
    </Box>
  );
}

function LogoAndEndCard({ clock, timeline, visual, ratio, vodTitle }: StageProps) {
  const inEnd = useClock(clock, (s) => timeline.endCardMs > 0 && s.timeMs >= timeline.contentMs);
  if (inEnd) {
    return (
      <Box
        pos="absolute"
        inset={0}
        bg="#0B0D12"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3cqw' }}
      >
        <Image src={BRAND.logoUrl} alt={BRAND.logoAlt} w={ratio === '9:16' ? '46cqw' : '24cqw'} fit="contain" />
        <Text c="white" fw={700} ta="center" px="6cqw" style={{ fontSize: ratio === '9:16' ? '5.6cqw' : '3cqw' }}>
          {BRAND.watchCta}
        </Text>
        <Text c="gray.4" ta="center" style={{ fontSize: ratio === '9:16' ? '4cqw' : '2.2cqw' }}>
          {vodTitle}
        </Text>
      </Box>
    );
  }
  if (!visual.logo.enabled) return null;
  return (
    <Box style={{ ...pct(logoRect(visual.logo.corner, visual.logo.size, ratio)), zIndex: 2 }}>
      <Image src={BRAND.logoUrl} alt={BRAND.logoAlt} w="100%" h="100%" fit="contain" style={{ opacity: 0.92 }} />
    </Box>
  );
}

const SUB_SIZE = { '9:16': { S: 4.4, M: 5.2, L: 6.4 }, '16:9': { S: 2.3, M: 2.8, L: 3.4 } } as const;

function SubtitleOverlay({ clock, cues, subtitle, ratio }: StageProps & { subtitle: SubtitleStyle; cues: Cue[] }) {
  const cueId = useClock(clock, (s) => activeCue(cues, s.timeMs)?.id);
  const cue = cues.find((c) => c.id === cueId);
  if (!cue) return null;
  const r = subtitleRect(subtitle, ratio);
  return (
    <Box
      style={{ ...pct(r), height: 'auto', zIndex: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
    >
      <span
        style={{
          fontSize: `${SUB_SIZE[ratio][subtitle.size]}cqw`,
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        <span style={subtitleTextStyle(subtitle.template)}>{cue.text}</span>
      </span>
    </Box>
  );
}

function SafeZones({ ratio }: { ratio: Ratio }) {
  return (
    <>
      {safeZoneRects(ratio).map((r, i) => (
        <Box
          key={i}
          style={{
            ...pct(r),
            zIndex: 4,
            background: 'rgba(242,111,33,0.22)',
            outline: '1px dashed rgba(242,111,33,0.9)',
            outlineOffset: -1,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

const frameName: Record<PlatformFrame, string> = {
  none: '',
  tiktok: 'TikTok',
  reels: 'Reels',
  shorts: 'Shorts',
  youtube: 'YouTube',
  facebook: 'Facebook',
};

/** Giao diện nền tảng mô phỏng (gần đúng, chỉ để hình dung vùng bị che) */
function PlatformOverlay({ frame, vertical, title }: { frame: PlatformFrame; vertical: boolean; title: string }) {
  const icon = { size: '100%', stroke: 1.8, color: 'white' } as const;
  if (vertical) {
    const items = [
      { I: IconHeart, n: '12,4K' },
      { I: IconMessageCircle, n: '318' },
      { I: IconBookmark, n: '1,2K' },
      { I: IconShare3, n: 'Chia sẻ' },
    ];
    return (
      <Box pos="absolute" inset={0} style={{ zIndex: 3, pointerEvents: 'none', color: 'white' }}>
        <Text pos="absolute" top="2.5cqw" left={0} right={0} ta="center" fw={600} c="white" style={{ fontSize: '4cqw', opacity: 0.9 }}>
          {frameName[frame]} · mô phỏng
        </Text>
        <Box pos="absolute" right="3cqw" bottom="22%" style={{ display: 'flex', flexDirection: 'column', gap: '4.5cqw', alignItems: 'center' }}>
          {items.map(({ I, n }) => (
            <Box key={n} ta="center">
              <Box w="9cqw" h="9cqw" mx="auto">
                <I {...icon} />
              </Box>
              <Text c="white" fw={600} style={{ fontSize: '3.2cqw' }}>
                {n}
              </Text>
            </Box>
          ))}
        </Box>
        <Box pos="absolute" left="4cqw" right="20%" bottom="5cqw">
          <Text c="white" fw={700} style={{ fontSize: '4.2cqw' }}>
            @kenh_cua_ban
          </Text>
          <Text c="white" lineClamp={2} style={{ fontSize: '3.8cqw' }}>
            {title} – trailer #phimhay
          </Text>
          <Text c="white" style={{ fontSize: '3.4cqw', display: 'flex', alignItems: 'center', gap: '1.5cqw' }}>
            <IconMusic size="3.4cqw" /> Nhạc gốc · AI
          </Text>
        </Box>
      </Box>
    );
  }
  return (
    <Box pos="absolute" inset={0} style={{ zIndex: 3, pointerEvents: 'none' }}>
      <Text pos="absolute" top="1.6cqw" left="2cqw" c="white" fw={600} style={{ fontSize: '2.2cqw', opacity: 0.9 }}>
        {title} · {frameName[frame]} (mô phỏng)
      </Text>
      <Box pos="absolute" left={0} right={0} bottom={0} h="12%" bg="rgba(0,0,0,0.55)" px="2cqw" style={{ display: 'flex', alignItems: 'center', gap: '2cqw' }}>
        <Box w="3cqw" h="3cqw">
          <IconPlayerPlay {...icon} />
        </Box>
        <Box w="3cqw" h="3cqw">
          <IconVolume {...icon} />
        </Box>
        <Box style={{ flex: 1, height: '0.6cqw', background: 'rgba(255,255,255,0.35)', borderRadius: 2 }} />
        <Box w="3cqw" h="3cqw">
          <IconSettings {...icon} />
        </Box>
        <Box w="3cqw" h="3cqw">
          <IconMaximize {...icon} />
        </Box>
      </Box>
    </Box>
  );
}
