# Trailer AI – Frontend (đội Play Hard)

Giao diện web cho công cụ tạo trailer/highlight từ VOD phim (Hackaithon FPT Play 2026).

Phạm vi: **v7** (`../plan/frontend-plan.md`, mục V7.3 và V7.6).
- **Tính năng** theo `BA-doc/UI spec … .docx` (mục 1, 4–8); mockup HTML của BA chỉ để đối chiếu tính năng.
- **Giao diện** theo UI/UX ban đầu: nền trắng, chỉ giao diện sáng; cam = hành động chính, xanh dương = đang xử lý / nhãn AI / link, xanh lá = xong, đỏ = lỗi; đoạn thủ công xám nét đứt; header ngang (logo + Play Hard), thanh bước ngang 8 bước, thanh hành động dính đáy.
- `legacy-v4/` và `legacy-v5/` không build, không lint.

## Chạy

```bash
npm install
npm run dev                # http://localhost:5173
npm run build              # kiểm tra type + build
npm run lint
npm run build:artifact     # build ra ../artifacts/web (có kèm mock, chạy độc lập)
npm run preview:artifact   # chạy thử tại http://localhost:4173
```

Mặc định dùng **mock (MSW)** trong trình duyệt. Dùng backend thật: đặt `VITE_USE_MOCK=false` và `VITE_API_BASE=https://<be>/api/v1`
(hoặc dùng proxy `/api` khi chạy dev với `API_URL=...`). Mọi thời gian trong API tính bằng **giây**.

## Luồng 8 bước

| Bước | Màn | Có gì |
|---|---|---|
| 1 | Thư viện VOD | Tìm theo tên, lọc thể loại, danh sách + pill trạng thái, thẻ chi tiết + ghi chú, "Tạo clip từ phim này" (khóa khi đang tải lên/lỗi). Thêm VOD: MP4/MOV/MKV ≤ 8 GB, tên, thể loại, 1 request + thanh tiến độ |
| 2 | Template đầu/cuối | 2 tab, mỗi dòng có ảnh nhỏ, Mặc định, Đang bật, Đặt làm mặc định, Xóa (bấm 2 lần); form thêm (V3, V4) |
| 3 | Cấu hình | 7 trường theo spec; khối tiến trình AI chọn đoạn ngay dưới form (Chạy nền, Hủy, lỗi + chạy lại); form khóa khi chạy |
| 4 | Duyệt đoạn AI | Tab phương án, dòng thời gian cả phim (đánh dấu Vào/Ra), thẻ đoạn (↑ ↓, Cắt ghép: 3 điểm tín hiệu, câu thoại, −1/+1 giây trong ±2 giây), Loại/Xóa, đoạn dự phòng + gợi ý bù, khối thời lượng, xác nhận, thêm đoạn thủ công; lớp phủ giai đoạn 2 |
| 5 | Nhạc AI | 2 bản nhạc (dạng sóng, cao trào, prompt), chỉnh và tạo bản mới, âm lượng, ducking. Không có tải nhạc lên |
| 6 | Sub, lời dẫn, caption | 3 tab sửa nội dung; bên phải là khung xem **tĩnh** đúng tỉ lệ (khung đoạn đầu, logo, sub/caption đầu tiên đang bật) |
| 7 | Xem trước và tải | `<video controls>` khi bản dựng có `mp4Url`, còn lại khung tĩnh của đoạn đang chọn; dải đoạn để chọn; công thức thời lượng; phương án chính; tự crop 9:16; Tải MP4 / ZIP; 4 tệp kèm; khóa tải khi có thay đổi chưa dựng (V15) |
| 8 | Đăng bài | 3 tiêu đề, mô tả, hashtag, 3 nền tảng, đăng ngay/hẹn giờ, lỗi từng nền tảng + kết nối lại, chế độ sandbox |

Chưa làm (để giai đoạn sau): chia đôi / nối đoạn trên UI (API và mock vẫn có), tải VOD nối tiếp, nhập VOD bằng link, player phát mô phỏng, Lịch sử.
Không hiện mã use case trên UI; mã UC chỉ ghi trong comment.

## Dữ liệu mẫu (mock)

- 4 VOD: *Mùa Hè Cuối Cùng* (Tâm lý, Sẵn sàng), *Đêm Săn* (Hành động, Đã phân tích trước), *Nhà Có Ba Chị Em* (Hài, đang tải lên 64%), *Tiếng Gọi Dưới Hầm* (Kinh dị, lỗi định dạng).
- Dự án mẫu `prj-demo` (Mùa Hè Cuối Cùng) đã xong 2 giai đoạn, dùng khi demo dự phòng.
- *Đêm Săn* lỗi bước tạo nhạc ở lần chạy giai đoạn 2 đầu tiên (để demo lỗi + chạy lại).
- Tải lên file có tên chứa `loi`/`hong`/`corrupt` → VOD thành "Lỗi định dạng".

## API chính

Định nghĩa ở `src/lib/api.ts` (tiền tố `/api/v1`), kiểu dữ liệu ở `src/types/domain.ts`, luật V1–V18 ở `src/lib/rules.ts`.

| Method | Path | Mục đích |
|---|---|---|
| GET | `/vods?q=&genre=` | Danh sách VOD |
| POST | `/vods` (multipart: `file`, `title`, `genre`) | Thêm VOD (1 request); BE đọc thời lượng, độ phân giải, tạo ảnh đại diện |
| GET/POST/PATCH/DELETE | `/templates…` | Template đầu/cuối |
| POST | `/projects`, `/projects/:id/select` | Tạo dự án + chạy AI chọn đoạn / chọn lại |
| GET/PATCH/POST | `/jobs/:id`, `/jobs/:id/cancel`, `/jobs/:id/stages/:key/retry` | Theo dõi job (poll 2 giây), chạy nền, hủy, chạy lại |
| PUT/POST/PATCH | `/projects/:id/variants/:key`, `/segments…`, `/confirm` | Duyệt đoạn, thêm đoạn thủ công, ±1 giây, xác nhận |
| POST/PATCH | `/variants/:key/music`, `/projects/:id`, `/voiceover/rewrite`, `/render` | Nhạc, sub/lời dẫn/caption, dựng lại |
| GET/POST | `/platforms…`, `/projects/:id/posts…` | Kết nối nền tảng, gợi ý nội dung, đăng |

Thể loại (`genre`) dùng nhãn tiếng Việt: `Tâm lý` · `Tình cảm` · `Hành động` · `Hài` · `Kinh dị`. `Vod.durationSec` có thể `null` khi BE chưa/không đọc được.

## Cấu trúc

```
src/
  app/          App, router, AppShell (header ngang, Stepper 8 bước, thanh hành động dính đáy), theme (màu theo vai trò), brand, steps
  screens/      8 màn: Library, Templates, Config, Review, Music, Text, Preview, Publish
  components/   ui (ScreenHeader, StatusPill, Notice…), inputs, segments, media (StillFrame, SegmentStrip, WaveformCard), Gate
  lib/          api, queries, rules (V1–V18), clip (dòng thời gian clip), thumb (ảnh khung mẫu), format, labels
  mocks/        MSW: fixtures, db (BE giả lập, job theo thời gian thực), handlers
  store/        Zustand (dự án đang làm, phương án đang chọn…)
  types/        domain
```
