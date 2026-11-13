# ⚔️ Cờ Vua vs Cờ Tướng — Đông đấu Tây

Một game cờ lai: **một người cầm bộ cờ tướng, một người cầm bộ cờ vua, đấu nhau trên cùng một bàn cờ.**
Bản MVP v0.1.1 — tung ra để lấy ý kiến người chơi về cân bằng và luật lai.

> **Mới ở v0.1.1:** quân cờ **trượt đi mượt mà** khi di chuyển thay vì nhảy tới vị trí mới (áp dụng cho cả nước của đối thủ / máy / online), ô xuất phát và ô đích của nước vừa đi nhấp nháy làm nổi bật, và dưới bàn cờ luôn hiện dòng "Nước vừa đi: …" để khỏi bỏ lỡ nước của đối thủ. Người chơi bật chế độ giảm chuyển động (prefers-reduced-motion) sẽ tự động tắt hiệu ứng trượt.

## Chơi ngay

- **Offline:** tải thư mục này về, mở file `index.html` bằng trình duyệt là chơi được (không cần cài đặt, không cần mạng).
- **Online qua GitHub Pages:** đẩy toàn bộ thư mục lên một repo GitHub, vào *Settings → Pages → Deploy from a branch* (chọn branch `main`, thư mục `/root`) — vài phút sau game có link công khai để gửi bạn bè.

## Các chế độ chơi

| Chế độ | Mô tả |
|---|---|
| 👥 2 người cùng máy | Đối kháng offline trên cùng thiết bị. Mặc định là trận lai Tướng (trên) vs Vua (dưới), đổi được quân từng bên. |
| 🤖 Luyện tập với máy | Bạn cầm quân bên dưới, máy cầm quân bên trên (AI đơn giản: ưu tiên ăn quân / chiếu). Được chọn **bất cứ loại quân nào cho cả hai bên** — gồm cả Vua vs Vua và Tướng vs Tướng — để làm quen cơ chế từng hệ trước khi đấu lai. |
| 🌐 Online (Beta) | Hai máy khác nhau đấu qua mạng bằng mã phòng (kết nối ngang hàng WebRTC qua PeerJS, không cần server riêng). Chủ phòng tạo phòng → gửi mã 5 ký tự → người kia nhập mã vào phòng. Chỉ áp dụng trận lai: chủ phòng chọn cầm Tướng hoặc Vua. |

## Chọn kiểu bàn: vote + random 🪙

Trước ván, mỗi người chơi chọn một kiểu bàn: **ô vuông** (như cờ vua) hoặc **vạch kẻ / giao điểm** (như cờ tướng).
Chọn giống nhau thì dùng kiểu đó; khác nhau thì hệ thống **tung đồng xu random** quyết định.

> Vì sao random công bằng? Vì cả hai kiểu bàn dùng **chung một bộ luật và một lưới tọa độ 9×10** — bàn chỉ là "skin" hiển thị, không đổi luật, nên không bên nào lợi hơn.

## Luật lai đã áp dụng

1. **Bàn thống nhất 9 cột × 10 hàng.** Bên cờ tướng đi trước. Hàng cuối cờ vua nằm ở cột 1–8, Vua ở cột 5 đối cột với Tướng.
   *Ngoại lệ cân bằng:* ở cánh vua, **Mã và Xe đổi chỗ cho nhau** (kiểu Chess960: Tượng–Xe–Mã). Lý do: nếu xếp như cờ vua chuẩn, Pháo ở cột 8 sẽ dùng Tốt làm ngòi ăn mất Xe ở góc ngay nước đầu tiên mà không quân nào bảo vệ được (vì cột 9 trống). Sau khi đổi chỗ, cả hai Pháo ở nước đầu chỉ ăn được Mã — và Mã đều có Xe kề bên bảo vệ, thành trao đổi ngang như khai cuộc cờ tướng chuẩn.
