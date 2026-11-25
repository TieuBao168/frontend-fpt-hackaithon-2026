// State toàn cục (Zustand). Dữ liệu dự án lấy từ API qua TanStack Query; store giữ phần UI.
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { Config, VariantKey } from '../types/domain';
import { DEFAULT_TARGET } from '../lib/rules';

const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  removeItem: (k) => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export const defaultConfig = (): Config => ({
  goal: 'trailer',
  ratio: '9:16',
  targetSec: DEFAULT_TARGET['9:16'],
  style: null,
  introTemplateId: 'default',
  outroTemplateId: 'default',
  variantCount: 1,
  extraPrompt: '',
});

interface AppState {
  /** Dự án đang làm (mock có sẵn dự án mẫu prj-demo) */
  projectId: string | null;
  /** VOD đã chọn ở màn 1 khi chưa tạo dự án */
  draftVodId: string | null;
  draftConfig: Config;
  activeVariant: VariantKey;
  /** Sau khi giai đoạn 2 xong thì sang màn nào (5 lần đầu, 7 khi "Duyệt và dựng lại") */
  afterPhase2: 'music' | 'preview';
  setProject: (id: string | null) => void;
  chooseVod: (vodId: string) => void;
  setDraftConfig: (c: Config) => void;
  setActiveVariant: (k: VariantKey) => void;
  setAfterPhase2: (s: 'music' | 'preview') => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      projectId: 'prj-demo',
      draftVodId: null,
      draftConfig: defaultConfig(),
      activeVariant: 'A',
      afterPhase2: 'music',
      setProject: (projectId) => set({ projectId, activeVariant: 'A' }),
      chooseVod: (draftVodId) => set({ draftVodId, projectId: null, draftConfig: defaultConfig(), activeVariant: 'A' }),
      setDraftConfig: (draftConfig) => set({ draftConfig }),
      setActiveVariant: (activeVariant) => set({ activeVariant }),
      setAfterPhase2: (afterPhase2) => set({ afterPhase2 }),
    }),
    { name: 'trailer-ai.app', storage: createJSONStorage(() => safeStorage) },
  ),
);
