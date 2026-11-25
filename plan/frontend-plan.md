# Frontend Plan – AI Highlight/Trailer Generator (Hackaithon FPT Play 2026)

> Nguồn: đề thi (`subject/`) + tài liệu BA (`BA-doc/Use case - AI Highlight Trailer Generator (Hackathon FPT Play 2026).docx`, 27 UC, 34 BR).
> Phạm vi: **chỉ phim**, ứng dụng web. Cập nhật: 2026-11-25 (v4 – quy trình 2 giai đoạn, thương hiệu Play Hard, kế hoạch triển khai ở mục 14).
> Đội: **Play Hard**. Logo dùng ảnh `asset/fpt-logo.png` (bản sao: `web/public/brand/fpt-play-logo.png`).

## v7 – Kế hoạch hiện hành (đọc trước nhất; thay v4–v6 khi mâu thuẫn)

### V7.1 Nguyên tắc đã chốt

| # | Quyết định | Nguồn |
|---|---|---|
| 1 | **Tính năng theo UI spec của BA**, chỉ lấy **mục 1 (luồng), 4–7 (nội dung từng màn, luật V1–V18), 8 (dữ liệu/API)**. **Không** lấy mục 2–3 (design tokens, AppShell thanh bên tối, tên/kiểu component) vì đó là giao diện của mockup | Đội chốt |
| 2 | **Mockup HTML** (`BA-doc/buoc-1-thu-vien-vod.html`, trong code có đủ 9 màn) **chỉ để tham khảo tính năng**, không copy giao diện | Đội chốt |
| 3 | **Giao diện theo UI/UX ban đầu (v2–v4)** – xem V7.6. Không dùng bố cục mockup/spec (thanh bên tối 220px, chân màn "Bước k/8", token màu mockup, nền tối) | Đội chốt (sửa lại) |
| 4 | **Làm luồng đơn giản trước**, bỏ phần thừa: chỉ giữ tính năng có trong spec, mỗi màn tối giản; tính năng phụ để giai đoạn sau | Đội chốt |
| 5 | Có chỉnh sửa đoạn thủ công ở màn 4 (theo spec) | Đã chốt ở v5 |
| 6 | Logo ảnh `asset/fpt-logo.png` + tên đội **Play Hard** + "Trailer AI" trên **header ngang** | Đã chốt |
| 7 | **Không hiện mã use case trên UI** (không chip "UC-A.1", không mã UC trong Stepper, không "(UC-A.2, 3a)" trong câu chữ). Mã UC chỉ được ghi trong comment code và tài liệu | Đội chốt |

### V7.2 Hiện trạng code (cần biết trước khi làm)

- `web/legacy-v5/src`: bản 8 màn theo spec – **chỉ lấy phần tính năng/logic** (màn hình, luật, mock, API). Khung app và theme của bản này là kiểu mockup → **không dùng**.
- `web/legacy-v4/src`: bản giao diện ban đầu – **lấy khung app và theme** (`app/theme.ts`, `app/global.css`, `app/Layout.tsx`, kiểu thẻ, badge trạng thái, thanh hành động dính đáy).
- `web/src`: hiện là bản khôi phục từ `legacy-v5` (giao diện kiểu mockup) → cần **thay khung + theme bằng của v4** theo V7.6, giữ màn hình và logic.
- Mock API (`/api/v1`, đơn vị giây, job poll 2 giây) và luật V1–V18 (`lib/rules.ts`) giữ nguyên từ v5. Dữ liệu mẫu Bước 1 dùng 4 VOD của mockup.
- **Hợp đồng API đề xuất cho Backend: `plan/api-proposal.md`** (quy ước, mô hình dữ liệu, endpoint theo từng bước, vòng đời job, luật V1–V18 phía BE, câu hỏi cần chốt). Mock trong `web/src/mocks` phải khớp tài liệu này.

### V7.3 Phạm vi tính năng từng màn (giữ / bỏ)

Ký hiệu: ✅ giữ · ✂️ bỏ khỏi UI (để sau hoặc không làm) · 🔁 đơn giản hóa.

**Khung app** (kiểu dáng theo V7.6)
- ✅ Header ngang: logo ảnh + Play Hard + Trailer AI, tên dự án, badge trạng thái, nút "Dựng lại thành vN" khi có thay đổi chưa dựng.
- ✅ Thanh bước ngang (Mantine Stepper) 8 bước dưới header, bấm để chuyển bước; bước xong màu xanh lá. ✂️ Thanh bên tối 220px.
- ✅ Tiêu đề màn + 1 dòng mô tả ngắn. ✂️ Chip mã use case và mọi mã UC trong câu chữ trên UI.
- ✅ Thanh hành động dính đáy (thẻ trắng có bóng như v4): nút Quay lại, nút chính của bước (Tiếp tục / "Bắt đầu chọn đoạn" / "Xác nhận…"). ✂️ Chữ "Bước k/8".
- ✅ Toast ở đáy, tự tắt 2,8 giây. ✅ Tự chuyển màn khi job xong (hoặc toast nếu chạy nền).
- ✂️ Lịch sử (spec ẩn `SHOW_HIST=false`).

**Bước 1 – Thư viện VOD (UC-A.1, A.2)**
- ✅ Tìm theo tên, chip lọc thể loại, danh sách VOD (ảnh, tên, thể loại · thời lượng, pill trạng thái).
- ✅ Thẻ chi tiết + ghi chú theo trạng thái; "Tạo clip từ phim này" (khóa khi đang tải lên / lỗi – V18) → sang Bước 3.
- ✅ Thêm VOD: kéo thả/chọn file MP4/MOV/MKV ≤ 8 GB, tên, thể loại, "Lưu vào thư viện".
- 🔁 Upload: 1 request + thanh tiến độ; tải nối tiếp (resumable) để BE làm sau. ✂️ Nhập bằng link.

**Bước 2 – Template đầu/cuối (UC-J.1)** *(mockup không có, spec có)*
- ✅ 2 tab Đầu clip / Cuối clip; mỗi dòng: ảnh, tên, pill Mặc định, meta, checkbox Đang bật, "Đặt làm mặc định", "Xóa" (bấm 2 lần).
- ✅ Form thêm: file MP4/MOV/PNG/JPG, tên, tỉ lệ, thời lượng 1–5 giây, Lưu; lỗi V3, luật V4.
- 🔁 Bỏ thẻ xem trước lớn, chỉ ảnh nhỏ trong dòng.

**Bước 3 – Cấu hình (UC-B.1–B.4, J.2, C.1, C.2, C.4)**
- ✅ Mục tiêu (chip + "Khác" ≤ 80 ký tự), tỉ lệ (2 thẻ), thời lượng (thanh trượt + ô nhập, lỗi V1), phong cách (4 chip, chưa chọn thì ghi "AI gợi ý…"), đầu/cuối clip (2 select + dòng "đã gồm X giây…"), số phương án 1–3, mô tả thêm ≤ 400 ký tự.
- ✅ Khối tiến trình ngay dưới form: 3 việc, Chạy nền, Hủy, lỗi + chạy lại, xong → "Mở Duyệt đoạn AI"; form khóa khi đang chạy (V14).
- ✂️ AI đọc prompt, checkbox chống spoil, chạy tự động (mockup có, spec bỏ).

**Bước 4 – Duyệt đoạn AI (UC-C.3, G.1, G.2) + giai đoạn 2**
- ✅ Tab phương án (khi ≥ 2); dòng thời gian cả phim (cam AI / xanh thủ công / xám dự phòng, bấm 2 lần đánh dấu Vào/Ra).
- ✅ Thẻ đoạn: ảnh, tên, nhãn nguồn, meta, lý do, cảnh báo cắt thoại; nút ↑ ↓, Chi tiết (3 điểm tín hiệu, câu thoại, −1/+1 giây trong ±2 giây – V7), Loại/Xóa.
- ✅ Đoạn dự phòng + "Thêm"; gợi ý bù thời lượng.
- ✅ Khối thời lượng: số lớn, thanh, AI/thủ công, cảnh báo V1/V5/V6 (+ "AI đề xuất lại").
- ✅ Nút xác nhận (V11 kiểm tra mọi phương án); form thêm đoạn thủ công (Vào/Ra, mô tả, vị trí; lỗi V8, cảnh báo V9/V10 + "Vẫn thêm").
- ✅ Lớp phủ giai đoạn 2: 4 việc + 4 thanh đo, Chạy nền, Hủy, lỗi nhạc + chạy lại.
- ✂️ Chia đôi / nối đoạn (spec có, để giai đoạn sau).

