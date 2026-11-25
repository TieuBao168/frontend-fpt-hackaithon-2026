# Đề xuất API – Trailer AI (FE ↔ BE)

> Đội Play Hard · Hackaithon FPT Play 2026 · bản 1 (2026-11-25)
> Dựa trên UI spec của BA (mục 8 "Mô hình dữ liệu và API giả định") và phạm vi tính năng plan v7 (`plan/frontend-plan.md`, mục V7.3).
> FE đã có bản mock chạy đúng hợp đồng này: `web/src/mocks/handlers.ts` + `web/src/mocks/db.ts`. Kiểu dữ liệu chuẩn: `web/src/types/domain.ts`. Lời gọi API: `web/src/lib/api.ts`.
> BE có thể đổi tên trường/đường dẫn, chỉ cần giữ đúng ý nghĩa và báo lại để FE sửa một chỗ ở `api.ts`.

---

## 1. Quy ước chung

| Mục | Quy ước |
|---|---|
| Tiền tố | `/api/v1` (FE đọc từ biến `VITE_API_BASE`, mặc định `/api/v1`) |
| Định dạng | JSON UTF-8; upload dùng `multipart/form-data` |
| Thời gian (độ dài, mốc) | **giây**, số thực (vd `754.5`). FE tự định dạng mm:ss / hh:mm:ss |
| Ngày giờ | ISO 8601 UTC (vd `2026-11-25T08:12:00Z`) |
| Id | chuỗi, BE tự sinh |
| Xác thực | Demo: không bắt buộc. Nếu có: `Authorization: Bearer <token>`; trả 401/403 thì FE báo "Phiên đăng nhập hết hạn" |
| Lỗi | HTTP status + body `{ "message": "Câu tiếng Việt cho người dùng", "code"?: "...", "field"?: "...", ...extra }` |
| Mã lỗi dùng | `400` request sai · `401/403` quyền · `404` không thấy · `409` xung đột trạng thái (vd đang có job chạy) · `422` vi phạm luật nghiệp vụ (V1–V18) · `5xx` lỗi BE |
| Kết quả thao tác trên dự án | **Trả về toàn bộ `Project` mới** (FE thay cache một lần, không cần gọi lại GET) |
| Tiến trình | FE **poll `GET /projects/:id` mỗi 2 giây** khi `project.job.status = "running"`. WebSocket/SSE là tùy chọn sau |
| CORS | Nếu FE và BE khác domain: cho phép origin của FE, các method GET/POST/PUT/PATCH/DELETE, header `Content-Type`, `Authorization` |

`message` luôn là câu tiếng Việt hiển thị thẳng cho người dùng (FE đưa vào toast/notice).

---

## 2. Mô hình dữ liệu

Định nghĩa đầy đủ ở `web/src/types/domain.ts`. Tóm tắt các kiểu BE cần trả:

