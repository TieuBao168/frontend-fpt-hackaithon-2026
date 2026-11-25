// Backend giả lập theo API giả định của UI spec mục 8. Job chạy theo thời gian thực.
import type {
  Config,
  Job,
  Platform,
  Post,
  Project,
  Segment,
  Stage,
  StageKey,
  Style,
  Template,
  Variant,
  VariantKey,
  Version,
  Vod,
} from '../types/domain';
import { compactName, srtTime } from '../lib/format';
import { styleByGenre } from '../lib/labels';
import { AI_TRIM_LIMIT, budget, canMerge, canTrim, clipSegments, filmTargetSec, MIN_SEGMENT_SEC, RESOLUTION, resolveTemplate, TEMPLATE_RULES } from '../lib/rules';
import {
  generateAiSegments,
  makeCaptions,
  makeTrack,
  newId,
  platforms,
  postDesc,
  postTitles,
  templates,
  voiceOverText,
  vods,
} from './fixtures';

export class HttpError extends Error {
  status: number;
  extra?: Record<string, unknown>;
  constructor(status: number, message: string, extra?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
const fail = (message: string, status = 422, extra?: Record<string, unknown>): never => {
  throw new HttpError(status, message, extra);
};

const clone = <T>(x: T): T => structuredClone(x);
const now = () => new Date().toISOString();

// ---------------------------------------------------------------- job
const STAGE_MS: Record<StageKey, number> = {
  scene: 3500,
  audio: 3500,
  rank: 3000,
  music: 3500,
  subtitle: 2500,
  template: 1500,
  render: 3500,
};
const PHASE_STAGES: Record<1 | 2 | 3, StageKey[]> = {
  1: ['scene', 'audio', 'rank'],
  2: ['music', 'subtitle', 'template', 'render'],
  3: ['template', 'render'],
};

interface Run {
  startedAt: number;
  skip: Set<StageKey>;
  failAt?: StageKey;
  onFinish: () => void;
}
interface Rec {
  p: Project;
  run?: Run;
  /** Kết quả AI gốc của giai đoạn 1 – để "AI đề xuất lại" */
  aiOriginal: Record<string, { order: string[]; reserve: string[] }>;
}

const projects = new Map<string, Rec>();
const failOnce = new Set(['vod-3']); // VOD 3 lỗi bước tạo nhạc lần đầu

function stageDur(_rec: Rec, s: Stage) {
  return s.reusedFromCache ? 400 : STAGE_MS[s.key];
}

function advance(rec: Rec) {
  const job = rec.p.job;
  const run = rec.run;
  if (!job || !run || job.status !== 'running') return;
  let t = Date.now() - run.startedAt;
  let eta = 0;
  let consuming = true; // còn đang "tiêu" thời gian đã trôi qua cho các bước
  for (const s of job.stages) {
    if (run.skip.has(s.key)) continue; // đã xong trước lần chạy này
    const dur = stageDur(rec, s);
    if (!consuming) {
      Object.assign(s, { status: 'waiting', pct: 0 });
      eta += dur;
      continue;
    }
    if (run.failAt === s.key && t >= dur * 0.6) {
      s.status = 'error';
      s.pct = 60;
      s.error = 'Dịch vụ sinh nhạc không phản hồi sau 2 lần thử.';
      job.status = 'error';
      rec.run = undefined;
      return;
    }
    if (t >= dur) {
      s.status = 'done';
      s.pct = 100;
      t -= dur;
      continue;
    }
    s.status = 'running';
    s.pct = Math.round((t / dur) * 100);
    eta += dur - t;
    consuming = false;
  }
  job.etaSec = Math.round(eta / 1000);
  if (consuming) {
    job.status = 'done';
    job.etaSec = 0;
    rec.run = undefined;
    run.onFinish();
  }
}

function startJob(rec: Rec, phase: 1 | 2 | 3, onFinish: () => void, reuse = false) {
  const stages: Stage[] = PHASE_STAGES[phase].map((key) => ({
    key,
    status: 'waiting',
    pct: 0,
    reusedFromCache: reuse && (key === 'scene' || key === 'audio') ? true : undefined,
  }));
  let failAt: StageKey | undefined;
  if (phase === 2 && failOnce.has(rec.p.vodId)) {
    failAt = 'music';
    failOnce.delete(rec.p.vodId);
  }
  rec.p.job = { id: newId('job'), phase, status: 'running', stages, background: false };
  rec.run = { startedAt: Date.now(), skip: new Set(), failAt, onFinish };
  advance(rec);
}

// ---------------------------------------------------------------- dựng phiên bản
function makeVersion(p: Project, note: string): Version {
  const v = p.versions.length + 1;
  const intro = p.intro?.durationSec ?? 0;
  const files = p.variants.map((variant) => {
    const segs = clipSegments(p, variant);
    let t = intro;
    const items = segs.map((s, i) => {
      const item = {
        order: i + 1,
        source: s.source,
        title: s.title,
        clipStartSec: Math.round(t * 10) / 10,
        sourceStartSec: s.startSec,
        sourceEndSec: Math.round((s.startSec + s.durSec) * 10) / 10,
        durSec: s.durSec,
        trimSec: s.trimSec,
        score: s.score ?? null,
        reason: s.reason ?? null,
        parentId: s.parentId ?? null,
      };
      t += s.durSec;
      return item;
    });
    const music = variant.music?.find((m) => m.id === variant.selectedMusicId);
    const timestamps = {
      project: p.id,
      vod: p.vodTitle,
      variant: variant.key,
      style: variant.style,
      ratio: p.config.ratio,
      version: v,
      intro: p.intro ?? null,
      outro: p.outro ?? null,
      segments: items,
      music: music ? { tool: music.tool, model: music.model, seed: music.seed, prompt: music.prompt, bpm: music.bpm } : null,
    };
    // SRT theo dòng thời gian clip (đã cộng phần đầu clip)
    let offset = intro;
    const cues: string[] = [];
    segs.forEach((s) => {
      if (!p.subtitleEnabled) return;
      p.subtitles
        .filter((x) => x.segmentId === s.id && x.text.trim())
        .forEach((x) => cues.push(`${cues.length + 1}\n${srtTime(offset + x.startSec)} --> ${srtTime(offset + x.endSec)}\n${x.text}\n`));
      offset += s.durSec;
    });
    const tags = ['#FPTPlay', `#${compactName(p.vodTitle)}`, '#trailer', '#phimhay'];
    return {
      variant: variant.key,
      fileName: `${compactName(p.vodTitle)}_${variant.key}_${variant.style}_${p.config.ratio.replace(':', 'x')}_v${v}.mp4`,
      resolution: `${RESOLUTION[p.config.ratio].w}×${RESOLUTION[p.config.ratio].h}`,
      timestampsJson: JSON.stringify(timestamps, null, 2),
      srt: cues.join('\n'),
      voTxt: p.voiceOver.enabled ? p.voiceOver.text : '',
      captionTxt: [...p.captions.filter((c) => c.enabled).map((c) => c.text), '', tags.join(' ')].join('\n'),
    };
  });
  return { v, createdAt: now(), note, files };
}

/** Giai đoạn 2: nhạc AI theo nhịp, sub/lời dẫn/caption cho mọi phương án */
function produceAudioText(p: Project) {
  const intro = p.intro?.durationSec ?? 0;
  const outro = p.outro?.durationSec ?? 0;
  p.variants.forEach((variant, vi) => {
    const clipSec = intro + clipSegments(p, variant).reduce((a, s) => a + s.durSec, 0) + outro;
    const tracks = [makeTrack('Bản A', clipSec, { style: variant.style }, vi * 10 + 1), makeTrack('Bản B', clipSec, { style: variant.style, bpm: undefined }, vi * 10 + 5)];
    tracks[1].bpm += 8;
    tracks[1].prompt = tracks[1].prompt.replace(/\d+ BPM/, `${tracks[1].bpm} BPM`);
    variant.music = tracks;
    variant.selectedMusicId = tracks[0].id;
  });
  // Sub: giữ dòng BTV đã sửa, thêm dòng cho đoạn có thoại chưa có sub
  const used = new Set(p.variants.flatMap((v) => v.order));
  p.subtitles = p.subtitles.filter((s) => used.has(s.segmentId));
  for (const id of used) {
    const s = p.segments[id];
    if (s.quote && !p.subtitles.some((x) => x.segmentId === id)) {
      p.subtitles.push({ id: newId('sub'), segmentId: id, startSec: 0.3, endSec: Math.max(0.8, s.durSec - 0.3), text: s.quote });
    }
  }
  if (!p.voiceOver.text) p.voiceOver = { enabled: false, text: voiceOverText(p.vodTitle, p.vodGenre), voice: 'female_warm' };
  if (!p.captions.length) p.captions = makeCaptions(p.variants[0].style);
}

// ---------------------------------------------------------------- tiện ích
function rec(id: string): Rec {
  const r = projects.get(id);
  if (!r) fail('Không tìm thấy dự án', 404);
  advance(r!);
  return r!;
}
const variantOf = (p: Project, key: string) => p.variants.find((v) => v.key === key) ?? fail('Không tìm thấy phương án', 404);
const markDirty = (p: Project) => {
  if (p.phase2Done) p.dirty = true;
};

function resolve(config: Config) {
  return {
    intro: resolveTemplate(config.introTemplateId, 'intro', config.ratio, templates),
    outro: resolveTemplate(config.outroTemplateId, 'outro', config.ratio, templates),
  };
}

function runPhase1(r: Rec) {
  const p = r.p;
  const vod = vods.find((v) => v.id === p.vodId)!;
  startJob(
    r,
    1,
    () => {
      const keys: VariantKey[] = ['A', 'B', 'C'];
      const first: Style = p.config.style ?? p.suggestedStyle;
      const styles: Style[] = [first, ...(['Cinematic', 'Dramatic', 'Energetic', 'Funny'] as Style[]).filter((s) => s !== first)];
      const target = filmTargetSec(p.config, p.intro, p.outro);
      p.segments = {};
      p.dialogueRanges = [];
      r.aiOriginal = {};
      p.variants = keys.slice(0, p.config.variantCount).map((key, i) => {
        const { order, reserve } = generateAiSegments(p.vodDurationSec, target, p.config.ratio, i);
        [...order, ...reserve].forEach((s) => {
          p.segments[s.id] = s;
          if (s.quote) p.dialogueRanges.push({ startSec: s.startSec + 0.3, endSec: s.startSec + s.durSec - 0.3 });
        });
        const v: Variant = { key, style: styles[i], isPrimary: i === 0, order: order.map((s) => s.id), reserve: reserve.map((s) => s.id) };
        r.aiOriginal[key] = { order: [...v.order], reserve: [...v.reserve] };
        return v;
      });
      // khoảng thoại rải rác trong phim (ASR) để cảnh báo đoạn thủ công
      for (let t = 40; t < p.vodDurationSec; t += 47) p.dialogueRanges.push({ startSec: t, endSec: t + 4.5 });
      p.subtitles = [];
      p.captions = [];
      p.versions = [];
      p.phase1Done = true;
      p.phase2Done = false;
      p.dirty = false;
      vod.status = 'analyzed';
      p.vodAnalyzed = true;
    },
    vod.status === 'analyzed',
  );
}

// ---------------------------------------------------------------- API
export const db = {
  // ----- VOD
  listVods(q = '', genre = '') {
    for (const v of vods) {
      if (v.status === 'uploading' && v.id === 'vod-4') {
        v.uploadPct = Math.min(100, (v.uploadPct ?? 0) + 4);
        if (v.uploadPct >= 100) v.status = 'ready';
      }
    }
    return clone(
      vods
        .filter((v) => (!genre || v.genre === genre) && v.title.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },
  getVod: (id: string) => clone(vods.find((v) => v.id === id) ?? fail('Không tìm thấy VOD', 404)),

  uploads: new Map<string, { vodId: string; size: number; offset: number; corrupt: boolean }>(),
  initUpload(body: { fileName: string; size: number; title: string; genre: Vod['genre'] }) {
    const ext = body.fileName.split('.').pop()?.toLowerCase() ?? '';
    if (!['mp4', 'mov', 'mkv'].includes(ext)) fail('Định dạng không hỗ trợ. Chỉ nhận MP4, MOV, MKV.');
    if (body.size > 8 * 1024 ** 3) fail('File vượt 8 GB.');
    if (!body.title?.trim()) fail('Thiếu tên phim.');
    const vod: Vod = { id: newId('vod'), title: body.title.trim(), genre: body.genre, durationSec: 0, status: 'uploading', uploadPct: 0, resolution: '—', createdAt: now() };
    vods.push(vod);
    const id = newId('up');
    db.uploads.set(id, { vodId: vod.id, size: body.size, offset: 0, corrupt: /hong|hỏng|corrupt/i.test(body.fileName) });
    return { uploadId: id, offset: 0, vodId: vod.id };
  },
  getUpload(id: string) {
    const u = db.uploads.get(id) ?? fail('Phiên tải lên đã hết hạn', 404);
    return { offset: u!.offset, size: u!.size };
  },
  patchUpload(id: string, offset: number, length: number) {
    const u = db.uploads.get(id) ?? fail('Phiên tải lên đã hết hạn', 404);
    if (offset !== u!.offset) fail(`Lệch vị trí tải lên (server đang ở ${u!.offset})`, 409, { offset: u!.offset });
    u!.offset += length;
    const vod = vods.find((v) => v.id === u!.vodId)!;
    vod.uploadPct = Math.round((u!.offset / u!.size) * 100);
    if (u!.offset >= u!.size) {
      // BE đọc metadata, tạo ảnh đại diện
      setTimeout(() => {
        if (u!.corrupt) {
          vod.status = 'error';
          vod.errorReason = 'File hỏng: không đọc được luồng video.';
        } else {
          vod.status = 'ready';
          vod.durationSec = 5400 + Math.round(Math.random() * 1800);
          vod.resolution = '1920×1080';
        }
      }, 1500);
    }
    return { offset: u!.offset };
  },

  // ----- Template
  listTemplates: (type?: string) => clone(templates.filter((t) => !type || t.type === type)),
  addTemplate(body: { name: string; type: 'intro' | 'outro'; ratios: Template['ratios']; durationSec: number; format: string; size: number; width: number; height: number }) {
    if (!body.name?.trim()) fail('Thiếu tên template.');
    if (!body.ratios?.length) fail('Chọn ít nhất một tỉ lệ.');
    if (body.size > TEMPLATE_RULES.maxBytes) fail('File lớn hơn 50 MB.');
    if (body.durationSec < TEMPLATE_RULES.minSec || body.durationSec > TEMPLATE_RULES.maxSec) fail('Thời lượng phải từ 1 đến 5 giây.');
    const ok = body.ratios.some((r) => RESOLUTION[r].w === body.width && RESOLUTION[r].h === body.height);
    if (!ok) {
      const r = body.ratios[0];
      fail(`File ${body.width}x${body.height} không đúng ${RESOLUTION[r].w}x${RESOLUTION[r].h} của khung ${r}.`);
    }
    const first = !templates.some((t) => t.type === body.type);
    const t: Template = {
      id: newId('tpl'),
      name: body.name.trim(),
      type: body.type,
      durationSec: body.durationSec,
      ratios: body.ratios,
      enabled: true,
      isDefault: first, // V4: template đầu tiên của mỗi loại tự thành mặc định
      format: body.format,
      createdAt: now(),
    };
    templates.push(t);
    return clone(t);
  },
  patchTemplate(id: string, body: { enabled?: boolean; isDefault?: boolean }) {
    const t = templates.find((x) => x.id === id) ?? fail('Không tìm thấy template', 404);
    if (body.enabled !== undefined) {
      t!.enabled = body.enabled;
      if (!body.enabled) t!.isDefault = false; // V4: tắt thì mất mặc định
    }
    if (body.isDefault) {
      if (!t!.enabled) fail('Bật template trước khi đặt làm mặc định.');
      templates.filter((x) => x.type === t!.type).forEach((x) => (x.isDefault = x.id === id));
    }
    return clone(templates.filter((x) => x.type === t!.type));
  },
  deleteTemplate(id: string) {
    const i = templates.findIndex((x) => x.id === id);
    if (i < 0) fail('Không tìm thấy template', 404);
    templates.splice(i, 1);
  },

  // ----- Dự án & job
  getProject: (id: string) => clone(rec(id).p),

  createProject(body: { vodId: string; config: Config }, opts: { id?: string } = {}) {
    const vod = vods.find((v) => v.id === body.vodId) ?? fail('Không tìm thấy VOD', 404);
    if (vod!.status === 'uploading' || vod!.status === 'error') fail('VOD chưa sẵn sàng để tạo clip.'); // V18
    const { intro, outro } = resolve(body.config);
    const p: Project = {
      id: opts.id ?? newId('prj'),
      vodId: vod!.id,
      vodTitle: vod!.title,
      vodDurationSec: vod!.durationSec,
      vodGenre: vod!.genre,
      vodAnalyzed: vod!.status === 'analyzed',
      config: body.config,
      suggestedStyle: styleByGenre[vod!.genre],
      intro,
      outro,
      variants: [],
      segments: {},
      dialogueRanges: [],
      subtitles: [],
      subtitleEnabled: true,
      voiceOver: { enabled: false, text: '', voice: 'female_warm' },
      captions: [],
      musicVolumePct: 35,
      ducking: true,
      autoCrop: true,
      versions: [],
      dirty: false,
      phase1Done: false,
      phase2Done: false,
      posts: [],
      createdAt: now(),
    };
    const r: Rec = { p, aiOriginal: {} };
    projects.set(p.id, r);
    runPhase1(r);
    return clone(p);
  },

  reselect(id: string, config: Config) {
    const r = rec(id);
    if (r.p.job?.status === 'running') fail('Đang có tác vụ chạy.');
    Object.assign(r.p, { config, ...resolve(config) });
    runPhase1(r);
    return clone(r.p);
  },

  findJob(jobId: string) {
    for (const r of projects.values()) {
      advance(r);
      if (r.p.job?.id === jobId) return r;
    }
    return fail('Không tìm thấy job', 404);
  },
  getJob: (jobId: string) => clone(db.findJob(jobId).p.job as Job),
  setBackground(jobId: string, background: boolean) {
    const r = db.findJob(jobId);
    r.p.job!.background = background;
    return clone(r.p.job as Job);
  },
  cancelJob(jobId: string) {
    const r = db.findJob(jobId);
    const job = r.p.job!;
    if (job.status === 'running') {
      job.status = 'cancelled';
      job.stages.filter((s) => s.status === 'running').forEach((s) => Object.assign(s, { status: 'waiting', pct: 0 }));
      r.run = undefined;
    }
    return clone(r.p);
  },
  retryStage(jobId: string, key: string) {
    const r = db.findJob(jobId);
    const job = r.p.job!;
    if (job.status !== 'error' && job.status !== 'cancelled') return clone(r.p);
    void key; // chạy lại từ bước lỗi, các bước đã xong được giữ
    job.stages.filter((s) => s.status !== 'done').forEach((s) => Object.assign(s, { status: 'waiting', pct: 0, error: undefined }));
    job.status = 'running';
    const onFinish = job.phase === 1 ? () => undefined : job.phase === 2 ? finishPhase2(r) : finishRender(r);
    if (job.phase === 1) {
      // chạy lại giai đoạn 1 từ đầu cho đơn giản
      runPhase1(r);
    } else {
      r.run = { startedAt: Date.now(), skip: new Set(job.stages.filter((s) => s.status === 'done').map((s) => s.key)), onFinish };
      advance(r);
    }
    return clone(r.p);
  },

  // ----- Màn 4: chỉnh sửa đoạn
  putVariant(id: string, key: string, body: { order: string[]; reserve?: string[] }) {
    const r = rec(id);
    const v = variantOf(r.p, key);
    v.order = body.order.filter((x) => r.p.segments[x]);
    if (body.reserve) v.reserve = body.reserve.filter((x) => r.p.segments[x]);
    markDirty(r.p);
    return clone(r.p);
  },
  resuggest(id: string, key: string) {
    const r = rec(id);
    const v = variantOf(r.p, key);
    const orig = r.aiOriginal[key];
    if (orig) {
      v.order = [...orig.order];
      v.reserve = [...orig.reserve];
    }
    markDirty(r.p);
    return clone(r.p);
  },
  addSegment(id: string, body: { variant: string; startSec: number; endSec: number; title: string; afterIndex: number | null }) {
    const r = rec(id);
    const v = variantOf(r.p, body.variant);
    const dur = Math.round((body.endSec - body.startSec) * 10) / 10;
    if (dur <= 0) fail('Mốc Ra phải sau mốc Vào.');
    if (dur > 60) fail('Đoạn thủ công dài tối đa 60 giây.');
    if (body.endSec > r.p.vodDurationSec) fail('Mốc nằm ngoài độ dài phim.');
    const seg: Segment = {
      id: newId('seg'),
      source: 'manual',
      startSec: body.startSec,
      durSec: dur,
      trimSec: 0,
      title: body.title.trim() || 'Đoạn thủ công',
      act: 2,
      subjectX: 0.5,
    };
    r.p.segments[seg.id] = seg;
    const at = body.afterIndex === null ? v.order.length : body.afterIndex + 1;
    v.order.splice(at, 0, seg.id);
    markDirty(r.p);
    return clone(r.p);
  },
  trimSegment(id: string, segId: string, delta: number) {
    const r = rec(id);
    const s = r.p.segments[segId] ?? fail('Không tìm thấy đoạn', 404);
    if (!canTrim(s!, delta)) fail(s!.source === 'ai' ? `Đoạn AI chỉ được lệch ±${AI_TRIM_LIMIT} giây so với gốc.` : 'Không thể cắt thêm.');
    s!.durSec = Math.round((s!.durSec + delta) * 10) / 10;
    s!.trimSec = Math.round((s!.trimSec + delta) * 10) / 10;
    markDirty(r.p);
    return clone(r.p);
  },
  splitSegment(id: string, segId: string, variant: string) {
    const r = rec(id);
    const v = variantOf(r.p, variant);
    const s = r.p.segments[segId] ?? fail('Không tìm thấy đoạn', 404);
    if (s!.durSec < MIN_SEGMENT_SEC * 2) fail('Đoạn quá ngắn để chia đôi.');
    const half = Math.round((s!.durSec / 2) * 10) / 10;
    const a: Segment = { ...clone(s!), id: newId('seg'), durSec: half, trimSec: 0, parentId: s!.id, title: `${s!.title} (1)` };
    const b: Segment = { ...clone(s!), id: newId('seg'), startSec: s!.startSec + half, durSec: Math.round((s!.durSec - half) * 10) / 10, trimSec: 0, parentId: s!.id, title: `${s!.title} (2)` };
    r.p.segments[a.id] = a;
    r.p.segments[b.id] = b;
    v.order.splice(v.order.indexOf(segId), 1, a.id, b.id);
    r.p.subtitles.filter((x) => x.segmentId === segId).forEach((x) => (x.segmentId = a.id));
    markDirty(r.p);
    return clone(r.p);
  },
  mergeSegments(id: string, body: { variant: string; a: string; b: string }) {
    const r = rec(id);
    const v = variantOf(r.p, body.variant);
    const A = r.p.segments[body.a];
    const B = r.p.segments[body.b];
    const ia = v.order.indexOf(body.a);
    if (ia < 0 || v.order[ia + 1] !== body.b || !canMerge(A, B)) fail('Chỉ nối được 2 đoạn liền kề cả trong clip lẫn trong phim gốc.');
    const m: Segment = {
      ...clone(A),
      id: newId('seg'),
      durSec: Math.round((A.durSec + B.durSec) * 10) / 10,
      trimSec: 0,
      title: A.parentId && A.parentId === B.parentId ? (r.p.segments[A.parentId]?.title ?? A.title) : A.title,
      parentId: undefined,
      source: A.source === 'ai' && B.source === 'ai' ? 'ai' : 'manual',
    };
    r.p.segments[m.id] = m;
    v.order.splice(ia, 2, m.id);
    markDirty(r.p);
    return clone(r.p);
  },

  confirm(id: string) {
    const r = rec(id);
    const p = r.p;
    if (!p.phase1Done) fail('Chưa có kết quả AI chọn đoạn.');
    if (p.job?.status === 'running') fail('Đang có tác vụ chạy.');
    for (const v of p.variants) {
      const b = budget(p, v);
      if (b.errors.length) fail(`Phương án ${v.key}: ${b.errors[0]}`, 422, { variant: v.key }); // V11
    }
    startJob(r, 2, finishPhase2(r));
    return clone(p);
  },

  // ----- Màn 5–7
  newMusic(id: string, key: string, body: { mood?: string; bpm?: number; instruments?: string }) {
    const r = rec(id);
    const p = r.p;
    const v = variantOf(p, key);
    const clipSec = (p.intro?.durationSec ?? 0) + clipSegments(p, v).reduce((a, s) => a + s.durSec, 0) + (p.outro?.durationSec ?? 0);
    const label = `Bản ${String.fromCharCode(65 + (v.music?.length ?? 0))}`;
    const t = makeTrack(label, clipSec, { ...body, style: v.style }, (v.music?.length ?? 0) * 7 + 3);
    v.music = [...(v.music ?? []), t];
    v.selectedMusicId = t.id;
    markDirty(p);
    return clone(p);
  },
  patchProject(id: string, body: Partial<Pick<Project, 'subtitles' | 'subtitleEnabled' | 'voiceOver' | 'captions' | 'musicVolumePct' | 'ducking' | 'autoCrop'>> & { selectedMusic?: { variant: string; id: string }; primary?: string }) {
    const r = rec(id);
    const p = r.p;
    const { selectedMusic, primary, ...rest } = body;
    Object.assign(p, rest);
    if (selectedMusic) variantOf(p, selectedMusic.variant).selectedMusicId = selectedMusic.id;
    if (primary) p.variants.forEach((v) => (v.isPrimary = v.key === primary));
    if (Object.keys(rest).length || selectedMusic) markDirty(p);
    return clone(p);
  },
  rewriteVoiceOver(id: string) {
    const r = rec(id);
    const n = (r.p.versions.length + Date.now()) % 3;
    r.p.voiceOver = { ...r.p.voiceOver, text: voiceOverText(r.p.vodTitle, r.p.vodGenre, n) };
    markDirty(r.p);
    return clone(r.p);
  },
  render(id: string) {
    const r = rec(id);
    if (!r.p.phase2Done) fail('Chưa có bản dựng để dựng lại.');
    if (r.p.job?.status === 'running') fail('Đang có tác vụ chạy.');
    startJob(r, 3, finishRender(r));
    return clone(r.p);
  },

  // ----- Màn 8
  listPlatforms: () => clone(platforms),
  connect(pl: Platform) {
    const s = platforms.find((x) => x.platform === pl)!;
    s.connected = true;
    s.tokenExpired = false;
    return clone(platforms);
  },
  suggestPost(id: string) {
    const r = rec(id);
    const n = (r.p.postDraft ? r.p.postDraft.titles.length : 0) + Math.floor(Date.now() / 1000);
    const titles = postTitles(r.p.vodTitle);
    r.p.postDraft = {
      titles,
      title: titles[0],
      desc: postDesc(r.p.vodTitle, n),
      tags: ['FPTPlay', compactName(r.p.vodTitle), 'trailer', 'phimhay'],
    };
    return clone(r.p);
  },
  publish(id: string, body: { platforms: Platform[]; title: string; desc: string; tags: string[]; scheduleAt?: string }) {
    const r = rec(id);
    if (!body.title?.trim() || body.title.length > 100) fail('Tiêu đề trống hoặc quá 100 ký tự.');
    if (r.p.dirty) fail('Có thay đổi chưa dựng. Dựng lại trước khi đăng.');
    r.p.postDraft = { ...(r.p.postDraft ?? { titles: [] }), title: body.title, desc: body.desc, tags: body.tags };
    const results: Post[] = body.platforms.map((pl) => {
      const st = platforms.find((x) => x.platform === pl)!;
      if (!st.connected) return { platform: pl, connected: false, status: 'error', error: 'Token hết hạn. Kết nối lại tài khoản rồi đăng lại.' };
      if (body.scheduleAt) return { platform: pl, connected: true, status: 'scheduled', scheduleAt: body.scheduleAt };
      return { platform: pl, connected: true, status: 'ok', url: `https://sandbox.example/${pl}/${newId('post')}` };
    });
    r.p.posts = [...r.p.posts.filter((x) => !body.platforms.includes(x.platform)), ...results];
    if (results.some((x) => x.status === 'ok' || x.status === 'scheduled')) r.p.publishedV = r.p.versions.length;
    return clone(r.p);
  },
};

function finishPhase2(r: Rec) {
  return () => {
    produceAudioText(r.p);
    r.p.versions.push(makeVersion(r.p, r.p.phase2Done ? 'Duyệt lại đoạn và dựng lại' : 'Bản dựng đầu tiên'));
    r.p.phase2Done = true;
    r.p.dirty = false;
  };
}
function finishRender(r: Rec) {
  return () => {
    r.p.versions.push(makeVersion(r.p, 'Dựng lại sau khi chỉnh nhạc / sub / caption'));
    r.p.dirty = false;
  };
}

// ---------------------------------------------------------------- dữ liệu mẫu
// Dự án mẫu đã xong cả 2 giai đoạn (v1) – phương án dự phòng khi demo
(function seed() {
  const config: Config = {
    goal: 'trailer',
    ratio: '9:16',
    targetSec: 60,
    style: null,
    introTemplateId: 'default',
    outroTemplateId: 'default',
    variantCount: 2,
  };
  const p = db.createProject({ vodId: 'vod-1', config }, { id: 'prj-demo' });
  const r = projects.get(p.id)!;
  r.run!.startedAt = 0; // hoàn tất giai đoạn 1 ngay
  advance(r);
  startJob(r, 2, finishPhase2(r));
  r.run!.startedAt = 0;
  advance(r);
  r.p.job = undefined;
})();
