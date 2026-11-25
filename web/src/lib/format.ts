const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');

/** 95 → "1:35", 3725 → "1:02:05" */
export function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** 750.5 → "00:12:30" */
export function hhmmss(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
}

/** Nhận "1:30", "90", "00:12:30" → giây; trả null nếu sai định dạng */
export function parseTime(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const parts = t.split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

/** Mốc SRT: 00:00:01,250 */
export function srtTime(sec: number): string {
  const ms = Math.round(sec * 1000);
  return `${pad(ms / 3_600_000)}:${pad((ms % 3_600_000) / 60_000)}:${pad((ms % 60_000) / 1000)},${pad(ms % 1000, 3)}`;
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

/** Bỏ dấu tiếng Việt, giữ chữ hoa: "Mùa Hè Định Mệnh" → "MuaHeDinhMenh" */
export function compactName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '');
}