```ts
type Ratio = '9:16' | '16:9';
type Style = 'Cinematic' | 'Dramatic' | 'Funny' | 'Energetic';
type Genre = 'Tâm lý' | 'Tình cảm' | 'Hành động' | 'Hài' | 'Kinh dị';
type VariantKey = 'A' | 'B' | 'C';

interface Vod {
  id: string; title: string; genre: Genre;
  durationSec: number | null;          // null khi chưa đọc được / file lỗi
  resolution: string;                  // vd "1920x1080"
  status: 'ready' | 'analyzed' | 'uploading' | 'error';
  uploadPct?: number;                  // khi uploading
  errorReason?: string;                // khi error, câu tiếng Việt
  thumbnailUrl?: string;
  createdAt: string;
}

interface Template {
  id: string; name: string; type: 'intro' | 'outro';
  durationSec: number;                 // 1..5
  ratios: Ratio[]; enabled: boolean; isDefault: boolean;
  format: string;                      // MP4, MOV, PNG, JPG
  fileUrl?: string; thumbnailUrl?: string; createdAt: string;
}

interface Config {
  goal: 'trailer' | 'teaser' | 'best' | 'character' | 'other';
  goalOther?: string;                  // ≤ 80 ký tự khi goal = other
  ratio: Ratio;
  targetSec: number;                   // tổng clip cuối, ĐÃ GỒM đầu/cuối
  style: Style | null;                 // null = AI gợi ý theo thể loại
  introTemplateId: string | 'default' | 'none';
  outroTemplateId: string | 'default' | 'none';
  variantCount: 1 | 2 | 3;
  extraPrompt?: string;                // ≤ 400 ký tự, gửi kèm cho AI
}

interface Segment {
  id: string; source: 'ai' | 'manual';
  startSec: number; durSec: number;    // mốc trong phim gốc
  trimSec: number;                     // lệch so với gốc AI, |trimSec| ≤ 2 với đoạn AI
  title: string; act: 1 | 2 | 3;
  score?: number;                      // 0..100, chỉ đoạn AI
  reason?: string;                     // ≤ 20 từ, chỉ đoạn AI
  signals?: { visual: number; audio: number; dialogue: number };  // 0..1
  quote?: string;                      // câu thoại gốc nếu có
  parentId?: string; thumbnailUrl?: string;
  subjectX?: number;                   // 0..1 vị trí ngang nhân vật chính (crop 9:16)
}

interface MusicTrack {
  id: string; label: string;           // "Bản A"
  bpm: number; mood: string; instruments: string;
  durationSec: number; climaxSec: number;
  prompt: string;                      // prompt đã gửi công cụ sinh nhạc (bằng chứng nhạc AI)
  waveform: number[];                  // 64 giá trị 0..1 để vẽ dạng sóng
  tool: string; model: string; seed: number; createdAt: string;
  audioUrl?: string;
}

interface Variant {
  key: VariantKey; style: Style; isPrimary: boolean;
  order: string[];                     // id đoạn theo thứ tự trong clip
  reserve: string[];                   // id đoạn dự phòng do AI chọn
  music?: MusicTrack[]; selectedMusicId?: string;
}

type StageKey = 'scene' | 'audio' | 'rank' | 'music' | 'subtitle' | 'template' | 'render';
interface Stage { key: StageKey; status: 'waiting' | 'running' | 'done' | 'error'; pct: number; reusedFromCache?: boolean; error?: string }
interface Job {
  id: string;
  phase: 1 | 2 | 3;                    // 1 chọn đoạn · 2 nhạc/sub/dựng · 3 dựng lại
  status: 'running' | 'done' | 'cancelled' | 'error';
  stages: Stage[]; etaSec?: number; background: boolean;
}

interface Subtitle { id: string; segmentId: string; startSec: number; endSec: number; text: string }  // tính từ đầu đoạn
interface VoiceOver { enabled: boolean; text: string; voice: 'female_warm' | 'male_deep' | 'male_young' }
interface Caption { id: string; text: string; enabled: boolean; segmentId?: string }

interface VersionFile {
  variant: VariantKey;
  fileName: string;                    // TenPhim_A_Dramatic_9x16_v1.mp4
  resolution: string;                  // 1080x1920
  mp4Url?: string;                     // link tải/xem MP4 (FE dùng cho thẻ <video>)
  timestampsJson: string;              // nội dung file timestamp (.json)
  srt: string; voTxt: string; captionTxt: string;
}
interface Version { v: number; createdAt: string; note: string; files: VersionFile[] }

interface Project {
  id: string; vodId: string; vodTitle: string; vodDurationSec: number; vodGenre: Genre; vodAnalyzed: boolean;
  config: Config;
  suggestedStyle: Style;               // phong cách AI gợi ý khi config.style = null
  intro?: { id: string; name: string; durationSec: number };   // template thực sự được chèn
  outro?: { id: string; name: string; durationSec: number };
  variants: Variant[];
  segments: Record<string, Segment>;   // mọi đoạn (đang dùng + dự phòng + thủ công)
  dialogueRanges: { startSec: number; endSec: number }[];      // khoảng có thoại (ASR) – FE cảnh báo cắt giữa thoại
  subtitles: Subtitle[]; subtitleEnabled: boolean;
  voiceOver: VoiceOver; captions: Caption[];
  musicVolumePct: number; ducking: boolean; autoCrop: boolean;
  versions: Version[];
  dirty: boolean;                      // có thay đổi sau bản dựng gần nhất
  job?: Job;                           // job gần nhất (đang chạy hoặc vừa xong)
  phase1Done: boolean; phase2Done: boolean;
  postDraft?: { titles: string[]; title: string; desc: string; tags: string[] };
  posts: Post[]; publishedV?: number;
  createdAt: string;
}

type Platform = 'facebook' | 'tiktok' | 'youtube';
interface PlatformState { platform: Platform; connected: boolean; tokenExpired?: boolean }
interface Post { platform: Platform; connected: boolean; status: 'idle' | 'ok' | 'error' | 'scheduled'; error?: string; url?: string; scheduleAt?: string }
```