**Bước 5 – Nhạc AI (UC-D.2)**
- ✅ 2 thẻ bản nhạc: BPM, thời lượng, dạng sóng + vạch cao trào, prompt đã gửi; bấm để chọn.
- ✅ Chỉnh và tạo lại: cảm xúc, tempo 60–160, nhạc cụ, "Tạo bản mới"; âm lượng nhạc %, ducking; ghi chú không có upload nhạc.

**Bước 6 – Sub, lời dẫn, caption (UC-E.1–E.3)**
- ✅ 3 tab: sub (bật/tắt, sửa từng dòng ≤ 120), lời dẫn (bật, sửa ≤ 600, đếm từ/giây, 3 giọng, "AI viết lại"), caption (bật/tắt + sửa ≤ 60).
- 🔁 Bên phải: 1 khung xem tĩnh đúng tỉ lệ có sub/caption mẫu (không phát).

**Bước 7 – Xem trước và tải (UC-F.2, F.3, F.4, G.3)**
- ✅ Tab phương án; khung xem + dải đoạn (đầu/cuối sọc xám nhạt, bấm để chọn); dòng công thức thời lượng; thông tin đoạn đang chọn.
- ✅ Tóm tắt phương án, "Đặt làm phương án chính", "Tự crop theo nhân vật" (9:16) + hình minh họa vùng giữ; Tải MP4 / Tải tất cả (ZIP), tên file.
- ✅ 4 tệp kèm (JSON, SRT có Sao chép; TXT lời dẫn, TXT caption/hashtag). Có thay đổi chưa dựng → khóa Tải (V15).
- 🔁 Khung xem: dùng `<video>` khi BE có MP4, còn lại là khung tĩnh. ✂️ Player canvas phát mô phỏng.

**Bước 8 – Đăng bài (UC-H.1–H.3)**
- ✅ 3 tiêu đề (radio), tiêu đề + đếm "N/100 (YouTube)", mô tả, hashtag + đếm "TikTok nên dưới 5", "Tạo lại giọng văn khác".
- ✅ 3 nền tảng (checkbox, trạng thái kết nối, kết quả), Đăng ngay / Hẹn giờ, "Duyệt và đăng" (khóa khi có thay đổi chưa dựng hoặc tiêu đề > 100), lỗi từng phần + "Kết nối lại YouTube", dòng sandbox.

### V7.4 Thứ tự triển khai

| Bước | Việc | Xong khi |
|---|---|---|
| 0 | Khôi phục `legacy-v5/src` → `web/src`; dữ liệu mẫu Bước 1 theo mockup (4 VOD, thể loại tiếng Việt) | App chạy như bản v5 |
| 1 | Cắt gọn theo V7.3 (upload đơn giản, bỏ chia đôi/nối, khung xem tĩnh ở màn 6–7, bỏ thẻ xem trước lớn ở màn 2) | Không còn tính năng ✂️ trên UI |
| 2 | Rà từng màn theo V7.3, đối chiếu tính năng với mockup HTML | Đủ mọi mục ✅ |
| 3 | Build, lint, chạy thử trọn luồng: Thư viện → Cấu hình → AI chọn đoạn → Duyệt (sửa + thêm tay) → giai đoạn 2 → Nhạc → Sub → Xem trước/tải → Đăng | Không lỗi console; artifact cập nhật |

### V7.6 Giao diện (theo UI/UX ban đầu v2–v4)

| Mục | Quy định |
|---|---|
| Nền | **Nền trắng**: trang `#F7F8FA`, thẻ/drawer trắng, viền `#E4E7EC`. **Chỉ giao diện sáng** (không chế độ tối). Khung video nền tối `#0B0D12` |
| Màu theo vai trò | **Cam** `#F26F21` = hành động chính (nút Tạo, Xác nhận, Tải…), bước/tab đang chọn · **Xanh dương** `#1E6FD9` = đang xử lý, thanh tiến trình, link, nhãn "AI" · **Xanh lá** `#22A45D` = xong, sẵn sàng, đạt · **Đỏ** `#D63B3B` chỉ cho lỗi · xám cho chữ phụ, viền |
| Tỉ lệ dùng màu | trắng/xám ~70%, cam ~15%, xanh dương ~10%, xanh lá ~5%; không gradient |
| Nguồn đoạn | Nhãn **"AI"** xanh dương nhạt (như v4) · nhãn **"Thủ công"** xám đậm, thẻ đoạn thủ công viền xám nét đứt · đầu/cuối clip (template) sọc xám nhạt. *(Đề xuất để không trùng màu với "AI"; spec dùng xanh lam cho thủ công – đội có thể đổi)* |
| Chữ | Be Vietnam Pro; timecode dùng JetBrains Mono (như v4); chữ thân 14px, nhãn 13px |
| Khung app | Header ngang trắng (logo, Play Hard, Trailer AI) + Stepper ngang 8 bước + nội dung trong `Container size="xl"` + thanh hành động dính đáy |
| Thành phần | Thẻ Mantine `Card` có viền, `Badge` trạng thái màu theo vai trò, `Stepper`, `Tabs`, `SegmentedControl`, `Drawer` cho form phụ |
| Nguyên tắc "không giống AI" | giữ mục 7.3 của plan: không gradient tím–xanh, không ✨, không emoji, dữ liệu thật (timecode, điểm số) thay trang trí |
| Nguồn code | `web/legacy-v4/src/app/theme.ts`, `global.css`, `Layout.tsx`, `components/common.tsx` (StatusBadge, AiTag, Timecode, ScorePill, PageHeader) |

### V7.5 Prompt triển khai

**Bản gộp để chạy ở session khác: `plan/prompt-session-v7.md`** (dán nguyên khối, đã gồm quy tắc không hiện mã UC trên UI).

Các prompt tách theo bước dưới đây dùng khi muốn chạy từng phần: prompt nền một lần, sau đó prompt theo bước.

**Prompt nền**

```
Bạn là frontend engineer của đội Play Hard (Hackaithon FPT Play 2026). Dự án: web/ (Vite + React + TypeScript,
Mantine, TanStack Query, Zustand, MSW mock). Đọc plan/frontend-plan.md mục v7 trước khi làm.

Quy tắc:
- Tính năng theo UI spec của BA (BA-doc/UI spec … .docx), phạm vi đúng bảng V7.3 (✅ giữ, ✂️ không làm, 🔁 đơn giản hóa).
- Mockup BA-doc/buoc-1-thu-vien-vod.html chỉ để đối chiếu tính năng, KHÔNG copy giao diện.
- Giao diện theo UI/UX ban đầu (V7.6): nền trắng, chỉ giao diện sáng, cam = hành động chính,
  xanh dương = đang xử lý/nhãn AI, xanh lá = xong, đỏ = lỗi; header ngang + Stepper 8 bước + thanh hành động
  dính đáy; lấy theme/khung từ web/legacy-v4. KHÔNG dùng bố cục mockup (thanh bên tối, "Bước k/8").
- Không thêm tính năng ngoài V7.3. Toàn bộ chữ trên UI bằng tiếng Việt.
- Không hiện mã use case (UC-A.1, UC-A.2…) ở bất kỳ đâu trên UI; mã UC chỉ để trong comment code.
- Dữ liệu qua src/lib/api.ts (tiền tố /api/v1, thời gian tính bằng giây); mock ở src/mocks. Luật V1–V18 ở src/lib/rules.ts.
- Xong mỗi bước: npm run build và npm run lint phải sạch, chạy thử trên trình duyệt, báo lại những gì chưa làm.
```

**Prompt 0 – Khôi phục nền**

```
Giữ màn hình + logic hiện có trong web/src (nguồn legacy-v5). Thay khung app và theme bằng của web/legacy-v4
(theme.ts, global.css, Layout header ngang) theo V7.6; xóa thanh bên tối, chân màn "Bước k/8", shell.css kiểu mockup,
chế độ tối. Thêm Stepper ngang 8 bước + thanh hành động dính đáy. Cập nhật dữ liệu mẫu VOD theo mockup:
Mùa Hè Cuối Cùng (Tâm lý, 1:52:00, Sẵn sàng), Đêm Săn (Hành động, 1:41:20, Đã phân tích trước),
Nhà Có Ba Chị Em (Hài, 1:36:45, Đang tải lên 64%), Tiếng Gọi Dưới Hầm (Kinh dị, lỗi định dạng).
Đổi thể loại sang nhãn tiếng Việt (Tâm lý, Tình cảm, Hành động, Hài, Kinh dị). Build/lint sạch.
```

