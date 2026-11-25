# Prompt triển khai v7 – dán nguyên khối vào một session mới

```
Bạn là frontend engineer của đội Play Hard (Hackaithon FPT Play 2026). Trả lời và viết chữ trên UI bằng tiếng Việt.
Thư mục làm việc: thư mục gốc repo. App nằm ở web/ (Vite + React 19 + TypeScript, Mantine 9, TanStack Query,
Zustand, MSW mock, React Router 8).

ĐỌC TRƯỚC: plan/frontend-plan.md, mục "v7 – Kế hoạch hiện hành" (V7.1–V7.4 và V7.6). Bảng V7.3 là phạm vi
duy nhất: ✅ giữ, ✂️ không làm/bỏ khỏi UI, 🔁 đơn giản hóa. Tính năng lấy từ BA-doc/UI spec … .docx mục 1, 4–7, 8
(KHÔNG lấy mục 2–3 về design tokens/AppShell – đó là giao diện mockup). Mockup BA-doc/buoc-1-thu-vien-vod.html
chỉ để đối chiếu tính năng, KHÔNG copy giao diện của nó.

QUY TẮC
1. Giao diện theo UI/UX ban đầu (V7.6), lấy khung và theme từ web/legacy-v4/src (app/theme.ts, app/global.css,
   app/Layout.tsx, components/common.tsx):
   - nền trắng (trang #F7F8FA, thẻ trắng, viền #E4E7EC), CHỈ giao diện sáng, khung video nền tối;
   - màu theo vai trò: cam #F26F21 = hành động chính / bước đang chọn; xanh dương #1E6FD9 = đang xử lý,
     tiến trình, link, nhãn "AI"; xanh lá #22A45D = xong/sẵn sàng/đạt; đỏ chỉ cho lỗi; không gradient;
   - nhãn "Thủ công" màu xám đậm, thẻ đoạn thủ công viền xám nét đứt; đầu/cuối clip sọc xám nhạt;
   - header ngang trắng (logo ảnh + Play Hard + Trailer AI, tên dự án, badge trạng thái, nút "Dựng lại thành vN"),
     dưới là Mantine Stepper ngang 8 bước, nội dung trong Container size="xl", thanh hành động dính đáy
     (thẻ trắng có bóng: Quay lại + nút chính của bước);
   - Be Vietnam Pro, timecode JetBrains Mono.
   KHÔNG dùng bố cục mockup/legacy-v5: không thanh bên tối 220px, không chân màn "Bước k/8", không chế độ tối,
   không token màu mockup.
2. KHÔNG hiện mã use case trên UI ở bất kỳ đâu: không chip "UC-A.1"/"UC-A.2", không mã UC trong Stepper,
   không "(UC-A.2, 3a)" trong câu chữ, không UseCaseChip ở tiêu đề/khối tiến trình/lớp phủ.
   Mã UC chỉ được để trong comment code.
3. Không thêm tính năng ngoài V7.3. Làm luồng đơn giản trước.
4. Dữ liệu qua web/src/lib/api.ts (tiền tố /api/v1, thời gian tính bằng giây), mock ở web/src/mocks,
   luật V1–V18 ở web/src/lib/rules.ts. Hợp đồng API chuẩn: plan/api-proposal.md – api.ts và mock phải khớp
   tài liệu này (vd upload VOD là 1 request POST /vods multipart); nếu buộc phải lệch thì sửa cả tài liệu.
5. Không commit, không push. Không sửa web/legacy-v4, web/legacy-v5, BA-doc, subject.

CÁC BƯỚC (làm lần lượt, mỗi bước xong chạy `npm --prefix web run build` và `npm --prefix web run lint` phải sạch)

Bước 0 – Đổi khung và theme về giao diện ban đầu
- web/src hiện là bản khôi phục từ legacy-v5: GIỮ các màn hình (screens), lib, mocks, types.
  Nếu web/src thiếu hoặc hỏng thì chép lại từ web/legacy-v5/src trước.
- Thay khung app + theme theo quy tắc 1: dùng theme.ts/global.css/Layout header từ web/legacy-v4/src; xóa
  shell.css kiểu mockup, thanh bên tối, chân màn "Bước k/8", defaultColorScheme "auto" (đặt "light");
  thêm Stepper ngang 8 bước + thanh hành động dính đáy (nút chính của từng bước chuyển vào đây,
  vd màn 3 "Bắt đầu chọn đoạn"). Sửa các component đang dùng biến màu mockup (var(--accent), var(--manual)…)
  sang màu Mantine theo vai trò.
- Dữ liệu mẫu VOD (web/src/mocks/fixtures.ts) đổi thành 4 phim của mockup:
  Mùa Hè Cuối Cùng – Tâm lý – 6720 giây – Sẵn sàng;
  Đêm Săn – Hành động – 6080 giây – Đã phân tích trước;
  Nhà Có Ba Chị Em – Hài – 5805 giây – Đang tải lên 64%;
  Tiếng Gọi Dưới Hầm – Kinh dị – không đọc được thời lượng – Lỗi định dạng ("File lỗi định dạng. Hãy tải lại file khác.").
- Thể loại dùng nhãn tiếng Việt: 'Tâm lý' | 'Tình cảm' | 'Hành động' | 'Hài' | 'Kinh dị' (sửa type Genre,
  labels.ts styleByGenre, bộ lọc ở màn 1, mock). Vod.durationSec cho phép null.
- Dự án mẫu 'prj-demo' gắn với Mùa Hè Cuối Cùng; kịch bản "lỗi bước tạo nhạc lần đầu" chuyển sang Đêm Săn.

Bước 1 – Thư viện VOD
- Giữ: tìm theo tên, chip lọc (Tất cả, Tâm lý, Hành động, Hài, Kinh dị), danh sách VOD, thẻ chi tiết + ghi chú
  theo trạng thái, "Tạo clip từ phim này" (khóa khi đang tải lên/lỗi) → chọn VOD rồi sang /config.
- Thêm VOD: kéo thả/chọn file MP4/MOV/MKV ≤ 8 GB, tên phim, thể loại, "Lưu vào thư viện".
  Upload chỉ 1 request POST /api/v1/vods (multipart: file, title, genre) + thanh tiến độ; bỏ tạm dừng/tải tiếp
  và lib/upload.ts; sửa api.ts, mock db/handlers tương ứng. Không có nhập link.

Bước 2 – Template đầu/cuối
- Giữ danh sách 2 tab + form thêm (luật V3, V4). Bỏ thẻ xem trước lớn, chỉ ảnh nhỏ trong dòng.

Bước 3 – Cấu hình
- Giữ 7 trường theo spec và khối tiến trình dưới form (Chạy nền, Hủy, lỗi + chạy lại, xong → "Mở Duyệt đoạn AI"),
  khóa form khi chạy. Bảo đảm không có AI đọc prompt, chống spoil, chạy tự động. Bỏ chip UC ở khối tiến trình.

Bước 4 – Duyệt đoạn AI + giai đoạn 2
- Bỏ khỏi UI nút "Chia đôi đoạn" và "Nối với đoạn …" (giữ API/mock).
- Giữ: tab phương án, dòng thời gian cả phim (đánh dấu Vào/Ra), thẻ đoạn (↑ ↓, Cắt ghép/Chi tiết với 3 điểm
  tín hiệu, câu thoại, −1/+1 giây trong ±2 giây, Loại/Xóa), đoạn dự phòng + gợi ý bù, khối thời lượng + cảnh báo,
  nút xác nhận, form thêm đoạn thủ công, lớp phủ giai đoạn 2 (bỏ chip UC ở tiêu đề lớp phủ).

Bước 5 – Nhạc AI: giữ nguyên phạm vi V7.3, không có nút tải nhạc lên.

Bước 6 – Sub, lời dẫn, caption
- Thay ClipPlayer (canvas phát mô phỏng) bằng 1 khung xem tĩnh đúng tỉ lệ: ảnh khung đoạn đầu, logo góc,
  dòng sub hoặc caption đầu tiên đang bật. Không có nút phát.

Bước 7 – Xem trước và tải
- Khung xem: thẻ <video controls> nếu bản dựng có mp4Url, còn lại khung tĩnh của đoạn đang chọn.
- SegmentStrip chỉ để chọn đoạn (không playhead, không phát); đầu/cuối clip sọc xám nhạt.
- Giữ dòng công thức thời lượng, tóm tắt phương án, đặt phương án chính, tự crop 9:16 + hình minh họa,
  Tải MP4 / Tải tất cả (ZIP), 4 tệp kèm (JSON, SRT có Sao chép), khóa Tải khi có thay đổi chưa dựng.
- Xóa web/src/player (clock, canvas) nếu không còn nơi dùng.

Bước 8 – Đăng bài: giữ nguyên phạm vi V7.3 (sandbox, lỗi từng nền tảng, kết nối lại YouTube).

Bước 9 – Kiểm thử và bàn giao
- Tìm và xóa mọi chỗ còn hiện mã UC trên UI (grep "UC-" trong web/src: chỉ được còn trong comment).
- Chạy dev server, đi trọn luồng 1 → 8 trên trình duyệt: chọn phim → cấu hình → AI chọn đoạn → duyệt (sửa thứ tự,
  ±1 giây, loại, thêm dự phòng, thêm đoạn thủ công) → xác nhận → giai đoạn 2 → nhạc → sub → xem trước/tải → đăng.
  Kiểm tra desktop và mobile, đối chiếu giao diện với V7.6 (nền trắng, màu theo vai trò, header ngang), không lỗi console.
- `npm --prefix web run build:artifact` để cập nhật artifacts/web. Cập nhật web/README.md theo phạm vi V7.3.
- Báo lại: đã làm gì, chỗ nào lệch V7.3, việc còn lại.
```
