// Data contract FE ↔ BE. Xem plan/frontend-plan.md mục 8 và 14.

export type FilmGenre = 'action' | 'romance' | 'drama' | 'horror' | 'comedy' | 'other';

export interface Vod {
  id: string;
  title: string;
  genre: FilmGenre;
  durationSec: number;
  resolution: string;
  thumbnailUrl?: string;
  /** Proxy 720p hỗ trợ HTTP range – dùng cho "xem trong ngữ cảnh gốc" */
  proxyUrl?: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  uploadProgress?: number;
  analyzed: boolean;
  createdAt: string;
}

export type ProjectStatus =
  | 'awaiting_config'
  | 'analyzing'
  | 'rendering'
  | 'review_video'
  | 'review_audio'
  | 'exporting'
  | 'ready'
  | 'published'
  | 'error'
  | 'cancelled';

/** Giai đoạn: 1 · video (âm gốc) → 2 · âm thanh & phụ đề → 3 · xuất */
export type Phase = 'video' | 'audio' | 'export';

export type Goal = 'trailer' | 'teaser' | 'best_scenes' | 'character_intro';
export type OutputType = 'short' | 'long';
export type Ratio = '9:16' | '16:9';
export type Style = 'cinematic' | 'dramatic' | 'funny' | 'energetic';
export type Pacing = 'slow' | 'medium' | 'fast';

export interface MusicConfig {
  mood?: string;
  tempo?: number;
  instruments?: string[];
  /** 0..1 – âm lượng nhạc so với âm gốc */
  volumeRatio?: number;
}

export interface GenerationConfig {
  goal: Goal;
  outputType: OutputType;
  durationSec: number;
  ratio: Ratio;
  style?: Style;
  pacing?: Pacing;
  focusCharacters?: string[];
  spoilerGuard: boolean;
  avoidSensitive: boolean;
  music?: MusicConfig;
  extras: { subtitle: boolean; voiceover: boolean; caption: boolean; smartCrop: boolean };
  prompt?: string;
  variantCount: number;
}

export type StepName = 'analyze' | 'suggest' | 'cut' | 'music' | 'subtitle' | 'mix' | 'export';
export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export const STEP_PHASE: Record<StepName, Phase> = {
  analyze: 'video',
  suggest: 'video',
  cut: 'video',
  music: 'audio',
  subtitle: 'audio',
  mix: 'audio',
  export: 'export',
};

export interface Step {
  name: StepName;
  status: StepStatus;
  progress: number;
  startedAt?: string;
  endedAt?: string;
  error?: string;
  retryable: boolean;
}

export type Act = 'open' | 'body' | 'end';

export interface Segment {
  id: string;
  startMs: number;
  endMs: number;
  order: number;
  act: Act;
  score: number;
  labels: string[];
  reason: string;
  signals?: { name: string; score: number }[];
  thumbnailUrl?: string;
  /** Vị trí ngang của chủ thể chính trong khung gốc (0..1) – dùng cho crop theo nhân vật */
  subjectX?: number;
}

// ---------- Trình bày: hình ảnh (giai đoạn 1+) ----------
export type CropMode = 'subject' | 'center' | 'blur';
export type Corner = 'tl' | 'tr' | 'bl' | 'br';
export type Transition = 'cut' | 'fade' | 'flash';

export interface VisualSettings {
  crop: CropMode;
  logo: { enabled: boolean; corner: Corner; size: 'S' | 'M' };
  endCard: { enabled: boolean; sec: number };
  transition: Transition;
}

// ---------- Âm thanh & phụ đề (giai đoạn 2) ----------
export interface MusicTrack {
  id: string;
  tool: string;
  model: string;
  version: string;
  prompt: string;
  params: Record<string, unknown>;
  seed?: number;
  createdAt: string;
  audioUrl?: string;
}

export interface Cue {
  id: string;
  /** Theo dòng thời gian của clip */
  startMs: number;
  endMs: number;
  text: string;
}

