# Đối chiếu UI spec (BA) với UI hiện tại

> Nguồn: `BA-doc/UI spec – Trailer AI cho phim (FPT Play Hackathon).docx` (25/11/2026, @Han) so với `web/` bản v4.
> Ký hiệu: ✅ đạt · 🟡 một phần · ❌ chưa có · ⚠️ lệch với spec (UI đang làm khác)

## 1. Kết luận nhanh

**UI hiện tại chưa đáp ứng UI spec.** Ước lượng ~35–40% nội dung dùng lại được (mock, luồng 2 giai đoạn, đăng bài, phần preview), nhưng khung ứng dụng, quy ước màu và phạm vi chỉnh sửa khác spec ở mức cấu trúc.

Ba điểm lệch lớn nhất:

1. **Chỉnh sửa đoạn thủ công** – spec yêu cầu (↑↓, cắt ±1 giây, chia đôi, nối, loại về dự phòng, thêm đoạn thủ công bằng mốc vào/ra trên timeline cả phim). Theo yêu cầu trước đó của đội ("không dùng tay để edit video"), UI đã **bỏ toàn bộ** phần này. → **Cần chốt lại** (mục 4).
2. **Khung ứng dụng** – spec là wizard 8 bước với thanh bên 220px, thanh trên có pill trạng thái + "Dựng lại thành vN", chân màn Quay lại / Bước k/8 / Tiếp tục. UI hiện tại là header ngang + 1 màn "Preview Studio" nhiều tab.
3. **Template đầu/cuối (UC-J.1–J.3)** – cả một màn và phần tính thời lượng "đã gồm đầu/cuối" chưa có. UI đang dùng "end card" tự vẽ thay thế.

## 2. Theo từng phần của spec

### 2.1 Design tokens & quy ước chung

