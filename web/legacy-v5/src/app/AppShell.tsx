import { useEffect, useRef } from 'react';
import { Anchor, Box, Button, Image, Text } from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconRefresh } from '@tabler/icons-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { BRAND } from './brand';
import { STEPS, stepByPath, stepDone, useFooterStore } from './steps';
import { StatusPill } from '../components/ui';
import { api } from '../lib/api';
import { goalLabel } from '../lib/labels';
import { toast, useProject, useProjectAction } from '../lib/queries';
import { projectStatus } from '../lib/status';
import { useApp } from '../store/app';
import type { Job } from '../types/domain';

export function AppShell() {
  const { data: project } = useProject();
  const location = useLocation();
  const step = stepByPath(location.pathname);

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Các bước">
        <div className="sidebar-logo">
          <Image src={BRAND.logoUrl} alt={BRAND.logoAlt} h={16} w={16 * BRAND.logoAspect} fit="contain" style={{ filter: 'brightness(1.1)' }} />
          <span>{BRAND.product}</span>
        </div>
        {STEPS.map((s) => (
          <NavLink
            key={s.n}
            to={s.path}
            className={({ isActive }) => `step-link${isActive ? ' active' : ''}${stepDone(s.n, project) ? ' done' : ''}`}
            aria-current={step.n === s.n ? 'step' : undefined}
          >
            <span className="step-num">{s.n}</span>
            <span>
              <div className="step-name">{s.name}</div>
              <div className="step-uc">{s.uc}</div>
            </span>
          </NavLink>
        ))}
        <div className="sidebar-foot">
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{BRAND.team}</div>
          Hackaithon FPT Play 2026
          {import.meta.env.VITE_USE_MOCK !== 'false' && <div>Dữ liệu (mẫu)</div>}
        </div>
      </nav>

      <div className="main">
        <TopBar />
        <main className="screen" id="main">
          <Outlet />
        </main>
        <Footer />
      </div>
      <JobWatcher />
    </div>
  );
}

function TopBar() {
  const { data: p, isLoading } = useProject();
  const status = projectStatus(p);
  const render = useProjectAction((id: string) => api.render(id));
  const canRebuild = !!p && p.versions.length > 0 && p.dirty && p.job?.status !== 'running';
  return (
    <header className="topbar">
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text fz={13} c="dimmed">
          Dự án {p ? `/ ${p.vodTitle}` : '/ chưa chọn phim'}
        </Text>
        <Text fw={700} fz={17} truncate>
          {p ? `${p.vodTitle} · ${p.config.goal === 'other' ? p.config.goalOther || 'Khác' : goalLabel[p.config.goal]} · ${p.config.ratio}` : isLoading ? 'Đang tải…' : 'Chưa có dự án'}
        </Text>
      </Box>
      <StatusPill tone={status.tone} label={status.label} />
      {canRebuild && (
        <Button leftSection={<IconRefresh size={18} />} loading={render.isPending} onClick={() => render.mutate(p.id)}>
          Dựng lại thành v{p.versions.length + 1}
        </Button>
      )}
    </header>
  );
}

function Footer() {
  const location = useLocation();
  const navigate = useNavigate();
  const conf = useFooterStore((s) => s.conf);
  const step = stepByPath(location.pathname);
  const prev = STEPS[step.n - 2];
  const next = STEPS[step.n];
  return (
    <footer className="footbar">
      {conf.processing ? (
        <>
          <span />
          <Text fw={700} c="var(--accent)">
            Đang xử lý
          </Text>
          <span />
        </>
      ) : (
        <>
          <Button variant="default" leftSection={<IconArrowLeft size={18} />} disabled={!prev} onClick={() => prev && navigate(prev.path)}>
            Quay lại
          </Button>
          <Text fz={15} fw={600} c="dimmed" className="num">
            Bước {step.n}/8
          </Text>
          {conf.next ?? (
            <Button rightSection={<IconArrowRight size={18} />} disabled={!next} onClick={() => next && navigate(next.path)}>
              Tiếp tục
            </Button>
          )}
        </>
      )}
    </footer>
  );
}

/** Theo dõi job: xong thì tự chuyển màn hoặc báo toast (UI spec mục 1, 4, 5) */
function JobWatcher() {
  const { data: p } = useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const afterPhase2 = useApp((s) => s.afterPhase2);
  const prev = useRef<Pick<Job, 'id' | 'status'> | undefined>(undefined);

  useEffect(() => {
    const job = p?.job;
    const before = prev.current;
    prev.current = job ? { id: job.id, status: job.status } : undefined;
    if (!p || !job || !before || before.id !== job.id || before.status !== 'running' || job.status === 'running') return;
    if (job.status === 'error') {
      toast('Lỗi ở 1 bước. Mở tiến trình để chạy lại.', 'bad');
      return;
    }
    if (job.status !== 'done') return;
    const here = location.pathname;
    if (job.phase === 1) {
      if (here.startsWith('/config') && !job.background) navigate('/review');
      else toast('AI đã đề xuất xong đoạn cắt', 'ok');
    } else if (job.phase === 2) {
      if (here.startsWith('/review') && !job.background) navigate(afterPhase2 === 'preview' ? '/preview' : '/music');
      else toast(`Đã dựng xong bản v${p.versions.length}`, 'ok');
    } else {
      toast(`Đã dựng xong bản v${p.versions.length}`, 'ok');
    }
  }, [p, location.pathname, navigate, afterPhase2]);
  return null;
}

export function GoTo({ to, children }: { to: string; children: string }) {
  const navigate = useNavigate();
  return (
    <Anchor component="button" onClick={() => navigate(to)} fz={15} fw={600} c="var(--accent)">
      {children}
    </Anchor>
  );
}
