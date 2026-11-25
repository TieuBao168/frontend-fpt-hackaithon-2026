// Bộ nhớ giả lập backend: các bước chạy theo thời gian thực, chia 3 giai đoạn.
import {
  STEP_PHASE,
  type Adjustment,
  type Check,
  type FilmGenre,
  type GenerationConfig,
  type Platform,
  type PostDraft,
  type Project,
  type ProjectSummary,
  type Revision,
  type Step,
  type StepName,
  type Style,
  type Variant,
  type VisualSettings,
  type Vod,
} from '../types/domain';
import { cropLabel, transitionLabel } from '../lib/labels';
import {
  defaultVisual,
  generateAudioLayer,
  generateCues,
  generateMusic,
  generatePost,
  generateSegments,
  newId,
  vods,
} from './fixtures';

const ALL_STEPS: StepName[] = ['analyze', 'suggest', 'cut', 'music', 'subtitle', 'mix', 'export'];
const VIDEO_STEPS: StepName[] = ['analyze', 'suggest', 'cut'];
const AUDIO_STEPS: StepName[] = ['music', 'subtitle', 'mix'];
const STEP_MS: Record<StepName, number> = {
  analyze: 6000,
  suggest: 2500,
  cut: 3000,
  music: 3500,
  subtitle: 1500,
  mix: 1500,
  export: 1500,
};

interface Run {
  queue: StepName[];
  startedAt: number;
  failAt?: StepName;
  onFinish: () => void;
}

interface ProjectRecord {
  project: Project;
  run?: Run;
  /** Giữ lại để chạy tiếp sau khi lỗi */
  failed?: { queue: StepName[]; onFinish: () => void };
}

const records = new Map<string, ProjectRecord>();
/** VOD sẽ lỗi bước Tạo nhạc ở lần đầu – để demo "Chạy lại bước này" */
const failOnceVods = new Set(['vod-3']);

const DEFAULT_STYLE_BY_GENRE: Record<FilmGenre, Style> = {
  action: 'energetic',
  drama: 'dramatic',
  comedy: 'funny',
  romance: 'cinematic',
  horror: 'cinematic',
  other: 'cinematic',
};
const STYLES: Style[] = ['cinematic', 'dramatic', 'energetic', 'funny'];

export const findVod = (id: string) => vods.find((v) => v.id === id);

const clone = <T>(x: T): T => structuredClone(x);

function computeChecks(config: GenerationConfig, segments: Revision['segments']): Check[] {
  const actual = segments.reduce((s, x) => s + x.endMs - x.startMs, 0) / 1000;
  const diff = Math.abs(actual - config.durationSec) / config.durationSec;
  return [
    { name: 'Thời lượng trong ±10% mục tiêu', passed: diff <= 0.1, detail: `${actual.toFixed(1)}s / mục tiêu ${config.durationSec}s` },
    { name: 'Hook mạnh trong 3 giây đầu', passed: (segments[0]?.score ?? 0) >= 0.85 },
    { name: 'Không cắt giữa câu thoại', passed: true },
    {
      name: 'Không dùng cảnh thuộc 15% cuối phim',
      passed: config.spoilerGuard,
      detail: config.spoilerGuard ? undefined : 'Đã tắt chế độ tránh spoil',
    },
    { name: 'Có mở · thân · kết', passed: true },
  ];
}

function videoRevision(vod: Vod, config: GenerationConfig, style: Style, no: number, variation: number): Revision {
  const segments = generateSegments(vod, config, variation);
  return {
    id: newId('rev'),
    no,
    createdAt: new Date().toISOString(),
    phase: 'video',
    segments,
    checks: computeChecks(config, segments),
    visual: defaultVisual(config, style),
    exported: false,
  };
}

function nextRevision(variant: Variant, base: Revision, patch: Partial<Revision>): Revision {
  return {
    ...clone(base),
    id: newId('rev'),
    no: variant.revisions.length + 1,
    createdAt: new Date().toISOString(),
    exported: false,
    restoredFrom: undefined,
    adjustment: undefined,
    changeSummary: undefined,
    ...patch,
  };
}