| Yêu cầu spec | Hiện trạng | |
|---|---|---|
| Nền sáng **và tối** (prefers-color-scheme) | Chỉ nền sáng | ❌ |
| Chỉ 1 font Be Vietnam Pro | Có thêm JetBrains Mono cho timecode | ⚠️ |
| Token màu (bg, ink, muted, line, panel, shell, accent #f26a21, manual #2f6fdb, ok, bad…) | Bảng màu riêng (cam #F26F21, xanh dương #1E6FD9, xanh lá #22A45D) | 🟡 gần, cần đổi theo token |
| **Cam = AI đề xuất**, xanh lam = thủ công/template, xanh lá = xong, đỏ = lỗi | Cam = nút chính; **nhãn "AI" đang màu xanh dương**; xanh dương = đang xử lý | ⚠️ |
| Thân chữ 16px, không dưới 12px; tiêu đề 21/17px | Chữ 13–14px, nhiều chỗ 10–11px | ⚠️ |
| Nút/input cao ≥ 44px, chip 40px, input 16px | Nhiều nút size xs (~30px) | ⚠️ |
| Focus outline 2px cam, tắt chuyển động khi reduced-motion | Mặc định Mantine | ❌ |
| Breakpoint 900px (thanh bên → hàng cuộn ngang) và 600px (thẻ thu gọn, bảng xếp chồng) | Chưa tối ưu; thanh hành động che player dưới ~992px | ❌ |
| Toast ở đáy màn, tự tắt 2,8 giây | Notification góc trên phải | 🟡 |

### 2.2 Khung ứng dụng (mục 3)

| Yêu cầu spec | Hiện trạng | |
|---|---|---|
| Thanh bên 220px, nền shell, logo "FPT Play Trailer AI", 8 bước kèm mã UC, bước đang chọn có vạch cam | Header ngang: logo + Play Hard + 2 mục menu | ❌ |
| Thanh trên: breadcrumb, tên dự án, **ProjectStatusPill** (9 giá trị), nút "Dựng lại thành vN" | Tiêu đề trang + StatusBadge (10 trạng thái khác tên) | 🟡 |
| Chân màn: Quay lại · "Bước k/8" · Tiếp tục (đổi nhãn theo màn) | Thanh hành động riêng trong Preview Studio | ❌ |
| ScreenHeader + UseCaseChip (cam đặc = Bắt buộc, viền cam = Tùy chọn) | Không có chip mã UC | ❌ |
| Chạy nền: pill thanh trên hiện %, xong có toast | Có toast khi xong; chưa có "Chạy nền", chưa có pill % | 🟡 |
| Ẩn Lịch sử bằng cờ `SHOW_HIST=false` | Trang Lịch sử đang hiện | ⚠️ |
| Component dùng chung (RatioPicker, DurationInput, StageList, MeterRow, VariantTabs, FilmTimeline, SegmentCard, SegmentEditor, DurationBudget, TemplateThumb, ClipPlayer, SegmentStrip, WaveformCard, Notice…) | Có tương đương: StageList (ProcessingView), VariantTabs (SegmentedControl), ClipPlayer (PreviewStage), SegmentStrip (Scrubber), EmptyState. Thiếu: RatioPicker, DurationInput mm:ss, FilmTimeline, SegmentEditor, DurationBudget, TemplateThumb, WaveformCard, UseCaseChip | 🟡 |

### 2.3 Màn 1 – Thư viện VOD

| Yêu cầu spec | Hiện trạng | |
|---|---|---|
| 2 cột: danh sách VodRow bên trái, thẻ chi tiết bên phải + "Tạo clip từ phim này" | Lưới thẻ, nút "Tạo clip" trên từng thẻ | ⚠️ |
| "Thêm VOD" đổi cột phải thành form tải lên | Modal | ⚠️ |
| **Không có nhập bằng link** | Có tab "Dán link" | ⚠️ cần bỏ |
| Tối đa **8 GB**, MP4/MOV/MKV | 20 GB, có thêm WEBM | ⚠️ |
| Upload bị ngắt thì tải tiếp (resumable) | Một request XHR, không nối tiếp | ❌ |
| Pill: Sẵn sàng · Đã phân tích trước (+notice dùng lại) · **Đang tải lên N%** · Lỗi định dạng (+lý do) | Có Sẵn sàng/Đã phân tích/Đang xử lý/Lỗi file; chưa hiện % trên thẻ, chưa có notice | 🟡 |
| Chip lọc: Tất cả, Tâm lý, Hành động, Hài, Kinh dị | Có thêm Tình cảm, Khác | 🟡 |
| Trạng thái rỗng + nút "Thêm VOD" | Có | ✅ |

### 2.4 Màn 2 – Template đầu/cuối (UC-J.1)

Toàn bộ **❌ chưa có**: 2 tab Đầu/Cuối, TemplateRow (bật/tắt, đặt mặc định, xóa 2 lần bấm), xem trước, form thêm (MP4/MOV/PNG/JPG, tỉ lệ, 1–5 giây, ≤ 50 MB, kiểm tra độ phân giải), luật V3–V4, trạng thái rỗng.

### 2.5 Màn 3 – Cấu hình và AI chọn đoạn

| Yêu cầu spec | Hiện trạng | |
|---|---|---|
| Form 1 cột ≤ 820px, 7 trường đúng thứ tự | Form 2 cột, nhiều nhóm trường | ⚠️ |
| Mục tiêu: ChipGroup, có "Khác" + ô tự do 80 ký tự | Select, không có "Khác" | 🟡 |
| RatioPicker (2 thẻ có hình khung, độ phân giải, khoảng thời lượng); đổi tỉ lệ thì kẹp thời lượng | SegmentedControl loại đầu ra + tỉ lệ | 🟡 |
| DurationInput: slider + ô nhập "1:30"/"90", lỗi tại ô; **tổng đã gồm đầu/cuối** | Slider, không có ô nhập, không tính đầu/cuối | 🟡 |
| Phong cách tên tiếng Việt (Điện ảnh, Kịch tính, Hài hước, Sôi động), gợi ý theo thể loại có ghi chú | Tên tiếng Anh, có gợi ý | 🟡 |
| Select template đầu/cuối + dòng "AI sẽ chọn khoảng mm:ss" + "Quản lý template" | Không có | ❌ |
| Số phương án 1/2/3 | Có (NumberInput) | ✅ |
| Mô tả thêm ≤ 400 ký tự, **không có bước AI phân tích prompt trên UI** | Có ô prompt + nút "Áp vào cấu hình" (AI tách tham số) | ⚠️ cần bỏ |
| Không có: nhịp cắt, nhân vật ưu tiên, tránh spoil, nhạc, kèm theo, chế độ Tự động/Có duyệt | UI đang có tất cả các trường này | ⚠️ thừa so với spec |
| **SelectionProgressCard ngay dưới form**, form mờ 55% + khóa khi chạy (V14), "Chạy nền", "Hủy", 4 trạng thái; xong thì tự sang màn 4 | Chuyển sang trang xử lý riêng; có Hủy, lỗi + chạy lại; chưa có Chạy nền, chưa khóa form | 🟡 |
| 3 việc giai đoạn 1: tách cảnh & hình ảnh · âm thanh & lời thoại · chấm điểm & sắp xếp; "(dùng lại kết quả cũ)" | 3 bước: Phân tích · Đề xuất đoạn · Dựng video | 🟡 tên/ý khác |
| Nút "Chọn lại đoạn với cấu hình mới" khi đã có kết quả | "Điều chỉnh nội dung" (drawer) | 🟡 |

### 2.6 Màn 4 – Duyệt đoạn AI

| Yêu cầu spec | Hiện trạng | |
|---|---|---|
| VariantTabs + ghi chú "Xác nhận một lần cho cả N phương án" | Có tab phương án; xác nhận từng phương án (Chốt video) | 🟡 |
| **FilmTimeline cả phim** (vạch 30 phút, cam = AI, xanh = thủ công, xám = dự phòng, bấm 2 lần đánh dấu vào/ra) | Không có | ❌ |
| SegmentCard: meta "Hồi 1 · gốc … · 8 giây · trong clip 0:14", lý do, cảnh báo cắt thoại; nút ↑ ↓ Cắt ghép Loại/Xóa | Thẻ chỉ đọc: số, timecode, độ dài, nhãn, điểm, lý do | 🟡 / ❌ phần nút |
| SegmentEditor: điểm 3 tín hiệu + câu thoại gốc; ±1 giây trong biên ±2 (V7); chia đôi; nối | Có điểm tín hiệu (hover); không có chỉnh sửa | ❌ |
| Đoạn dự phòng do AI chọn + "Thêm"; gợi ý bù thời lượng | Không có | ❌ |
| DurationBudget: số lớn, thanh tiến độ (đỏ khi lệch > 5 giây), AI/Thủ công, cảnh báo V1/V5/V6 | Có checklist thời lượng ±10% | 🟡 |
| Form thêm đoạn thủ công (Vào/Ra, mô tả, vị trí, lỗi cứng V8, cảnh báo mềm V9/V10 + "Vẫn thêm") | Không có | ❌ |
| Nút xác nhận "Xác nhận đoạn, tạo nhạc và sub" / "Duyệt và dựng lại"; kiểm tra mọi phương án (V11) | "Chốt video" + hộp xác nhận | 🟡 |
| UI có thêm: preview phát được, tùy chỉnh hình ảnh, khung nền tảng, A/B, ngữ cảnh gốc | Không có trong spec | ⚠️ thừa |

### 2.7 Lớp phủ giai đoạn 2

| Yêu cầu spec | Hiện trạng | |
|---|---|---|
| Lớp phủ trên màn 4, thanh bên vẫn dùng được, chân màn ghi "Đang xử lý" | Thay cả trang bằng màn xử lý | 🟡 |
| 4 việc: Tạo nhạc AI · Tạo sub/lời dẫn/caption · **Chèn đầu và cuối clip** · Dựng và xuất MP4 | Tạo nhạc · Tạo phụ đề · Trộn âm (+ Xuất riêng ở giai đoạn 3) | 🟡 |
| Cột phải: tóm tắt từng phương án + 4 MeterRow | Có thời gian + chi phí | 🟡 |
| Lỗi nhạc: Notice "Không thay bằng nhạc có sẵn" + chạy lại; pill "Lỗi ở 1 bước" | Có lỗi + chạy lại; chưa có notice đó | 🟡 |
| Hủy thì quay về màn 4 giữ kết quả; Chạy nền | Hủy có; chạy nền chưa | 🟡 |
| Xong → tạo vN, tự sang màn 5 | Xong → về Preview Studio giai đoạn 2 | ✅ (khác vị trí) |

### 2.8 Màn 5 – Nhạc AI

| Yêu cầu spec | Hiện trạng | |
|---|---|---|
| 2 WaveformCard (Bản A/B): BPM, thời lượng, **dạng sóng 64 cột + vạch cao trào**, "Prompt đã gửi…", bấm để chọn | 3 bản dạng radio, không có dạng sóng/cao trào; prompt trong mục thu gọn | 🟡 |
| Card "Chỉnh và tạo lại": Cảm xúc, Tempo 60–160, Nhạc cụ, "Tạo bản mới" | Drawer "Tạo lại nhạc" có mood/tempo (50–180), chưa có nhạc cụ | 🟡 |
| Âm lượng nhạc so với tiếng phim (%) + checkbox ducking | Mix 3 track + mức ducking + fade (nhiều hơn spec) | ✅ / ⚠️ thừa |
| Không có nút tải nhạc lên + dòng giải thích | Không có upload, có ghi chú | ✅ |

### 2.9 Màn 6 – Sub, lời dẫn, caption

| Yêu cầu spec | Hiện trạng | |
|---|---|---|
| Tab Subtitle: bật sub, **sửa từng dòng** (≤ 120 ký tự) | Bật/tắt + kiểu chữ; câu thoại chỉ đọc | 🟡 |
| Tab Lời dẫn: bật, textarea ≤ 600, bộ đếm "N từ, ~X giây", chip giọng đọc, "AI viết lại" | Không có | ❌ |
| Tab Caption: danh sách AI gợi ý, bật/tắt + sửa (≤ 60) | Không có | ❌ |
| Cột phải ClipPlayer có sub và caption | Có player + sub (chưa có caption) | 🟡 |

### 2.10 Màn 7 – Xem trước và tải

| Yêu cầu spec | Hiện trạng | |
|---|---|---|
| ClipPlayer đúng tỉ lệ, logo góc, sub | Có | ✅ |
| SegmentStrip: đầu/cuối **sọc xanh lam**, đoạn đánh số, bấm nhảy | Có dải đoạn; cuối là end card sọc xám; chưa có đầu | 🟡 |
| Dòng công thức "Đầu 2s + đoạn phim 0:57 + cuối 3s = 1:02, giới hạn …" | Không có | ❌ |
| Thông tin đoạn đang chọn (mốc trong clip, mốc gốc, điểm, lý do) | Có trong storyboard | ✅ |
| Tóm tắt phương án + "Đặt làm phương án chính" | Có (rải rác ở thanh trên) | 🟡 |
| Checkbox "Tự crop theo nhân vật chính" (tắt = letterbox) + ảnh minh họa vùng giữ | 3 kiểu crop có xem trực tiếp | ✅ / ⚠️ khác dạng |
| "Tải MP4", "Tải tất cả (ZIP)"; tên `TenPhim_A_Dramatic_9x16_v1.mp4` | Menu tải; tên `ten-phim_short_9x16_v1` | 🟡 |
| 4 khối tệp kèm (JSON, SRT, TXT lời dẫn, TXT caption/hashtag), JSON & SRT có "Sao chép" | Tải được JSON, SRT, thông tin nhạc; chưa có TXT, chưa có sao chép | 🟡 |
| **Dirty → Notice + tắt Tải**; nút "Dựng lại thành vN+1" ở thanh trên (V15) | Chặn Chốt khi có thay đổi; nút "Áp dụng" ở thanh dưới; Tải không bị tắt | 🟡 |

### 2.11 Màn 8 – Đăng bài

| Yêu cầu spec | Hiện trạng | |
|---|---|---|
| "AI đề xuất 3 tiêu đề" dạng radio | 3 phương án (tiêu đề + mô tả + hashtag) | ✅ |
| Một nội dung chung, bộ đếm "N/100 (YouTube)", hashtag "TikTok nên dưới 5" (V16) | Nội dung riêng từng nền tảng, giới hạn riêng | ⚠️ |
| "Tạo lại giọng văn khác" | "Gợi ý lại" | ✅ |
| Nền tảng có trạng thái kết nối ("Đã kết nối"/"Token hết hạn"), kết quả từng nền tảng, "Kết nối lại YouTube" | Chưa có trạng thái kết nối / lỗi token | ❌ |
| Thời điểm: Đăng ngay / Hẹn giờ | Chưa có | ❌ |
| Tắt "Duyệt và đăng" khi dirty hoặc tiêu đề > 100 | Chặn khi lỗi; chưa xét dirty | 🟡 |
| Dòng "Demo chạy ở chế độ sandbox" | Có | ✅ |

### 2.12 Luật kiểm tra V1–V18

| Luật | Hiện trạng |
|---|---|
| V1 tổng gồm đầu/cuối · V2 trừ đầu/cuối | 🟡 có khung thời lượng, chưa tính đầu/cuối |
| V3, V4 template | ❌ |
| V5 ≥ 1 đoạn AI · V6 thủ công > 50% · V7 ±2s · V8 đoạn thủ công · V9 cắt thoại · V10 trùng | ❌ (không có chỉnh sửa thủ công; V5 luôn đúng) |
| V11 xác nhận nhiều phương án cùng lúc | ❌ (đang xác nhận từng phương án) |
| V12 chống spoil không hiện trên UI | ⚠️ UI đang có công tắc "Tránh spoil" và mục kiểm tra 15% cuối |
| V13 nhạc chỉ AI | ✅ |
| V14 khóa form khi giai đoạn 1 chạy | 🟡 (đổi trang nên không sửa được, nhưng không phải dạng khóa form) |
| V15 dirty tắt Tải/Đăng | 🟡 |
| V16 tiêu đề 100, hashtag TikTok < 5 | 🟡 |
| V17 giới hạn ký tự | 🟡 (chưa có các ô tương ứng) |
| V18 VOD chưa xong/lỗi không tạo clip, ≤ 8 GB | 🟡 (đang 20 GB) |

### 2.13 Dữ liệu & API (mục 8)

| Spec | UI hiện tại |
|---|---|
| Tiền tố `/api/v1` | `/api` |
| Thời gian tính bằng **giây** (số thực) | Mili giây |
| Job riêng (`/jobs/:id`), poll 2 giây hoặc **WebSocket** | Trạng thái trong Project, **SSE** + poll 4 giây |
| Segment `source: ai \| manual`, `trimSec`, `act 1/2/3`, `parentId`, `warnings`; Variant `key A/B/C`, `order[]`, `reserve[]` | Segment không có source/trim/reserve; Variant id tự sinh |
| Project giữ `subtitles`, `voiceOver`, `captions`, `musicVolumePct`, `ducking`, `autoCrop`, `versions`, `dirty` | Mỗi `Revision` giữ `visual` + `audio`; không có voice-over/caption |
| `POST /projects/:id/confirm`, `POST /projects/:id/render`, `PATCH /projects/:id`, segments CRUD, templates CRUD, `POST /posts` có `scheduleAt` | Endpoint khác tên (`lock`, `revisions`, `export`, `publish`) |

### 2.14 Checklist nghiệm thu của BA

| Mục | |
|---|---|
| Thanh bên đúng 8 bước | ❌ |
| Không có bước AI chọn đoạn riêng; tiến trình nằm trong màn Cấu hình | ❌ |
| 1, 2, 3 phương án đều hiện tab ở màn 4–7 | 🟡 (từ giai đoạn 2 chỉ còn phương án chính) |
| Không có nút tải nhạc lên | ✅ |
| Không có vùng chống spoil trên UI | ❌ |
| Tổng thời lượng luôn tính cả đầu/cuối | ❌ |
| Đủ trạng thái rỗng, đang chạy, lỗi, hủy cho mọi màn có job | 🟡 |
| Sáng/tối, màn hẹp < 600px | ❌ |

## 3. Dùng lại được gì

- Mock backend (MSW, mô phỏng tiến trình theo thời gian, lỗi + chạy lại), lớp API + TanStack Query.
- Luồng 2 giai đoạn (chọn đoạn → xác nhận → nhạc/sub/dựng) – khớp ý tưởng của spec.
- PreviewStage (player mô phỏng, logo góc, lớp sub, crop) → làm **ClipPlayer**; Scrubber → **SegmentStrip**; ProcessingView → **StageList**.
- Trang đăng bài, xuất JSON/SRT, Storyboard (làm nền cho SegmentCard).

## 4. Cần đội chốt trước khi sửa

1. **Có cho chỉnh sửa đoạn thủ công không?** Spec có (màn 4 + V5–V11); yêu cầu trước của đội là không. Nếu có, màn 4 phải làm thêm FilmTimeline, SegmentEditor, đoạn dự phòng, form thêm đoạn.
2. **Các tính năng UI đang có mà spec không có**: khung nền tảng, A/B, ngữ cảnh gốc, bộ mẫu, hoàn tác, 3 kiểu crop, chế độ Tự động, AI tách prompt, Lịch sử, các trường nhịp/nhân vật/nhạc ở cấu hình. Ẩn đi để bám spec, hay giữ làm điểm cộng?
3. **Màu nhãn AI**: spec quy định cam = AI, xanh lam = thủ công/template. Đổi theo spec (khác plan v2 của FE).
4. **Thương hiệu**: spec ghi logo chữ "FPT Play Trailer AI" ở thanh bên; yêu cầu trước là logo ảnh + tên đội Play Hard. Đề xuất: logo ảnh + "Trailer AI" ở thanh bên, "Play Hard" ở chân thanh bên.
5. **Hợp đồng API**: theo mục 8 của spec (giây, `/api/v1`, jobs, WebSocket/poll) hay theo FE hiện tại – cần Backend chọn một.
