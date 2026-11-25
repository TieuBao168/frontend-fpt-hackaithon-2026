import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { api, ApiError } from './api';
import { useApp } from '../store/app';
import type { Project, Template } from '../types/domain';

/** Poll tiến trình job 2 giây (spec mục 8: poll 2 giây nếu không có WebSocket) */
export const JOB_POLL_MS = 2000;

export const keys = {
  vods: (q: string, g: string) => ['vods', q, g] as const,
  vod: (id: string) => ['vod', id] as const,
  templates: ['templates'] as const,
  project: (id: string) => ['project', id] as const,
  platforms: ['platforms'] as const,
};

export const toast = (message: string, tone: 'ok' | 'bad' | 'info' = 'info') =>
  notifications.show({ message, color: tone === 'ok' ? 'green' : tone === 'bad' ? 'red' : 'orange', withBorder: true });

export const useVods = (q = '', genre = '') =>
  useQuery({
    queryKey: keys.vods(q, genre),
    queryFn: () => api.listVods(q, genre),
    refetchInterval: (query) => (query.state.data?.some((v) => v.status === 'uploading') ? 1500 : false),
  });

export const useVod = (id: string | null | undefined) =>
  useQuery({ queryKey: keys.vod(id ?? ''), queryFn: () => api.getVod(id!), enabled: !!id });

export const useTemplates = () => useQuery({ queryKey: keys.templates, queryFn: () => api.listTemplates() });

export const usePlatforms = () => useQuery({ queryKey: keys.platforms, queryFn: api.listPlatforms });

/** Dự án đang làm; poll khi có job chạy. Dự án không còn (mock reset) thì bỏ chọn. */
export function useProject() {
  const projectId = useApp((s) => s.projectId);
  const setProject = useApp((s) => s.setProject);
  const q = useQuery({
    queryKey: keys.project(projectId ?? ''),
    queryFn: () => api.getProject(projectId!),
    enabled: !!projectId,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
    refetchInterval: (query) => (query.state.data?.job?.status === 'running' ? JOB_POLL_MS : false),
  });
  const notFound = q.error instanceof ApiError && q.error.status === 404;
  useEffect(() => {
    if (notFound) {
      setProject(null);
      toast('Dự án không còn trên máy chủ (dữ liệu mẫu đã làm mới). Chọn lại phim ở bước 1.', 'bad');
    }
  }, [notFound, setProject]);
  return q;
}

/** Hành động trên dự án: API trả về Project mới → cập nhật cache */
export function useProjectAction<TVars>(fn: (vars: TVars) => Promise<Project>, okMessage?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (p) => {
      qc.setQueryData(keys.project(p.id), p);
      if (okMessage) toast(okMessage, 'ok');
    },
    onError: (e: Error) => toast(e.message, 'bad'),
  });
}

export function useTemplateAction<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.templates }),
  });
}

export const usableTemplates = (list: Template[] | undefined, type: 'intro' | 'outro', ratio: string) =>
  (list ?? []).filter((t) => t.type === type && t.enabled && t.ratios.includes(ratio as never));
