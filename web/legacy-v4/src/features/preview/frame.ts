// Vẽ khung hình mô phỏng khi chưa có video thật: mỗi đoạn một màu nền, có "chủ thể"
// đặt theo subjectX để thấy rõ khác biệt giữa các kiểu crop.
import { formatTimecode } from '../../lib/time';
import type { CropMode, Ratio, Segment, Transition } from '../../types/domain';
import { positionAt, type Timeline } from './timeline';

const PALETTE = ['#2B3A55', '#3D2C2E', '#23403A', '#45372A', '#2E2E48', '#3A4A3F', '#4A2F3A', '#2F3E46'];
export const SRC_W = 640;
export const SRC_H = 360;

let srcCanvas: HTMLCanvasElement | null = null;
function source(): HTMLCanvasElement {
  if (!srcCanvas) {
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = SRC_W;
    srcCanvas.height = SRC_H;
  }
  return srcCanvas;
}

/** Vẽ khung 16:9 của VOD gốc tại thời điểm sourceMs */
export function drawSourceFrame(opts: {
  seg?: Segment;
  index: number;
  sourceMs: number;
  localMs: number;
  dim?: boolean;
  /** Vẽ timecode / nhãn lên khung nguồn (dùng cho xem ngữ cảnh 16:9) */
  labels?: boolean;
}): HTMLCanvasElement {
  const c = source();
  const ctx = c.getContext('2d')!;
  const { seg, index, sourceMs, localMs } = opts;
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.fillStyle = seg ? PALETTE[index % PALETTE.length] : '#2a2d35';
  ctx.fillRect(0, 0, SRC_W, SRC_H);
  // nền đất
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, SRC_H * 0.66, SRC_W, SRC_H * 0.34);
  // vài khối kiến trúc để thấy chuyển động crop
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 6; i++) ctx.fillRect(((i * 113 + index * 37) % SRC_W) - 20, SRC_H * 0.3, 46, SRC_H * 0.36);
  // chủ thể
  const sx = (seg?.subjectX ?? 0.5) * SRC_W + Math.sin(localMs / 700) * 10;
  ctx.fillStyle = '#E8D5C4';
  ctx.beginPath();
  ctx.arc(sx, SRC_H * 0.42, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(sx - 26, SRC_H * 0.5, 52, SRC_H * 0.24);
  // nhãn
  if (opts.labels) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText(formatTimecode(sourceMs), 14, 24);
  }
  if (seg && opts.labels) {
    ctx.font = '700 64px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillText(String(index + 1).padStart(2, '0'), SRC_W - 110, SRC_H - 24);
    ctx.font = '500 13px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(seg.labels.join(' · '), 14, 44);
  }
  if (opts.dim) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, SRC_W, SRC_H);
  }
  return c;
}

/** Chiếu khung nguồn 16:9 lên canvas đầu ra theo tỉ lệ và kiểu crop */
export function project(out: CanvasRenderingContext2D, src: HTMLCanvasElement, ratio: Ratio, crop: CropMode, subjectX = 0.5) {
  const W = out.canvas.width;
  const H = out.canvas.height;
  out.filter = 'none';
  if (ratio === '16:9') {
    out.drawImage(src, 0, 0, W, H);
    return;
  }
  const sw = SRC_H * (9 / 16);
  if (crop === 'blur') {
    out.filter = 'blur(14px) brightness(0.7)';
    out.drawImage(src, (SRC_W - sw) / 2, 0, sw, SRC_H, -20, -20, W + 40, H + 40);
    out.filter = 'none';
    const h = W * (SRC_H / SRC_W);
    out.drawImage(src, 0, (H - h) / 2, W, h);
    return;
  }
  const center = crop === 'subject' ? subjectX * SRC_W : SRC_W / 2;
  const sx = Math.max(0, Math.min(SRC_W - sw, center - sw / 2));
  out.drawImage(src, sx, 0, sw, SRC_H, 0, 0, W, H);
}

/** Vẽ một khung của clip tại thời điểm ms */
export function drawClipFrame(
  ctx: CanvasRenderingContext2D,
  tl: Timeline,
  ms: number,
  opts: { ratio: Ratio; crop: CropMode; transition: Transition },
) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const pos = positionAt(tl, ms);
  if (pos.index < 0) {
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const seg = tl.segments[pos.index];
  const src = drawSourceFrame({ seg, index: pos.index, sourceMs: pos.sourceMs, localMs: pos.localMs });
  project(ctx, src, opts.ratio, opts.crop, seg.subjectX);

  // thông tin đoạn (chỉ có ở khung mô phỏng)
  const fs = Math.round(W / (opts.ratio === '9:16' ? 26 : 48));
  ctx.filter = 'none';
  ctx.font = `700 ${fs * 4}px "Be Vietnam Pro", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.textAlign = 'center';
  ctx.fillText(String(pos.index + 1).padStart(2, '0'), W / 2, H * 0.24);
  ctx.textAlign = 'left';
  ctx.font = `500 ${fs}px "Be Vietnam Pro", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(seg.labels.join(' · '), fs, H * 0.6);
  ctx.font = `500 ${fs * 0.9}px "JetBrains Mono", monospace`;
  ctx.fillText(`Gốc ${formatTimecode(pos.sourceMs)}`, fs, H * 0.6 + fs * 1.5);

  // chuyển cảnh (mô phỏng gần đúng)
  const len = seg.endMs - seg.startMs;
  if (opts.transition === 'fade') {
    const edge = Math.min(pos.index > 0 ? pos.localMs : Infinity, pos.index < tl.segments.length - 1 ? len - pos.localMs : Infinity);
    if (edge < 220) {
      ctx.fillStyle = `rgba(0,0,0,${(1 - edge / 220) * 0.85})`;
      ctx.fillRect(0, 0, W, H);
    }
  } else if (opts.transition === 'flash' && pos.index > 0 && pos.localMs < 120) {
    ctx.fillStyle = `rgba(255,255,255,${(1 - pos.localMs / 120) * 0.8})`;
    ctx.fillRect(0, 0, W, H);
  }
}
