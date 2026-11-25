// Khung hình mô phỏng khi chưa có file video thật: mỗi đoạn một màu nền, có "chủ thể"
// đặt theo subjectX để thấy khác biệt giữa crop theo nhân vật và letterbox.
import { hhmmss } from '../lib/format';
import type { Ratio, Segment } from '../types/domain';

const PALETTE = ['#2B3A55', '#3D2C2E', '#23403A', '#45372A', '#2E2E48', '#3A4A3F', '#4A2F3A', '#2F3E46'];
export const SRC_W = 640;
export const SRC_H = 360;

let src: HTMLCanvasElement | null = null;
const srcCanvas = () => {
  if (!src) {
    src = document.createElement('canvas');
    src.width = SRC_W;
    src.height = SRC_H;
  }
  return src;
};

/** Vẽ khung 16:9 của phim gốc */
export function drawSourceFrame(o: { index: number; subjectX?: number; localSec: number; sourceSec?: number; dim?: boolean; label?: string }) {
  const c = srcCanvas();
  const ctx = c.getContext('2d')!;
  ctx.filter = 'none';
  ctx.fillStyle = PALETTE[Math.abs(o.index) % PALETTE.length];
  ctx.fillRect(0, 0, SRC_W, SRC_H);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, SRC_H * 0.66, SRC_W, SRC_H * 0.34);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 6; i++) ctx.fillRect(((i * 113 + o.index * 37) % SRC_W) - 20, SRC_H * 0.3, 46, SRC_H * 0.36);
  const sx = (o.subjectX ?? 0.5) * SRC_W + Math.sin(o.localSec * 1.4) * 10;
  ctx.fillStyle = '#E8D5C4';
  ctx.beginPath();
  ctx.arc(sx, SRC_H * 0.42, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(sx - 26, SRC_H * 0.5, 52, SRC_H * 0.24);
  if (o.sourceSec !== undefined) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '600 14px "Be Vietnam Pro", sans-serif';
    ctx.fillText(hhmmss(o.sourceSec), 14, 26);
  }
  if (o.label) {
    ctx.font = '600 15px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(o.label, 14, SRC_H - 18);
  }
  if (o.dim) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, SRC_W, SRC_H);
  }
  return c;
}

/** Chiếu khung nguồn lên canvas đầu ra: 9:16 crop theo nhân vật hoặc letterbox */
export function project(out: CanvasRenderingContext2D, s: HTMLCanvasElement, ratio: Ratio, autoCrop: boolean, subjectX = 0.5) {
  const W = out.canvas.width;
  const H = out.canvas.height;
  if (ratio === '16:9') {
    out.drawImage(s, 0, 0, W, H);
    return;
  }
  if (!autoCrop) {
    out.fillStyle = '#000';
    out.fillRect(0, 0, W, H);
    const h = W * (SRC_H / SRC_W);
    out.drawImage(s, 0, (H - h) / 2, W, h);
    return;
  }
  const sw = SRC_H * (9 / 16);
  const sx = Math.max(0, Math.min(SRC_W - sw, subjectX * SRC_W - sw / 2));
  out.drawImage(s, sx, 0, sw, SRC_H, 0, 0, W, H);
}

// ---------------- dòng thời gian của clip: đầu clip + các đoạn + cuối clip
export type ClipItem =
  | { kind: 'template'; type: 'intro' | 'outro'; name: string; durSec: number }
  | { kind: 'segment'; seg: Segment; index: number; durSec: number };

export interface ClipTimeline {
  items: ClipItem[];
  starts: number[];
  totalSec: number;
}

export function buildClip(items: ClipItem[]): ClipTimeline {
  const starts: number[] = [];
  let t = 0;
  for (const it of items) {
    starts.push(t);
    t += it.durSec;
  }
  return { items, starts, totalSec: t };
}

export function itemAt(tl: ClipTimeline, sec: number): { i: number; local: number } {
  for (let i = tl.items.length - 1; i >= 0; i--) if (sec >= tl.starts[i]) return { i, local: sec - tl.starts[i] };
  return { i: 0, local: 0 };
}

export function drawClipFrame(ctx: CanvasRenderingContext2D, tl: ClipTimeline, sec: number, ratio: Ratio, autoCrop: boolean) {
  const { i, local } = itemAt(tl, Math.min(sec, Math.max(0, tl.totalSec - 0.001)));
  const it = tl.items[i];
  if (!it || it.kind === 'template') {
    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }
  const s = drawSourceFrame({ index: it.index, subjectX: it.seg.subjectX, localSec: local });
  project(ctx, s, ratio, autoCrop, it.seg.subjectX);
}

// ---------------- ảnh khung cho thẻ đoạn (tạo một lần, lưu cache)
const thumbs = new Map<string, string>();
export function segmentThumb(seg: Segment, index: number): string {
  const key = `${seg.id}:${index}`;
  const hit = thumbs.get(key);
  if (hit) return hit;
  const s = drawSourceFrame({ index, subjectX: seg.subjectX, localSec: 0.5 });
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 90;
  c.getContext('2d')!.drawImage(s, 0, 0, 160, 90);
  const url = c.toDataURL('image/jpeg', 0.7);
  thumbs.set(key, url);
  return url;
}
