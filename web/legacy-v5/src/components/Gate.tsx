import type { ReactNode } from 'react';
import { Button } from '@mantine/core';
import { useNavigate } from 'react-router';
import { useProject } from '../lib/queries';
import type { Project } from '../types/domain';
import { EmptyState } from './ui';

/** Màn 5–8 chỉ mở sau khi giai đoạn 2 xong (UI spec mục 6) */
export function Phase2Gate({ header, children }: { header: ReactNode; children: (p: Project) => ReactNode }) {
  const { data: p, isLoading } = useProject();
  const navigate = useNavigate();
  if (isLoading) return null;
  if (!p || !p.phase2Done) {
    const running = p?.job?.phase === 2 && p.job.status === 'running';
    return (
      <>
        {header}
        <EmptyState
          message="Chưa có nhạc, sub và clip dựng."
          action={<Button onClick={() => navigate(running ? '/review' : p?.phase1Done ? '/review' : '/config')}>{running ? 'Xem tiến trình' : 'Tới bước Duyệt đoạn AI'}</Button>}
        />
      </>
    );
  }
  return (
    <>
      {header}
      {children(p)}
    </>
  );
}
