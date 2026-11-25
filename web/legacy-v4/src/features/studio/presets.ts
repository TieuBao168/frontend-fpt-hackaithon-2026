import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Presentation, SubtitleStyle, VisualSettings } from '../../types/domain';

export interface Preset {
  id: string;
  name: string;
  builtIn?: boolean;
  visual: VisualSettings;
  subtitle?: SubtitleStyle;
}

export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'tiktok',
    name: 'TikTok / Reels',
    builtIn: true,
    visual: { crop: 'subject', logo: { enabled: true, corner: 'tl', size: 'S' }, endCard: { enabled: true, sec: 3 }, transition: 'flash' },
    subtitle: { enabled: true, template: 'bold', size: 'M', position: 'bottom' },
  },
  {
    id: 'shorts',
    name: 'YouTube Shorts',
    builtIn: true,
    visual: { crop: 'subject', logo: { enabled: true, corner: 'tl', size: 'S' }, endCard: { enabled: true, sec: 3 }, transition: 'fade' },
    subtitle: { enabled: true, template: 'boxed', size: 'M', position: 'bottom' },
  },
  {
    id: 'cinema',
    name: 'Điện ảnh',
    builtIn: true,
    visual: { crop: 'blur', logo: { enabled: true, corner: 'tr', size: 'S' }, endCard: { enabled: true, sec: 4 }, transition: 'fade' },
    subtitle: { enabled: true, template: 'cinema', size: 'S', position: 'bottom' },
  },
  {
    id: 'minimal',
    name: 'Tối giản',
    builtIn: true,
    visual: { crop: 'center', logo: { enabled: false, corner: 'tl', size: 'S' }, endCard: { enabled: false, sec: 3 }, transition: 'cut' },
    subtitle: { enabled: true, template: 'clean', size: 'M', position: 'bottom' },
  },
];

interface PresetState {
  saved: Preset[];
  save: (name: string, p: Presentation) => void;
  remove: (id: string) => void;
}

/** Preset người dùng tự lưu – hiện lưu ở trình duyệt; khi có BE chuyển sang /presets */
export const usePresets = create<PresetState>()(
  persist(
    (set) => ({
      saved: [],
      save: (name, p) =>
        set((s) => ({
          saved: [...s.saved, { id: `p-${Date.now().toString(36)}`, name, visual: p.visual, subtitle: p.subtitle }],
        })),
      remove: (id) => set((s) => ({ saved: s.saved.filter((x) => x.id !== id) })),
    }),
    {
      name: 'playhard.presets',
      storage: createJSONStorage(() => ({
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
      })),
    },
  ),
);