**Prompt 1 – Bước 1 Thư viện VOD**

```
Rà màn Thư viện VOD theo V7.3 Bước 1. Upload chỉ 1 request (POST /vods multipart) + thanh tiến độ,
bỏ tạm dừng/tải tiếp phía UI. Không có nhập link. "Tạo clip từ phim này" chọn VOD rồi sang /config.
```

**Prompt 2 – Bước 2 Template đầu/cuối**

```
Rà màn Template theo V7.3 Bước 2: bỏ thẻ xem trước lớn, giữ danh sách + form thêm. Kiểm tra V3, V4.
```

**Prompt 3 – Bước 3 Cấu hình**

```
Rà màn Cấu hình theo V7.3 Bước 3 (7 trường theo thứ tự spec, khối tiến trình dưới form, khóa form khi chạy).
Đảm bảo không có AI đọc prompt, chống spoil, chạy tự động.
```

**Prompt 4 – Bước 4 Duyệt đoạn AI + giai đoạn 2**

```
Rà màn Duyệt đoạn AI theo V7.3 Bước 4. Bỏ "Chia đôi đoạn" và "Nối với đoạn" khỏi UI (giữ API/mock).
Giữ ↑ ↓, Chi tiết (tín hiệu, câu thoại, −1/+1 giây trong ±2), Loại/Xóa, dự phòng, khối thời lượng,
form thêm đoạn thủ công, lớp phủ giai đoạn 2.
```

**Prompt 5 – Bước 5 Nhạc AI**

```
Rà màn Nhạc AI theo V7.3 Bước 5. Không có nút tải nhạc lên.
```

**Prompt 6 – Bước 6 Sub, lời dẫn, caption**

```
Rà màn Sub/lời dẫn/caption theo V7.3 Bước 6. Thay player phát mô phỏng bằng 1 khung xem tĩnh đúng tỉ lệ
(logo góc, dòng sub hoặc caption đầu tiên).
```

**Prompt 7 – Bước 7 Xem trước và tải**

```
Rà màn Xem trước và tải theo V7.3 Bước 7. Khung xem: <video> nếu version có mp4Url, còn lại khung tĩnh
của đoạn đang chọn; dải đoạn bấm để chọn đoạn (không phát). Khóa Tải khi có thay đổi chưa dựng.
```

**Prompt 8 – Bước 8 Đăng bài**

```
Rà màn Đăng bài theo V7.3 Bước 8. Giữ sandbox, lỗi từng nền tảng, kết nối lại YouTube.
```

**Prompt 9 – Kiểm thử và bàn giao**

```
Chạy trọn luồng trên trình duyệt (1 → 8), kiểm tra desktop và mobile, đối chiếu giao diện với V7.6, không lỗi console.
npm run build:artifact để cập nhật artifacts/web. Cập nhật web/README.md theo phạm vi V7.3.
```

## Thay đổi v6 – (đã thay bằng v7) làm theo mockup HTML từng bước

- Đã bỏ cách copy giao diện mockup; giữ lại bài học: chỉ làm tính năng cần thiết, đối chiếu với mockup.
- Bản copy CSS mockup (chỉ Bước 1) không dùng nữa.

## Thay đổi v5 – bám UI spec của BA (lưu để tham khảo; phần giao diện bên dưới ĐÃ BỊ v7 thay, chỉ còn giá trị phần tính năng)

Nguồn chuẩn: `BA-doc/UI spec – Trailer AI cho phim (FPT Play Hackathon).docx`. Đối chiếu chi tiết: `plan/ui-spec-gap.md`.

- **Cho phép chỉnh sửa đoạn thủ công** ở màn 4 (đội chốt theo spec): ↑↓, cắt ngắn/nới ±1 giây (đoạn AI tối đa ±2 giây), chia đôi, nối, loại về dự phòng, thêm đoạn thủ công. Thay thế nguyên tắc "không chỉnh tay" của v2.
- **Khung ứng dụng:** wizard 8 bước (thanh bên 220px, thanh trên có pill trạng thái + "Dựng lại thành vN", chân màn Quay lại / Bước k/8 / Tiếp tục).
- **8 màn:** Thư viện VOD · Template đầu/cuối · Cấu hình (+ tiến trình giai đoạn 1 ngay dưới form) · Duyệt đoạn AI (+ lớp phủ giai đoạn 2) · Nhạc AI · Sub/lời dẫn/caption · Xem trước và tải · Đăng bài.
- **Design tokens của spec** (sáng + tối, chỉ font Be Vietnam Pro, chữ thân 16px, vùng chạm 44px). Quy ước màu: **cam = AI**, xanh lam = thủ công/template, xanh lá = xong, đỏ = lỗi.
- **Dữ liệu & API theo mục 8 của spec:** thời gian tính bằng giây, tiền tố `/api/v1`, job riêng, poll 2 giây.
- **Ẩn** theo spec: nhập VOD bằng link, AI tách prompt, vùng chống spoil, Lịch sử (`SHOW_HIST=false`), khung nền tảng / A/B / chế độ tự động (không có trong spec). Code v4 lưu ở `web/legacy-v4/`.
- Thương hiệu: thanh bên dùng logo ảnh + "Trailer AI"; tên đội **Play Hard** ở chân thanh bên.

## Thay đổi v4

1. **Quy trình 2 giai đoạn:** âm thanh (nhạc AI, voice-over) và phụ đề **chỉ được thêm sau khi chốt video ngắn**.
   - Giai đoạn 1 – *Duyệt video*: AI chọn đoạn → dựng video (âm gốc) → người dùng xem, tùy chỉnh hình ảnh, điều chỉnh nội dung → **Chốt video**.
   - Giai đoạn 2 – *Âm thanh & phụ đề*: AI tạo nhạc, phụ đề → người dùng tùy chỉnh mix âm thanh, kiểu phụ đề, chọn nhạc → **Chốt & xuất**.
   - Giai đoạn 3 – *Xuất & đăng*: tải gói xuất, gợi ý bài đăng, đăng (sandbox).
   - Chế độ tự động chạy liền cả 3 giai đoạn.
   - Có thể **quay lại giai đoạn 1** (mở khóa video); âm thanh & phụ đề sẽ được tạo lại sau lần chốt mới.
2. **Thương hiệu:** header hiển thị logo (ảnh) + tên đội **Play Hard** + tên sản phẩm *Highlight Studio*. Logo trên video và end card dùng cùng ảnh logo.
3. Mục 5.2 B được chia lại theo giai đoạn (bảng ở mục 14.2). Các mục khác giữ nguyên nếu không ghi chú.

---

## 0. Định hướng sản phẩm (chốt v2)

1. **Đây là công cụ điều chỉnh, không phải trình dựng video.**
   - Người dùng **không** cắt, trim, kéo thả hay thêm đoạn bằng tay.
   - Mọi thay đổi đi qua **bộ điều chỉnh**: tham số cấu hình (thời lượng, phong cách, nhịp, nhân vật ưu tiên, tránh spoil, mood nhạc…) và mô tả bằng prompt (tùy chọn). Sau đó AI **tạo lại** phiên bản mới.
   - Giao diện tập trung vào: **cấu hình → theo dõi → xem kết quả → điều chỉnh → chốt → tải**. Không có timeline dựng phim.
2. **Màu chủ đạo:** cam, xanh lá, xanh dương; trắng là màu phụ (nền, bề mặt). Chi tiết ở mục 7.
3. **Custom Preview linh động (v3).** Người dùng tùy chỉnh **cách xem** và **cách trình bày** clip ngay trên preview, thấy kết quả **tức thì** mà không chờ AI tạo lại:
   - *Tùy chỉnh xem* (không đổi bản dựng): khung nền tảng, tốc độ, lặp đoạn, xem đoạn trong ngữ cảnh gốc, so sánh A/B…
   - *Tùy chỉnh trình bày* (đổi bản dựng khi bấm **Áp dụng**): kiểu phụ đề/caption, mix âm thanh, chọn nhạc, kiểu crop 9:16, logo, end card.
   - **Ranh giới giữ nguyên:** không đổi đoạn, thứ tự hay điểm cắt – phần đó vẫn chỉ AI làm (qua Bảng điều chỉnh).
   - Chi tiết ở mục 5.2.

