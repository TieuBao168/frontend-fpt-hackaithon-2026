// Tải VOD lên theo từng phần, ngắt thì tải tiếp từ vị trí server đã nhận (UC-A.1 1a).
// Giao thức kiểu tus: POST khởi tạo → PATCH từng phần kèm Upload-Offset → GET để hỏi vị trí hiện tại.
import { api, ApiError } from './api';
import type { Genre } from '../types/domain';

const CHUNK = 8 * 1024 * 1024;

export interface UploadHandle {
  uploadId: string;
  vodId: string;
  file: File;
}

export async function startUpload(file: File, meta: { title: string; genre: Genre }): Promise<UploadHandle> {
  const r = await api.initUpload({ fileName: file.name, size: file.size, ...meta });
  return { uploadId: r.uploadId, vodId: r.vodId, file };
}

/** Gửi phần còn lại; dừng bằng AbortSignal. Gọi lại hàm này để tải tiếp. */
export async function continueUpload(h: UploadHandle, onProgress: (pct: number) => void, signal?: AbortSignal) {
  let { offset } = await api.getUpload(h.uploadId);
  const size = h.file.size;
  onProgress(Math.round((offset / size) * 100));
  while (offset < size) {
    if (signal?.aborted) throw new ApiError(0, 'Đã tạm dừng tải lên.');
    const chunk = h.file.slice(offset, Math.min(size, offset + CHUNK));
    try {
      ({ offset } = await api.uploadChunk(h.uploadId, offset, chunk, signal));
    } catch (e) {
      // server báo lệch vị trí → lấy vị trí đúng và tiếp tục
      if (e instanceof ApiError && e.status === 409 && typeof e.data.offset === 'number') {
        offset = e.data.offset;
        continue;
      }
      throw e;
    }
    onProgress(Math.round((offset / size) * 100));
  }
}
