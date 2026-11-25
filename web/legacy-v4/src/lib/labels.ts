import type {
  Act,
  AdjustScope,
  CropMode,
  Corner,
  FilmGenre,
  Goal,
  Pacing,
  Phase,
  Platform,
  ProjectStatus,
  StepName,
  StepStatus,
  Style,
  SubtitleTemplate,
  Transition,
} from '../types/domain';

export const genreLabel: Record<FilmGenre, string> = {
  action: 'Hành động',
  romance: 'Tình cảm',
  drama: 'Tâm lý',
  horror: 'Kinh dị',
  comedy: 'Hài',
  other: 'Khác',
};

export const goalLabel: Record<Goal, string> = {
  trailer: 'Trailer',
  teaser: 'Teaser',
  best_scenes: 'Tổng hợp cảnh hay',
  character_intro: 'Giới thiệu nhân vật',
};

export const styleLabel: Record<Style, string> = {
  cinematic: 'Cinematic',
  dramatic: 'Dramatic',
  funny: 'Funny',
  energetic: 'Energetic',
};

export const pacingLabel: Record<Pacing, string> = {
  slow: 'Chậm',
  medium: 'Vừa',
  fast: 'Nhanh',
};

export const stepLabel: Record<StepName, string> = {
  analyze: 'Phân tích',
  suggest: 'Đề xuất đoạn',
  cut: 'Dựng video',
  music: 'Tạo nhạc',
  subtitle: 'Tạo phụ đề',
  mix: 'Trộn âm',
  export: 'Xuất',
};

export const phaseLabel: Record<Phase, string> = {
  video: 'Video',
  audio: 'Âm thanh & phụ đề',
  export: 'Xuất',
};

export const phaseTitle: Record<Phase, string> = {
  video: 'Giai đoạn 1 · Video',
  audio: 'Giai đoạn 2 · Âm thanh & phụ đề',
  export: 'Giai đoạn 3 · Xuất',
};

export const stepStatusLabel: Record<StepStatus, string> = {
  pending: 'Chờ',
  running: 'Đang chạy',
  done: 'Xong',
  error: 'Lỗi',
};

export const projectStatusLabel: Record<ProjectStatus, string> = {
  awaiting_config: 'Chờ cấu hình',
  analyzing: 'Đang phân tích',
  rendering: 'Đang xử lý',
  review_video: 'Chờ duyệt video',
  review_audio: 'Chờ duyệt âm thanh',
  exporting: 'Đang xuất',
  ready: 'Sẵn sàng',
  published: 'Đã đăng',
  error: 'Lỗi',
  cancelled: 'Đã hủy',
};

/** Màu theo vai trò: xanh dương = đang xử lý, xanh lá = xong, cam = cần người dùng, đỏ = lỗi */
export const projectStatusColor: Record<ProjectStatus, string> = {
  awaiting_config: 'gray',
  analyzing: 'blue',
  rendering: 'blue',
  review_video: 'orange',
  review_audio: 'orange',
  exporting: 'blue',
  ready: 'green',
  published: 'green',
  error: 'red',
  cancelled: 'gray',
};

export const stepStatusColor: Record<StepStatus, string> = {
  pending: 'gray',
  running: 'blue',
  done: 'green',
  error: 'red',
};

export const actLabel: Record<Act, string> = {
  open: 'Mở',
  body: 'Thân',
  end: 'Kết',
};

export const scopeLabel: Record<AdjustScope, string> = {
  content: 'Chọn lại đoạn',
  visual: 'Hình ảnh',
  music: 'Tạo lại nhạc',
  subtitle: 'Tạo lại phụ đề',
  audio_style: 'Mix & kiểu phụ đề',
};

export const cropLabel: Record<CropMode, string> = {
  subject: 'Theo nhân vật',
  center: 'Giữa khung',
  blur: 'Nền mờ',
};

export const cornerLabel: Record<Corner, string> = {
  tl: 'Trên trái',
  tr: 'Trên phải',
  bl: 'Dưới trái',
  br: 'Dưới phải',
};

export const transitionLabel: Record<Transition, string> = {
  cut: 'Cắt thẳng',
  fade: 'Mờ dần',
  flash: 'Chớp sáng',
};

export const subtitleTemplateLabel: Record<SubtitleTemplate, string> = {
  clean: 'Gọn',
  bold: 'Nổi bật',
  boxed: 'Nền hộp',
  cinema: 'Điện ảnh',
};

export const platformLabel: Record<Platform, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

/** Giới hạn ký tự theo nền tảng (UC-H.2 1a) */
export const platformLimits: Record<Platform, { title: number; description: number; hashtags: number }> = {
  facebook: { title: 100, description: 2000, hashtags: 10 },
  tiktok: { title: 100, description: 2200, hashtags: 8 },
  youtube: { title: 100, description: 5000, hashtags: 15 },
};

/** Giới hạn thời lượng theo BR-01 */
export const DURATION_RANGE = {
  short: { min: 15, max: 90, default: 60 },
  long: { min: 180, max: 600, default: 180 },
} as const;
