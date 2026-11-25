import { formatTimecode } from '../../lib/time';
import type { Cue, Project, Revision, Variant } from '../../types/domain';

export function downloadFile(filename: string, content: BlobPart, type = 'application/json') {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

/** BR-05: tênphim_loạiđầura_tỉlệ_phiênbản */
export function baseFilename(p: Project, v: Variant, r: Revision) {
  return `${slug(p.vodTitle)}_${p.config.outputType}_${v.ratio.replace(':', 'x')}_v${r.no}`;
}

/** File timestamp nộp bài: mọi đoạn do AI chọn, ghi rõ lần điều chỉnh sinh ra phiên bản. */
export function downloadTimestamps(p: Project, v: Variant, r: Revision) {
  const data = {
    project: p.id,
    vod: { id: p.vodId, title: p.vodTitle },
    variant: { id: v.id, style: v.style, ratio: v.ratio },
    revision: {
      no: r.no,
      phase: r.phase,
      createdAt: r.createdAt,
      adjustment: r.adjustment ?? null,
      restoredFrom: r.restoredFrom ?? null,
    },
    segments: r.segments.map((s) => ({
      order: s.order + 1,
      source: 'ai',
      start: formatTimecode(s.startMs),
      end: formatTimecode(s.endMs),
      startMs: s.startMs,
      endMs: s.endMs,
      act: s.act,
      score: s.score,
      labels: s.labels,
      reason: s.reason,
    })),
  };
  downloadFile(`${baseFilename(p, v, r)}_timestamps.json`, JSON.stringify(data, null, 2));
}

/** BR-17: thông tin công cụ & prompt tạo nhạc */
export function downloadMusicInfo(p: Project, v: Variant, r: Revision) {
  if (!r.audio) return;
  const selected = r.audio.musicTracks.find((t) => t.id === r.audio!.selectedTrackId);
  downloadFile(
    `${baseFilename(p, v, r)}_music.json`,
    JSON.stringify({ selected, alternatives: r.audio.musicTracks, mix: r.audio.mix }, null, 2),
  );
}

const srtTime = (ms: number) => formatTimecode(ms).replace('.', ',');

export function toSrt(cues: Cue[]): string {
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.startMs)} --> ${srtTime(c.endMs)}\n${c.text}\n`).join('\n');
}

export function downloadSrt(p: Project, v: Variant, r: Revision) {
  if (!r.audio) return;
  downloadFile(`${baseFilename(p, v, r)}.srt`, toSrt(r.audio.subtitleCues), 'application/x-subrip');
}
