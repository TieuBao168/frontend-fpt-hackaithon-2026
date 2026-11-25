import { useEffect } from 'react';
import { create } from 'zustand';
import type { ReactNode } from 'react';
import type { Project } from '../types/domain';

export interface StepMeta {
  n: number;
  path: string;
  name: string;
  /** Dòng mã use case nhỏ trên thanh bên */
  uc: string;
  /** Chip mã UC ở ScreenHeader */
  chips: string[];
}

export const STEPS: StepMeta[] = [
  { n: 1, path: '/library', name: 'Thư viện VOD', uc: 'UC-A.1, A.2', chips: ['A.1', 'A.2'] },
  { n: 2, path: '/templates', name: 'Template đầu/cuối', uc: 'UC-J.1', chips: ['J.1'] },
  { n: 3, path: '/config', name: 'Cấu hình', uc: 'UC-B.1–B.4, J.2', chips: ['B.1', 'B.2', 'B.3', 'B.4', 'J.2', 'C.1', 'C.2', 'C.4'] },
  { n: 4, path: '/review', name: 'Duyệt đoạn AI', uc: 'UC-C.3, G.1, G.2', chips: ['C.3', 'G.1', 'G.2', 'J.3'] },
  { n: 5, path: '/music', name: 'Nhạc AI', uc: 'UC-D.2', chips: ['D.1', 'D.2'] },
  { n: 6, path: '/text', name: 'Sub, lời dẫn, caption', uc: 'UC-E.1–E.3', chips: ['E.1', 'E.2', 'E.3'] },
  { n: 7, path: '/preview', name: 'Xem trước và tải', uc: 'UC-F.2, F.3, F.4, G.3', chips: ['F.2', 'F.3', 'F.4', 'G.3'] },
  { n: 8, path: '/publish', name: 'Đăng bài', uc: 'UC-H.1–H.3', chips: ['H.1', 'H.2', 'H.3'] },
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
