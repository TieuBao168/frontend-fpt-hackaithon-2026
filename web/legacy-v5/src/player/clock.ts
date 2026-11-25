import { createStore, useStore, type StoreApi } from 'zustand';

/**
 * Đồng hồ phát của preview. Chạy bằng requestAnimationFrame nên preview phát được
 * cả khi chưa có file video thật; nếu có video, video bám theo đồng hồ này.
 */
export interface ClockState {
  timeMs: number;
  playing: boolean;
  speed: number;
  durationMs: number;
  loop: { start: number; end: number } | null;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (ms: number) => void;
  setSpeed: (s: number) => void;
  setDuration: (ms: number) => void;
  setLoop: (r: { start: number; end: number } | null) => void;
}

export type Clock = StoreApi<ClockState>;

export function createClock(durationMs: number): Clock {
  let raf = 0;
  let last = 0;

  const store = createStore<ClockState>((set, get) => {
    const tick = (now: number) => {
      const s = get();
      if (!s.playing) return;
      let t = s.timeMs + (now - last) * s.speed;
      last = now;
      if (s.loop && t >= s.loop.end) t = s.loop.start;
      if (!s.loop && t >= s.durationMs) {
        set({ timeMs: s.durationMs, playing: false });
        return;
      }
      set({ timeMs: t });
      raf = requestAnimationFrame(tick);
    };

    return {
      timeMs: 0,
      playing: false,
      speed: 1,
      durationMs,
      loop: null,
      play: () => {
        const s = get();
        if (s.playing) return;
        let t = s.timeMs;
        if (s.loop && (t < s.loop.start || t >= s.loop.end)) t = s.loop.start;
        if (!s.loop && t >= s.durationMs) t = 0;
        last = performance.now();
        set({ playing: true, timeMs: t });
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
      },
      pause: () => {
        cancelAnimationFrame(raf);
        set({ playing: false });
      },
      toggle: () => (get().playing ? get().pause() : get().play()),
      seek: (ms) => set({ timeMs: Math.max(0, Math.min(ms, get().durationMs)) }),
      setSpeed: (speed) => set({ speed }),
      setDuration: (ms) => set((s) => ({ durationMs: ms, timeMs: Math.min(s.timeMs, ms) })),
      setLoop: (loop) => set({ loop }),
    };
  });
  return store;
}

export function useClock<T>(clock: Clock, selector: (s: ClockState) => T): T {
  return useStore(clock, selector);
}