Hệ quả: toàn bộ đoạn trong clip đều do AI chọn → đáp ứng thẳng nguyên tắc "không thay phần chọn đoạn của AI bằng thao tác thủ công" (BR-06).

---

## 1. Tóm tắt bài toán

- **Đầu vào:** 1 VOD phim do BTC cung cấp.
- **Đầu ra:** clip MP4 tạo tự động, kèm file timestamp, SRT, lời dẫn, gợi ý tít/caption/hashtag.
  - Video ngắn: 15–90 giây, 9:16, 1080×1920.
  - Video dài: 3–10 phút, 16:9 hoặc 9:16, 1920×1080.
- **Nhiệm vụ FE:** giao diện thao tác, trạng thái xử lý, preview và tải clip.

## 2. Điểm FE ảnh hưởng (~35/100)

| Tiêu chí | Điểm | FE cần làm |
|---|---|---|
| Trải nghiệm sử dụng | 10 | 6đ: chọn VOD → chạy → trạng thái → preview → tải. 4đ: duyệt đề xuất dễ hiểu, rõ nguồn gốc từng đoạn |
| Tự động hóa | 2 + 3 | Trạng thái & lỗi rõ, chạy lại được; số liệu thời gian xử lý và chi phí |
| Tính năng mở rộng | 10 | Nhiều phương án, điều chỉnh bằng tham số/prompt, lý do chọn đoạn, lịch sử phiên bản, gợi ý bài đăng |
| Pipeline đầu-cuối | 10 | Một lần bấm chạy hết VOD → clip |
| Bài nộp | 5 | Xuất timestamp + thông tin tạo nhạc ngay từ UI |

## 3. Điều chỉnh so với tài liệu BA (cần BA cập nhật)

| Hạng mục BA | Quyết định v2 |
|---|---|
| UC-G.1 Duyệt đề xuất | Duyệt **cả phiên bản**: xem storyboard đoạn AI + lý do → **Chốt** hoặc **Điều chỉnh** (đổi tham số / prompt → AI tạo lại). Không giữ/loại/kéo thả từng đoạn |
| UC-G.2 Thêm/thay/bỏ đoạn thủ công | **Bỏ** |
| BR-24 Trim ±2s | **Bỏ** |
| BR-25 Ba nhãn nguồn | Mọi đoạn là **AI đề xuất**; file timestamp ghi thêm `revision` (lần điều chỉnh nào sinh ra đoạn đó) và yêu cầu điều chỉnh tương ứng |
| BR-26 Ngưỡng 50% thủ công | **Bỏ** (không còn đoạn thủ công) |
| UC-D.2 Chọn nhạc | Giữ: nghe 2–3 bản AI, chọn 1, hoặc đổi tham số nhạc → tạo lại |
| UC-E.1 Sửa sub | Không sửa từng dòng; chỉ bật/tắt, chọn kiểu chữ, yêu cầu tạo lại |
| UC-F.3 Xem trước clip | Mở rộng thành **Preview Studio**: tùy chỉnh xem + tùy chỉnh trình bày tức thì (mục 5.2). Cần BA thêm UC mới "Tùy chỉnh trình bày trên preview" |
| UC-H.2 Sửa bài đăng | Giữ sửa **văn bản** bài đăng (không phải chỉnh video) |
| UC-I.1, I.2 Lịch sử | Lịch sử = chuỗi **lần điều chỉnh → phiên bản**; khôi phục phiên bản cũ vẫn giữ |

## 4. Luồng sử dụng

```
Thư viện VOD → Cấu hình → Đang xử lý → Preview Studio (xem + storyboard + lý do)
                                              │
              ┌───────────────────────────────┼───────────────────────────────┐
        Tùy chỉnh preview               Chốt & tải                  Điều chỉnh nội dung
        (tức thì, trong trình duyệt)                                (tham số / prompt)
              │                                                             │
     Áp dụng → chỉ dựng lại (nhanh)                              AI tạo lại đoạn/nhạc (lâu hơn)
              └──────────────────────────► phiên bản mới ◄──────────────────┘
```

Chế độ **Tự động hoàn toàn**: bỏ qua bước duyệt, ra thẳng clip.

## 5. Màn hình ↔ Use case

| # | Màn hình | UC bắt buộc | UC tùy chọn | Ưu tiên |
|---|---|---|---|---|
| 1 | Thư viện VOD & Upload | A.1, A.2 | | P0 |
| 2 | Cấu hình dự án | B.1 | B.2, B.3, B.4 | P0 / P1 |
| 3 | Trạng thái xử lý | C.4 | | P0 |
| 4 | **Preview Studio** (Kết quả & Duyệt) | G.1, F.3, F.4 | C.3, G.3, D.2, E.1, E.3, F.2 | P0 / P1 |
| 5 | **Bảng điều chỉnh nội dung** (drawer trong màn 4) | | B.2, B.3, D.2, E.* | P1 |
| 6 | Lịch sử phiên bản | | I.1, I.2 | P1 |
| 7 | Bài đăng | | H.1, H.2, H.3 | P2 |

### 5.1 Chi tiết từng màn

**① Thư viện VOD**
- Lưới VOD: thumbnail, tên, thể loại, thời lượng, trạng thái (Sẵn sàng / Đang xử lý / Lỗi / Đã phân tích).
- Lọc theo thể loại, tìm theo tên, xem nhanh.
- "Thêm VOD": upload (nối tiếp được) hoặc dán link; báo lỗi định dạng / dung lượng.
- Thư viện trống → hướng dẫn thêm VOD.

**② Cấu hình dự án** – form một trang, chia nhóm rõ ràng
- *Mục tiêu:* trailer / teaser / tổng hợp cảnh hay / giới thiệu nhân vật.
- *Đầu ra:* ngắn / dài; thời lượng (slider theo BR-01, mặc định 60s hoặc 3 phút); tỉ lệ.
- *Phong cách:* Cinematic / Dramatic / Funny / Energetic (để trống → tự gợi ý theo thể loại).
- *Nội dung:* nhân vật ưu tiên (chọn từ danh sách AI nhận diện nếu đã phân tích), nhịp cắt (chậm / vừa / nhanh), tránh spoil (bật mặc định), tránh cảnh nhạy cảm.
- *Nhạc:* mood, tempo, nhạc cụ (tùy chọn – để trống thì AI tự suy ra).
- *Kèm theo:* phụ đề, voice-over, caption, tự crop theo nhân vật.
- *Prompt (tùy chọn):* mô tả tự do → "Áp vào cấu hình" → AI điền các trường; mâu thuẫn thì hỏi chọn giá trị.
- *Số phương án:* 1–3.
- Hai nút: **Tạo tự động** (ra thẳng clip) và **Tạo và duyệt**.

**③ Trạng thái xử lý**
- Trạng thái dự án (BR-28): Chờ cấu hình → Đang phân tích → Chờ duyệt → Đang dựng → Sẵn sàng → Đã đăng; thêm Lỗi, Đã hủy.
- Bước con: Phân tích · Đề xuất đoạn · Tạo nhạc · Tạo sub · Dựng · Xuất – mỗi bước có trạng thái, %, thời gian.
- Realtime qua SSE; thông báo khi xong.
- Lỗi: câu dễ hiểu + "Chạy lại bước này" (BR-29); nút hủy.
- Nhiều phương án: mỗi phương án một hàng tiến trình, lỗi riêng không chặn phương án khác.
- Ô số liệu: tổng thời gian, chi phí ước tính.

**④ Preview Studio** (màn chính – thay cho "Kết quả & Duyệt" ở v2)

