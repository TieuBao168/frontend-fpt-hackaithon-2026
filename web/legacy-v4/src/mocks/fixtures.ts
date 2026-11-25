import type {
  Act,
  AudioLayer,
  Cue,
  GenerationConfig,
  MusicTrack,
  Platform,
  PostDraft,
  Segment,
  Style,
  VisualSettings,
  Vod,
} from '../types/domain';
import { BRAND } from '../app/brand';

// Dữ liệu giả để FE chạy độc lập. Tên phim là giả định.
export const vods: Vod[] = [
  {
    id: 'vod-1',
    title: 'Mùa Hè Định Mệnh',
    genre: 'romance',
    durationSec: 6420,
    resolution: '1920×1080',
    status: 'ready',
    analyzed: true,
    createdAt: '2026-11-24T08:12:00Z',
  },
  {
    id: 'vod-2',
    title: 'Truy Đuổi Lúc Nửa Đêm',
    genre: 'action',
    durationSec: 7110,
    resolution: '1920×1080',
    status: 'ready',
    analyzed: true,
    createdAt: '2026-11-24T09:40:00Z',
  },
  {
    id: 'vod-3',
    title: 'Căn Nhà Cuối Hẻm',
    genre: 'horror',
    durationSec: 5880,
    resolution: '3840×2160',
    status: 'ready',
    analyzed: false,
    createdAt: '2026-11-25T02:05:00Z',
  },
];

const segmentPool: { labels: string[]; reason: string }[] = [
  { labels: ['Thoại đắt', 'Tạo tò mò'], reason: 'Câu thoại mở vấn đề + cận mặt nhân vật chính, tạo hook mạnh.' },
  { labels: ['Bối cảnh'], reason: 'Toàn cảnh bối cảnh chính, ánh sáng rõ, giới thiệu không gian phim.' },
  { labels: ['Nhân vật'], reason: 'Nhân vật chính xuất hiện lần đầu, biểu cảm rõ, khung hình sạch.' },
  { labels: ['Xung đột'], reason: 'Tranh cãi gay gắt, âm lượng tăng, nhịp cắt nhanh.' },
  { labels: ['Cảm xúc'], reason: 'Khoảng lặng + cận mặt, cảm xúc mạnh, không cần thoại.' },
  { labels: ['Hành động'], reason: 'Chuyển động lớn, đổi khung hình liên tục, âm thanh dồn dập.' },
  { labels: ['Thoại đắt'], reason: 'Câu thoại ngắn, nhiều ý nghĩa, không lộ kết phim.' },
  { labels: ['Cao trào'], reason: 'Âm thanh dồn dập + cận mặt, điểm cao nhất trước phần kết.' },
  { labels: ['Câu treo'], reason: 'Câu hỏi bỏ ngỏ, kết thúc treo, không spoil.' },
];

const dialoguePool = [
  'Anh có chắc đây là lựa chọn đúng không?',
  'Mọi chuyện bắt đầu từ mùa hè năm đó.',
  'Đừng quay đầu lại, dù có nghe thấy gì.',
  'Chúng ta không còn nhiều thời gian nữa.',
  'Nếu được làm lại, tôi vẫn sẽ chọn như vậy.',
  'Có ai đó đang theo dõi chúng ta.',
  'Lần này, tôi sẽ không bỏ chạy.',
  'Bí mật đó… cô ấy đã giữ suốt mười năm.',
  'Cậu nghĩ mình hiểu tôi sao?',
  'Câu trả lời ở ngay trước mắt.',
];

let seq = 0;
const nextId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
export const newId = nextId;

/** Sinh danh sách đoạn khớp thời lượng mục tiêu. */
export function generateSegments(vod: Vod, config: GenerationConfig, variation = 0): Segment[] {
  const target = config.durationSec * 1000;
  const fast = config.pacing === 'fast';
  const segLen = config.outputType === 'short' ? (fast ? 2600 : 4000) : fast ? 8000 : 12000;
  const count = Math.max(3, Math.round(target / segLen));
  const safeEnd = vod.durationSec * 1000 * (config.spoilerGuard ? 0.85 : 1);

  return Array.from({ length: count }, (_, i) => {
    const pool = segmentPool[(i + variation) % segmentPool.length];
    const act: Act = i < Math.ceil(count * 0.25) ? 'open' : i >= count - Math.ceil(count * 0.2) ? 'end' : 'body';
    const start = Math.round((((i * 7919 + variation * 104729) % 97) / 97) * (safeEnd - segLen));
    return {
      id: nextId('seg'),
      startMs: start,
      endMs: start + segLen + ((i * 37) % 5) * 100,
      order: i,
      act,
      score: Math.round((0.95 - i * 0.015 - variation * 0.01) * 100) / 100,
      labels: pool.labels,
      reason: pool.reason,
      subjectX: 0.25 + (((i + variation) * 0.37) % 0.5),
      signals: [
        { name: 'Âm thanh', score: 0.6 + ((i * 13) % 40) / 100 },
        { name: 'Khuôn mặt', score: 0.5 + ((i * 7) % 50) / 100 },
        { name: 'Lời thoại', score: 0.4 + ((i * 11) % 60) / 100 },
      ],
    };
  });
}