**Ghi chú cho BE**
- `Project.segments` là kho chung; mỗi phương án chỉ giữ danh sách id (`order`, `reserve`). Đoạn thủ công cũng nằm trong `segments`.
- Trường `subtitleEnabled`, `dialogueRanges`, `suggestedStyle`, `intro/outro`, `subjectX`, `waveform` **không có trong spec mục 8** nhưng FE cần (đã dùng trong mock).
- FE tự tính "pill trạng thái" từ `job`, `phase1Done`, `phase2Done`, `versions`, `dirty`, `publishedV` – BE không cần trả nhãn.

---

## 3. Danh sách endpoint

### 3.1 Bước 1 – Thư viện VOD

| Method · Path | Body | Trả về | Ghi chú |
|---|---|---|---|
| `GET /vods` | – | `Vod[]` | Mới nhất trước. FE tự lọc theo tên/thể loại (có thể thêm `?q=&genre=` sau) |
| `POST /vods` | multipart: `file`, `title`, `genre` | `Vod` (status `uploading`) | Phạm vi v7: **1 request**. BE kiểm tra định dạng MP4/MOV/MKV, ≤ 8 GB (V18); sau đó đọc độ dài, độ phân giải, tạo ảnh đại diện rồi chuyển `ready` hoặc `error` + `errorReason` |

- Lỗi 422: `"Định dạng không hỗ trợ. Chỉ nhận MP4, MOV, MKV."`, `"File vượt 8 GB."`, `"Thiếu tên phim."`.
- FE poll `GET /vods` mỗi 1,5 giây khi còn VOD `uploading`.
- **Giai đoạn sau (spec yêu cầu tải nối tiếp):** đề xuất kiểu tus – `POST /vods/uploads {fileName,size,title,genre}` → `{uploadId, offset}`; `PATCH /vods/uploads/:id` (header `Upload-Offset`, body là phần file) → `{offset}`; `GET /vods/uploads/:id` → `{offset,size}`; lệch vị trí trả `409 {offset}`. FE đã có code sẵn (`lib/upload.ts`), chỉ bật khi BE hỗ trợ.

### 3.2 Bước 2 – Template đầu/cuối

| Method · Path | Body | Trả về | Ghi chú |
|---|---|---|---|
| `GET /templates?type=intro\|outro` | – | `Template[]` | Không truyền `type` thì trả cả hai |
| `POST /templates` | multipart: `file`, `name`, `type`, `ratios` (JSON `["16:9"]`), `durationSec`, `format`, `width`, `height` | `Template` | V3: 1–5 giây, ≤ 50 MB, đúng độ phân giải của tỉ lệ (16:9 = 1920x1080, 9:16 = 1080x1920). Template đầu tiên của mỗi loại tự thành mặc định (V4) |
| `PATCH /templates/:id` | `{ enabled?, isDefault? }` | `Template[]` (cùng loại) | V4: mỗi loại đúng 1 mặc định; tắt thì mất mặc định; chưa bật thì không đặt mặc định được (422) |
| `DELETE /templates/:id` | – | `204` | |

Lỗi 422 mẫu: `"File 1280x720 không đúng 1920x1080 của khung 16:9."`, `"Thời lượng phải từ 1 đến 5 giây."`, `"File lớn hơn 50 MB."`.

### 3.3 Bước 3 – Cấu hình và giai đoạn 1 (AI chọn đoạn)

