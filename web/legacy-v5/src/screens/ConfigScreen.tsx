import { useState } from 'react';
import { Box, Button, Card, Group, Modal, Select, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { GoTo } from '../app/AppShell';
import { useFooter } from '../app/steps';
import { DurationInput, RatioPicker } from '../components/inputs';
import { ChipGroup, EmptyState, Notice, ScreenHeader, StageList, UseCaseChip } from '../components/ui';
import { api } from '../lib/api';
import { mmss } from '../lib/format';
import { genreLabel, goalLabel, styleLabel } from '../lib/labels';
import { keys, toast, useProject, useProjectAction, useTemplates, useVod, usableTemplates } from '../lib/queries';
import { budget, filmTargetSec, LIMITS, MAXLEN, resolveTemplate, targetError, templateSec } from '../lib/rules';
import { useApp } from '../store/app';
import type { Config, GoalKey, Project, Ratio, Style, TemplateChoice } from '../types/domain';

const GOALS = (Object.keys(goalLabel) as GoalKey[]).map((value) => ({ value, label: goalLabel[value] }));
const STYLES = (Object.keys(styleLabel) as Style[]).map((value) => ({ value, label: styleLabel[value] }));

/** Màn 3. Cấu hình và AI chọn đoạn (UC-B.1 đến B.4, J.2, C.1, C.2, C.4) */
export function ConfigScreen() {
  const { data: project, isLoading } = useProject();
  const draftVodId = useApp((s) => s.draftVodId);
  const vodId = project?.vodId ?? draftVodId;
  const navigate = useNavigate();
  if (isLoading) return null;
  if (!vodId)
    return (
      <>
        <ScreenHeader title="Cấu hình" useCases={['B.1', 'B.2', 'B.3', 'B.4', 'J.2']} />
        <EmptyState message="Chưa chọn phim. Chọn một VOD ở Thư viện để cấu hình clip." action={<Button onClick={() => navigate('/library')}>Mở Thư viện VOD</Button>} />
      </>
    );
  return <ConfigForm key={project?.id ?? `draft-${vodId}`} project={project} vodId={vodId} />;
}

function ConfigForm({ project, vodId }: { project?: Project; vodId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: vod } = useVod(vodId);
  const { data: templates } = useTemplates();
  const { draftConfig, setDraftConfig, setProject } = useApp();
  const [cfg, setCfgState] = useState<Config>(() => project?.config ?? draftConfig);
  const [targetInput, setTargetInput] = useState<number | null>(cfg.targetSec);
  const [confirmReselect, setConfirmReselect] = useState(false);
  const setCfg = (c: Config) => {
    setCfgState(c);
    if (!project) setDraftConfig(c);
  };

  const job = project?.job?.phase === 1 ? project.job : undefined;
  const running = job?.status === 'running';
  const tErr = targetError(cfg.ratio, targetInput); // V1
  const goalErr = cfg.goal === 'other' && !cfg.goalOther?.trim() ? 'Nhập mục tiêu khác.' : undefined;
  const intro = resolveTemplate(cfg.introTemplateId, 'intro', cfg.ratio, templates ?? []);
  const outro = resolveTemplate(cfg.outroTemplateId, 'outro', cfg.ratio, templates ?? []);
  const suggested = vod ? (({ drama: 'Dramatic', action: 'Energetic', comedy: 'Funny', horror: 'Cinematic' }) as const)[vod.genre] : 'Cinematic';

  const create = useProjectAction((c: Config) => api.createProject(vodId, c));
  const reselect = useProjectAction((c: Config) => api.reselect(project!.id, c));
  const background = useProjectAction(async (jobId: string) => {
    await api.setBackground(jobId, true);
    return api.getProject(project!.id);
  }, 'Đang chạy nền. Sẽ báo khi xong.');
  const cancel = useProjectAction((jobId: string) => api.cancelJob(jobId));
  const retry = useProjectAction((key: string) => api.retryStage(job!.id, key));

  const start = () => {
    if (tErr || goalErr) return;
    if (project?.phase1Done) return setConfirmReselect(true);
    create.mutate(cfg, {
      onSuccess: (p) => {
        qc.setQueryData(keys.project(p.id), p);
        setProject(p.id);
      },
    });
  };

  useFooter({
    next: running ? (
      <Button variant="light" onClick={() => toast('AI đang chọn đoạn. Vui lòng chờ hoặc bấm Hủy ở khối tiến trình.')}>
        AI đang chọn đoạn
      </Button>
    ) : (
      <Button leftSection={<IconPlayerPlay size={18} />} onClick={start} loading={create.isPending || reselect.isPending} disabled={!!tErr || !!goalErr || project?.job?.status === 'running'}>
        {project?.phase1Done ? 'Chọn lại đoạn với cấu hình mới' : 'Bắt đầu chọn đoạn'}
      </Button>
    ),
  });

  const tplOptions = (type: 'intro' | 'outro') => {
    const usable = usableTemplates(templates, type, cfg.ratio);
    const def = usable.find((t) => t.isDefault);
    return [
      ...(def ? [{ value: 'default', label: `Mặc định: ${def.name} (${def.durationSec} giây)` }] : []),
      ...usable.filter((t) => !t.isDefault).map((t) => ({ value: t.id, label: `${t.name} (${t.durationSec} giây)` })),
      { value: 'none', label: 'Không chèn cho clip này' },
    ];
  };
  const tplValue = (choice: TemplateChoice, type: 'intro' | 'outro') => {
    const opts = tplOptions(type);
    return opts.some((o) => o.value === choice) ? choice : 'none';
  };

  return (
    <Box maw={820}>
      <ScreenHeader title="Cấu hình" useCases={['B.1', 'B.2', 'B.3', 'B.4', 'J.2']} />
      {vod && (
        <Text c="dimmed" mb="md">
          Phim: <b>{vod.title}</b> · {genreLabel[vod.genre]} · {mmss(vod.durationSec)}
        </Text>
      )}
      {/* V14: khi giai đoạn 1 đang chạy, form bị khóa */}
      <div className={running ? 'inert-form' : undefined} inert={running || undefined}>
        <Stack gap="lg">
          <Field label="Mục tiêu clip">
            <ChipGroup label="Mục tiêu clip" options={GOALS} value={cfg.goal} onChange={(goal) => setCfg({ ...cfg, goal })} />
            {cfg.goal === 'other' && (
              <TextInput
                mt="sm"
                maxLength={MAXLEN.goalOther}
                placeholder="Mục tiêu khác"
                aria-label="Mục tiêu khác"
                value={cfg.goalOther ?? ''}
                onChange={(e) => setCfg({ ...cfg, goalOther: e.currentTarget.value })}
                error={goalErr}
                description={`${(cfg.goalOther ?? '').length}/${MAXLEN.goalOther}`}
              />
            )}
          </Field>
          <Field label="Tỉ lệ">
            <RatioPicker
              value={cfg.ratio}
              onChange={(ratio: Ratio) => {
                const { min, max } = LIMITS[ratio];
                const targetSec = Math.min(max, Math.max(min, cfg.targetSec)); // kẹp vào khoảng mới
                setTargetInput(targetSec);
                setCfg({ ...cfg, ratio, targetSec });
              }}
            />
          </Field>
          <Field label="Thời lượng mục tiêu" hint="Tổng clip cuối, đã gồm đầu/cuối. Nhập 1:30 hoặc 90.">
            <DurationInput
              min={LIMITS[cfg.ratio].min}
              max={LIMITS[cfg.ratio].max}
              value={cfg.targetSec}
              error={tErr}
              onChange={(sec) => {
                setTargetInput(sec);
                if (sec !== null) setCfg({ ...cfg, targetSec: sec });
              }}
            />
          </Field>
          <Field label="Phong cách">
            <ChipGroup label="Phong cách" options={STYLES} value={cfg.style} onChange={(s) => setCfg({ ...cfg, style: cfg.style === s ? null : s })} />
            {!cfg.style && vod && (
              <Text fz={14} c="dimmed" mt={6}>
                Chưa chọn: AI gợi ý <b>{styleLabel[suggested]}</b> theo thể loại {genreLabel[vod.genre]}.
              </Text>
            )}
          </Field>
          <Field label="Đầu và cuối clip">
            <Group grow className="stack-sm" align="flex-start">
              <Select
                label="Đầu clip"
                data={tplOptions('intro')}
                value={tplValue(cfg.introTemplateId, 'intro')}
                onChange={(v) => v && setCfg({ ...cfg, introTemplateId: v })}
                allowDeselect={false}
              />
              <Select
                label="Cuối clip"
                data={tplOptions('outro')}
                value={tplValue(cfg.outroTemplateId, 'outro')}
                onChange={(v) => v && setCfg({ ...cfg, outroTemplateId: v })}
                allowDeselect={false}
              />
            </Group>
            <Group justify="space-between" mt={6} gap="sm">
              <Text fz={14} c="dimmed">
                Đã gồm {templateSec(intro, outro)} giây đầu/cuối, AI sẽ chọn khoảng {mmss(filmTargetSec(cfg, intro, outro))} đoạn phim.
              </Text>
              <GoTo to="/templates">Quản lý template</GoTo>
            </Group>
          </Field>
          <Field label="Số phương án">
            <ChipGroup
              label="Số phương án"
              options={[1, 2, 3].map((n) => ({ value: n, label: `${n} phương án` }))}
              value={cfg.variantCount}
              onChange={(n) => setCfg({ ...cfg, variantCount: n as 1 | 2 | 3 })}
            />
          </Field>
          <Field label="Mô tả thêm (không bắt buộc)" hint="Gửi kèm cho AI khi chọn đoạn.">
            <Textarea
              autosize
              minRows={3}
              maxLength={MAXLEN.extraPrompt}
              aria-label="Mô tả thêm"
              placeholder="vd: tập trung vào cặp đôi chính, nhịp nhanh dần về cuối"
              value={cfg.extraPrompt ?? ''}
              onChange={(e) => setCfg({ ...cfg, extraPrompt: e.currentTarget.value })}
            />
            <Text fz={13} c="dimmed" ta="right" mt={2} className="num">
              {(cfg.extraPrompt ?? '').length}/{MAXLEN.extraPrompt}
            </Text>
          </Field>
        </Stack>
      </div>

      {project && (job || project.phase1Done) && (
        <SelectionProgressCard
          project={project}
          onBackground={() => job && background.mutate(job.id)}
          onCancel={() => job && cancel.mutate(job.id)}
          onRetry={(k) => retry.mutate(k)}
          retrying={retry.isPending}
          onOpen={() => navigate('/review')}
        />
      )}

      <Modal opened={confirmReselect} onClose={() => setConfirmReselect(false)} title={<Text fw={700}>Chọn lại đoạn với cấu hình mới?</Text>}>
        <Stack>
          <Text>AI sẽ chọn lại toàn bộ đoạn. Các chỉnh sửa ở Duyệt đoạn AI và các bản dựng hiện tại sẽ bị thay thế.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmReselect(false)}>
              Giữ kết quả cũ
            </Button>
            <Button loading={reselect.isPending} onClick={() => reselect.mutate(cfg, { onSuccess: () => setConfirmReselect(false) })}>
              Chọn lại đoạn
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <Box component="fieldset" p={0} m={0} style={{ border: 0 }}>
      <Text component="legend" fw={700} fz={17} mb={4}>
        {label}
      </Text>
      {hint && (
        <Text fz={14} c="dimmed" mb={8}>
          {hint}
        </Text>
      )}
      {children}
    </Box>
  );
}

