import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { temporal } from 'zundo';
import type { Presentation } from '../../types/domain';
import type { PlatformFrame } from './timeline';

// ---------------- Bản nháp tùy chỉnh trình bày (có hoàn tác) ----------------
interface DraftState {
  revisionId?: string;
  baseline: Presentation | null;
  draft: Presentation | null;
  load: (revisionId: string, p: Presentation) => void;
  patch: (fn: (d: Presentation) => void) => void;
  set: (p: Presentation) => void;
  reset: () => void;
}

export const useDraft = create<DraftState>()(
  temporal(
    (set, get) => ({
      revisionId: undefined,
      baseline: null,
      draft: null,
      load: (revisionId, p) => set({ revisionId, baseline: structuredClone(p), draft: structuredClone(p) }),
      patch: (fn) => {
        const d = structuredClone(get().draft);
        if (!d) return;
        fn(d);
        set({ draft: d });
      },
      set: (p) => set({ draft: structuredClone(p) }),
      reset: () => set({ draft: structuredClone(get().baseline) }),
    }),
    {
      partialize: (s) => ({ draft: s.draft }),
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      limit: 100,
    },
  ),
);

export const draftHistory = () => useDraft.temporal.getState();

/** Liệt kê các thay đổi chưa áp dụng (để đếm và mô tả) */
export function diffPresentation(a: Presentation | null, b: Presentation | null): string[] {
  if (!a || !b) return [];
  const out: string[] = [];
  const eq = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
  if (a.visual.crop !== b.visual.crop) out.push('Kiểu crop');
  if (!eq(a.visual.logo, b.visual.logo)) out.push('Logo');
  if (!eq(a.visual.endCard, b.visual.endCard)) out.push('End card');
  if (a.visual.transition !== b.visual.transition) out.push('Chuyển cảnh');
  if (!eq(a.mix, b.mix)) out.push('Mix âm thanh');
  if (!eq(a.subtitle, b.subtitle)) out.push('Phụ đề');
  if (a.selectedTrackId !== b.selectedTrackId) out.push('Bản nhạc');
  return out;
}

// ---------------- Tùy chỉnh cách xem (lưu ở trình duyệt) ----------------
export interface ViewPrefs {
  platformFrame: PlatformFrame;
  safeZone: boolean;
  loopSegment: boolean;
  contextSec: number;
  speed: number;
  setPrefs: (p: Partial<Omit<ViewPrefs, 'setPrefs'>>) => void;
}

/** localStorage có thể bị chặn (chế độ riêng tư) – khi đó bỏ qua, chỉ dùng trong phiên */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export const useViewPrefs = create<ViewPrefs>()(
  persist(
    (set) => ({
      platformFrame: 'none',
      safeZone: false,
      loopSegment: false,
      contextSec: 5,
      speed: 1,
      setPrefs: (p) => set(p),
    }),
    { name: 'playhard.viewPrefs', storage: createJSONStorage(() => safeStorage) },
  ),
);