Bố cục 3 vùng:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Thanh công cụ: [Phương án ▾] v3 · Chờ duyệt │ Khung: TikTok ▾ │ A/B │ 1x ▾ │ ⋯ │
├───────────────────────────────┬──────────────────────────────────────────────┤
│                               │ Tabs: [Đoạn] [Hiển thị] [Âm thanh] [Xem]      │
│        PLAYER (đúng tỉ lệ)    │                                              │
│   + lớp phụ đề / caption /    │  Đoạn     : storyboard chỉ đọc + lý do AI    │
│     logo / end card / khung   │  Hiển thị : phụ đề, caption, logo, end card, │
│     nền tảng (xem trực tiếp)  │             kiểu crop 9:16                   │
│                               │  Âm thanh : mix 3 track, chọn nhạc, ducking  │
│ ◀ đoạn trước  ▶  đoạn sau ▶  ⟳ │  Xem      : vùng an toàn, ngữ cảnh gốc…     │
│ ▮▮▮▮▮▮▮▮▮▮ dải đoạn Mở·Thân·Kết │                                              │
├───────────────────────────────┴──────────────────────────────────────────────┤
│ 3 thay đổi chưa áp dụng  [Hoàn tác] [Mặc định] [Giữ ← → So sánh trước/sau]   │
│                                   [Điều chỉnh nội dung] [Áp dụng] [Chốt] [Tải]│
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Player** đúng tỉ lệ; dải ranh giới đoạn (chapters) chia màu Mở · Thân · Kết (BR-09); nút đoạn trước/sau, lặp đoạn.
- **Tab Đoạn – storyboard chỉ đọc**: thumbnail, timecode gốc, độ dài, nhãn, điểm, lý do ≤ 20 từ. Bấm thẻ → player nhảy tới đoạn đó.
- **Tab Hiển thị / Âm thanh / Xem**: các tùy chỉnh preview, xem mục 5.2.
- Kiểm tra tự động (checklist) và thông tin nhạc (công cụ/model/prompt/seed – BR-17) đặt trong tab Đoạn, thu gọn được.
- **Thanh trạng thái thay đổi**: đếm số thay đổi trình bày chưa áp dụng, Hoàn tác / Về mặc định, giữ nút để xem "trước" (bản dựng hiện tại) so với "sau".
- Hành động: **Áp dụng** (dựng lại phần trình bày) · **Điều chỉnh nội dung** (mở drawer ⑤) · **Chốt phiên bản** · **Tải xuống**.
- Chốt khi còn thay đổi chưa áp dụng → hỏi "Áp dụng rồi chốt" hoặc "Bỏ thay đổi".

**⑤ Bảng điều chỉnh nội dung** (drawer bên phải màn ④ – AI tạo lại đoạn / nhạc)
- Hiển thị lại các tham số của màn ② ở trạng thái hiện tại, cho đổi nhanh.
- Ô prompt điều chỉnh, kèm gợi ý nhanh dạng chip: "Nhịp nhanh hơn", "Hook mạnh hơn", "Tập trung nhân vật chính", "Nhạc buồn hơn", "Rút còn 30 giây".
- Phạm vi tạo lại: **Toàn bộ** / **Chỉ nhạc** / **Chỉ phụ đề – caption** (tiết kiệm thời gian, dùng lại kết quả phân tích).
- Nhạc: đổi mood / tempo / nhạc cụ → AI sinh bản mới. (Chọn giữa các bản đã có và chỉnh âm lượng đã chuyển sang tab Âm thanh của preview – xem trực tiếp.)
- Bấm **Tạo lại** → về màn ③ (chỉ các bước cần chạy) → phiên bản mới.
- Ghi rõ trên UI để người dùng không nhầm: **Tùy chỉnh preview = tức thì** · **Điều chỉnh nội dung = AI chạy lại, mất vài phút**.

**⑥ Lịch sử phiên bản**
- Dòng thời gian: v1 (cấu hình ban đầu) → v2 (điều chỉnh: "nhịp nhanh hơn") → …
- Mỗi phiên bản: thời điểm, tham số/prompt đã đổi, **tóm tắt thay đổi** do hệ thống tính (ví dụ: "+2 đoạn, −1 đoạn, tempo 90 → 110"), thumbnail, lượt tải.
- Xem trước phiên bản cũ; **Khôi phục** → tạo phiên bản mới từ trạng thái đó (BR-31).

**⑦ Bài đăng** (P2)
- 2–3 phương án tít/mô tả/hashtag; sửa văn bản; đếm ký tự theo nền tảng; xem trước theo nền tảng; đăng (sandbox khi demo).

### 5.2 Custom Preview – chi tiết

#### A. Tùy chỉnh xem (chỉ thay đổi cách xem, không đổi bản dựng)

| Tùy chỉnh | Mô tả | Ưu tiên |
|---|---|---|
| Khung nền tảng | Phủ giao diện giả lập TikTok / Reels / Shorts / YouTube / Facebook lên player để thấy clip khi đăng thật (cột nút, tên kênh, caption bài) | P1 |
| Vùng an toàn | Tô vùng bị giao diện nền tảng che (BR-21); cảnh báo nếu phụ đề/caption rơi vào | P0 |
| Tốc độ phát | 0.5x / 1x / 1.5x / 2x để duyệt nhanh | P1 |
| Điều hướng theo đoạn | Đoạn trước/sau, lặp đoạn đang chọn, phát lần lượt từng đoạn | P0 |
| Xem trong ngữ cảnh gốc | Phát đoạn kèm ±5 giây trước/sau trong VOD gốc, có đánh dấu điểm cắt – giúp BTV hiểu vì sao AI cắt ở đó | P1 |
| So sánh A/B | Hai player đồng bộ thời gian: 2 phiên bản hoặc 2 phương án, chuyển nhanh bằng phím | P2 |
| Trước / sau | Giữ nút để xem bản dựng hiện tại, thả ra để xem bản có tùy chỉnh chưa áp dụng | P1 |
| Toàn màn hình, chụp khung hình | Chụp khung hình làm ảnh bìa gợi ý cho bài đăng | P2 |

#### B. Tùy chỉnh trình bày (xem tức thì, áp vào bản dựng khi bấm **Áp dụng**)

| Nhóm | Tùy chỉnh | Ràng buộc | Ưu tiên |
|---|---|---|---|
| Phụ đề | Bật/tắt, mẫu kiểu chữ (3–4 mẫu sẵn), cỡ chữ, màu chữ/nền, vị trí trên/giữa/dưới | Tối đa 2 dòng, ≥ 1 giây/dòng (BR-20); không vào vùng an toàn (BR-21) | P1 |
| Caption | Bật/tắt từng caption AI đề xuất, mẫu kiểu, vị trí | Chỉ chọn trong danh sách AI tạo; sửa nội dung qua Bảng điều chỉnh | P2 |
| Âm thanh | Thanh trượt âm lượng 3 track: âm gốc, nhạc, voice-over; nghe riêng (solo) / tắt (mute) từng track; mức ducking (nhẹ / vừa / mạnh); fade in/out | Thoại luôn nghe rõ – cảnh báo khi nhạc lớn hơn thoại (BR-18) | P1 |
| Nhạc | Đổi giữa 2–3 bản AI đã sinh, nghe ngay trên clip | Không upload nhạc (BR-15) | P1 |
| Khung 9:16 | Kiểu crop: theo nhân vật (AI) / giữa khung / nền mờ | Áp cho cả clip; không kéo khung tay | P2 |
| Thương hiệu | Logo FPT Play: bật/tắt, góc đặt; end card "Xem trên FPT Play": bật/tắt, 2–4 giây | End card không tính vào thời lượng nội dung | P2 |
| Chuyển cảnh | Cắt thẳng / fade / flash (xem gần đúng) | Theo phong cách mặc định | P2 |

**Bộ mẫu (preset):**
- Có sẵn theo nền tảng: "TikTok", "YouTube Shorts", "YouTube 16:9", "Facebook".
- Lưu bộ tùy chỉnh hiện tại thành preset để dùng cho dự án sau.
- Chọn preset → áp toàn bộ nhóm B ngay trên preview.