function pushRevision(variant: Variant, rev: Revision) {
  variant.revisions.push(rev);
  variant.activeRevisionId = rev.id;
}

const activeRev = (v: Variant) => v.revisions.find((r) => r.id === v.activeRevisionId)!;

function advance(rec: ProjectRecord) {
  const run = rec.run;
  if (!run) return;
  const p = rec.project;
  const vod = findVod(p.vodId);
  let t = Date.now() - run.startedAt;

  for (let i = 0; i < run.queue.length; i++) {
    const name = run.queue[i];
    const step = p.steps.find((s) => s.name === name)!;
    const dur = name === 'analyze' && vod?.analyzed ? 500 : STEP_MS[name];
    step.startedAt ??= new Date(Date.now() - t).toISOString();

    if (run.failAt === name && t >= dur * 0.6) {
      step.status = 'error';
      step.progress = 60;
      step.error = 'Dịch vụ sinh nhạc không phản hồi sau 2 lần thử. Kết quả các bước trước vẫn được giữ.';
      p.status = 'error';
      rec.failed = { queue: run.queue.slice(i), onFinish: run.onFinish };
      rec.run = undefined;
      return;
    }
    if (t >= dur) {
      if (step.status !== 'done') {
        step.status = 'done';
        step.progress = 100;
        step.endedAt = new Date().toISOString();
        p.metrics.totalSec += dur / 1000;
        p.metrics.costUsd = Math.round((p.metrics.costUsd + (dur / 1000 / 60) * 0.12) * 1000) / 1000;
      }
      t -= dur;
      continue;
    }
    step.status = 'running';
    step.progress = Math.round((t / dur) * 100);
    p.phase = STEP_PHASE[name];
    p.status = name === 'analyze' ? 'analyzing' : name === 'export' ? 'exporting' : 'rendering';
    return;
  }

  rec.run = undefined;
  run.onFinish();
  if (vod) vod.analyzed = true;
}

function startRun(rec: ProjectRecord, queue: StepName[], onFinish: () => void) {
  for (const name of queue) {
    const s = rec.project.steps.find((x) => x.name === name)!;
    Object.assign(s, { status: 'pending', progress: 0, error: undefined, startedAt: undefined, endedAt: undefined });
  }
  let failAt: StepName | undefined;
  if (queue.includes('music') && failOnceVods.has(rec.project.vodId)) {
    failAt = 'music';
    failOnceVods.delete(rec.project.vodId);
  }
  rec.failed = undefined;
  rec.run = { queue, startedAt: Date.now(), onFinish, failAt };
  advance(rec);
}

function resetSteps(rec: ProjectRecord, names: StepName[]) {
  for (const n of names) {
    Object.assign(rec.project.steps.find((s) => s.name === n)!, {
      status: 'pending',
      progress: 0,
      error: undefined,
      startedAt: undefined,
      endedAt: undefined,
    });
  }
}

function visualSummary(a: VisualSettings, b: VisualSettings): string {
  const parts: string[] = [];
  if (a.crop !== b.crop) parts.push(`crop ${cropLabel[a.crop]} → ${cropLabel[b.crop]}`);
  if (a.logo.enabled !== b.logo.enabled) parts.push(b.logo.enabled ? 'bật logo' : 'tắt logo');
  else if (a.logo.corner !== b.logo.corner || a.logo.size !== b.logo.size) parts.push('đổi vị trí/cỡ logo');
  if (a.endCard.enabled !== b.endCard.enabled || a.endCard.sec !== b.endCard.sec)
    parts.push(b.endCard.enabled ? `end card ${b.endCard.sec}s` : 'tắt end card');
  if (a.transition !== b.transition) parts.push(`chuyển cảnh ${transitionLabel[b.transition].toLowerCase()}`);
  return parts.join(', ');
}