2. **Phi tướng — biến thể B:** Tướng và Vua đối mặt trên cùng một cột không có quân chắn thì chỉ tính là **chiếu từ xa** (Vua phải chạy hoặc chắn cột). Tướng *không* bay sang ăn Vua và vẫn ở trong cung.
3. **Hết nước đi = thua** (kể cả khi không bị chiếu — theo cờ tướng). **Lặp lại thế cờ 3 lần = hòa.** Bản MVP chưa xử lý luật cấm chiếu dai của cờ tướng.
4. **Không nhập thành, không bắt tốt qua đường.** Tốt vua được **phong cấp** (Hậu / Xe / Tượng / Mã vua). **Chốt** tướng sang hàng cuối không phong cấp, chỉ đi ngang — đúng luật cờ tướng.
5. **Chiếu tính đúng luật từng quân:** Pháo phải có ngòi mới chiếu/ăn; Mã tướng bị cản chân; Tượng tướng bị cản mắt tượng, không qua sông; Sĩ/Tướng chỉ trong cung; Chốt chưa qua sông không đi ngang, qua sông rồi mới đi ngang, không đi lùi; Mã vua nhảy tự do; Tượng vua đi chéo không giới hạn; Hậu đi mọi hướng. Không được đi nước làm Vua/Tướng nhà bị chiếu. Ván kết thúc ở chiếu bí / hết nước — không bao giờ "ăn thật" Vua/Tướng.
6. **Chưa nerf/boost quân nào.** Hai bộ quân giữ nguyên để cộng đồng chơi thử và góp ý cân bằng trước.

### Bảng đối chiếu quân

| Cờ vua | Cờ tướng | Khác biệt chính |
|---|---|---|
| Vua (đi 8 hướng, tự do) | Tướng (đi ngang/dọc, trong cung, + chiếu phi tướng) | Tướng bị giới hạn cung nhưng có đòn chiếu từ xa |
| Hậu (mọi hướng, không giới hạn) | — (không có) | Quân đơn mạnh nhất bàn thuộc về phe vua |
| Xe | Xe | Giống hệt nhau |
| Tượng vua (chéo, không giới hạn) | Tượng (chéo đúng 2 ô, cản mắt, không qua sông) | Cùng tên, khác hẳn cách đi |
| Mã vua (nhảy L, không bị cản) | Mã (nhảy L, bị cản chân) | Chỉ khác luật cản chân |
| Tốt vua (đi thẳng, ăn chéo, phong cấp) | Chốt (đi thẳng/ngang sau khi qua sông, không lùi, không phong cấp) | Hai triết lý tốt khác nhau |
| — | Pháo (ăn phải nhảy qua ngòi) | Đòn độc quyền của phe tướng |
| — | Sĩ (chéo 1 ô, trong cung) | Thuần phòng thủ cung |

## Góp ý / báo lỗi

Trong game có nút **"Sao chép biên bản để góp ý"** — bấm nút đó sau ván đấu, dán biên bản vào issue kèm nhận xét của bạn:

- Phe nào đang quá mạnh / quá yếu? Vì quân nào?
- Luật lai nào khó hiểu hoặc vô lý?
- Đề xuất chấp quân / chỉnh luật?

Muốn nút "Mở trang góp ý" trong game hoạt động: mở `app.js`, điền link Issues của repo vào hằng số `FEEDBACK_URL` ở đầu file.

## Cấu trúc thư mục

```
index.html   — giao diện
style.css    — định dạng, 2 skin bàn cờ
game.js      — engine luật (thuần JS, chạy cả trên Node để test)
app.js       — điều khiển giao diện, chế độ chơi, online
tests/       — test tự động cho engine:  node tests/engine.test.js
```

Engine đã được kiểm chứng bằng test tự động, trong đó có: bàn gương Tướng-vs-Tướng cho đúng **44** nước đi hợp lệ ở khai cuộc như cờ tướng chuẩn, bàn gương Vua-vs-Vua cho đúng **20** nước như cờ vua chuẩn.

## Hạn chế đã biết của MVP

- Chưa có: nhập thành, bắt tốt qua đường, luật cấm chiếu dai, đồng hồ, chấp quân, AI mạnh (AI hiện tại chỉ đánh giá 1 nước).
- Online Beta phụ thuộc dịch vụ môi giới PeerJS công cộng — thỉnh thoảng có thể kết nối chậm; nếu cần ổn định lâu dài nên dựng server riêng.
- Bàn không tự xoay theo lượt (hai người ngồi đối diện dùng chung một hướng nhìn).

## Giấy phép

Mã nguồn mở — cứ fork, sửa luật, và chia sẻ biến thể của bạn. Ghi công tác giả gốc là đủ.
