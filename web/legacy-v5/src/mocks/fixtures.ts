// Dữ liệu mẫu cho mock. Tên phim, cảnh, câu thoại đều là giả định.
import type { Caption, Genre, MusicTrack, PlatformState, Segment, Style, Template, Vod } from '../types/domain';

const now = () => new Date().toISOString();
let seq = 0;
export const newId = (p: string) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}`;

export const vods: Vod[] = [
  { id: 'vod-1', title: 'Mùa Hè Định Mệnh', genre: 'drama', durationSec: 6420, status: 'analyzed', resolution: '1920×1080', createdAt: '2026-11-24T08:12:00Z' },
  { id: 'vod-2', title: 'Truy Đuổi Lúc Nửa Đêm', genre: 'action', durationSec: 7110, status: 'ready', resolution: '1920×1080', createdAt: '2026-11-24T09:40:00Z' },
  { id: 'vod-3', title: 'Căn Nhà Cuối Hẻm', genre: 'horror', durationSec: 5880, status: 'ready', resolution: '3840×2160', createdAt: '2026-11-25T02:05:00Z' },
  { id: 'vod-4', title: 'Ông Bố Bất Đắc Dĩ', genre: 'comedy', durationSec: 6030, status: 'uploading', uploadPct: 64, resolution: '1920×1080', createdAt: '2026-11-25T03:00:00Z' },
  {
    id: 'vod-5',
    title: 'Bản Sao Lỗi',
    genre: 'drama',
    durationSec: 0,
    status: 'error',
    errorReason: 'File hỏng: không đọc được luồng video (codec không hỗ trợ).',
    resolution: '—',
    createdAt: '2026-11-25T03:20:00Z',
  },
];

export const templates: Template[] = [
  { id: 'tpl-i1', name: 'Logo FPT Play', type: 'intro', durationSec: 2, ratios: ['16:9', '9:16'], enabled: true, isDefault: true, format: 'MP4', createdAt: '2026-11-20T08:00:00Z' },
  { id: 'tpl-i2', name: 'Logo FPT Play – mùa lễ hội', type: 'intro', durationSec: 3, ratios: ['16:9'], enabled: true, isDefault: false, format: 'MP4', createdAt: '2026-11-21T08:00:00Z' },
  { id: 'tpl-o1', name: 'Xem trọn bộ trên FPT Play', type: 'outro', durationSec: 3, ratios: ['16:9', '9:16'], enabled: true, isDefault: true, format: 'MP4', createdAt: '2026-11-20T08:00:00Z' },
  { id: 'tpl-o2', name: 'Hẹn gặp cuối tuần', type: 'outro', durationSec: 2, ratios: ['9:16'], enabled: false, isDefault: false, format: 'PNG', createdAt: '2026-11-22T08:00:00Z' },
];

export const platforms: PlatformState[] = [
  { platform: 'facebook', connected: true },
  { platform: 'tiktok', connected: true },
  { platform: 'youtube', connected: false, tokenExpired: true },
];

const scenePool: { title: string; reason: string; quote?: string }[] = [
  { title: 'Câu hỏi bỏ ngỏ ở bến tàu', reason: 'Câu thoại mở vấn đề + cận mặt nhân vật chính, tạo hook mạnh.', quote: 'Anh có chắc đây là lựa chọn đúng không?' },
  { title: 'Toàn cảnh thị trấn lúc bình minh', reason: 'Giới thiệu bối cảnh rõ, ánh sáng đẹp, nhịp chậm mở đầu.' },
  { title: 'Lần đầu gặp mặt', reason: 'Hai nhân vật chính xuất hiện cùng khung, biểu cảm rõ.', quote: 'Mọi chuyện bắt đầu từ mùa hè năm đó.' },
  { title: 'Bức thư không người gửi', reason: 'Chi tiết tạo tò mò, cận cảnh đồ vật, nhạc nền căng.' },
  { title: 'Cãi vã trong bếp', reason: 'Xung đột leo thang, âm lượng tăng, cắt cảnh nhanh.', quote: 'Cậu nghĩ mình hiểu tôi sao?' },
  { title: 'Chạy dưới mưa', reason: 'Chuyển động lớn, âm thanh dồn dập, nhịp nhanh.' },
  { title: 'Lời thú nhận trên mái nhà', reason: 'Khoảng lặng + câu thoại cảm xúc, không lộ kết phim.', quote: 'Nếu được làm lại, tôi vẫn sẽ chọn như vậy.' },
  { title: 'Cánh cửa khóa trái', reason: 'Âm thanh đột ngột + cận mặt hoảng hốt, tạo kịch tính.' },
  { title: 'Cuộc gọi lúc nửa đêm', reason: 'Câu thoại ngắn tạo tò mò, ánh sáng tương phản.', quote: 'Có ai đó đang theo dõi chúng ta.' },
  { title: 'Ánh mắt cuối cùng', reason: 'Cao trào cảm xúc, nhạc nền lên cao, kết treo.', quote: 'Lần này, tôi sẽ không bỏ chạy.' },
  { title: 'Đoàn tàu rời ga', reason: 'Hình ảnh mang tính biểu tượng, phù hợp đóng clip.' },
  { title: 'Bí mật trong ngăn kéo', reason: 'Chi tiết hé lộ vừa đủ, giữ tò mò cho người xem.', quote: 'Bí mật đó, cô ấy đã giữ suốt mười năm.' },
];

/** Sinh đoạn AI cho một phương án: thứ tự trong clip + đoạn dự phòng */
export function generateAiSegments(filmDurSec: number, targetFilmSec: number, ratio: '9:16' | '16:9', variation: number) {
  const segLen = ratio === '9:16' ? 4.5 + (variation % 2) : 11 + variation;
  const count = Math.max(3, Math.round(targetFilmSec / segLen));
  const safeEnd = filmDurSec * 0.85; // V12: BE tự loại 15% cuối phim
  const make = (i: number, reserve: boolean): Segment => {
    const pool = scenePool[(i + variation * 3) % scenePool.length];
    // rải đều trong phim (dãy tỉ lệ vàng), tránh 15% cuối
    const frac = ((i + 1) * 0.6180339887 + variation * 0.2719) % 1;
    const start = Math.round(frac * (safeEnd - 90) + 30);
    const dur = Math.round((segLen + ((i * 37) % 5) * 0.2) * 10) / 10;
    const act = (i < count / 3 ? 1 : i < (2 * count) / 3 ? 2 : 3) as 1 | 2 | 3;
    return {
      id: newId('seg'),
      source: 'ai',
      startSec: start,
      durSec: dur,
      trimSec: 0,
      title: pool.title,
      act,
      score: Math.round(96 - i * 1.5 - variation * 2 - (reserve ? 12 : 0)),
      reason: pool.reason,
      quote: pool.quote,
      signals: {
        visual: Math.round((0.6 + ((i * 13) % 40) / 100) * 100) / 100,
        audio: Math.round((0.5 + ((i * 7) % 50) / 100) * 100) / 100,
        dialogue: pool.quote ? Math.round((0.7 + ((i * 11) % 30) / 100) * 100) / 100 : 0.2,
      },
      subjectX: 0.25 + (((i + variation) * 0.37) % 0.5),
    };
  };
  const order = Array.from({ length: count }, (_, i) => make(i, false));
  const reserve = Array.from({ length: 4 }, (_, i) => make(count + i, true));
  return { order, reserve };
}

export function waveform(seed: number, climaxIdx: number): number[] {
  return Array.from({ length: 64 }, (_, i) => {
    const base = 0.3 + 0.25 * Math.sin((i + seed) / 3) ** 2;
    const climax = Math.max(0, 1 - Math.abs(i - climaxIdx) / 10) * 0.45;
    return Math.min(1, Math.round((base + climax + ((i * seed) % 7) / 40) * 100) / 100);
  });
}

const moodByStyle: Record<Style, string> = {
  Cinematic: 'Hùng tráng, sâu lắng',
  Dramatic: 'Căng thẳng, kịch tính',
  Funny: 'Vui tươi, tinh nghịch',
  Energetic: 'Dồn dập, mạnh mẽ',
};
const bpmByStyle: Record<Style, number> = { Cinematic: 84, Dramatic: 96, Funny: 112, Energetic: 128 };
const instrumentsByStyle: Record<Style, string> = {
  Cinematic: 'Dàn dây, piano',
  Dramatic: 'Dàn dây, trống trầm',
  Funny: 'Ukulele, bộ gõ',
  Energetic: 'Trống điện tử, synth',
};

export function makeTrack(
  label: string,
  clipSec: number,
  opts: { mood?: string; bpm?: number; instruments?: string; style: Style },
  seed: number,
): MusicTrack {
  const mood = opts.mood ?? moodByStyle[opts.style];
  const bpm = opts.bpm ?? bpmByStyle[opts.style];
  const instruments = opts.instruments ?? instrumentsByStyle[opts.style];
  const climaxSec = Math.round(clipSec * 0.78);
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  return {
    id: newId('trk'),
    label,
    bpm,
    mood,
    instruments,
    durationSec: Math.round(clipSec),
    climaxSec,
    prompt: `${mood}, ${bpm} BPM, ${instruments.toLowerCase()}, dài ${mm(clipSec)}, cao trào ở ${mm(climaxSec)}`,
    waveform: waveform(seed, Math.round((climaxSec / Math.max(1, clipSec)) * 63)),
    tool: 'MusicGen (mẫu)',
    model: 'musicgen-medium',
    seed: 1000 + seed,
    createdAt: now(),
  };
}

const captionsByStyle: Record<Style, string[]> = {
  Cinematic: ['Một mùa hè thay đổi tất cả', 'Có những lựa chọn không thể quay lại', 'Câu trả lời đang chờ', 'Sắp ra mắt trên FPT Play'],
  Dramatic: ['Ai đang nói dối?', 'Mọi bí mật đều có giá', 'Đừng tin bất kỳ ai', 'Xem trọn bộ trên FPT Play'],
  Funny: ['Khi bố phải trông con một mình', 'Kế hoạch hoàn hảo… trên giấy', 'Đừng thử ở nhà', 'Cười không ngớt trên FPT Play'],
  Energetic: ['Không có đường lui', '60 giây nghẹt thở', 'Tốc độ là tất cả', 'Bùng nổ trên FPT Play'],
};

export const makeCaptions = (style: Style): Caption[] => captionsByStyle[style].map((text, i) => ({ id: newId('cap'), text, enabled: i < 3 }));

export const voiceOverText = (title: string, genre: Genre, variation = 0) =>
  [
    `Một mùa hè. Một lời hứa. Và những bí mật chưa từng được kể. ${title} – câu chuyện về những lựa chọn không thể quay lại.`,
    `Khi mọi thứ tưởng như đã yên bình, một cuộc gọi lúc nửa đêm thay đổi tất cả. ${title}, sắp ra mắt trên FPT Play.`,
    `Có những người ta gặp để thương, có những người ta gặp để hiểu. ${title}, xem trọn bộ trên FPT Play.`,
  ][(variation + (genre === 'action' ? 1 : 0)) % 3];

export function postTitles(title: string): string[] {
  return [`${title} – Trailer chính thức`, `Đừng bỏ lỡ: ${title}`, `${title} | Một phút nghẹt thở`];
}

export function postDesc(title: string, variation = 0): string {
  return [
    `Một câu chuyện khiến bạn không thể rời mắt. Xem trọn bộ ${title} trên FPT Play.`,
    `Ai sẽ là người lựa chọn đúng? Khám phá ${title} ngay hôm nay trên FPT Play.`,
    `Xem hết clip và bạn sẽ hiểu vì sao mọi người đang nói về ${title}. Chỉ có trên FPT Play.`,
  ][variation % 3];
}