function segmentSummary(prev: Revision, next: Revision): string {
  const a = new Set(prev.segments.map((s) => s.startMs));
  const b = new Set(next.segments.map((s) => s.startMs));
  const added = [...b].filter((x) => !a.has(x)).length;
  const removed = [...a].filter((x) => !b.has(x)).length;
  return added || removed ? `+${added} đoạn, −${removed} đoạn` : 'giữ nguyên đoạn';
}

/** Gói hoàn tất giai đoạn 2 cho một biến thể */
function makeAudioRevision(p: Project, variant: Variant, base: Revision, variation: number): Revision {
  return nextRevision(variant, base, {
    phase: 'audio',
    audio: generateAudioLayer({ ...p.config, style: variant.style }, base.segments, variation),
    changeSummary: 'AI thêm nhạc và phụ đề cho video đã chốt',
  });
}

export const db = {
  // ---------------- VOD ----------------
  listVods(): Vod[] {
    for (const v of vods) {
      if (v.status === 'processing' && Date.now() - new Date(v.createdAt).getTime() > 4000) v.status = 'ready';
    }
    return clone(vods).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  addVod(meta: { title: string; genre: FilmGenre }): Vod {
    const vod: Vod = {
      id: newId('vod'),
      title: meta.title,
      genre: meta.genre,
      durationSec: 5400 + Math.round(Math.random() * 1800),
      resolution: '1920×1080',
      status: 'processing',
      analyzed: false,
      createdAt: new Date().toISOString(),
    };
    vods.push(vod);
    return clone(vod);
  },

  // ---------------- Dự án ----------------
  listProjects(): ProjectSummary[] {
    return [...records.values()]
      .map((r) => {
        advance(r);
        const p = r.project;
        return {
          id: p.id,
          vodId: p.vodId,
          vodTitle: p.vodTitle,
          createdAt: p.createdAt,
          status: p.status,
          mode: p.mode,
          phase: p.phase,
          outputType: p.config.outputType,
          ratio: p.config.ratio,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getProject(id: string): Project | undefined {
    const rec = records.get(id);
    if (!rec) return undefined;
    advance(rec);
    return clone(rec.project);
  },

  createProject(
    input: { vodId: string; mode: 'auto' | 'review'; config: GenerationConfig },
    opts: { instant?: boolean; id?: string; until?: 'video' | 'audio' } = {},
  ): Project {
    const vod = findVod(input.vodId);
    if (!vod) throw new Error('Không tìm thấy VOD');
    const firstStyle = input.config.style ?? DEFAULT_STYLE_BY_GENRE[vod.genre];
    const variants: Variant[] = Array.from({ length: input.config.variantCount }, (_, i) => ({
      id: newId('var'),
      style: i === 0 ? firstStyle : STYLES.filter((s) => s !== firstStyle)[i - 1],
      ratio: input.config.ratio,
      revisions: [],
      activeRevisionId: '',
      isPrimary: i === 0,
    }));
    const project: Project = {
      id: opts.id ?? newId('prj'),
      vodId: vod.id,
      vodTitle: vod.title,
      createdAt: new Date().toISOString(),
      status: 'analyzing',
      phase: 'video',
      mode: input.mode,
      config: { ...input.config, style: firstStyle },
      steps: ALL_STEPS.map((name) => ({ name, status: 'pending', progress: 0, retryable: true }) satisfies Step),
      variants,
      metrics: { totalSec: 0, costUsd: 0 },
    };
    const rec: ProjectRecord = { project };
    records.set(project.id, rec);

    const finishVideo = () => {
      project.variants.forEach((v, i) => pushRevision(v, videoRevision(vod, project.config, v.style, 1, i)));
      project.phase = 'video';
      project.status = 'review_video';
    };
    const finishAudio = (variant: Variant) => {
      variant.lockedRevisionId = variant.activeRevisionId;
      pushRevision(variant, makeAudioRevision(project, variant, activeRev(variant), 0));
      project.phase = 'audio';
      project.status = 'review_audio';
    };

    if (opts.instant) {
      const done = opts.until === 'audio' ? ALL_STEPS.slice(0, 6) : VIDEO_STEPS;
      project.steps.filter((s) => done.includes(s.name)).forEach((s) => Object.assign(s, { status: 'done', progress: 100 }));
      project.metrics = { totalSec: opts.until === 'audio' ? 486 : 312, costUsd: opts.until === 'audio' ? 1.12 : 0.64 };
      finishVideo();
      if (opts.until === 'audio') finishAudio(project.variants[0]);
    } else if (input.mode === 'review') {
      startRun(rec, VIDEO_STEPS, finishVideo);
    } else {
      startRun(rec, ALL_STEPS, () => {
        finishVideo();
        const primary = project.variants[0];
        finishAudio(primary);
        activeRev(primary).exported = true;
        project.phase = 'export';
        project.status = 'ready';
      });
    }
    return clone(project);
  },

  cancel(id: string): Project | undefined {
    const rec = records.get(id);
    if (!rec) return undefined;
    advance(rec);
    rec.run = undefined;
    rec.project.steps.filter((s) => s.status === 'running').forEach((s) => (s.status = 'pending'));
    rec.project.status = 'cancelled';
    return clone(rec.project);
  },

  retry(id: string): Project | undefined {
    const rec = records.get(id);
    if (!rec?.failed) return rec ? clone(rec.project) : undefined;
    startRun(rec, rec.failed.queue, rec.failed.onFinish);
    return clone(rec.project);
  },

  createRevision(id: string, variantId: string, adj: Adjustment): Project | undefined {
    const rec = records.get(id);
    const vod = rec && findVod(rec.project.vodId);
    const variant = rec?.project.variants.find((v) => v.id === variantId);
    if (!rec || !vod || !variant) return undefined;
    const p = rec.project;
    const prev = activeRev(variant);
    const fromPrompt = adj.prompt ? parsePrompt(adj.prompt) : {};
    const config: GenerationConfig = {
      ...p.config,
      ...fromPrompt,
      ...adj.configDiff,
      music: { ...p.config.music, ...fromPrompt.music, ...adj.configDiff.music },
    };
    const variation = variant.revisions.length;
    const review = prev.phase === 'video' ? 'review_video' : 'review_audio';
    const finish = (rev: Revision) => () => {
      rev.adjustment = adj;
      pushRevision(variant, rev);
      p.config = config;
      p.status = review;
    };

    switch (adj.scope) {
      case 'content': {
        const style = config.style ?? variant.style;
        startRun(rec, ['suggest', 'cut'], () => {
          const fresh = videoRevision(vod, config, style, 0, variation);
          const rev = nextRevision(variant, prev, {
            phase: 'video',
            segments: fresh.segments,
            checks: fresh.checks,
            changeSummary: segmentSummary(prev, fresh),
          });
          variant.style = style;
          finish(rev)();
        });
        break;
      }
      case 'visual': {
        const visual = adj.presentation?.visual ?? prev.visual;
        const queue: StepName[] = prev.phase === 'audio' ? ['cut', 'mix'] : ['cut'];
        startRun(rec, queue, finish(nextRevision(variant, prev, { visual, changeSummary: visualSummary(prev.visual, visual) || 'Áp dụng tùy chỉnh hình ảnh' })));
        break;
      }
      case 'music': {
        startRun(rec, ['music', 'mix'], () => {
          const tracks = generateMusic(config, variation);
          const rev = nextRevision(variant, prev, {
            audio: { ...prev.audio!, musicTracks: tracks, selectedTrackId: tracks[0].id },
            changeSummary: `nhạc mới · tempo ${String(tracks[0].params.tempo)} BPM`,
          });
          finish(rev)();
        });
        break;
      }
      case 'subtitle': {
        startRun(rec, ['subtitle', 'mix'], () => {
          const cues = generateCues(prev.segments, variation);
          const rev = nextRevision(variant, prev, {
            audio: { ...prev.audio!, subtitleCues: cues, speechRanges: cues.map(({ startMs, endMs }) => ({ startMs, endMs })) },
            changeSummary: `phụ đề mới · ${cues.length} câu`,
          });
          finish(rev)();
        });
        break;
      }
      case 'audio_style': {
        const pr = adj.presentation;
        const visual = pr?.visual ?? prev.visual;
        const visualChanged = JSON.stringify(visual) !== JSON.stringify(prev.visual);
        const audio = {
          ...prev.audio!,
          mix: pr?.mix ?? prev.audio!.mix,
          subtitle: pr?.subtitle ?? prev.audio!.subtitle,
          selectedTrackId: pr?.selectedTrackId ?? prev.audio!.selectedTrackId,
        };
        const parts: string[] = [];
        if (audio.selectedTrackId !== prev.audio!.selectedTrackId) parts.push('đổi bản nhạc');
        if (JSON.stringify(audio.mix) !== JSON.stringify(prev.audio!.mix)) parts.push('chỉnh mix âm thanh');
        if (JSON.stringify(audio.subtitle) !== JSON.stringify(prev.audio!.subtitle)) parts.push('đổi kiểu phụ đề');
        const vs = visualSummary(prev.visual, visual);
        if (vs) parts.push(vs);
        startRun(
          rec,
          visualChanged ? ['cut', 'mix'] : ['mix'],
          finish(nextRevision(variant, prev, { visual, audio, changeSummary: parts.join(', ') || 'Áp dụng tùy chỉnh' })),
        );
        break;
      }
    }
    return clone(p);
  },

  lock(id: string, variantId: string, revisionId: string): Project | undefined {
    const rec = records.get(id);
    const p = rec?.project;
    const variant = p?.variants.find((v) => v.id === variantId);
    const rev = variant?.revisions.find((r) => r.id === revisionId);
    if (!rec || !p || !variant || !rev) return undefined;
    p.variants.forEach((v) => (v.isPrimary = v.id === variantId));
    variant.lockedRevisionId = rev.id;
    variant.activeRevisionId = rev.id;
    resetSteps(rec, [...AUDIO_STEPS, 'export']);
    startRun(rec, AUDIO_STEPS, () => {
      pushRevision(variant, makeAudioRevision(p, variant, rev, variant.revisions.length));
      p.phase = 'audio';
      p.status = 'review_audio';
    });
    return clone(p);
  },

  unlock(id: string, variantId: string): Project | undefined {
    const rec = records.get(id);
    const p = rec?.project;
    const variant = p?.variants.find((v) => v.id === variantId);
    if (!rec || !p || !variant) return undefined;
    const lockedId = variant.lockedRevisionId ?? [...variant.revisions].reverse().find((r) => r.phase === 'video')?.id;
    variant.lockedRevisionId = undefined;
    if (lockedId) variant.activeRevisionId = lockedId;
    resetSteps(rec, [...AUDIO_STEPS, 'export']);
    p.phase = 'video';
    p.status = 'review_video';
    return clone(p);
  },

  exportRevision(id: string, variantId: string, revisionId: string): Project | undefined {
    const rec = records.get(id);
    const p = rec?.project;
    const rev = p?.variants.find((v) => v.id === variantId)?.revisions.find((r) => r.id === revisionId);
    if (!rec || !p || !rev) return undefined;
    resetSteps(rec, ['export']);
    startRun(rec, ['export'], () => {
      rev.exported = true;
      p.phase = 'export';
      p.status = 'ready';
    });
    return clone(p);
  },

  restore(id: string, variantId: string, revisionId: string): Project | undefined {
    const p = records.get(id)?.project;
    const variant = p?.variants.find((v) => v.id === variantId);
    const old = variant?.revisions.find((r) => r.id === revisionId);
    if (!p || !variant || !old) return undefined;
    const copy = nextRevision(variant, old, { restoredFrom: old.id, changeSummary: `Khôi phục từ v${old.no}` });
    pushRevision(variant, copy);
    if (old.phase === 'video') {
      variant.lockedRevisionId = undefined;
      p.phase = 'video';
      p.status = 'review_video';
    } else {
      p.phase = 'audio';
      p.status = 'review_audio';
    }
    return clone(p);
  },

  setPrimary(id: string, variantId: string): Project | undefined {
    const p = records.get(id)?.project;
    if (!p) return undefined;
    p.variants.forEach((v) => (v.isPrimary = v.id === variantId));
    return clone(p);
  },

  // ---------------- Bài đăng ----------------
  suggestPosts(id: string, platforms: Platform[]): Project | undefined {
    const p = records.get(id)?.project;
    const vod = p && findVod(p.vodId);
    if (!p || !vod) return undefined;
    const existing = new Map((p.posts ?? []).map((x) => [x.platform, x]));
    for (const pl of platforms) existing.set(pl, generatePost(vod, pl));
    p.posts = [...existing.values()];
    return clone(p);
  },

  savePost(id: string, draft: PostDraft): Project | undefined {
    const p = records.get(id)?.project;
    if (!p) return undefined;
    p.posts = (p.posts ?? []).map((x) => (x.platform === draft.platform ? draft : x));
    return clone(p);
  },

  publish(id: string, platforms: Platform[]): Project | undefined {
    const p = records.get(id)?.project;
    if (!p) return undefined;
    for (const post of p.posts ?? []) {
      if (!platforms.includes(post.platform)) continue;
      post.status = 'published';
      post.url = `https://sandbox.example/${post.platform}/${newId('post')}`;
    }
    p.status = 'published';
    return clone(p);
  },
};

/** Mock cho AI Ngôn ngữ tách prompt thành tham số (UC-B.3) */
export function parsePrompt(prompt: string): Partial<GenerationConfig> {
  const text = prompt.toLowerCase();
  const out: Partial<GenerationConfig> = {};
  const sec = text.match(/(\d+)\s*(giây|s\b)/);
  const min = text.match(/(\d+)\s*phút/);
  if (sec) out.durationSec = Number(sec[1]);
  else if (min) out.durationSec = Number(min[1]) * 60;
  if (out.durationSec) {
    out.outputType = out.durationSec <= 90 ? 'short' : 'long';
    if (out.outputType === 'short') out.ratio = '9:16';
  }
  if (/nhanh|dồn dập|gấp/.test(text)) out.pacing = 'fast';
  else if (/chậm|từ tốn/.test(text)) out.pacing = 'slow';
  if (/hài|vui/.test(text)) out.style = 'funny';
  else if (/kịch tính|dramatic/.test(text)) out.style = 'dramatic';
  else if (/sôi động|năng lượng|energetic/.test(text)) out.style = 'energetic';
  else if (/điện ảnh|cinematic/.test(text)) out.style = 'cinematic';
  if (/không spoil|tránh spoil|không lộ/.test(text)) out.spoilerGuard = true;
  const mood = text.match(/nhạc\s+([\p{L}\s]+?)(?:[,.]|$)/u);
  if (mood) out.music = { mood: mood[1].trim() };
  if (/trailer/.test(text)) out.goal = 'trailer';
  else if (/teaser/.test(text)) out.goal = 'teaser';
  return out;
}

// Dự án mẫu – phương án dự phòng khi demo (BR-34).
// Mock lưu trong bộ nhớ: tải lại trang sẽ mất dự án tạo thêm, riêng dự án mẫu giữ id cố định.
const demoConfig: GenerationConfig = {
  goal: 'trailer',
  outputType: 'short',
  durationSec: 60,
  ratio: '9:16',
  pacing: 'medium',
  spoilerGuard: true,
  avoidSensitive: true,
  music: { mood: 'lãng mạn, da diết', volumeRatio: 0.35 },
  extras: { subtitle: true, voiceover: false, caption: false, smartCrop: true },
  variantCount: 2,
};
db.createProject({ vodId: 'vod-1', mode: 'review', config: demoConfig }, { instant: true, id: 'prj-demo' });
db.createProject(
  {
    vodId: 'vod-2',
    mode: 'review',
    config: { ...demoConfig, durationSec: 45, pacing: 'fast', music: { mood: 'dồn dập', volumeRatio: 0.4 }, variantCount: 1 },
  },
  { instant: true, id: 'prj-demo-audio', until: 'audio' },
);