**Thao tác cho tiện:**
- Mọi thay đổi hiện ngay trên player, không cần bấm "xem trước".
- Hoàn tác / làm lại (Ctrl+Z / Ctrl+Shift+Z), "Về mặc định" theo từng nhóm.
- Đếm thay đổi chưa áp dụng; cảnh báo khi rời trang.
- Phím tắt xem: `Space` phát/dừng, `←/→` đoạn trước/sau, `L` lặp đoạn, `F` toàn màn hình, giữ `\` để xem trước/sau.
- Tùy chỉnh xem (khung nền tảng, tốc độ…) được nhớ theo người dùng (localStorage).

#### C. Cơ chế kỹ thuật

- **Preview là lớp ghép trong trình duyệt**, không render lại server cho mỗi thay đổi:
  - Video: bản proxy 720p **sạch** (chưa in phụ đề/logo); đúng thứ tự đoạn AI đã chọn.
  - Phụ đề, caption, logo, end card: lớp HTML/CSS phủ lên video, đồng bộ theo `requestVideoFrameCallback`.
  - Âm thanh: các track tách riêng (âm gốc, nhạc từng bản, voice-over) phát qua **Web Audio API**, mỗi track một `GainNode`; ducking mô phỏng bằng tự động giảm gain theo mốc thoại.
  - Crop 9:16: video nguồn 16:9 + khung crop theo thời gian do AI tính sẵn (mỗi chế độ một bộ), FE dùng CSS `transform` để mô phỏng.
- **Áp dụng** → tạo phiên bản mới với phạm vi `presentation` → BE chỉ chạy Dựng + Xuất (không phân tích/chọn đoạn lại) → nhanh.
- **Dự phòng** khi BE chưa cấp track âm thanh riêng: tab Âm thanh hiển thị "xem trước gần đúng", âm lượng chính xác chỉ có sau khi Áp dụng.
- Xem trong ngữ cảnh gốc cần proxy VOD gốc hỗ trợ HTTP range để tua nhanh.

## 6. Business rule FE thể hiện

| BR | Quy tắc | Thể hiện trên UI |
|---|---|---|
| BR-01, BR-03 | Khung thời lượng/tỉ lệ, lệch ≤ ±10% | Kiểm tra tại trường cấu hình; checklist ở màn kết quả |
| BR-06 | Luồng bắt buộc chạy không cần thao tác tay | Nút "Tạo tự động" |
| BR-08, BR-09 | Hook 3 giây, cấu trúc mở-thân-kết | Dải Mở · Thân · Kết, checklist hook |
| BR-12 | Tránh spoil 15% cuối | Công tắc ở cấu hình; checklist ở kết quả |
| BR-14 | Đoạn có điểm, nhãn, lý do | Thẻ storyboard |
| BR-15, BR-17 | Nhạc AI mới, lưu thông tin tạo | Không có upload nhạc; thẻ thông tin nhạc |
| BR-21 | Vùng an toàn 9:16 | Lớp phủ bật/tắt; cảnh báo khi phụ đề/caption/logo nằm trong vùng bị che |
| BR-18 | Ducking, fade, thoại nghe rõ | Tab Âm thanh: mức ducking, fade; cảnh báo khi nhạc lấn thoại |
| BR-20 | Phụ đề ≤ 2 dòng, ≥ 1 giây/dòng | Bộ dựng lớp phụ đề trên preview tự ngắt dòng theo tỉ lệ |
| BR-27, BR-31 | Phiên bản mới, không ghi đè | Màn lịch sử; "Áp dụng" tùy chỉnh trình bày cũng tạo phiên bản mới |
| BR-28, BR-29 | Trạng thái & chạy lại | Stepper + nút chạy lại |
| BR-05 | ZIP + mẫu tên file | Nút tải xuống |

## 7. Hệ màu & giao diện

### 7.1 Vai trò màu

| Màu | Vai trò | Dùng cho |
|---|---|---|
| **Cam** (chủ đạo) | Hành động chính, thương hiệu | Nút chính (Tạo, Chốt, Tải), tab đang chọn, điểm nhấn trên logo/header |
| **Xanh dương** | Thông tin, đang xử lý, AI | Trạng thái "Đang chạy", thanh tiến trình, link, nhãn "AI", chip gợi ý điều chỉnh |
| **Xanh lá** | Thành công, sẵn sàng | Trạng thái "Xong/Sẵn sàng", checklist đạt, phiên bản đã chốt |
| **Trắng** (phụ) | Nền, bề mặt | Nền trang, card, drawer |
| Xám trung tính | Chữ, viền | Chữ chính/phụ, đường kẻ, nền phụ |
| Đỏ (chỉ cảnh báo lỗi) | Lỗi | Bước lỗi, lỗi trường nhập |

Tỉ lệ dùng gợi ý: trắng/xám ~70%, cam ~15%, xanh dương ~10%, xanh lá ~5%. Không trộn cam–xanh thành gradient.

### 7.2 Token đề xuất (chỉnh theo brand guide nếu có)

```css
:root {
  --orange-500: #F26F21;  /* nút chính, nền */
  --orange-600: #D9590F;  /* hover; chữ cam trên nền trắng */
  --orange-50:  #FFF3EB;  /* nền nhạt */

  --blue-500:   #1E6FD9;
  --blue-600:   #1659B3;  /* chữ/link trên nền trắng */
  --blue-50:    #EBF3FF;

  --green-500:  #22A45D;
  --green-600:  #1A8049;  /* chữ trên nền trắng */
  --green-50:   #EAF7EF;

  --red-600:    #D63B3B;

  --white:      #FFFFFF;
  --gray-50:    #F7F8FA;  /* nền trang */
  --gray-200:   #E4E7EC;  /* viền */
  --gray-500:   #667085;  /* chữ phụ */
  --gray-900:   #101828;  /* chữ chính */

  --player-bg:  #0B0D12;  /* chỉ khung video là nền tối */
}
```

- Chữ màu cam/xanh trên nền trắng dùng sắc độ **600** để đủ tương phản (WCAG AA).
- Nút cam: chữ trắng, đậm.
- Khung video luôn nền tối để hình nổi; phần còn lại là giao diện sáng.

### 7.3 Nguyên tắc để không "nhìn như AI làm"

- Tham khảo công cụ nội dung thực tế (YouTube Studio, Frame.io, Canva khi duyệt bản), không phải landing page AI.
- Tránh: gradient tím–xanh, ✨ khắp nơi, glassmorphism, emoji trong UI, bong bóng chat, câu kiểu "Let AI do the magic". AI chỉ là nhãn chữ nhỏ **"AI"** màu xanh dương.
- Dữ liệu thật thay trang trí: thumbnail, điểm dạng số (0.87), timecode `01:07:23.450`, lý do ngắn.
- Mật độ vừa phải, chữ 14px, tabular numbers cho thời gian.
- Câu chữ tiếng Việt cụ thể: "Tạo lại", "Chốt phiên bản", "Chạy lại bước này".
- Trạng thái rỗng / đang tải / lỗi đều được thiết kế.
- Chuyển động tiết chế: đổi trạng thái, thông báo xong job.

## 8. Data contract (đề xuất thống nhất với BE)

```ts
interface Project {
  id: string; vodId: string;
  status: 'awaiting_config' | 'analyzing' | 'awaiting_review' | 'rendering' | 'ready' | 'published' | 'error' | 'cancelled';
  mode: 'auto' | 'review';
  config: GenerationConfig;
  steps: Step[]; variants: Variant[];
  metrics: { totalSec: number; costUsd: number };
}

interface GenerationConfig {
  goal: 'trailer' | 'teaser' | 'best_scenes' | 'character_intro';
  outputType: 'short' | 'long'; durationSec: number; ratio: '9:16' | '16:9';
  style?: 'cinematic' | 'dramatic' | 'funny' | 'energetic';
  pacing?: 'slow' | 'medium' | 'fast';
  focusCharacters?: string[];
  spoilerGuard: boolean; avoidSensitive: boolean;
  music?: { mood?: string; tempo?: number; instruments?: string[]; volumeRatio?: number };
  extras: { subtitle: boolean; voiceover: boolean; caption: boolean; smartCrop: boolean };
  prompt?: string;
  variantCount: number;
}

interface Step { name: 'analyze' | 'suggest' | 'music' | 'subtitle' | 'render' | 'export';
  status: 'pending' | 'running' | 'done' | 'error'; progress: number; error?: string; retryable: boolean; }

interface Variant { id: string; style: string; ratio: string; revisions: Revision[]; activeRevisionId: string; isPrimary: boolean; }

interface Revision {
  id: string; no: number; createdAt: string;
  adjustment?: { scope: 'all' | 'music' | 'text'; configDiff: Partial<GenerationConfig>; prompt?: string };
  changeSummary?: string;            // "+2 đoạn, −1 đoạn, tempo 90 → 110"
  segments: Segment[]; music: MusicTrack;
  checks: { name: string; passed: boolean; detail?: string }[];
  videoUrl?: string; zipUrl?: string; approved: boolean; restoredFrom?: string;
}

interface Segment { id: string; startMs: number; endMs: number; order: number;
  act: 'open' | 'body' | 'end'; score: number; labels: string[]; reason: string;
  signals?: { name: string; score: number }[]; thumbnailUrl: string; }

interface MusicTrack { id: string; tool: string; model: string; version: string; prompt: string;
  params: Record<string, unknown>; seed?: number; createdAt: string; audioUrl: string; selected: boolean; }

