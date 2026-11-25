// Mô hình dữ liệu theo UI spec mục 8. Thời gian luôn tính bằng GIÂY (số thực).
// BE có thể đổi tên trường, chỉ cần giữ đúng ý nghĩa.

export type Ratio = '9:16' | '16:9';
export type Style = 'Cinematic' | 'Dramatic' | 'Funny' | 'Energetic';
export type Genre = 'drama' | 'action' | 'comedy' | 'horror';
export type VariantKey = 'A' | 'B' | 'C';

export interface Vod {
  id: string;
  title: string;
  genre: Genre;
  durationSec: number;
  status: 'ready' | 'analyzed' | 'uploading' | 'error';
  uploadPct?: number;
  thumbnailUrl?: string;
  resolution: string;
  errorReason?: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  type: 'intro' | 'outro';
  /** 1..5, mặc định 2 */
  durationSec: number;
  ratios: Ratio[];
  enabled: boolean;
  isDefault: boolean;
  fileUrl?: string;
  thumbnailUrl?: string;
  format: string;
  createdAt: string;
}

export type GoalKey = 'trailer' | 'teaser' | 'best' | 'character' | 'other';
export type TemplateChoice = string | 'default' | 'none';

export interface Config {
  goal: GoalKey;
  goalOther?: string;
  ratio: Ratio;
  /** Tổng clip cuối, đã gồm đầu/cuối */
  targetSec: number;
  /** null = để AI gợi ý theo thể loại */
  style: Style | null;
  introTemplateId: TemplateChoice;
  outroTemplateId: TemplateChoice;
  variantCount: 1 | 2 | 3;
  extraPrompt?: string;
}

export type SegmentWarning = 'dialogue_cut' | 'overlap';

export interface Segment {
  id: string;
  source: 'ai' | 'manual';
  startSec: number;
  durSec: number;
  /** Độ lệch thời lượng so với gốc AI; đoạn AI chỉ được trong ±2 (V7) */
  trimSec: number;
  title: string;
  act: 1 | 2 | 3;
  score?: number;
  reason?: string;
  signals?: { visual: number; audio: number; dialogue: number };
  quote?: string;
  parentId?: string;
  thumbnailUrl?: string;
  warnings?: SegmentWarning[];
  /** Vị trí ngang chủ thể (0..1) – dùng cho crop theo nhân vật */
  subjectX?: number;
}

export interface MusicTrack {
  id: string;
  label: string;
  bpm: number;
  mood: string;
  instruments: string;
  durationSec: number;
  climaxSec: number;
  prompt: string;
  audioUrl?: string;
  waveform: number[];
  tool: string;
  model: string;
  seed: number;
  createdAt: string;
}

export interface Variant {
  key: VariantKey;
  style: Style;
  isPrimary: boolean;
  /** id đoạn theo thứ tự trong clip */
  order: string[];
  /** đoạn dự phòng do AI chọn */
  reserve: string[];
  music?: MusicTrack[];
  selectedMusicId?: string;
}

export type StageKey = 'scene' | 'audio' | 'rank' | 'music' | 'subtitle' | 'template' | 'render';

export interface Stage {
  key: StageKey;
  status: 'waiting' | 'running' | 'done' | 'error';
  pct: number;
  reusedFromCache?: boolean;
  error?: string;
}

export interface Job {
  id: string;
  /** 1 = AI chọn đoạn · 2 = nhạc, sub, dựng · 3 = dựng lại */
  phase: 1 | 2 | 3;
  status: 'running' | 'done' | 'cancelled' | 'error';
  stages: Stage[];
  etaSec?: number;
  background: boolean;
}

export interface Subtitle {
  id: string;
  segmentId: string;
  /** Tính từ đầu đoạn */
  startSec: number;
  endSec: number;
  text: string;
}

export type Voice = 'female_warm' | 'male_deep' | 'male_young';

export interface VoiceOver {
  enabled: boolean;
  text: string;
  voice: Voice;
}

export interface Caption {
  id: string;
  text: string;
  enabled: boolean;
  segmentId?: string;
}

export interface VersionFile {
  variant: VariantKey;
  fileName: string;
  mp4Url?: string;
  resolution: string;
  timestampsJson: string;
  srt: string;
  voTxt: string;
  captionTxt: string;
}

export interface Version {
  v: number;
  createdAt: string;
  note: string;
  files: VersionFile[];
}

export type Platform = 'facebook' | 'tiktok' | 'youtube';

export interface PlatformState {
  platform: Platform;
  connected: boolean;
  tokenExpired?: boolean;
}

export interface Post {
  platform: Platform;
  connected: boolean;
  status: 'idle' | 'ok' | 'error' | 'scheduled';
  error?: string;
  url?: string;
  scheduleAt?: string;
}

export interface PostDraft {
  titles: string[];
  title: string;
  desc: string;
  tags: string[];
}

export interface ResolvedTemplate {
  id: string;
  name: string;
  durationSec: number;
}

export interface Project {
  id: string;
  vodId: string;
  vodTitle: string;
  vodDurationSec: number;
  vodGenre: Genre;
  vodAnalyzed: boolean;
  config: Config;
  /** Phong cách AI gợi ý khi config.style = null */
  suggestedStyle: Style;
  /** Template đầu/cuối thực sự được chèn (sau khi xét mặc định, bật/tắt, tỉ lệ) */
  intro?: ResolvedTemplate;
  outro?: ResolvedTemplate;
  variants: Variant[];
  segments: Record<string, Segment>;
  /** Khoảng có thoại trong phim gốc (từ ASR) – để cảnh báo cắt giữa câu thoại (V9) */
  dialogueRanges: { startSec: number; endSec: number }[];
  subtitles: Subtitle[];
  /** Checkbox "Bật sub" ở màn 6 (spec mục 8 chưa có trường này) */
  subtitleEnabled: boolean;
  voiceOver: VoiceOver;
  captions: Caption[];
  musicVolumePct: number;
  ducking: boolean;
  autoCrop: boolean;
  versions: Version[];
  dirty: boolean;
  job?: Job;
  phase1Done: boolean;
  phase2Done: boolean;
  postDraft?: PostDraft;
  posts: Post[];
  publishedV?: number;
  createdAt: string;
}