| Method · Path | Body | Trả về | Ghi chú |
|---|---|---|---|
| `POST /projects` | `{ vodId, config: Config }` | `Project` có `job.phase = 1` đang chạy | Tạo dự án + job giai đoạn 1. VOD `uploading/error` → 422 (V18). `targetSec` ngoài khung → 422 (V1) |
| `POST /projects/:id/select` | `Config` | `Project` | "Chọn lại đoạn với cấu hình mới": chạy lại giai đoạn 1, **xóa** kết quả chọn đoạn, chỉnh sửa và bản dựng cũ |
| `GET /projects/:id` | – | `Project` | Poll 2 giây khi job chạy |
| `PATCH /jobs/:id` | `{ background: true }` | `Job` | "Chạy nền, báo tôi khi xong" (chỉ là cờ, FE dùng để quyết định tự chuyển màn hay toast) |
| `POST /jobs/:id/cancel` | – | `Project` | Dừng job, **giữ** kết quả các việc đã xong; `job.status = cancelled` |
| `POST /jobs/:id/stages/:key/retry` | – | `Project` | Chạy lại từ việc lỗi/đã hủy, giữ các việc đã xong |

**Giai đoạn 1 – 3 việc**: `scene` (tách cảnh, phân tích hình ảnh) → `audio` (âm thanh, chép lời thoại) → `rank` (chấm điểm, chọn, sắp xếp đoạn).
- VOD đã phân tích trước: `scene`, `audio` trả `done` ngay với `reusedFromCache: true`.
- Xong: `phase1Done = true`, mỗi phương án có `order` (đoạn AI theo cấu trúc 3 hồi) + `reserve` (≥ 3 đoạn dự phòng), `dialogueRanges` đã có.
- BE tự loại cảnh trong 15% cuối phim (V12) – **UI không hiển thị**.
- Tổng `durSec` các đoạn AI ≈ `targetSec − (intro + outro)` (V2).

### 3.4 Bước 4 – Duyệt đoạn AI và giai đoạn 2

| Method · Path | Body | Trả về | Ghi chú |
|---|---|---|---|
| `PUT /projects/:id/variants/:key` | `{ order: string[], reserve?: string[] }` | `Project` | Đổi thứ tự (↑ ↓), "Loại" đoạn AI (chuyển sang `reserve`), "Xóa" đoạn thủ công, "Thêm" từ dự phòng. Đặt `dirty` nếu đã có bản dựng |
| `POST /projects/:id/variants/:key/resuggest` | – | `Project` | "AI đề xuất lại" khi đã loại hết đoạn AI: khôi phục danh sách AI gốc |
| `PATCH /projects/:id/segments/:segId` | `{ delta: -1 \| 1 }` | `Project` | Cắt ngắn/nới 1 giây ở cuối đoạn. Đoạn AI: `|trimSec + delta| ≤ 2` (V7); mọi đoạn ≥ 1 giây; thủ công ≤ 60 giây |
| `POST /projects/:id/segments` | `{ variant, startSec, endSec, title, afterIndex: number \| null }` | `Project` | Thêm đoạn thủ công (`afterIndex = null` là cuối clip). Lỗi cứng V8: Ra ≤ Vào, dài > 60 giây, ngoài độ dài phim, làm tổng vượt giới hạn đề → 422. Cảnh báo mềm V9/V10 do FE hỏi "Vẫn thêm" trước khi gọi |
| `POST /projects/:id/confirm` | – | `Project` có `job.phase = 2` | Xác nhận **mọi phương án** cùng lúc (V11). Phương án sai → `422 { message, variant: "B" }` để FE chuyển tab. Đã có bản dựng thì đây là "Duyệt và dựng lại" |

*Để giai đoạn sau (UI v7 chưa dùng):* `POST /projects/:id/segments/:segId/split` `{variant}` và `POST /projects/:id/segments/merge` `{variant, a, b}` (chia đôi / nối 2 đoạn liền kề cả trong clip lẫn trong phim gốc).

**Giai đoạn 2 – 4 việc**: `music` (nhạc AI theo nhịp đoạn cắt) → `subtitle` (sub, lời dẫn, caption) → `template` (chèn đầu/cuối) → `render` (dựng, xuất MP4).
- Xong: mỗi phương án có `music` (≥ 2 bản, `selectedMusicId`), có `subtitles` cho đoạn có thoại, `voiceOver.text`, `captions`; thêm 1 `Version` mới; `phase2Done = true`, `dirty = false`.
- Lỗi sinh nhạc: `stage.status = error`, `error = "Dịch vụ sinh nhạc không phản hồi sau 2 lần thử."`; **không bao giờ thay bằng nhạc có sẵn** (V13).