// ---- v3: Custom Preview ----
type AdjustScope = 'all' | 'music' | 'text' | 'presentation';   // 'presentation' = chỉ Dựng + Xuất

interface PresentationSettings {
  subtitle: { enabled: boolean; template: 'clean' | 'bold' | 'boxed' | 'cinema'; size: 'S' | 'M' | 'L';
              color: string; background: 'none' | 'shadow' | 'box'; position: 'top' | 'middle' | 'bottom' };
  captions: { enabledIds: string[]; template: string; position: 'top' | 'bottom' };
  audio: { originalGain: number; musicGain: number; voiceoverGain: number;   // 0..1
           ducking: 'light' | 'medium' | 'strong'; fadeInSec: number; fadeOutSec: number };
  musicTrackId: string;
  crop: 'subject' | 'center' | 'blur';
  branding: { logo: boolean; logoCorner: 'tl' | 'tr' | 'bl' | 'br'; endCard: boolean; endCardSec: number };
  transition: 'cut' | 'fade' | 'flash';
}
// Revision có thêm: presentation: PresentationSettings
// Adjustment có thêm: presentation?: PresentationSettings (khi scope = 'presentation')

/** Gói dữ liệu cho preview ghép trong trình duyệt */
interface PreviewPackage {
  proxyUrl: string;                     // 720p sạch, đúng thứ tự đoạn
  sourceProxyUrl: string;               // proxy VOD gốc – xem trong ngữ cảnh
  stems: { original: string; voiceover?: string; music: Record<string, string> };  // trackId → url
  subtitleCues: { startMs: number; endMs: number; text: string }[];   // theo dòng thời gian clip
  captionCues: { id: string; startMs: number; endMs: number; text: string }[];
  speechRanges: { startMs: number; endMs: number }[];                 // mốc thoại để mô phỏng ducking
  cropTracks: Record<'subject' | 'center', { tMs: number; x: number; y: number; w: number; h: number }[]>;
  segmentOffsets: { segmentId: string; clipStartMs: number }[];
}

interface PreviewPreset { id: string; name: string; platform?: 'tiktok' | 'reels' | 'shorts' | 'youtube' | 'facebook';
  settings: Partial<PresentationSettings>; builtIn: boolean; }

/** Chỉ lưu ở trình duyệt (localStorage) */
interface ViewPrefs { platformFrame: 'none' | 'tiktok' | 'reels' | 'shorts' | 'youtube' | 'facebook';
  safeZone: boolean; speed: number; loopSegment: boolean; contextPaddingSec: number; }
```

**API dự kiến:**

```
GET  /vods                               POST /vods (upload/link)
POST /prompt/parse                        → Partial<GenerationConfig>
POST /projects                            GET  /projects/:id
GET  /projects/:id/events   (SSE)         POST /projects/:id/cancel
POST /projects/:id/steps/:name/retry
POST /variants/:id/revisions              { scope, configDiff, prompt }   → tạo lại
POST /variants/:id/revisions/:rid/approve
POST /variants/:id/revisions/:rid/restore
PUT  /variants/:id/revisions/:rid/music   { trackId }
GET  /projects/:id/history
POST /variants/:id/post-suggestions

# v3 – Custom Preview
GET  /variants/:id/revisions/:rid/preview-package   → PreviewPackage
POST /variants/:id/revisions                        { scope: 'presentation', presentation }  → chỉ Dựng + Xuất
GET  /presets                                       POST /presets   DELETE /presets/:id
```

## 9. Tech stack & open source

| Việc | Lựa chọn | Lý do |
|---|---|---|
| Framework | Vite + React + TypeScript | SPA nội bộ, nhanh |
| Component | **Mantine** (core, dropzone, notifications) | Sẵn `Stepper`, `Timeline`, `Drawer`, `SegmentedControl`, `Slider`, `Chip` – đúng các control điều chỉnh; theme theo token màu dễ |
| Player | **Vidstack Player** | Chapters cho ranh giới đoạn, thumbnail, captions |
| Nghe thử nhạc | **wavesurfer.js** | Waveform cho 2–3 bản nhạc |
| Upload | **Uppy** + tus | Upload nối tiếp được |
| Form | **react-hook-form** + **zod** | Kiểm tra BR-01/03 trong schema |
| Server state | **TanStack Query** + `EventSource` | Cache + realtime SSE |
| Mock | **MSW** | FE làm song song BE |
| Icon | **Tabler Icons** | Đi cùng Mantine, nét gọn |
| Font | **Be Vietnam Pro** + **JetBrains Mono** (timecode) | Dấu tiếng Việt chuẩn |

| Preview ghép lớp (v3) | `<video>` + **Web Audio API** (GainNode từng track) + lớp HTML/CSS đồng bộ bằng `requestVideoFrameCallback` | Thay đổi hiện tức thì, không cần render server |
| Undo tùy chỉnh (v3) | **zustand** + **zundo** | Hoàn tác / làm lại cho tùy chỉnh trình bày |
| Phím tắt xem (v3) | `@mantine/hooks` `useHotkeys` | Space, ←/→, L, F, giữ `\` |

Đã bỏ so với v1: peaks.js, dnd-kit, hotkeys dựng phim (không còn chỉnh tay). zundo dùng lại ở v3 cho undo tùy chỉnh preview.

## 10. Cấu trúc thư mục

```
web/src/
  app/          # router, providers, theme (token màu)
  pages/        # library, configure, processing, result, history, publish
  features/
    vod/        # library, upload
    config/     # GenerationConfig form, prompt parse
    processing/ # stepper, SSE hook
    result/     # Preview Studio: layout, storyboard, checks, variants compare
    preview/    # v3: PreviewStage (video + lớp phủ), audio mixer (Web Audio), subtitle/caption renderer,
                #     platform frames, crop simulator, A/B sync, preset picker, store (zustand + zundo)
    adjust/     # drawer điều chỉnh, quick chips, music picker
    history/    # revision timeline, restore
    publish/    # post suggestions
  components/   # StatusBadge, Timecode, AiTag, ScorePill, SafeZoneOverlay, ActBar
  lib/          # api client, zod schemas, time utils
  mocks/        # MSW handlers + fixtures
