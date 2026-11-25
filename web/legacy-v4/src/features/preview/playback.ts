import type { Act } from '../../types/domain';
import { useClock, type Clock } from './clock';
import { positionAt, segmentRange, type Timeline } from './timeline';

export const ACT_COLOR: Record<Act, string> = {
  open: 'var(--mantine-color-orange-2)',
  body: 'var(--mantine-color-gray-3)',
  end: 'var(--mantine-color-orange-4)',
};

/** Nhảy tới đoạn i; nếu đang lặp đoạn thì chuyển vùng lặp theo. */
export function goToSegment(clock: Clock, tl: Timeline, i: number) {
  if (i < 0 || i >= tl.segments.length) return;
  const r = segmentRange(tl, i);
  if (clock.getState().loop) clock.getState().setLoop(r);
  clock.getState().seek(r.start);
}

export function useCurrentIndex(clock: Clock, tl: Timeline) {
  return useClock(clock, (s) => positionAt(tl, s.timeMs).index);
}
