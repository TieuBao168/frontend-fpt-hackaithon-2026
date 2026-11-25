import type { GoalKey, Genre, Platform, StageKey, Style, Voice } from '../types/domain';

export const genreLabel: Record<Genre, string> = {
  drama: 'Tâm lý',
  action: 'Hành động',
  comedy: 'Hài',
  horror: 'Kinh dị',
};

export const goalLabel: Record<GoalKey, string> = {
  trailer: 'Trailer',
  teaser: 'Teaser mạng xã hội',
  best: 'Tổng hợp cảnh hay',
  character: 'Giới thiệu nhân vật',
  other: 'Khác',
};

export const styleLabel: Record<Style, string> = {
  Cinematic: 'Điện ảnh',
  Dramatic: 'Kịch tính',
  Funny: 'Hài hước',
  Energetic: 'Sôi động',
};

/** Gợi ý phong cách theo thể loại (UC-B.2 1a) */
export const styleByGenre: Record<Genre, Style> = {
  drama: 'Dramatic',
  action: 'Energetic',
  comedy: 'Funny',
  horror: 'Cinematic',
};

export const stageLabel: Record<StageKey, string> = {
  scene: 'Tách cảnh và phân tích hình ảnh',
  audio: 'Phân tích âm thanh và chép lời thoại',
  rank: 'Chấm điểm, chọn và sắp xếp đoạn',
  music: 'Tạo nhạc AI theo nhịp đoạn cắt',
  subtitle: 'Tạo sub, lời dẫn và caption',
  template: 'Chèn đầu và cuối clip',
  render: 'Dựng và xuất MP4',
};

export const voiceLabel: Record<Voice, string> = {
  female_warm: 'Nữ trầm ấm',
  male_deep: 'Nam trầm',
  male_young: 'Nam trẻ',
};

export const platformLabel: Record<Platform, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

export const actLabel = (a: 1 | 2 | 3) => `Hồi ${a}`;
