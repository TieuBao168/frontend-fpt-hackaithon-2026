import { http, HttpResponse, type HttpResponseResolver } from 'msw/http';
import { delay } from 'msw';
import { db, HttpError } from './db';
import type { Config, Genre, Platform } from '../types/domain';

const B = '/api/v1';

/** Bọc resolver: chuyển HttpError thành JSON { message } với đúng status */
const safe =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fn: (info: any) => unknown | Promise<unknown>, wait = 120): HttpResponseResolver =>
    async (info) => {
      await delay(wait);
      try {
        const out = await fn(info);
        return out === undefined ? new HttpResponse(null, { status: 204 }) : HttpResponse.json(out as never);
      } catch (e) {
        if (e instanceof HttpError) return HttpResponse.json({ message: e.message, ...e.extra }, { status: e.status });
        throw e;
      }
    };

export const handlers = [
  // ---------- Màn 1: VOD
  http.get(`${B}/vods`, safe(({ request }) => {
    const u = new URL(request.url);
    return db.listVods(u.searchParams.get('q') ?? '', u.searchParams.get('genre') ?? '');
  })),
  http.get(`${B}/vods/:id`, safe(({ params }) => db.getVod(params.id))),
  http.post(`${B}/vods`, safe(async ({ request }) => {
    const f = await request.formData();
    const file = f.get('file');
    if (!(file instanceof File)) throw new HttpError(422, 'Chưa chọn file.');
    return db.createVod({ fileName: file.name, size: file.size, title: String(f.get('title') ?? ''), genre: String(f.get('genre') ?? '') as Genre });
  }, 400)),

  // ---------- Màn 2: Template
  http.get(`${B}/templates`, safe(({ request }) => db.listTemplates(new URL(request.url).searchParams.get('type') ?? undefined))),
  http.post(`${B}/templates`, safe(async ({ request }) => {
    const f = await request.formData();
    const file = f.get('file');
    if (!(file instanceof File)) throw new HttpError(422, 'Chưa chọn file.');
    return db.addTemplate({
      name: String(f.get('name') ?? ''),
      type: f.get('type') as 'intro' | 'outro',
      ratios: JSON.parse(String(f.get('ratios') ?? '[]')),
      durationSec: Number(f.get('durationSec')),
      format: String(f.get('format') ?? ''),
      size: file.size,
      width: Number(f.get('width')),
      height: Number(f.get('height')),
    });
  }, 500)),
  http.patch(`${B}/templates/:id`, safe(async ({ params, request }) => db.patchTemplate(params.id, await request.json()))),
  http.delete(`${B}/templates/:id`, safe(({ params }) => db.deleteTemplate(params.id))),

  // ---------- Màn 3: dự án + job giai đoạn 1
  http.post(`${B}/projects`, safe(async ({ request }) => db.createProject(await request.json()), 300)),
  http.get(`${B}/projects/:id`, safe(({ params }) => db.getProject(params.id), 60)),
  http.post(`${B}/projects/:id/select`, safe(async ({ params, request }) => db.reselect(params.id, (await request.json()) as Config), 300)),
  http.get(`${B}/jobs/:id`, safe(({ params }) => db.getJob(params.id), 60)),
  http.patch(`${B}/jobs/:id`, safe(async ({ params, request }) => db.setBackground(params.id, ((await request.json()) as { background: boolean }).background))),
  http.post(`${B}/jobs/:id/cancel`, safe(({ params }) => db.cancelJob(params.id))),
  http.post(`${B}/jobs/:id/stages/:key/retry`, safe(({ params }) => db.retryStage(params.id, params.key))),

  // ---------- Màn 4: duyệt & chỉnh đoạn
  http.put(`${B}/projects/:id/variants/:key`, safe(async ({ params, request }) => db.putVariant(params.id, params.key, await request.json()))),
  http.post(`${B}/projects/:id/variants/:key/resuggest`, safe(({ params }) => db.resuggest(params.id, params.key), 600)),
  http.post(`${B}/projects/:id/segments`, safe(async ({ params, request }) => db.addSegment(params.id, await request.json()))),
  http.patch(`${B}/projects/:id/segments/:sid`, safe(async ({ params, request }) =>
    db.trimSegment(params.id, params.sid, ((await request.json()) as { delta: number }).delta),
  )),
  http.post(`${B}/projects/:id/segments/:sid/split`, safe(async ({ params, request }) =>
    db.splitSegment(params.id, params.sid, ((await request.json()) as { variant: string }).variant),
  )),
  http.post(`${B}/projects/:id/segments/merge`, safe(async ({ params, request }) => db.mergeSegments(params.id, await request.json()))),
  http.post(`${B}/projects/:id/confirm`, safe(({ params }) => db.confirm(params.id), 300)),

  // ---------- Màn 5–7
  http.post(`${B}/projects/:id/variants/:key/music`, safe(async ({ params, request }) => db.newMusic(params.id, params.key, await request.json()), 1500)),
  http.patch(`${B}/projects/:id`, safe(async ({ params, request }) => db.patchProject(params.id, await request.json()))),
  http.post(`${B}/projects/:id/voiceover/rewrite`, safe(({ params }) => db.rewriteVoiceOver(params.id), 1000)),
  http.post(`${B}/projects/:id/render`, safe(({ params }) => db.render(params.id), 300)),

  // ---------- Màn 8
  http.get(`${B}/platforms`, safe(() => db.listPlatforms())),
  http.post(`${B}/platforms/:p/connect`, safe(({ params }) => db.connect(params.p as Platform), 800)),
  http.post(`${B}/projects/:id/posts/suggest`, safe(({ params }) => db.suggestPost(params.id), 900)),
  http.post(`${B}/projects/:id/posts`, safe(async ({ params, request }) => db.publish(params.id, await request.json()), 1200)),
];
