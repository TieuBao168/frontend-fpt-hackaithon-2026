import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Menu,
  Modal,
  SegmentedControl,
  Stack,
  Stepper,
  Tabs,
  Text,
  Tooltip,
} from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import {
  IconAdjustments,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconArrowLeft,
  IconCheck,
  IconColumns,
  IconDownload,
  IconEye,
  IconRestore,
  IconSend,
  IconStar,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useStore } from 'zustand';
import { useCreateRevision, useExportRevision, useLockVideo, useSetPrimaryVariant, useUnlockVideo, useVod } from '../../lib/queries';
import { phaseLabel, styleLabel } from '../../lib/labels';
import { formatDateTime, formatDuration, segmentsDurationSec } from '../../lib/time';
import type { Presentation, Project, Revision } from '../../types/domain';
import { createClock } from '../preview/clock';
import { CompareModal } from '../preview/CompareModal';
import { ContextModal } from '../preview/ContextModal';
import { PreviewStage } from '../preview/PreviewStage';
import { diffPresentation, draftHistory, useDraft, useViewPrefs } from '../preview/stores';
import { buildTimeline, overlayWarnings } from '../preview/timeline';
import { Transport } from '../preview/Transport';
import { goToSegment, useCurrentIndex } from '../preview/playback';
import { AdjustDrawer } from '../result/AdjustDrawer';
import { ChecksCard } from '../result/ChecksAndMusic';
import { baseFilename, downloadFile, downloadMusicInfo, downloadSrt, downloadTimestamps } from '../result/export';
import { Storyboard } from '../result/Storyboard';
import { AudioTab, SubtitleTab, ViewTab, VisualTab } from './tabs';
import { useStemPlayback, type Monitor } from './audio';

const toPresentation = (r: Revision): Presentation => ({
  visual: r.visual,
  mix: r.audio?.mix,
  subtitle: r.audio?.subtitle,
  selectedTrackId: r.audio?.selectedTrackId,
});

interface Props {
  project: Project;
  /** Xem một phiên bản cụ thể (từ trang lịch sử); mặc định là phiên bản hiện hành */
  revisionId?: string | null;
}

