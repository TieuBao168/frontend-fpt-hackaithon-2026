import { useEffect, useRef } from 'react';
import type { AudioLayer, AudioMix, Presentation } from '../../types/domain';
import type { Clock } from '../preview/clock';
import { gainsAt, type Timeline } from '../preview/timeline';

export type TrackKey = 'original' | 'music' | 'voiceover';
export const TRACKS: { key: TrackKey; label: string; field: keyof AudioMix }[] = [
  { key: 'original', label: 'Âm gốc (thoại)', field: 'originalGain' },
  { key: 'music', label: 'Nhạc AI', field: 'musicGain' },
  { key: 'voiceover', label: 'Voice-over', field: 'voiceoverGain' },
];

export interface Monitor {
  muted: Record<TrackKey, boolean>;
  solo: TrackKey | null;
}

export const effectiveGain = (key: TrackKey, g: number, m: Monitor) => (m.muted[key] || (m.solo && m.solo !== key) ? 0 : g);

/** Phát các track âm thanh riêng (nếu BE cung cấp), âm lượng theo mix + ducking. */
export function useStemPlayback(clock: Clock, audio: AudioLayer | undefined, draft: Presentation | null, timeline: Timeline, monitor: Monitor) {
  const els = useRef<Partial<Record<TrackKey, HTMLAudioElement>>>({});
  const stems = audio?.stems;
  const musicUrl = stems?.music?.[draft?.selectedTrackId ?? ''];
  useEffect(() => {
    if (!stems) return;
    const map: Partial<Record<TrackKey, string>> = { original: stems.original, voiceover: stems.voiceover, music: musicUrl };
    const created: Partial<Record<TrackKey, HTMLAudioElement>> = {};
    for (const k of Object.keys(map) as TrackKey[]) if (map[k]) created[k] = new Audio(map[k]);
    els.current = created;
    return () => Object.values(created).forEach((a) => a?.pause());
  }, [stems, musicUrl]);

  useEffect(() => {
    if (!stems || !draft?.mix || !audio) return;
    const mix = draft.mix;
    return clock.subscribe((s) => {
      const g = gainsAt(mix, audio.speechRanges, s.timeMs, timeline.totalMs);
      for (const k of Object.keys(els.current) as TrackKey[]) {
        const a = els.current[k]!;
        a.volume = Math.min(1, effectiveGain(k, g[k], monitor));
        a.playbackRate = s.speed;
        if (Math.abs(a.currentTime * 1000 - s.timeMs) > 250) a.currentTime = s.timeMs / 1000;
        if (s.playing && a.paused) void a.play().catch(() => undefined);
        if (!s.playing && !a.paused) a.pause();
      }
    });
  }, [clock, stems, draft?.mix, audio, timeline.totalMs, monitor]);
}
