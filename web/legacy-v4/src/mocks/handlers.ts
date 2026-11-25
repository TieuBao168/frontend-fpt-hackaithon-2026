import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw';
import { sse } from 'msw/sse';
import { db, findVod, parsePrompt } from './db';
import {
  TERMINAL_STATUSES,
  type Adjustment,
  type FilmGenre,
  type GenerationConfig,
  type Platform,
  type PostDraft,
} from '../types/domain';

const notFound = (what = 'dự án') => HttpResponse.json({ message: `Không tìm thấy ${what}` }, { status: 404 });
const reply = (p: unknown) => (p ? HttpResponse.json(p) : notFound());

type P = { id: string; variantId: string; revisionId: string; step: string };
const VAR = '/api/projects/:id/variants/:variantId';

export const handlers = [
  // ---------- VOD ----------
  http.get('/api/vods', async () => {
    await delay(150);
    return HttpResponse.json(db.listVods());
  }),

  http.get<Pick<P, 'id'>>('/api/vods/:id', ({ params }) => {
    const vod = findVod(params.id);
    return vod ? HttpResponse.json(vod) : notFound('VOD');
  }),

  http.post('/api/vods', async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as { url: string; title: string; genre: FilmGenre };
    if (!/^https?:\/\/\S+$/i.test(body.url ?? '')) {
      return HttpResponse.json({ message: 'Link không hợp lệ. Dán link http(s) do BTC cung cấp.' }, { status: 422 });
    }
    return HttpResponse.json(db.addVod(body), { status: 201 });
  }),

  http.post('/api/vods/upload', async ({ request }) => {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.type.startsWith('video/')) {
      return HttpResponse.json({ message: 'File không phải video. Hỗ trợ MP4, MOV, MKV.' }, { status: 422 });
    }
    await delay(800);
    return HttpResponse.json(
      db.addVod({ title: String(form.get('title') || file.name), genre: (form.get('genre') as FilmGenre) ?? 'other' }),
      { status: 201 },
    );
  }),

  // ---------- Prompt ----------
  http.post('/api/prompt/parse', async ({ request }) => {
    await delay(600);
    const { prompt } = (await request.json()) as { prompt: string };
    const parsed = parsePrompt(prompt);
    if (Object.keys(parsed).length === 0) {
      return HttpResponse.json(
        { message: 'Chưa hiểu được yêu cầu, hãy mô tả cụ thể hơn (thời lượng, nhịp, nhạc…).' },
        { status: 422 },
      );
    }
    return HttpResponse.json(parsed);
  }),

  // ---------- Dự án ----------
  http.get('/api/projects', () => HttpResponse.json(db.listProjects())),
  http.get<Pick<P, 'id'>>('/api/projects/:id', ({ params }) => reply(db.getProject(params.id))),

  http.post('/api/projects', async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as { vodId: string; mode: 'auto' | 'review'; config: GenerationConfig };
    return HttpResponse.json(db.createProject(body), { status: 201 });
  }),

  http.post<Pick<P, 'id'>>('/api/projects/:id/cancel', ({ params }) => reply(db.cancel(params.id))),
  http.post<Pick<P, 'id' | 'step'>>('/api/projects/:id/steps/:step/retry', ({ params }) => reply(db.retry(params.id))),

  // ---------- Phiên bản ----------
  http.post<Pick<P, 'id' | 'variantId'>>(`${VAR}/revisions`, async ({ params, request }) => {
    const adj = (await request.json()) as Adjustment;
    return reply(db.createRevision(params.id, params.variantId, adj));
  }),
  http.post<P>(`${VAR}/revisions/:revisionId/restore`, ({ params }) =>
    reply(db.restore(params.id, params.variantId, params.revisionId)),
  ),
  http.post<P>(`${VAR}/revisions/:revisionId/lock`, ({ params }) => reply(db.lock(params.id, params.variantId, params.revisionId))),
  http.post<P>(`${VAR}/revisions/:revisionId/export`, ({ params }) =>
    reply(db.exportRevision(params.id, params.variantId, params.revisionId)),
  ),
  http.post<Pick<P, 'id' | 'variantId'>>(`${VAR}/unlock`, ({ params }) => reply(db.unlock(params.id, params.variantId))),
  http.post<Pick<P, 'id' | 'variantId'>>(`${VAR}/primary`, ({ params }) => reply(db.setPrimary(params.id, params.variantId))),

  // ---------- Bài đăng ----------
  http.post<Pick<P, 'id'>>('/api/projects/:id/posts/suggest', async ({ params, request }) => {
    await delay(900);
    const { platforms } = (await request.json()) as { platforms: Platform[] };
    return reply(db.suggestPosts(params.id, platforms));
  }),
  http.put<{ id: string; platform: string }>('/api/projects/:id/posts/:platform', async ({ params, request }) => {
    const draft = (await request.json()) as PostDraft;
    return reply(db.savePost(params.id, draft));
  }),
  http.post<Pick<P, 'id'>>('/api/projects/:id/publish', async ({ params, request }) => {
    await delay(1200);
    const { platforms } = (await request.json()) as { platforms: Platform[] };
    return reply(db.publish(params.id, platforms));
  }),

  // ---------- Realtime ----------
  sse<{ id: string }>('/api/projects/:id/events', ({ client, params }) => {
    const timer = setInterval(() => {
      const p = db.getProject(String(params.id));
      if (!p) return;
      client.send({ data: JSON.stringify(p) });
      if (TERMINAL_STATUSES.includes(p.status)) {
        clearInterval(timer);
        client.close();
      }
    }, 500);
  }),
];
