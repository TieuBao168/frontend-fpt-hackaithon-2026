const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');

/** 4043450 → "01:07:23.450" */
export function formatTimecode(ms: number): string {
  const h = ms / 3_600_000;
  const m = (ms % 3_600_000) / 60_000;
  const s = (ms % 60_000) / 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms % 1000, 3)}`;
}

/** 95 → "1:35", 3725 → "1:02:05" */
export function formatDuration(totalSec: number): string {
  const sec = Math.round(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

export function segmentsDurationSec(segments: { startMs: number; endMs: number }[]): number {
  return segments.reduce((sum, s) => sum + (s.endMs - s.startMs), 0) / 1000;
}
