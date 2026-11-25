import type { AudioMix, Corner, Cue, Ratio, Segment, SubtitleStyle, VisualSettings } from '../../types/domain';

export interface Timeline {
  segments: Segment[];
  /** Mốc bắt đầu của từng đoạn trên dòng thời gian clip */
  offsets: number[];
  contentMs: number;
  endCardMs: number;
  totalMs: number;
}

export function buildTimeline(segments: Segment[], visual: VisualSettings): Timeline {
  const offsets: number[] = [];
  let t = 0;
  for (const s of segments) {
    offsets.push(t);
    t += s.endMs - s.startMs;
  }
  const endCardMs = visual.endCard.enabled ? visual.endCard.sec * 1000 : 0;
  return { segments, offsets, contentMs: t, endCardMs, totalMs: t + endCardMs };
}

export interface Position {
  index: number; // -1 = end card
  localMs: number;
  sourceMs: number;
}

export function positionAt(tl: Timeline, ms: number): Position {
  if (ms >= tl.contentMs) return { index: -1, localMs: ms - tl.contentMs, sourceMs: 0 };
  let lo = 0;
  let hi = tl.offsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (tl.offsets[mid] <= ms) lo = mid;
    else hi = mid - 1;
  }
  const localMs = ms - tl.offsets[lo];
  return { index: lo, localMs, sourceMs: tl.segments[lo].startMs + localMs };
}

export const segmentRange = (tl: Timeline, i: number) => ({
  start: tl.offsets[i],
  end: tl.offsets[i] + (tl.segments[i].endMs - tl.segments[i].startMs),
});

export const activeCue = (cues: Cue[] | undefined, ms: number) => cues?.find((c) => ms >= c.startMs && ms < c.endMs);

// ---------------- Âm thanh: mô phỏng mức âm lượng theo thời gian ----------------
const DUCK: Record<AudioMix['ducking'], number> = { light: 0.75, medium: 0.5, strong: 0.25 };

/** Âm lượng thực tế của từng track tại thời điểm ms (có ducking và fade) */
export function gainsAt(mix: AudioMix, speech: { startMs: number; endMs: number }[], ms: number, totalMs: number) {
  const fadeIn = mix.fadeInSec > 0 ? Math.min(1, ms / (mix.fadeInSec * 1000)) : 1;
  const fadeOut = mix.fadeOutSec > 0 ? Math.min(1, Math.max(0, (totalMs - ms) / (mix.fadeOutSec * 1000))) : 1;
  const speaking = speech.some((r) => ms >= r.startMs - 150 && ms < r.endMs + 150);
  return {
    original: mix.originalGain,
    music: mix.musicGain * fadeIn * fadeOut * (speaking ? DUCK[mix.ducking] : 1),
    voiceover: mix.voiceoverGain,
    speaking,
  };
}

// ---------------- Vùng an toàn & vị trí lớp phủ (đơn vị %) ----------------
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PlatformFrame = 'none' | 'tiktok' | 'reels' | 'shorts' | 'youtube' | 'facebook';

export const VERTICAL_FRAMES: PlatformFrame[] = ['tiktok', 'reels', 'shorts', 'facebook'];
export const HORIZONTAL_FRAMES: PlatformFrame[] = ['youtube', 'facebook'];

/** Vùng bị giao diện nền tảng che (BR-21) */
export function safeZoneRects(ratio: Ratio): Rect[] {
  return ratio === '9:16'
    ? [
        { x: 0, y: 82, w: 100, h: 18 }, // mép dưới: tên kênh, caption
        { x: 85, y: 40, w: 15, h: 42 }, // cột nút tương tác bên phải
        { x: 0, y: 0, w: 100, h: 7 }, // thanh trên
      ]
    : [{ x: 0, y: 88, w: 100, h: 12 }]; // thanh điều khiển player
}

export function subtitleRect(style: SubtitleStyle, ratio: Ratio): Rect {
  const h = ratio === '9:16' ? 10 : 14;
  const y = style.position === 'top' ? (ratio === '9:16' ? 12 : 8) : style.position === 'middle' ? 50 - h / 2 : ratio === '9:16' ? 70 : 76;
  // khung dọc: chừa cột nút tương tác bên phải
  return ratio === '9:16' ? { x: 5, y, w: 78, h } : { x: 8, y, w: 84, h };
}

export function logoRect(corner: Corner, size: 'S' | 'M', ratio: Ratio): Rect {
  const w = (size === 'S' ? 16 : 22) * (ratio === '9:16' ? 1 : 0.6);
  const h = w / 4.1 / (ratio === '9:16' ? 9 / 16 : 16 / 9);
  const m = 4;
  return {
    x: corner.endsWith('l') ? m : 100 - m - w,
    y: corner.startsWith('t') ? m + (ratio === '9:16' ? 4 : 0) : 100 - m - h,
    w,
    h,
  };
}

const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function overlayWarnings(opts: { ratio: Ratio; visual: VisualSettings; subtitle?: SubtitleStyle }): string[] {
  const zones = safeZoneRects(opts.ratio);
  const out: string[] = [];
  if (opts.subtitle?.enabled && zones.some((z) => intersects(z, subtitleRect(opts.subtitle!, opts.ratio)))) {
    out.push('Phụ đề nằm trong vùng bị giao diện nền tảng che. Thử vị trí "Giữa" hoặc "Trên".');
  }
  if (opts.visual.logo.enabled && zones.some((z) => intersects(z, logoRect(opts.visual.logo.corner, opts.visual.logo.size, opts.ratio)))) {
    out.push('Logo nằm trong vùng bị che. Thử góc trên bên trái.');
  }
  return out;
}