### 3.5 Bước 5–7 – Nhạc, sub/lời dẫn/caption, xem trước và tải

| Method · Path | Body | Trả về | Ghi chú |
|---|---|---|---|
| `POST /projects/:id/variants/:key/music` | `{ mood?, bpm?, instruments? }` | `Project` | "Tạo bản mới": thêm 1 `MusicTrack` (Bản C, D…) và chọn luôn; đặt `dirty`. BPM 60–160 |
| `PATCH /projects/:id` | một phần của: `subtitles`, `subtitleEnabled`, `voiceOver`, `captions`, `musicVolumePct`, `ducking`, `autoCrop`, `selectedMusic: {variant, id}`, `primary: "A"` | `Project` | Lưu chỉnh sửa màn 5–7, đặt `dirty = true` (riêng `primary` thì không). Giới hạn V17: sub ≤ 120, lời dẫn ≤ 600, caption ≤ 60 ký tự |
| `POST /projects/:id/voiceover/rewrite` | – | `Project` | "AI viết lại" lời dẫn (không lộ kết phim) |
| `POST /projects/:id/render` | – | `Project` có `job.phase = 3` | "Dựng lại thành vN+1": việc `template` → `render`; xong thêm `Version`, `dirty = false`. Bản cũ vẫn giữ |
| `GET /versions/:v/download?variant=A` | – | file MP4 | Hoặc trả sẵn `mp4Url` trong `VersionFile` (FE ưu tiên `mp4Url`) |
| `GET /versions/:v/zip` | – | file ZIP | Tất cả phương án + tệp kèm |

- Tệp kèm (`timestampsJson`, `srt`, `voTxt`, `captionTxt`) trả **nội dung** trong `VersionFile`; FE hiển thị, sao chép, tải về phía trình duyệt.
- `timestampsJson` cần có: thứ tự, nguồn (`ai`/`manual`), mốc gốc vào/ra, mốc trong clip, điểm và lý do (đoạn AI), đầu/cuối clip, thông tin nhạc (công cụ, model, seed, prompt) – phục vụ bài nộp.
- MP4: H.264/AAC, 1080x1920 (9:16) hoặc 1920x1080 (16:9). Tên file: `TenPhim_<variant>_<Style>_<ratio>_v<n>.mp4`.
- Khi `dirty = true` hoặc đang có job `phase = 3`, FE khóa nút Tải (V15).

### 3.6 Bước 8 – Đăng bài

| Method · Path | Body | Trả về | Ghi chú |
|---|---|---|---|
| `GET /platforms` | – | `PlatformState[]` | Trạng thái kết nối Facebook/TikTok/YouTube |
| `POST /platforms/:platform/connect` | – | `PlatformState[]` | "Kết nối lại" (demo: giả lập) |
| `POST /projects/:id/posts/suggest` | – | `Project` (có `postDraft`) | AI đề xuất 3 tiêu đề + mô tả + hashtag; gọi lại = "Tạo lại giọng văn khác" |
| `POST /projects/:id/posts` | `{ platforms, title, desc, tags, scheduleAt? }` | `Project` (có `posts`) | Mỗi nền tảng đăng **độc lập**; nền tảng hết token trả `status: error` + `error`, các nền tảng khác vẫn đăng. Tiêu đề ≤ 100 ký tự, `dirty = true` → 422 (V15, V16). Demo: sandbox, `url` giả lập |

---

## 4. Vòng đời dự án và job

```
POST /projects ──► job phase 1 running ──► done ──► phase1Done (Chờ duyệt đoạn)
                         │  └► error ─► retry stage ─┘
                         └► cancel (giữ việc đã xong) ─► retry
Chỉnh đoạn (PUT variant, PATCH segment, POST segment, resuggest)
POST /confirm ──► job phase 2 running ──► done ──► Version v1, phase2Done (vN sẵn sàng xem trước)
Chỉnh màn 5–7 (PATCH project, POST music, rewrite VO) ──► dirty = true (Có thay đổi chưa dựng)
POST /render ──► job phase 3 running ──► done ──► Version vN+1, dirty = false
POST /posts ──► publishedV = vN (Đã đăng vN)
```