export function PreviewStudio({ project, revisionId }: Props) {
  const navigate = useNavigate();
  const { data: vod } = useVod(project.vodId);
  const finalized = project.status === 'ready' || project.status === 'published';
  const primary = project.variants.find((v) => v.isPrimary) ?? project.variants[0];
  const [variantId, setVariantId] = useState(primary.id);
  // Từ giai đoạn 2 chỉ làm việc trên phương án đã chốt
  const variant = project.phase === 'video' ? (project.variants.find((v) => v.id === variantId) ?? primary) : primary;
  const revision = variant.revisions.find((r) => r.id === revisionId) ?? variant.revisions.find((r) => r.id === variant.activeRevisionId)!;
  const viewingOld = revision.id !== variant.activeRevisionId;
  const readOnly = viewingOld || finalized;
  const revPhase = revision.phase;

  // ---------- bản nháp tùy chỉnh ----------
  const baselineP = useMemo(() => toPresentation(revision), [revision]);
  useEffect(() => {
    useDraft.getState().load(revision.id, baselineP);
    draftHistory().clear();
  }, [revision.id, baselineP]);
  const draftState = useDraft();
  const draft = draftState.revisionId === revision.id && draftState.draft ? draftState.draft : baselineP;
  const patch = draftState.patch;
  const [showBaseline, setShowBaseline] = useState(false);
  const shown = showBaseline ? baselineP : draft;
  const changes = readOnly ? [] : diffPresentation(baselineP, draft);
  const pastLen = useStore(useDraft.temporal, (s) => s.pastStates.length);
  const futureLen = useStore(useDraft.temporal, (s) => s.futureStates.length);

  // ---------- phát ----------
  const timeline = useMemo(() => buildTimeline(revision.segments, shown.visual), [revision.segments, shown.visual]);
  const [clock] = useState(() => createClock(timeline.totalMs));
  const speedPref = useViewPrefs((s) => s.speed);
  const { platformFrame, safeZone, setPrefs } = useViewPrefs();
  useEffect(() => clock.getState().setSpeed(speedPref), [clock, speedPref]);
  useEffect(() => {
    clock.getState().pause();
    clock.getState().seek(0);
  }, [clock, revision.id]);
  const currentIndex = useCurrentIndex(clock, timeline);
  const [monitor, setMonitor] = useState<Monitor>({ muted: { original: false, music: false, voiceover: false }, solo: null });
  useStemPlayback(clock, revision.audio, shown, timeline, monitor);

  const stageWrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ---------- hộp thoại ----------
  const [tab, setTab] = useState<string | null>('segments');
  const [adjust, setAdjust] = useState<{ open: boolean; scope?: 'content' | 'music' | 'subtitle' }>({ open: false });
  const [contextIdx, setContextIdx] = useState<number | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [confirm, setConfirm] = useState<'lock' | 'unlock' | 'export' | null>(null);

  const applyRev = useCreateRevision();
  const lock = useLockVideo();
  const unlock = useUnlockVideo();
  const exportRev = useExportRevision();
  const setPrimaryV = useSetPrimaryVariant();
  const ids = { projectId: project.id, variantId: variant.id, revisionId: revision.id };

  const apply = () =>
    applyRev.mutate({
      projectId: project.id,
      variantId: variant.id,
      adjustment: { scope: revPhase === 'video' ? 'visual' : 'audio_style', configDiff: {}, presentation: draft },
    });

  const warnings = overlayWarnings({ ratio: variant.ratio, visual: shown.visual, subtitle: revPhase === 'audio' ? shown.subtitle : undefined });

  const snapshot = () => {
    const c = canvasRef.current;
    if (!c) return;
    const sec = Math.round(clock.getState().timeMs / 1000);
    c.toBlob((b) => b && downloadFile(`${baseFilename(project, variant, revision)}_khung_${sec}s.png`, b));
  };

  // ---------- phím tắt ----------
  useHotkeys([
    ['space', () => clock.getState().toggle()],
    ['ArrowLeft', () => goToSegment(clock, timeline, Math.max(0, (currentIndex < 0 ? timeline.segments.length : currentIndex) - 1))],
    ['ArrowRight', () => goToSegment(clock, timeline, currentIndex + 1)],
    ['L', () => setPrefs({ loopSegment: !useViewPrefs.getState().loopSegment })],
    ['F', () => (document.fullscreenElement ? document.exitFullscreen() : stageWrap.current?.requestFullscreen())],
    ['mod+Z', () => !readOnly && draftHistory().undo()],
    ['mod+shift+Z', () => !readOnly && draftHistory().redo()],
  ]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => e.key === '\\' && !(e.target instanceof HTMLInputElement) && setShowBaseline(true);
    const up = (e: KeyboardEvent) => e.key === '\\' && setShowBaseline(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Cảnh báo rời trang khi còn thay đổi chưa áp dụng
  useEffect(() => {
    if (!changes.length) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [changes.length]);

  const stepActive = finalized ? 2 : revPhase === 'video' ? 0 : 1;
  const dirtyBlock = changes.length > 0 ? 'Áp dụng hoặc hoàn tác thay đổi trước khi chốt.' : undefined;

  return (
    <Stack gap="md" pb={80}>
      <Card padding="sm">
        <Stepper active={stepActive} size="sm" color="green" allowNextStepsSelect={false}>
          <Stepper.Step label="Duyệt video" description="Chọn đoạn, hình ảnh" />
          <Stepper.Step label="Âm thanh & phụ đề" description="Nhạc AI, mix, kiểu chữ" />
          <Stepper.Step label="Xuất & đăng" description="Tải gói, đăng bài" />
        </Stepper>
      </Card>

      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm">
          {project.phase === 'video' && project.variants.length > 1 && (
            <SegmentedControl
              value={variant.id}
              onChange={setVariantId}
              data={project.variants.map((v, i) => ({ value: v.id, label: `PA ${i + 1} · ${styleLabel[v.style]}${v.isPrimary ? ' ★' : ''}` }))}
            />
          )}
          <Text fw={600}>v{revision.no}</Text>
          <Badge color={revPhase === 'video' ? 'gray' : 'blue'} variant="light">
            {phaseLabel[revPhase]}
          </Badge>
          {revision.exported && <Badge color="green">Đã xuất</Badge>}
          <Text fz="xs" c="gray.6">
            {formatDateTime(revision.createdAt)} · {revision.segments.length} đoạn · {formatDuration(segmentsDurationSec(revision.segments))} · {variant.ratio}
          </Text>
        </Group>
        <Group gap="xs">
          {project.phase === 'video' && project.variants.length > 1 && !variant.isPrimary && (
            <Button size="xs" variant="subtle" color="gray" leftSection={<IconStar size={14} />} onClick={() => setPrimaryV.mutate({ projectId: project.id, variantId: variant.id })}>
              Đặt làm chính
            </Button>
          )}
          <Button size="xs" variant="default" leftSection={<IconColumns size={14} />} onClick={() => setCompareOpen(true)}>
            So sánh A/B
          </Button>
          <DownloadMenu project={project} variant={variant} revision={revision} />
        </Group>
      </Group>

      {viewingOld && (
        <Alert color="blue" title={`Đang xem phiên bản cũ v${revision.no}`}>
          <Group gap="sm">
            <Text fz="sm">Chỉ xem. Muốn dùng lại bản này, hãy khôi phục ở trang Lịch sử.</Text>
            <Button size="xs" variant="white" onClick={() => navigate(`/projects/${project.id}`)}>
              Về phiên bản hiện hành
            </Button>
          </Group>
        </Alert>
      )}
      {revision.adjustment?.prompt || revision.changeSummary ? (
        <Text fz="sm" c="gray.7">
          {revision.adjustment?.prompt && <>Yêu cầu: “{revision.adjustment.prompt}” · </>}
          {revision.changeSummary}
        </Text>
      ) : null}

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Stack gap="xs" ref={stageWrap} bg="white" p={0}>
            <Group justify="center" h={20}>
              {showBaseline ? (
                <Badge color="blue">Đang xem bản đã dựng</Badge>
              ) : changes.length ? (
                <Badge color="orange" variant="light">
                  Đang xem tùy chỉnh chưa áp dụng
                </Badge>
              ) : (
                <Text fz="xs" c="gray.6">
                  Xem trước · thay đổi ở các tab hiện ngay tại đây
                </Text>
              )}
            </Group>
            <PreviewStage
              clock={clock}
              timeline={timeline}
              ratio={variant.ratio}
              visual={shown.visual}
              subtitle={revPhase === 'audio' ? shown.subtitle : undefined}
              cues={revision.audio?.subtitleCues}
              vodTitle={project.vodTitle}
              videoUrl={revision.videoUrl}
              platformFrame={platformFrame}
              safeZone={safeZone}
              canvasRef={canvasRef}
            />
            <Transport clock={clock} timeline={timeline} />
            {warnings.length > 0 && (
              <Text fz="xs" c="orange.8">
                ⚠ {warnings[0]}
              </Text>
            )}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 7 }}>
          <Tabs value={tab} onChange={setTab} keepMounted={false}>
            <Tabs.List mb="sm">
              <Tabs.Tab value="segments">Đoạn ({revision.segments.length})</Tabs.Tab>
              {revPhase === 'audio' && <Tabs.Tab value="audio">Âm thanh</Tabs.Tab>}
              {revPhase === 'audio' && <Tabs.Tab value="subtitle">Phụ đề</Tabs.Tab>}
              <Tabs.Tab value="visual">Hình ảnh</Tabs.Tab>
              <Tabs.Tab value="view">Xem</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="segments">
              <Stack gap="sm">
                <ChecksCard checks={revision.checks} />
                <Group justify="space-between">
                  <Text fz="sm" fw={600}>
                    Các đoạn AI đã chọn
                  </Text>
                  <Text fz="xs" c="gray.6">
                    Theo thứ tự trong clip · bấm để xem · kính lúp để xem ngữ cảnh gốc
                  </Text>
                </Group>
                <Storyboard segments={revision.segments} currentIndex={currentIndex} onSelect={(i) => goToSegment(clock, timeline, i)} onContext={setContextIdx} />
              </Stack>
            </Tabs.Panel>
            {revision.audio && draft.mix && (
              <Tabs.Panel value="audio">
                <AudioTab
                  draft={draft}
                  patch={patch}
                  audio={revision.audio}
                  clock={clock}
                  timeline={timeline}
                  monitor={monitor}
                  setMonitor={setMonitor}
                  readOnly={readOnly}
                  onRegenerate={() => setAdjust({ open: true, scope: 'music' })}
                />
              </Tabs.Panel>
            )}
            {revision.audio && draft.subtitle && (
              <Tabs.Panel value="subtitle">
                <SubtitleTab
                  draft={draft}
                  patch={patch}
                  audio={revision.audio}
                  onSeek={(ms) => clock.getState().seek(ms)}
                  readOnly={readOnly}
                  onRegenerate={() => setAdjust({ open: true, scope: 'subtitle' })}
                />
              </Tabs.Panel>
            )}
            <Tabs.Panel value="visual">
              <VisualTab draft={draft} patch={patch} ratio={variant.ratio} phase={revPhase} readOnly={readOnly} />
            </Tabs.Panel>
            <Tabs.Panel value="view">
              <ViewTab
                ratio={variant.ratio}
                warnings={warnings}
                onCompare={() => setCompareOpen(true)}
                onSnapshot={snapshot}
                canCompare={project.variants.reduce((n, v) => n + v.revisions.length, 0) > 1}
              />
            </Tabs.Panel>
          </Tabs>
        </Grid.Col>
      </Grid>

      {/* ---------- Thanh hành động ---------- */}
      <Card
        padding="sm"
        pos="sticky"
        bottom={8}
        style={{ zIndex: 20, boxShadow: '0 4px 20px rgba(16,24,40,0.10)' }}
      >
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="xs" wrap="nowrap">
            {readOnly ? (
              <Text fz="sm" c="gray.6">
                {finalized ? 'Đã chốt & xuất. Có thể tải gói hoặc đăng bài.' : 'Chế độ chỉ xem.'}
              </Text>
            ) : (
              <>
                <Tooltip label={changes.join(', ') || 'Chưa có thay đổi'} disabled={!changes.length}>
                  <Badge color={changes.length ? 'orange' : 'gray'} variant={changes.length ? 'filled' : 'light'}>
                    {changes.length ? `${changes.length} thay đổi chưa áp dụng` : 'Không có thay đổi'}
                  </Badge>
                </Tooltip>
                <Tooltip label="Hoàn tác (Ctrl+Z)">
                  <Button size="xs" variant="subtle" color="gray" px={6} onClick={() => draftHistory().undo()} disabled={!pastLen} aria-label="Hoàn tác">
                    <IconArrowBackUp size={16} />
                  </Button>
                </Tooltip>
                <Tooltip label="Làm lại (Ctrl+Shift+Z)">
                  <Button size="xs" variant="subtle" color="gray" px={6} onClick={() => draftHistory().redo()} disabled={!futureLen} aria-label="Làm lại">
                    <IconArrowForwardUp size={16} />
                  </Button>
                </Tooltip>
                <Button size="xs" variant="subtle" color="gray" leftSection={<IconRestore size={14} />} onClick={() => draftState.reset()} disabled={!changes.length}>
                  Về bản đã dựng
                </Button>
                <Tooltip label="Giữ chuột (hoặc phím \) để xem bản đã dựng">
                  <Button
                    size="xs"
                    variant={showBaseline ? 'filled' : 'default'}
                    color="blue"
                    leftSection={<IconEye size={14} />}
                    disabled={!changes.length}
                    onPointerDown={() => setShowBaseline(true)}
                    onPointerUp={() => setShowBaseline(false)}
                    onPointerLeave={() => setShowBaseline(false)}
                  >
                    Giữ để so trước/sau
                  </Button>
                </Tooltip>
              </>
            )}
          </Group>

          <Group gap="xs" wrap="nowrap">
            {!readOnly && revPhase === 'video' && (
              <>
                <Button variant="default" leftSection={<IconAdjustments size={16} />} onClick={() => setAdjust({ open: true, scope: 'content' })}>
                  Điều chỉnh nội dung
                </Button>
                <Button variant="light" onClick={apply} loading={applyRev.isPending} disabled={!changes.length}>
                  Áp dụng
                </Button>
                <Tooltip label={dirtyBlock} disabled={!dirtyBlock}>
                  <Button color="green" leftSection={<IconCheck size={16} />} onClick={() => setConfirm('lock')} disabled={!!dirtyBlock}>
                    Chốt video
                  </Button>
                </Tooltip>
              </>
            )}
            {!readOnly && revPhase === 'audio' && (
              <>
                <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} onClick={() => setConfirm('unlock')}>
                  Quay lại duyệt video
                </Button>
                <Button variant="light" onClick={apply} loading={applyRev.isPending} disabled={!changes.length}>
                  Áp dụng
                </Button>
                <Tooltip label={dirtyBlock} disabled={!dirtyBlock}>
                  <Button color="green" leftSection={<IconCheck size={16} />} onClick={() => setConfirm('export')} disabled={!!dirtyBlock}>
                    Chốt & xuất
                  </Button>
                </Tooltip>
              </>
            )}
            {finalized && !viewingOld && (
              <Button leftSection={<IconSend size={16} />} onClick={() => navigate(`/projects/${project.id}/publish`)}>
                Đăng bài
              </Button>
            )}
          </Group>
        </Group>
      </Card>

      {/* ---------- Hộp thoại ---------- */}
      {vod && (
        <AdjustDrawer
          opened={adjust.open}
          onClose={() => setAdjust({ open: false })}
          project={project}
          variant={variant}
          vodDurationSec={vod.durationSec}
          phase={revPhase}
          initialScope={adjust.scope}
        />
      )}
      <ContextModal
        opened={contextIdx !== null}
        onClose={() => setContextIdx(null)}
        segment={contextIdx !== null ? revision.segments[contextIdx] : undefined}
        index={contextIdx ?? 0}
        vodDurationSec={vod?.durationSec ?? 7200}
      />
      <CompareModal key={`${revision.id}-${compareOpen}`} opened={compareOpen} onClose={() => setCompareOpen(false)} project={project} initialA={revision.id} />

      <Modal opened={confirm === 'lock'} onClose={() => setConfirm(null)} title={<Text fw={600}>Chốt video v{revision.no}?</Text>}>
        <Stack gap="sm">
          <Text fz="sm">
            AI sẽ tạo nhạc mới và phụ đề cho{' '}
            <b>
              phương án {project.variants.indexOf(variant) + 1} · {styleLabel[variant.style]}
            </b>
            . Phương án này trở thành phương án chính.
          </Text>
          <Text fz="sm" c="gray.6">
            Sau đó vẫn có thể quay lại bước duyệt video; nhạc và phụ đề sẽ được tạo lại sau lần chốt mới.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirm(null)}>
              Xem thêm
            </Button>
            <Button color="green" loading={lock.isPending} onClick={() => lock.mutate(ids, { onSuccess: () => setConfirm(null) })}>
              Chốt video
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal opened={confirm === 'unlock'} onClose={() => setConfirm(null)} title={<Text fw={600}>Quay lại duyệt video?</Text>}>
        <Stack gap="sm">
          <Text fz="sm">Nhạc và phụ đề hiện tại vẫn nằm trong lịch sử, nhưng sẽ được tạo lại khi bạn chốt video lần sau.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirm(null)}>
              Ở lại
            </Button>
            <Button loading={unlock.isPending} onClick={() => unlock.mutate({ projectId: project.id, variantId: variant.id }, { onSuccess: () => setConfirm(null) })}>
              Quay lại duyệt video
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal opened={confirm === 'export'} onClose={() => setConfirm(null)} title={<Text fw={600}>Chốt & xuất v{revision.no}?</Text>}>
        <Stack gap="sm">
          <Text fz="sm">Hệ thống xuất MP4 {variant.ratio === '9:16' ? '1080×1920' : '1920×1080'} kèm phụ đề SRT, file timestamp và thông tin tạo nhạc.</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirm(null)}>
              Xem thêm
            </Button>
            <Button color="green" loading={exportRev.isPending} onClick={() => exportRev.mutate(ids, { onSuccess: () => setConfirm(null) })}>
              Chốt & xuất
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function DownloadMenu({ project, variant, revision }: { project: Project; variant: Project['variants'][number]; revision: Revision }) {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Button size="xs" leftSection={<IconDownload size={14} />}>
          Tải xuống
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Tooltip label={revision.exported ? 'Cần backend dựng video' : 'Có sau khi Chốt & xuất'} disabled={!!revision.zipUrl} position="left">
          <Box>
            <Menu.Item component="a" href={revision.zipUrl} disabled={!revision.zipUrl}>
              Gói ZIP (MP4 + SRT + timestamp + nhạc)
            </Menu.Item>
          </Box>
        </Tooltip>
        <Menu.Item onClick={() => downloadTimestamps(project, variant, revision)}>File timestamp (JSON)</Menu.Item>
        <Menu.Item onClick={() => downloadSrt(project, variant, revision)} disabled={!revision.audio}>
          Phụ đề (SRT)
        </Menu.Item>
        <Menu.Item onClick={() => downloadMusicInfo(project, variant, revision)} disabled={!revision.audio}>
          Thông tin tạo nhạc (JSON)
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
