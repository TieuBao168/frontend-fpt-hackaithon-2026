import { useEffect } from 'react';
import { create } from 'zustand';
import type { ReactNode } from 'react';
import type { Project } from '../types/domain';

export interface StepMeta {
  n: number;
  path: string;
  name: string;
}

export const STEPS: StepMeta[] = [
  { n: 1, path: '/library', name: 'Thư viện VOD' }, // UC-A.1, A.2
  { n: 2, path: '/templates', name: 'Template đầu/cuối' }, // UC-J.1
  { n: 3, path: '/config', name: 'Cấu hình' }, // UC-B.1–B.4, J.2
  { n: 4, path: '/review', name: 'Duyệt đoạn AI' }, // UC-C.3, G.1, G.2
  { n: 5, path: '/music', name: 'Nhạc AI' }, // UC-D.2
  { n: 6, path: '/text', name: 'Sub, lời dẫn, caption' }, // UC-E.1–E.3
  { n: 7, path: '/preview', name: 'Xem trước và tải' }, // UC-F.2, F.3, F.4, G.3
  { n: 8, path: '/publish', name: 'Đăng bài' }, // UC-H.1–H.3
];

export const stepByPath = (path: string) => STEPS.find((s) => path.startsWith(s.path)) ?? STEPS[0];

export function stepDone(n: number, p?: Project): boolean {
  if (!p) return false;
  switch (n) {
    case 1:
      return true;
    case 3:
      return p.phase1Done;
    case 4:
      return p.phase2Done;
    case 5:
    case 6:
    case 7:
      return p.versions.length > 0 && !p.dirty;
    case 8:
      return !!p.publishedV;
    default:
      return false;
  }
}

// ---------------------------------------------------------------- Chân màn: màn hình có thể đổi nút Tiếp tục
export interface FooterConfig {
  /** Thay nút Tiếp tục */
  next?: ReactNode;
  /** Ẩn Quay lại/Tiếp tục, ghi "Đang xử lý" (lớp phủ giai đoạn 2) */
  processing?: boolean;
}

export const useFooterStore = create<{ conf: FooterConfig; set: (c: FooterConfig) => void }>((set) => ({
  conf: {},
  set: (conf) => set({ conf }),
}));

/** Màn hình đăng ký nút chân màn riêng (vd "Bắt đầu chọn đoạn") */
export function useFooter(conf: FooterConfig) {
  const set = useFooterStore((s) => s.set);
  useEffect(() => {
    set(conf);
  });
  useEffect(() => () => set({}), [set]);
}
