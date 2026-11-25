import { useEffect, useRef } from 'react';
import { Anchor, AppShell as MantineShell, Badge, Box, Button, Card, Container, Divider, Group, Image, ScrollArea, Stepper, Text } from '@mantine/core';
import { IconArrowLeft, IconArrowRight, IconLoader2, IconRefresh } from '@tabler/icons-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { BRAND } from './brand';
import { STEPS, stepByPath, stepDone, useFooterStore } from './steps';
import { api } from '../lib/api';
import { goalLabel } from '../lib/labels';
import { toast, useProject, useProjectAction } from '../lib/queries';
import { projectStatus, type Tone } from '../lib/status';
import { useApp } from '../store/app';
import type { Job } from '../types/domain';

/** Màu badge trạng thái theo vai trò: cam = cần người dùng, xanh dương = đang xử lý, xanh lá = xong, đỏ = lỗi */
const toneColor: Record<Tone, string> = { neutral: 'gray', hot: 'orange', ok: 'green', bad: 'red' };

// Khung app theo UI/UX ban đầu (plan v7 mục V7.6): header ngang trắng + Stepper ngang + thanh hành động dính đáy.
export function AppShell() {
  return (
    <MantineShell header={{ height: 56 }} padding={0}>
      <MantineShell.Header withBorder>
        <Header />
      </MantineShell.Header>
      <MantineShell.Main>
        <Container size="xl" pt="md" pb={96}>
          <Steps />
          <Box mt="lg">
            <Outlet />
          </Box>
        </Container>
        <ActionBar />
      </MantineShell.Main>
      <JobWatcher />
    </MantineShell>
  );
}

function Header() {
  const { data: p, isLoading } = useProject();
  const status = projectStatus(p);
  const render = useProjectAction((id: string) => api.render(id));
  const canRebuild = !!p && p.versions.length > 0 && p.dirty && p.job?.status !== 'running';
  const running = p?.job?.status === 'running';
  return (
    <Container size="xl" h="100%">
      <Group h="100%" justify="space-between" wrap="nowrap" gap="md">
        <Group gap="lg" wrap="nowrap" style={{ minWidth: 0 }}>
          <NavLink to="/library" style={{ textDecoration: 'none', color: 'inherit' }} aria-label="Về Thư viện VOD">
            <Group gap={10} wrap="nowrap">
              <Image src={BRAND.logoUrl} alt={BRAND.logoAlt} h={18} w={18 * BRAND.logoAspect} fit="contain" />
              <Divider orientation="vertical" h={20} style={{ alignSelf: 'center' }} />
              <Box lh={1.1}>
                <Text fw={700} fz="md" c="orange.7">
                  {BRAND.team}
                </Text>
                <Text fz={11} c="dimmed" fw={500}>
                  {BRAND.product}
                </Text>
              </Box>
            </Group>
          </NavLink>
          <Box visibleFrom="sm" style={{ minWidth: 0 }}>
            <Text fz="xs" c="dimmed">
              Dự án
            </Text>
            <Text fw={600} fz="sm" truncate>
              {p ? `${p.vodTitle} · ${p.config.goal === 'other' ? p.config.goalOther || 'Khác' : goalLabel[p.config.goal]} · ${p.config.ratio}` : isLoading ? 'Đang tải…' : 'Chưa chọn phim'}
            </Text>
          </Box>
        </Group>
        <Group gap="sm" wrap="nowrap">
          <Badge color={running ? 'blue' : toneColor[status.tone]} leftSection={running ? <IconLoader2 size={12} /> : undefined}>
            {status.label}
          </Badge>
          {canRebuild && (
            <Button size="xs" leftSection={<IconRefresh size={14} />} loading={render.isPending} onClick={() => render.mutate(p.id)}>
              Dựng lại thành v{p.versions.length + 1}
            </Button>
          )}
          {import.meta.env.VITE_USE_MOCK !== 'false' && (
            <Badge color="gray" variant="outline" visibleFrom="md">
              Dữ liệu mẫu
            </Badge>
          )}
        </Group>
      </Group>
    </Container>
  );
}

/** Thanh bước ngang 8 bước; bấm để chuyển bước, bước xong màu xanh lá */
function Steps() {
  const { data: p } = useProject();
  const location = useLocation();
  const navigate = useNavigate();
  const active = stepByPath(location.pathname).n - 1;
  return (
    <Card padding="sm">
      <ScrollArea type="auto" offsetScrollbars>
        <Box miw={860}>
          <Stepper
            active={active}
            onStepClick={(i) => navigate(STEPS[i].path)}
            allowNextStepsSelect
            size="xs"
            color="orange"
            iconSize={26}
            wrap={false}
          >
            {STEPS.map((s, i) => (
              <Stepper.Step
                key={s.n}
                label={s.name}
                color={i === active ? undefined : stepDone(s.n, p) ? 'green' : i < active ? 'gray' : undefined}
                completedIcon={stepDone(s.n, p) ? undefined : <Text fz="xs" fw={700}>{s.n}</Text>}
              />
            ))}
          </Stepper>
        </Box>
      </ScrollArea>
    </Card>
  );
}

/** Thanh hành động dính đáy: Quay lại + nút chính của bước */
function ActionBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const conf = useFooterStore((s) => s.conf);
  const step = stepByPath(location.pathname);
  const prev = STEPS[step.n - 2];
  const next = STEPS[step.n];
  return (
    <Box pos="fixed" left={0} right={0} bottom={0} style={{ zIndex: 30, pointerEvents: 'none' }}>
      <Container size="xl" pb="sm">
        <Card padding="sm" style={{ boxShadow: '0 4px 20px rgba(16,24,40,0.10)', pointerEvents: 'auto' }}>
          {conf.processing ? (
            <Group justify="center" gap="xs">
              <IconLoader2 size={16} color="var(--ai)" />
              <Text fw={600} c="blue.7">
                Đang xử lý – có thể chuyển sang bước khác, hệ thống sẽ báo khi xong
              </Text>
            </Group>
          ) : (
            <Group justify="space-between" wrap="nowrap">
              <Button variant="default" leftSection={<IconArrowLeft size={16} />} disabled={!prev} onClick={() => prev && navigate(prev.path)}>
                {/* Màn hẹp: nhãn ngắn để không bị cắt chữ */}
                <Box component="span" visibleFrom="sm">
                  {prev ? prev.name : 'Quay lại'}
                </Box>
                <Box component="span" hiddenFrom="sm">
                  Quay lại
                </Box>
              </Button>
              {conf.next ?? (
                <Button rightSection={<IconArrowRight size={16} />} disabled={!next} onClick={() => next && navigate(next.path)}>
                  <Box component="span" visibleFrom="sm">
                    {next ? `Tiếp: ${next.name}` : 'Tiếp tục'}
                  </Box>
                  <Box component="span" hiddenFrom="sm">
                    Tiếp tục
                  </Box>
                </Button>
              )}
            </Group>
          )}
        </Card>
      </Container>
    </Box>
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
    <Anchor component="button" onClick={() => navigate(to)} fz="sm" fw={600} c="blue.7">
      {children}
    </Anchor>
  );
}
