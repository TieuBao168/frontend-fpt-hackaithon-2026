import type {
  Adjustment,
  FilmGenre,
  GenerationConfig,
  Platform,
  PostDraft,
  Project,
  ProjectSummary,
  StepName,
  Vod,
} from '../types/domain';

export const API_BASE = '/api';

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readError(res: Response): Promise<ApiError> {
  let message = `Lỗi ${res.status}`;
  try {
    const body = (await res.json()) as { message?: string };
    if (body.message) message = body.message;
  } catch {
    /* body không phải JSON */
  }
  return new ApiError(res.status, message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw await readError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
const put = <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) });

export interface CreateProjectInput {
  vodId: string;
  mode: 'auto' | 'review';
  config: GenerationConfig;
}

export interface VodMeta {
  title: string;
  genre: FilmGenre;
}

/** Upload có tiến độ (XHR). Trả về VOD mới ở trạng thái "processing". */
function uploadVod(file: File, meta: VodMeta, onProgress: (pct: number) => void): Promise<Vod> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('file', file);
    form.append('title', meta.title);
    form.append('genre', meta.genre);
    xhr.open('POST', `${API_BASE}/vods/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText) as Vod);
      else {
        let msg = `Lỗi ${xhr.status}`;
        try {
          msg = (JSON.parse(xhr.responseText) as { message?: string }).message ?? msg;
        } catch {
          /* ignore */
        }
        reject(new ApiError(xhr.status, msg));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, 'Mất kết nối khi tải lên. Hãy thử lại.'));
    xhr.send(form);
  });
}

const v = (projectId: string, variantId: string) => `/projects/${projectId}/variants/${variantId}`;

export const api = {
  listVods: () => request<Vod[]>('/vods'),
  getVod: (id: string) => request<Vod>(`/vods/${id}`),
  addVodByLink: (url: string, meta: VodMeta) => post<Vod>('/vods', { url, ...meta }),
  uploadVod,

  parsePrompt: (prompt: string) => post<Partial<GenerationConfig>>('/prompt/parse', { prompt }),

  listProjects: () => request<ProjectSummary[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (input: CreateProjectInput) => post<Project>('/projects', input),
  cancelProject: (id: string) => post<Project>(`/projects/${id}/cancel`),
  retryStep: (id: string, step: StepName) => post<Project>(`/projects/${id}/steps/${step}/retry`),

  createRevision: (projectId: string, variantId: string, adjustment: Adjustment) =>
    post<Project>(`${v(projectId, variantId)}/revisions`, adjustment),
  restoreRevision: (projectId: string, variantId: string, revisionId: string) =>
    post<Project>(`${v(projectId, variantId)}/revisions/${revisionId}/restore`),
  /** Chốt video → bắt đầu giai đoạn 2 (nhạc + phụ đề) */
  lockVideo: (projectId: string, variantId: string, revisionId: string) =>
    post<Project>(`${v(projectId, variantId)}/revisions/${revisionId}/lock`),
  /** Quay lại giai đoạn 1 */
  unlockVideo: (projectId: string, variantId: string) => post<Project>(`${v(projectId, variantId)}/unlock`),
  /** Chốt & xuất */
  exportRevision: (projectId: string, variantId: string, revisionId: string) =>
    post<Project>(`${v(projectId, variantId)}/revisions/${revisionId}/export`),
  setPrimaryVariant: (projectId: string, variantId: string) => post<Project>(`${v(projectId, variantId)}/primary`),

  suggestPosts: (projectId: string, platforms: Platform[]) =>
    post<Project>(`/projects/${projectId}/posts/suggest`, { platforms }),
  savePost: (projectId: string, draft: PostDraft) => put<Project>(`/projects/${projectId}/posts/${draft.platform}`, draft),
  publish: (projectId: string, platforms: Platform[]) => post<Project>(`/projects/${projectId}/publish`, { platforms }),

  projectEventsUrl: (id: string) => `${API_BASE}/projects/${id}/events`,
};
