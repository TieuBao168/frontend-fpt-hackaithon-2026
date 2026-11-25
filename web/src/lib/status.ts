import type { Project } from '../types/domain';

export type Tone = 'neutral' | 'hot' | 'ok' | 'bad';

/** Giá trị của ProjectStatusPill – UI spec mục 3 */
export function projectStatus(p: Project | undefined): { label: string; tone: Tone } {
  if (!p) return { label: 'Chờ cấu hình', tone: 'neutral' };
  const job = p.job;
  const pct = job ? Math.round(job.stages.reduce((a, s) => a + s.pct, 0) / job.stages.length) : 0;
  if (job?.status === 'error') return { label: 'Lỗi ở 1 bước', tone: 'bad' };
  if (job?.status === 'running') {
    if (job.phase === 1) return { label: `AI đang chọn đoạn ${pct}%`, tone: 'hot' };
    if (job.phase === 2) return { label: `Đang tạo nhạc, sub và dựng ${pct}%`, tone: 'hot' };
    return { label: 'Đang dựng lại', tone: 'hot' };
  }
  const v = p.versions.length;
  if (p.publishedV && p.publishedV === v && !p.dirty) return { label: `Đã đăng v${v}`, tone: 'ok' };
  if (v && p.dirty) return { label: 'Có thay đổi chưa dựng', tone: 'hot' };
  if (v) return { label: `v${v} sẵn sàng xem trước`, tone: 'ok' };
  if (p.phase1Done) return { label: 'Chờ duyệt đoạn', tone: 'hot' };
  return { label: 'Chờ cấu hình', tone: 'neutral' };
}

export const jobPct = (p?: Project) =>
  p?.job ? Math.round(p.job.stages.reduce((a, s) => a + s.pct, 0) / p.job.stages.length) : 0;
