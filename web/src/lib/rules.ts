// Luật kiểm tra dùng chung – UI spec mục 7. FE kiểm tra để phản hồi nhanh, BE kiểm tra lại.
import type { Config, Project, Ratio, ResolvedTemplate, Segment, Template, TemplateChoice, Variant } from '../types/domain';
import { mmss } from './format';

/** V1: tổng clip cuối (đã gồm đầu/cuối) */
export const LIMITS: Record<Ratio, { min: number; max: number }> = {
  '9:16': { min: 15, max: 90 },
  '16:9': { min: 180, max: 600 },
};
export const DEFAULT_TARGET: Record<Ratio, number> = { '9:16': 60, '16:9': 180 };

/** Độ phân giải đúng của từng khung (V3) */
export const RESOLUTION: Record<Ratio, { w: number; h: number }> = {
  '16:9': { w: 1920, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
};

/** V18 */
export const VOD_MAX_BYTES = 8 * 1024 ** 3;
export const VOD_EXT = ['mp4', 'mov', 'mkv'];

/** V3 */
export const TEMPLATE_RULES = { minSec: 1, maxSec: 5, defaultSec: 2, maxBytes: 50 * 1024 ** 2, ext: ['mp4', 'mov', 'png', 'jpg', 'jpeg'] };

/** V7, V8 */
export const AI_TRIM_LIMIT = 2;
export const MANUAL_MAX_SEC = 60;
export const MIN_SEGMENT_SEC = 1;
/** DurationBudget đỏ khi lệch quá 5 giây */
export const BUDGET_TOLERANCE = 5;

/** V17 */
export const MAXLEN = { goalOther: 80, extraPrompt: 400, subtitle: 120, voiceOver: 600, caption: 60, title: 100 };
/** V16 */
export const TIKTOK_TAG_SOFT_MAX = 5;

/** V1 – lỗi tại ô thời lượng */
export function targetError(ratio: Ratio, sec: number | null): string | undefined {
  if (sec === null || Number.isNaN(sec)) return 'Nhập dạng 1:30 hoặc 90.';
  const { min, max } = LIMITS[ratio];
  if (sec < min || sec > max) return `Khung ${ratio} cần từ ${mmss(min)} đến ${mmss(max)}.`;
  return undefined;
}

/** Template thực sự được chèn: theo lựa chọn, đang bật và hỗ trợ tỉ lệ (V4) */
export function resolveTemplate(choice: TemplateChoice, type: 'intro' | 'outro', ratio: Ratio, templates: Template[]): ResolvedTemplate | undefined {
  if (choice === 'none') return undefined;
  const usable = templates.filter((t) => t.type === type && t.enabled && t.ratios.includes(ratio));
  const t = choice === 'default' ? usable.find((x) => x.isDefault) : usable.find((x) => x.id === choice);
  return t ? { id: t.id, name: t.name, durationSec: t.durationSec } : undefined;
}

export const templateSec = (intro?: ResolvedTemplate, outro?: ResolvedTemplate) => (intro?.durationSec ?? 0) + (outro?.durationSec ?? 0);

/** V2: thời lượng đoạn phim AI cần chọn */
export const filmTargetSec = (config: Config, intro?: ResolvedTemplate, outro?: ResolvedTemplate) =>
  Math.max(0, config.targetSec - templateSec(intro, outro));

export const clipSegments = (p: Pick<Project, 'segments'>, v: Variant): Segment[] => v.order.map((id) => p.segments[id]).filter(Boolean);

export const filmSec = (segs: Segment[]) => segs.reduce((s, x) => s + x.durSec, 0);

export interface Budget {
  filmSec: number;
  targetFilmSec: number;
  tplSec: number;
  totalSec: number;
  targetSec: number;
  aiSec: number;
  manualSec: number;
  aiCount: number;
  manualCount: number;
  overTolerance: boolean;
  errors: string[];
  warnings: string[];
}

/** DurationBudget + V1, V5, V6 cho một phương án */
export function budget(p: Project, v: Variant): Budget {
  const segs = clipSegments(p, v);
  const ai = segs.filter((s) => s.source === 'ai');
  const manual = segs.filter((s) => s.source === 'manual');
  const tplSec = templateSec(p.intro, p.outro);
  const film = filmSec(segs);
  const total = film + tplSec;
  const targetFilm = filmTargetSec(p.config, p.intro, p.outro);
  const { min, max } = LIMITS[p.config.ratio];
  const errors: string[] = [];
  const warnings: string[] = [];
  if (total < min || total > max) errors.push(`Clip cuối dài ${mmss(total)}, ngoài giới hạn đề ${mmss(min)}–${mmss(max)}.`); // V1
  if (ai.length === 0) errors.push('Đã loại hết đoạn AI. Cần ít nhất 1 đoạn AI trong mỗi phương án.'); // V5
  const manualSec = filmSec(manual);
  if (film > 0 && manualSec / film > 0.5) warnings.push('Đoạn thủ công chiếm hơn 50% thời lượng, AI cần giữ vai trò chính.'); // V6
  const overTolerance = Math.abs(film - targetFilm) > BUDGET_TOLERANCE;
  return {
    filmSec: film,
    targetFilmSec: targetFilm,
    tplSec,
    totalSec: total,
    targetSec: p.config.targetSec,
    aiSec: filmSec(ai),
    manualSec,
    aiCount: ai.length,
    manualCount: manual.length,
    overTolerance,
    errors,
    warnings,
  };
}

/** V7 (AI ±2 giây) và giới hạn chung khi cắt ngắn / nới */
export function canTrim(seg: Segment, delta: number): boolean {
  const dur = seg.durSec + delta;
  if (dur < MIN_SEGMENT_SEC) return false;
  if (seg.source === 'ai') return Math.abs(seg.trimSec + delta) <= AI_TRIM_LIMIT + 1e-6;
  return dur <= MANUAL_MAX_SEC;
}

/** Nối được khi liền kề cả trong clip lẫn trong phim gốc */
export const canMerge = (a?: Segment, b?: Segment) => !!a && !!b && Math.abs(a.startSec + a.durSec - b.startSec) < 0.05;

/** V9: điểm cắt rơi vào giữa câu thoại */
export function cutsDialogue(ranges: Project['dialogueRanges'], sec: number): boolean {
  return ranges.some((r) => sec > r.startSec + 0.15 && sec < r.endSec - 0.15);
}

export interface ManualCheck {
  errors: string[];
  warnings: string[];
}

/** V8 (lỗi cứng), V1 (vượt giới hạn), V9, V10 (cảnh báo mềm) cho đoạn thủ công */
export function checkManual(p: Project, v: Variant, inSec: number | null, outSec: number | null): ManualCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (inSec === null || outSec === null) return { errors: ['Nhập mốc Vào và Ra dạng hh:mm:ss.'], warnings };
  if (outSec <= inSec) errors.push('Mốc Ra phải sau mốc Vào.');
  if (outSec - inSec > MANUAL_MAX_SEC) errors.push(`Đoạn thủ công dài tối đa ${MANUAL_MAX_SEC} giây.`);
  if (outSec > p.vodDurationSec || inSec < 0) errors.push(`Mốc nằm ngoài độ dài phim (${mmss(p.vodDurationSec)}).`);
  const b = budget(p, v);
  const len = Math.max(0, outSec - inSec);
  if (b.totalSec + len > LIMITS[p.config.ratio].max) errors.push(`Thêm đoạn này làm clip dài ${mmss(b.totalSec + len)}, vượt giới hạn đề.`);
  if (cutsDialogue(p.dialogueRanges, inSec) || cutsDialogue(p.dialogueRanges, outSec)) warnings.push('Điểm cắt rơi vào giữa câu thoại.');
  const overlap = clipSegments(p, v).find((s) => inSec < s.startSec + s.durSec && outSec > s.startSec);
  if (overlap) warnings.push(`Trùng thời gian với đoạn "${overlap.title}".`);
  return { errors, warnings };
}