/** Khối tiến trình AI chọn đoạn – ngay dưới form, cùng bề rộng 820px */
function SelectionProgressCard({
  project,
  onBackground,
  onCancel,
  onRetry,
  retrying,
  onOpen,
}: {
  project: Project;
  onBackground: () => void;
  onCancel: () => void;
  onRetry: (key: string) => void;
  retrying: boolean;
  onOpen: () => void;
}) {
  const job = project.job?.phase === 1 ? project.job : undefined;
  const status = job?.status ?? 'done';
  const stages =
    job?.stages ??
    (['scene', 'audio', 'rank'] as const).map((key) => ({ key, status: 'done' as const, pct: 100, reusedFromCache: project.vodAnalyzed && key !== 'rank' }));
  const doneCount = stages.filter((s) => s.status === 'done').length;
  return (
    <Card mt="xl" padding={14}>
      <Group justify="space-between" mb="md" gap="sm">
        <Title order={3} fz={17}>
          AI chọn và sắp xếp đoạn cắt
        </Title>
        <Group gap={6}>
          {['C.1', 'C.2', 'C.4'].map((c) => (
            <UseCaseChip key={c} code={c} />
          ))}
        </Group>
      </Group>
      <StageList stages={stages} onRetry={status === 'error' ? onRetry : undefined} retrying={retrying} />
      <Box mt="md">
        {status === 'running' && (
          <Group justify="space-between" gap="sm">
            <Text fz={15} c="dimmed">
              {doneCount} trên 3 bước xong, ước tính {job?.etaSec ? `còn khoảng ${Math.max(1, Math.ceil(job.etaSec / 60))} phút` : '4 đến 7 phút'}
              {job?.background && ' · đang chạy nền'}
            </Text>
            <Group gap="sm">
              {!job?.background && (
                <Button variant="default" onClick={onBackground}>
                  Chạy nền, báo tôi khi xong
                </Button>
              )}
              <Button variant="default" color="red" onClick={onCancel}>
                Hủy
              </Button>
            </Group>
          </Group>
        )}
        {status === 'done' && (
          <Stack gap="sm">
            <Notice tone="ok">
              {project.variants.length > 1
                ? `AI đã chọn đoạn cho ${project.variants.length} phương án: ${project.variants
                    .map((v) => `${v.key} ${v.order.length} đoạn, ${mmss(budget(project, v).filmSec)}`)
                    .join(' · ')}.`
                : project.variants[0]
                  ? `AI đã chọn ${project.variants[0].order.length} đoạn, tổng ${mmss(budget(project, project.variants[0]).filmSec)}.`
                  : 'AI đã chọn xong đoạn.'}
            </Notice>
            <Group justify="flex-end">
              <Button onClick={onOpen}>Mở Duyệt đoạn AI</Button>
            </Group>
          </Stack>
        )}
        {status === 'cancelled' && (
          <Notice tone="warn" action={<Button size="sm" variant="white" onClick={() => onRetry(stages.find((s) => s.status !== 'done')?.key ?? 'scene')}>Chạy lại</Button>}>
            Đã hủy. Kết quả các bước đã xong được giữ lại.
          </Notice>
        )}
      </Box>
    </Card>
  );
}
