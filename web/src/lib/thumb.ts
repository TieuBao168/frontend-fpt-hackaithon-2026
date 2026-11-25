// Ảnh khung mẫu khi BE chưa trả ảnh đại diện của đoạn: mỗi đoạn một màu nền, có "chủ thể"
// đặt theo subjectX để thấy khác biệt giữa crop theo nhân vật và letterbox. Sinh 1 lần rồi lưu cache.
import type { Segment } from '../types/domain';

const PALETTE = ['#2B3A55', '#3D2C2E', '#23403A', '#45372A', '#2E2E48', '#3A4A3F', '#4A2F3A', '#2F3E46'];
const cache = new Map<string, string>();

/** Ảnh 16:9 của đoạn (data URL). Có `seg.thumbnailUrl` từ BE thì dùng luôn. */
export function segmentThumb(seg: Segment, index: number, width = 160): string {
  if (seg.thumbnailUrl) return seg.thumbnailUrl;
  const key = `${seg.id}:${index}:${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = width;
  const H = Math.round((width * 9) / 16);
  const k = W / 640;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = PALETTE[Math.abs(index) % PALETTE.length];
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, H * 0.66, W, H * 0.34);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 6; i++) ctx.fillRect((((i * 113 + index * 37) % 640) - 20) * k, H * 0.3, 46 * k, H * 0.36);
  const sx = (seg.subjectX ?? 0.5) * W;
  ctx.fillStyle = '#E8D5C4';
  ctx.beginPath();
  ctx.arc(sx, H * 0.42, 22 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(sx - 26 * k, H * 0.5, 52 * k, H * 0.24);
  const url = c.toDataURL('image/jpeg', 0.75);
  cache.set(key, url);
  return url;
}