```

## 11. Lộ trình

| Giai đoạn | Việc | Kết quả |
|---|---|---|
| **P0 – nền** | Khung dự án, theme màu, data contract, MSW + fixture | Chạy với dữ liệu giả |
| **P0 – luồng bắt buộc** | Màn 1, 2 (cơ bản), 3, 4 (player + storyboard + tải) | Demo đầu-cuối chế độ tự động |
| **P1 – ăn điểm** | Bảng điều chỉnh + tạo lại theo phạm vi, prompt → cấu hình, chọn nhạc, nhiều phương án, checklist, lịch sử phiên bản, số liệu thời gian/chi phí | Đủ tính năng mở rộng |
| **P1 – Custom Preview** | Bố cục Preview Studio + tabs; điều hướng theo đoạn, lặp, tốc độ; vùng an toàn có cảnh báo; khung nền tảng; phụ đề (mẫu, cỡ, vị trí); mix 3 track + đổi nhạc; trước/sau; đếm thay đổi + hoàn tác; **Áp dụng** (scope `presentation`); mock `PreviewPackage` | Tùy chỉnh trình bày tức thì, áp vào bản dựng nhanh |
| **P2 – thêm** | So sánh A/B, xem trong ngữ cảnh gốc, kiểu crop 9:16, caption, logo + end card, chuyển cảnh, preset (có sẵn + lưu riêng), chụp khung hình; bài đăng | Điểm cộng |
| **Demo** | Job dựng sẵn làm dự phòng (BR-34), kịch bản 10 phút | Demo ổn định |

## 12. Câu hỏi mở

1. BA cập nhật UC-G.1/G.2 và BR-24/25/26 theo mục 3?
2. BE có hỗ trợ tạo lại theo phạm vi (chỉ nhạc / chỉ chữ) dùng lại kết quả phân tích không?
3. BE có trả danh sách nhân vật nhận diện được để làm trường "nhân vật ưu tiên"?
4. BE tính sẵn `changeSummary` và `checks` hay FE tự tính từ hai revision?
5. Đăng nhập: đề xuất bỏ khi demo, dùng 1 user cố định.
6. SSE hay WebSocket cho trạng thái?
7. Có brand guide màu chính thức để thay token ở mục 7.2?
8. (v3) BE có xuất được `PreviewPackage` không: proxy 720p **chưa in phụ đề/logo**, các track âm thanh tách riêng (âm gốc / nhạc từng bản / voice-over), mốc thoại, khung crop theo thời gian? Thiếu phần nào thì tab tương ứng chuyển sang "xem trước gần đúng".
9. (v3) Scope `presentation` chỉ chạy Dựng + Xuất – thời gian ước tính bao lâu cho clip 60 giây? (để hiện ước lượng trên nút Áp dụng)
10. (v3) Logo FPT Play và end card: BTC có cho dùng logo không, hay dùng chữ "Xem trên FPT Play"?
11. (v3) BA bổ sung UC "Tùy chỉnh trình bày trên preview" và các BR mới: ngưỡng cảnh báo nhạc lấn thoại, vị trí phụ đề hợp lệ theo nền tảng.

## 13. Mẹo demo

- Chuẩn bị sẵn job đã xử lý xong; chạy job thật song song.
- Kịch bản (v4): Tạo và duyệt → bước 1: xem đoạn & lý do, bật khung TikTok, đổi kiểu crop / logo → Áp dụng → Chốt video → bước 2: đổi bản nhạc, kéo nhạc nhỏ lại, đổi kiểu phụ đề → Áp dụng → Chốt & xuất → tải SRT → Đăng sandbox.
- Kịch bản cũ (v3): Tạo tự động → xem kết quả & lý do → bật khung TikTok, đổi kiểu phụ đề, kéo nhạc nhỏ lại, đổi bản nhạc (thấy ngay) → **Áp dụng** → điều chỉnh nội dung "nhịp nhanh hơn, hook mạnh hơn" → so sánh v1/v2 (A/B hoặc lịch sử) → tải ZIP.
- Nhấn mạnh với BGK: mọi đoạn do AI chọn, người dùng chỉ điều chỉnh tham số; lịch sử là bằng chứng.

## 14. Kế hoạch triển khai chi tiết (v4)

### 14.1 Trạng thái & bước xử lý

| Trạng thái dự án | Nhãn | Khi nào |
|---|---|---|
| `analyzing` | Đang phân tích | Bước Phân tích |
| `rendering` | Đang xử lý | Đề xuất đoạn / Dựng video / Tạo nhạc / Tạo phụ đề / Trộn âm |
| `review_video` | Chờ duyệt video | Xong giai đoạn 1 (chế độ có duyệt) |
| `review_audio` | Chờ duyệt âm thanh | Xong giai đoạn 2 |
| `exporting` | Đang xuất | Bước Xuất |
| `ready` / `published` | Sẵn sàng / Đã đăng | Xong xuất / đã đăng |
| `error` / `cancelled` | Lỗi / Đã hủy | |

| Giai đoạn | Bước | Chạy lại khi |
|---|---|---|
| 1 · Video | Phân tích → Đề xuất đoạn → Dựng video | Điều chỉnh nội dung: Đề xuất + Dựng; tùy chỉnh hình ảnh: chỉ Dựng |
| 2 · Âm thanh & phụ đề | Tạo nhạc → Tạo phụ đề → Trộn âm | Tạo lại nhạc: Nhạc + Trộn; tạo lại phụ đề: Phụ đề + Trộn; tùy chỉnh mix/kiểu phụ đề: chỉ Trộn |
| 3 · Xuất | Xuất | Chốt & xuất |

### 14.2 Tùy chỉnh trên Preview theo giai đoạn

| Tab | Giai đoạn 1 | Giai đoạn 2 | Nội dung |
|---|---|---|---|
| Đoạn | ✔ | ✔ | Storyboard chỉ đọc, lý do, kiểm tra tự động, xem ngữ cảnh gốc |
| Hình ảnh | ✔ | ✔ | Kiểu crop 9:16, logo (bật/góc/cỡ), end card, chuyển cảnh |
| Âm thanh | – | ✔ | Chọn bản nhạc, âm lượng 3 track + tắt/nghe riêng, ducking, fade |
| Phụ đề | – | ✔ | Bật/tắt, mẫu chữ, cỡ, vị trí, nền; xem danh sách câu |
| Xem | ✔ | ✔ | Khung nền tảng, vùng an toàn, tốc độ, lặp đoạn, A/B, chụp khung hình |

### 14.3 Luồng màn hình

```
Thư viện ──(Thêm VOD: upload / link)──► Cấu hình ──► Đang xử lý (giai đoạn 1)
   ▲                                                     │
   │                                     Preview Studio · Bước 1 Duyệt video
   │                                       ├ Tùy chỉnh hình ảnh → Áp dụng (chỉ Dựng)
   │                                       ├ Điều chỉnh nội dung → AI chọn lại đoạn
   │                                       └ Chốt video ──► Đang xử lý (giai đoạn 2)
   │                                                     │
   │                                     Preview Studio · Bước 2 Âm thanh & phụ đề
   │                                       ├ Tùy chỉnh mix / phụ đề → Áp dụng (chỉ Trộn)
   │                                       ├ Tạo lại nhạc / phụ đề
   │                                       ├ Quay lại bước 1 (mở khóa video)
   │                                       └ Chốt & xuất ──► Đang xuất
   │                                                     │
   └──────────── Dự án ◄──── Đăng bài (gợi ý + sửa + đăng sandbox) ◄── Bước 3 Xuất & đăng (tải gói)
```

### 14.4 Hạng mục triển khai

| # | Hạng mục | Nội dung chính | Tệp / thư mục |
|---|---|---|---|
| 1 | Thương hiệu | Logo ảnh + "Play Hard" trên header, favicon, tiêu đề trang | `app/Layout.tsx`, `public/brand/` |
| 2 | Data contract | Trạng thái & bước mới, `Revision.phase`, `visual`, `audio` (nhạc, phụ đề, mix), khóa video, bài đăng | `types/domain.ts`, `lib/api.ts`, `lib/queries.ts` |
| 3 | Mock backend | Chạy theo giai đoạn, chốt / mở khóa video, áp dụng theo phạm vi, xuất, gợi ý & đăng bài, upload VOD | `mocks/` |
| 4 | Preview engine | Đồng hồ phát (thật hoặc ảo), khung hình mô phỏng bằng canvas khi chưa có video, crop 9:16, chuyển cảnh, lớp phủ phụ đề / logo / end card, khung nền tảng, vùng an toàn + cảnh báo | `features/preview/` |
| 5 | Preview Studio | Thanh giai đoạn, bố cục player + tabs, thanh thay đổi (đếm, hoàn tác, mặc định, giữ để xem bản đã dựng), Áp dụng / Chốt video / Chốt & xuất / Quay lại bước 1, phím tắt | `features/studio/` |
| 6 | So sánh & ngữ cảnh | A/B hai phiên bản / phương án với đồng hồ chung; xem đoạn ±N giây trong VOD gốc | `features/preview/` |
| 7 | Xử lý & lịch sử | Tiến trình theo giai đoạn; lịch sử có nhãn giai đoạn, phạm vi điều chỉnh | `features/processing/`, `pages/HistoryPage.tsx` |
| 8 | Thêm VOD | Upload (kéo thả, tiến độ) hoặc dán link, chọn thể loại | `features/library/` |
| 9 | Xuất & đăng | Tải timestamp JSON, phụ đề SRT, thông tin nhạc; gợi ý bài đăng theo nền tảng, đếm ký tự, xem trước, đăng sandbox | `features/result/export.ts`, `pages/PublishPage.tsx` |
| 10 | Kiểm thử & bàn giao | Build, lint, chạy thử luồng đầy đủ trên trình duyệt, cập nhật `artifacts/web`, README | |

### 14.5 Điều kiện hoàn thành

- Chạy trọn: Thêm VOD → Cấu hình → Giai đoạn 1 → tùy chỉnh hình ảnh + Áp dụng → Chốt video → Giai đoạn 2 → tùy chỉnh mix/phụ đề + Áp dụng → Chốt & xuất → tải SRT/timestamp → Đăng (sandbox).
- Chế độ tự động ra thẳng trạng thái Sẵn sàng; lỗi bước Tạo nhạc (VOD 3) chạy lại được.
- Preview phát được khi chưa có video thật (khung hình mô phỏng), mọi tùy chỉnh hiện tức thì.
- Không có thao tác chỉnh đoạn bằng tay ở bất kỳ màn nào.
- `npm run build`, `npm run lint` sạch; `artifacts/web` cập nhật.