export type SubtitleTemplate = 'clean' | 'bold' | 'boxed' | 'cinema';

export interface SubtitleStyle {
  enabled: boolean;
  template: SubtitleTemplate;
  size: 'S' | 'M' | 'L';
  position: 'top' | 'middle' | 'bottom';
}

export interface AudioMix {
  /** 0..1 */
  originalGain: number;
  musicGain: number;
  voiceoverGain: number;
  ducking: 'light' | 'medium' | 'strong';
  fadeInSec: number;
  fadeOutSec: number;
}

export interface AudioLayer {
  musicTracks: MusicTrack[];
  selectedTrackId: string;
  subtitleCues: Cue[];
  /** Mốc có thoại – để mô phỏng ducking */
  speechRanges: { startMs: number; endMs: number }[];
  mix: AudioMix;
  subtitle: SubtitleStyle;
  /** Track âm thanh tách riêng cho preview (nếu BE cung cấp) */
  stems?: { original?: string; voiceover?: string; music?: Record<string, string> };
}

/** Những gì người dùng tùy chỉnh được trên preview mà không đổi đoạn */
export interface Presentation {
  visual: VisualSettings;
  mix?: AudioMix;
  subtitle?: SubtitleStyle;
  selectedTrackId?: string;
}

/**
 * content  = AI chọn lại đoạn (giai đoạn 1)
 * visual   = áp dụng tùy chỉnh hình ảnh (chỉ Dựng)
 * music    = AI tạo lại nhạc (giai đoạn 2)
 * subtitle = AI tạo lại phụ đề (giai đoạn 2)
 * audio_style = áp dụng mix / kiểu phụ đề / chọn nhạc (chỉ Trộn)
 */
export type AdjustScope = 'content' | 'visual' | 'music' | 'subtitle' | 'audio_style';

export interface Adjustment {
  scope: AdjustScope;
  configDiff: Partial<GenerationConfig>;
  prompt?: string;
  presentation?: Presentation;
}

export interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface Revision {
  id: string;
  no: number;
  createdAt: string;
  phase: Exclude<Phase, 'export'>;
  adjustment?: Adjustment;
  changeSummary?: string;
  segments: Segment[];
  checks: Check[];
  visual: VisualSettings;
  /** Chỉ có từ giai đoạn 2 */
  audio?: AudioLayer;
  videoUrl?: string;
  zipUrl?: string;
  /** Đã chốt & xuất */
  exported: boolean;
  restoredFrom?: string;
}

export interface Variant {
  id: string;
  style: Style;
  ratio: Ratio;
  revisions: Revision[];
  activeRevisionId: string;
  isPrimary: boolean;
  /** Phiên bản video đã chốt (bắt đầu giai đoạn 2) */
  lockedRevisionId?: string;
}

export type Platform = 'facebook' | 'tiktok' | 'youtube';

export interface PostDraft {
  platform: Platform;
  options: { title: string; description: string; hashtags: string[] }[];
  chosen: number;
  title: string;
  description: string;
  hashtags: string[];
  status: 'draft' | 'approved' | 'published' | 'failed';
  url?: string;
  error?: string;
}

export interface Project {
  id: string;
  vodId: string;
  vodTitle: string;
  createdAt: string;
  status: ProjectStatus;
  phase: Phase;
  mode: 'auto' | 'review';
  config: GenerationConfig;
  steps: Step[];
  variants: Variant[];
  posts?: PostDraft[];
  metrics: { totalSec: number; costUsd: number };
}

export type ProjectSummary = Pick<Project, 'id' | 'vodId' | 'vodTitle' | 'createdAt' | 'status' | 'mode' | 'phase'> & {
  outputType: OutputType;
  ratio: Ratio;
};

export const TERMINAL_STATUSES: ProjectStatus[] = [
  'review_video',
  'review_audio',
  'ready',
  'published',
  'error',
  'cancelled',
];

export const RUNNING_STATUSES: ProjectStatus[] = ['analyzing', 'rendering', 'exporting'];
