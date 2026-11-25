import type { Config, Genre, Job, Platform, PlatformState, Project, Template, Vod } from '../types/domain';

/** Địa chỉ API. Bản build có thể trỏ thẳng tới BE bằng VITE_API_BASE (vd https://be.example.com/api/v1). */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly data: Record<string, unknown>;
  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: init?.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  }
  if (!res.ok) {
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      /* không phải JSON */
    }
    const fallback = res.status === 401 || res.status === 403 ? 'Phiên đăng nhập hết hạn hoặc không có quyền.' : `Lỗi máy chủ (${res.status}).`;
    throw new ApiError(res.status, String(data.message ?? fallback), data);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export interface ManualSegmentInput {
  variant: string;
  startSec: number;
  endSec: number;
  title: string;
  /** null = cuối clip */
  afterIndex: number | null;
}

export type ProjectPatch = Partial<Pick<Project, 'subtitles' | 'subtitleEnabled' | 'voiceOver' | 'captions' | 'musicVolumePct' | 'ducking' | 'autoCrop'>> & {
  selectedMusic?: { variant: string; id: string };
  primary?: string;
};

export const api = {
  // Màn 1
  listVods: (q = '', genre = '') => request<Vod[]>(`/vods?q=${encodeURIComponent(q)}&genre=${genre}`),
  getVod: (id: string) => request<Vod>(`/vods/${id}`),
  initUpload: (body: { fileName: string; size: number; title: string; genre: Genre }) =>
    request<{ uploadId: string; offset: number; vodId: string }>('/vods/uploads', json('POST', body)),
  getUpload: (id: string) => request<{ offset: number; size: number }>(`/vods/uploads/${id}`),
  uploadChunk: (id: string, offset: number, chunk: Blob, signal?: AbortSignal) =>
    request<{ offset: number }>(`/vods/uploads/${id}`, {
      method: 'PATCH',
      body: chunk,
      signal,
      headers: { 'Content-Type': 'application/offset+octet-stream', 'Upload-Offset': String(offset) },
    }),

  // Màn 2
  listTemplates: (type?: 'intro' | 'outro') => request<Template[]>(`/templates${type ? `?type=${type}` : ''}`),
  addTemplate: (form: FormData) => request<Template>('/templates', { method: 'POST', body: form }),
  patchTemplate: (id: string, body: { enabled?: boolean; isDefault?: boolean }) => request<Template[]>(`/templates/${id}`, json('PATCH', body)),
  deleteTemplate: (id: string) => request<void>(`/templates/${id}`, { method: 'DELETE' }),

  // Màn 3 + job
  createProject: (vodId: string, config: Config) => request<Project>('/projects', json('POST', { vodId, config })),
  reselect: (id: string, config: Config) => request<Project>(`/projects/${id}/select`, json('POST', config)),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  getJob: (id: string) => request<Job>(`/jobs/${id}`),
  setBackground: (jobId: string, background: boolean) => request<Job>(`/jobs/${jobId}`, json('PATCH', { background })),
  cancelJob: (jobId: string) => request<Project>(`/jobs/${jobId}/cancel`, { method: 'POST' }),
  retryStage: (jobId: string, key: string) => request<Project>(`/jobs/${jobId}/stages/${key}/retry`, { method: 'POST' }),

  // Màn 4
  putVariant: (id: string, key: string, body: { order: string[]; reserve?: string[] }) => request<Project>(`/projects/${id}/variants/${key}`, json('PUT', body)),
  resuggest: (id: string, key: string) => request<Project>(`/projects/${id}/variants/${key}/resuggest`, { method: 'POST' }),
  addSegment: (id: string, body: ManualSegmentInput) => request<Project>(`/projects/${id}/segments`, json('POST', body)),
  trimSegment: (id: string, segId: string, delta: number) => request<Project>(`/projects/${id}/segments/${segId}`, json('PATCH', { delta })),
  splitSegment: (id: string, segId: string, variant: string) => request<Project>(`/projects/${id}/segments/${segId}/split`, json('POST', { variant })),
  mergeSegments: (id: string, body: { variant: string; a: string; b: string }) => request<Project>(`/projects/${id}/segments/merge`, json('POST', body)),
  confirm: (id: string) => request<Project>(`/projects/${id}/confirm`, { method: 'POST' }),

  // Màn 5–7
  newMusic: (id: string, key: string, body: { mood?: string; bpm?: number; instruments?: string }) =>
    request<Project>(`/projects/${id}/variants/${key}/music`, json('POST', body)),
  patchProject: (id: string, body: ProjectPatch) => request<Project>(`/projects/${id}`, json('PATCH', body)),
  rewriteVoiceOver: (id: string) => request<Project>(`/projects/${id}/voiceover/rewrite`, { method: 'POST' }),
  render: (id: string) => request<Project>(`/projects/${id}/render`, { method: 'POST' }),
  downloadUrl: (v: number, variant: string) => `${API_BASE}/versions/${v}/download?variant=${variant}`,
  zipUrl: (v: number) => `${API_BASE}/versions/${v}/zip`,

  // Màn 8
  listPlatforms: () => request<PlatformState[]>('/platforms'),
  connect: (p: Platform) => request<PlatformState[]>(`/platforms/${p}/connect`, { method: 'POST' }),
  suggestPost: (id: string) => request<Project>(`/projects/${id}/posts/suggest`, { method: 'POST' }),
  publish: (id: string, body: { platforms: Platform[]; title: string; desc: string; tags: string[]; scheduleAt?: string }) =>
    request<Project>(`/projects/${id}/posts`, json('POST', body)),
};