- Khi có job `running`, các thao tác thay đổi dự án nên trả **409** `"Đang có tác vụ chạy."`.
- `project.job` luôn là job gần nhất, kể cả đã `done`/`cancelled`/`error` (FE dựa vào đó để hiện lỗi, nút chạy lại, tự chuyển màn).
- `etaSec`: ước tính giây còn lại (FE hiện "còn khoảng N phút").

---

## 5. Luật kiểm tra – ai kiểm ở đâu

FE kiểm trước để phản hồi nhanh, **BE kiểm lại** và trả 422 với `message` tiếng Việt.

| Mã | Luật | BE trả lỗi ở |
|---|---|---|
| V1 | Tổng clip cuối (gồm đầu/cuối): 9:16 từ 15 đến 90 giây, 16:9 từ 180 đến 600 giây | `POST /projects`, `/select`, `/segments`, `/confirm` |
| V2 | Thời lượng AI cần chọn = `targetSec` − giây đầu/cuối | Logic giai đoạn 1 |
| V3 | Template 1–5 giây, ≤ 50 MB, đúng độ phân giải tỉ lệ | `POST /templates` |
| V4 | Mỗi loại đúng 1 mặc định; tắt thì mất mặc định | `PATCH /templates/:id` |
| V5 | Mỗi phương án còn ít nhất 1 đoạn AI | `POST /confirm` |
| V6 | Đoạn thủ công > 50% thời lượng | Chỉ cảnh báo (FE) |
| V7 | Đoạn AI chỉ lệch ±2 giây so với gốc | `PATCH /segments/:id` |
| V8 | Đoạn thủ công: Ra sau Vào, ≤ 60 giây, trong độ dài phim | `POST /segments` |
| V9, V10 | Cắt giữa câu thoại; trùng đoạn đã có | Chỉ cảnh báo (FE, dựa `dialogueRanges`) |
| V11 | Xác nhận mọi phương án cùng lúc; sai thì báo phương án nào | `POST /confirm` (`variant` trong body lỗi) |
| V12 | Loại cảnh trong 15% cuối phim | Logic giai đoạn 1 (không hiện trên UI) |
| V13 | Nhạc chỉ do AI tạo, không upload, lỗi không thay nhạc có sẵn | Giai đoạn 2, `POST /music` |
| V14 | Đang chạy giai đoạn 1 thì không đổi cấu hình | `POST /select` → 409 |
| V15 | Có thay đổi chưa dựng thì không tải/đăng | `POST /posts` |
| V16 | Tiêu đề ≤ 100 ký tự; TikTok nên < 5 hashtag (chỉ cảnh báo) | `POST /posts` |
| V17 | Giới hạn ký tự: mục tiêu khác 80, mô tả thêm 400, sub 120/dòng, lời dẫn 600, caption 60 | Các endpoint tương ứng |
| V18 | VOD chưa tải xong/lỗi thì không tạo clip; ≤ 8 GB, MP4/MOV/MKV | `POST /vods`, `POST /projects` |

---

## 6. Câu hỏi cần BE chốt

1. Đồng ý trả **toàn bộ `Project`** sau mỗi thao tác? (Nếu muốn trả gọn hơn, FE cần thêm một lần `GET /projects/:id`.)
2. Poll 2 giây có ổn cho máy chủ? Có làm WebSocket/SSE không?
3. Upload VOD: giai đoạn demo dùng 1 request; khi nào hỗ trợ tải nối tiếp (tus)?
4. `mp4Url` và `thumbnailUrl`: link tĩnh hay link ký tạm (hết hạn)? Nếu hết hạn, FE cần endpoint lấy link mới.
5. Có dự án mẫu dựng sẵn để demo (BR-34) không, id là gì?
6. Tên trường có muốn đổi theo quy ước BE (snake_case…)? FE chỉ sửa ở `web/src/lib/api.ts`.
7. Đăng bài thật hay sandbox trong buổi demo?