export function defaultVisual(config: GenerationConfig, style: Style): VisualSettings {
  return {
    crop: config.ratio === '9:16' ? (config.extras.smartCrop ? 'subject' : 'center') : 'center',
    logo: { enabled: true, corner: config.ratio === '9:16' ? 'tl' : 'tr', size: 'S' },
    endCard: { enabled: true, sec: 3 },
    transition: style === 'energetic' ? 'flash' : style === 'funny' ? 'cut' : 'fade',
  };
}

export function generateMusic(config: GenerationConfig, variation = 0, count = 3): MusicTrack[] {
  const mood = config.music?.mood || (config.style === 'energetic' ? 'dồn dập' : 'cảm xúc, điện ảnh');
  const baseTempo = config.music?.tempo ?? (config.pacing === 'fast' ? 120 : config.pacing === 'slow' ? 72 : 96);
  return Array.from({ length: count }, (_, i) => {
    const tempo = baseTempo + (i - 1) * 6;
    return {
      id: nextId('trk'),
      tool: 'MusicGen (mock)',
      model: 'musicgen-medium',
      version: '1.0',
      prompt: `Nhạc nền trailer phim, mood ${mood}, tempo ${tempo} BPM, dài ${config.durationSec}s, cao trào ở 80% thời lượng`,
      params: { tempo, durationSec: config.durationSec, mood },
      seed: 1000 + variation * 100 + i * 17,
      createdAt: new Date().toISOString(),
    };
  });
}

export function generateCues(segments: Segment[], variation = 0): Cue[] {
  const cues: Cue[] = [];
  let offset = 0;
  segments.forEach((s, i) => {
    const len = s.endMs - s.startMs;
    const hasLine = s.labels.some((l) => l.includes('Thoại') || l.includes('Câu treo')) || (i + variation) % 3 === 0;
    if (hasLine && len >= 1500) {
      cues.push({
        id: nextId('cue'),
        startMs: offset + 200,
        endMs: offset + len - 200,
        text: dialoguePool[(i + variation) % dialoguePool.length],
      });
    }
    offset += len;
  });
  return cues;
}

export function generateAudioLayer(config: GenerationConfig, segments: Segment[], variation = 0): AudioLayer {
  const musicTracks = generateMusic(config, variation);
  const subtitleCues = generateCues(segments, variation);
  return {
    musicTracks,
    selectedTrackId: musicTracks[0].id,
    subtitleCues,
    speechRanges: subtitleCues.map(({ startMs, endMs }) => ({ startMs, endMs })),
    mix: {
      originalGain: 1,
      musicGain: config.music?.volumeRatio ?? 0.35,
      voiceoverGain: 0.9,
      ducking: 'medium',
      fadeInSec: 0.5,
      fadeOutSec: 1.5,
    },
    subtitle: { enabled: config.extras.subtitle, template: 'clean', size: 'M', position: 'bottom' },
  };
}

const tagBase: Record<Vod['genre'], string[]> = {
  action: ['phimhanhdong', 'actionmovie'],
  romance: ['phimtinhcam', 'ngontinh'],
  drama: ['phimtamly', 'drama'],
  horror: ['phimkinhdi', 'horror'],
  comedy: ['phimhai', 'comedy'],
  other: ['phimhay'],
};

export function generatePost(vod: Vod, platform: Platform): PostDraft {
  const slug = vod.title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/\s+/g, '');
  const tags = ['FPTPlay', slug, ...tagBase[vod.genre], 'trailer'];
  const options = [
    {
      title: `${vod.title} – Trailer chính thức`,
      description: `Một câu chuyện khiến bạn không thể rời mắt. ${BRAND.watchCta}.`,
      hashtags: tags,
    },
    {
      title: `Đừng bỏ lỡ: ${vod.title}`,
      description: `Ai sẽ là người lựa chọn đúng? Khám phá ngay – ${BRAND.watchCta.toLowerCase()}.`,
      hashtags: [...tags, 'phimhay'],
    },
    {
      title: `${vod.title} | 60 giây nghẹt thở`,
      description: `Xem hết 60 giây và bạn sẽ hiểu vì sao mọi người đang nói về bộ phim này. ${BRAND.watchCta}.`,
      hashtags: tags.slice(0, 4),
    },
  ];
  if (platform === 'tiktok') options.forEach((o) => (o.title = o.title.slice(0, 80)));
  return { platform, options, chosen: 0, ...options[0], status: 'draft' };
}
