import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { api, type CreateProjectInput, type VodMeta } from './api';
import {
  RUNNING_STATUSES,
  TERMINAL_STATUSES,
  type Adjustment,
  type Platform,
  type PostDraft,
  type Project,
  type StepName,
} from '../types/domain';

export const keys = {
  vods: ['vods'] as const,
  vod: (id: string) => ['vods', id] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
};

export const useVods = () =>
  useQuery({
    queryKey: keys.vods,
    queryFn: api.listVods,
    // VOD mới tải lên đang xử lý → hỏi lại định kỳ
    refetchInterval: (q) => (q.state.data?.some((v) => v.status === 'uploading' || v.status === 'processing') ? 1500 : false),
  });

export const useVod = (id: string | undefined) =>
  useQuery({ queryKey: keys.vod(id ?? ''), queryFn: () => api.getVod(id!), enabled: !!id });

export const useProjects = () => useQuery({ queryKey: keys.projects, queryFn: api.listProjects });

const isRunning = (p?: Project) => !!p && RUNNING_STATUSES.includes(p.status);

const doneMessage: Partial<Record<Project['status'], string>> = {
  review_video: 'Video đã dựng xong, sẵn sàng để duyệt.',
  review_audio: 'Đã thêm nhạc và phụ đề, sẵn sàng để duyệt.',
  ready: 'Đã xuất xong, có thể tải về.',
};

/** Lấy dự án; khi đang chạy thì nghe SSE, có polling dự phòng nếu SSE lỗi. */
export function useProject(id: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: keys.project(id ?? ''),
    queryFn: () => api.getProject(id!),
    enabled: !!id,
    refetchInterval: (q) => (isRunning(q.state.data) ? 4000 : false),
  });

  const running = isRunning(query.data);
  useEffect(() => {
    if (!id || !running) return;
    const es = new EventSource(api.projectEventsUrl(id));
    es.onmessage = (ev) => {
      const next = JSON.parse(ev.data as string) as Project;
      qc.setQueryData(keys.project(id), next);
      if (TERMINAL_STATUSES.includes(next.status)) {
        es.close();
        qc.invalidateQueries({ queryKey: keys.projects });
        const msg = doneMessage[next.status];
        if (msg) notifications.show({ color: 'green', title: next.vodTitle, message: msg });
      }
    };
    es.onerror = () => es.close(); // polling ở trên sẽ tiếp tục
    return () => es.close();
  }, [id, running, qc]);

  return query;
}

function useProjectMutation<TVars>(fn: (vars: TVars) => Promise<Project>, successMessage?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (project) => {
      qc.setQueryData(keys.project(project.id), project);
      qc.invalidateQueries({ queryKey: keys.projects });
      if (successMessage) notifications.show({ color: 'green', message: successMessage });
    },
    onError: (err: Error) => notifications.show({ color: 'red', title: 'Không thực hiện được', message: err.message }),
  });
}

type Ids = { projectId: string; variantId: string; revisionId: string };

export const useCreateProject = () => useProjectMutation((input: CreateProjectInput) => api.createProject(input));

export const useCancelProject = () => useProjectMutation((id: string) => api.cancelProject(id), 'Đã hủy dự án.');

export const useRetryStep = () =>
  useProjectMutation(({ id, step }: { id: string; step: StepName }) => api.retryStep(id, step));

export const useCreateRevision = () =>
  useProjectMutation(({ projectId, variantId, adjustment }: { projectId: string; variantId: string; adjustment: Adjustment }) =>
    api.createRevision(projectId, variantId, adjustment),
  );

export const useRestoreRevision = () =>
  useProjectMutation(
    ({ projectId, variantId, revisionId }: Ids) => api.restoreRevision(projectId, variantId, revisionId),
    'Đã khôi phục thành phiên bản mới.',
  );

export const useLockVideo = () =>
  useProjectMutation(({ projectId, variantId, revisionId }: Ids) => api.lockVideo(projectId, variantId, revisionId));

export const useUnlockVideo = () =>
  useProjectMutation(
    ({ projectId, variantId }: { projectId: string; variantId: string }) => api.unlockVideo(projectId, variantId),
    'Đã quay lại bước duyệt video.',
  );

export const useExportRevision = () =>
  useProjectMutation(({ projectId, variantId, revisionId }: Ids) => api.exportRevision(projectId, variantId, revisionId));

export const useSetPrimaryVariant = () =>
  useProjectMutation(({ projectId, variantId }: { projectId: string; variantId: string }) =>
    api.setPrimaryVariant(projectId, variantId),
  );

export const useSuggestPosts = () =>
  useProjectMutation(({ projectId, platforms }: { projectId: string; platforms: Platform[] }) =>
    api.suggestPosts(projectId, platforms),
  );

export const useSavePost = () =>
  useProjectMutation(({ projectId, draft }: { projectId: string; draft: PostDraft }) => api.savePost(projectId, draft));

export const usePublish = () =>
  useProjectMutation(({ projectId, platforms }: { projectId: string; platforms: Platform[] }) =>
    api.publish(projectId, platforms),
  );

export const useParsePrompt = () =>
  useMutation({
    mutationFn: api.parsePrompt,
    onError: (err: Error) => notifications.show({ color: 'red', title: 'Không đọc được prompt', message: err.message }),
  });

export function useAddVod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      input:
        | { kind: 'link'; url: string; meta: VodMeta }
        | { kind: 'file'; file: File; meta: VodMeta; onProgress: (pct: number) => void },
    ) => (input.kind === 'link' ? api.addVodByLink(input.url, input.meta) : api.uploadVod(input.file, input.meta, input.onProgress)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.vods }),
    onError: (err: Error) => notifications.show({ color: 'red', title: 'Không thêm được VOD', message: err.message }),
  });
}
