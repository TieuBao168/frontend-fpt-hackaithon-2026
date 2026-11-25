import type { Project, Segment, Variant } from '../types/domain';
import { clipSegments } from './rules';

/** Một mục trong clip cuối: đầu/cuối clip (template) hoặc một đoạn phim */
export type ClipItem =
  | { kind: 'template'; type: 'intro' | 'outro'; name: string; durSec: number }
  | { kind: 'segment'; seg: Segment; index: number; durSec: number };

export interface ClipTimeline {
  items: ClipItem[];
  /** Mốc bắt đầu của từng mục trong clip (giây) */
  starts: number[];
  totalSec: number;
}

function buildClip(items: ClipItem[]): ClipTimeline {
  const starts: number[] = [];
  let t = 0;
  for (const it of items) {
    starts.push(t);
    t += it.durSec;
  }
  return { items, starts, totalSec: t };
}

/** Dòng thời gian clip cuối: đầu clip + đoạn theo thứ tự + cuối clip */
export function clipTimeline(p: Project, v: Variant): ClipTimeline {
  const items: ClipItem[] = [];
  if (p.intro) items.push({ kind: 'template', type: 'intro', name: p.intro.name, durSec: p.intro.durationSec });
  clipSegments(p, v).forEach((seg, index) => items.push({ kind: 'segment', seg, index, durSec: seg.durSec }));
  if (p.outro) items.push({ kind: 'template', type: 'outro', name: p.outro.name, durSec: p.outro.durationSec });
  return buildClip(items);
}

export interface Cue {
  startSec: number;
  endSec: number;
  text: string;
}

/** Sub theo dòng thời gian clip (đã cộng phần đầu clip) */
export function subtitleCues(p: Project, tl: ClipTimeline): Cue[] {
  const out: Cue[] = [];
  tl.items.forEach((it, i) => {
    if (it.kind !== 'segment') return;
    p.subtitles
      .filter((s) => s.segmentId === it.seg.id && s.text.trim())
      .forEach((s) => out.push({ startSec: tl.starts[i] + s.startSec, endSec: tl.starts[i] + Math.min(s.endSec, it.durSec), text: s.text }));
  });
  return out;
}

/** Caption trên hình: rải các caption đang bật lên đầu một số đoạn, mỗi caption 2,5 giây */
export function captionCues(p: Project, tl: ClipTimeline): Cue[] {
  const caps = p.captions.filter((c) => c.enabled && c.text.trim());
  const segIdx = tl.items.map((it, i) => (it.kind === 'segment' ? i : -1)).filter((i) => i >= 0);
  if (!caps.length || !segIdx.length) return [];
  const step = Math.max(1, Math.floor(segIdx.length / caps.length));
  return caps.map((c, k) => {
    const i = segIdx[Math.min(segIdx.length - 1, k * step)];
    return { startSec: tl.starts[i], endSec: tl.starts[i] + Math.min(2.5, tl.items[i].durSec), text: c.text };
  });
}
