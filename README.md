# ⚔️ Cờ Vua vs Cờ Tướng — Đông đấu Tây

Một game cờ lai: **một người cầm bộ cờ tướng, một người cầm bộ cờ vua, đấu nhau trên cùng một bàn cờ.**
Bản v0.2.2 — tung ra để lấy ý kiến người chơi về cân bằng và luật lai.

> **Mới ở v0.2.0 — Luật bổ trợ phe Tướng:** vì thực chiến cho thấy phe Tướng yếu thế hơn, game có thêm bộ luật bổ trợ tùy chọn (mặc định **tắt** — chọn preset "Đề xuất" hoặc "Tùy chỉnh" ở màn hình thiết lập). Các luật này **không đổi nước đi, số quân hay vị trí xếp quân** của hai bộ cờ, chỉ thêm điều kiện thắng/hòa và giới hạn phong cấp. Chi tiết ở mục riêng phía dưới.
>
> **Mới ở v0.1.1:** quân cờ **trượt đi mượt mà** khi di chuyển thay vì nhảy tới vị trí mới (áp dụng cho cả nước của đối thủ / máy / online), ô xuất phát và ô đích của nước vừa đi nhấp nháy làm nổi bật, và dưới bàn cờ luôn hiện dòng "Nước vừa đi: …" để khỏi bỏ lỡ nước của đối thủ. Người chơi bật chế độ giảm chuyển động (prefers-reduced-motion) sẽ tự động tắt hiệu ứng trượt.

## Có gì mới ở v0.2.2

- Toàn bộ giao diện khoác áo mới phong cách **Sơn mài cung đình**: nền đen sơn mài viền vàng, quân Tướng là đĩa ngà chữ đỏ son, bỏ hết emoji — ván cờ trông trang trọng hẳn lên.
- Thêm **thẻ người chơi** ở hai đầu bàn cờ: nhìn một cái là biết lượt của ai, phe Tướng đã chiếu được mấy lần Du kích, phe Vua còn bao nhiêu nước Trường kỳ.
- Chơi trên **điện thoại** sướng hơn: máy màn hình nhỏ chơi trọn ván không cần cuộn trang, nút bấm to dễ chạm.
- Luật chơi giữ nguyên từ v0.2.0 — gồm bộ **Luật bổ trợ phe Tướng** tùy chọn cho phe yếu thế. Bản này chỉ làm đẹp và tiện hơn, không đổi luật.

**Chơi thử rồi góp ý giúp mình nhé!** Cứ mở một [Issue](https://github.com/DLoc03/co-vua-vs-co-tuong/issues) và kể cảm nhận của bạn: phe nào đang mạnh/yếu, luật nào khó hiểu. Khi góp ý, bạn nhớ ghi rõ **ván đó có bật luật bổ trợ nào không** — bạn đang chơi preset "Bản gốc", "Đề xuất" hay "Tùy chỉnh" với những luật cụ thể nào — vì thông tin này quyết định cách mình chỉnh cân bằng ở bản tiếp theo. Đính kèm biên bản ván đấu (trong game có nút "Sao chép biên bản để góp ý") thì càng tốt!

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

## Luật bổ trợ phe Tướng (v0.2.0)

Thực chiến cho thấy phe Tướng yếu thế hơn phe Vua (quân bảo vệ Tướng bị bó trong cung/nửa bàn, hàng chốt mỏng hơn hàng tốt…). Bộ luật bổ trợ này giúp phe Tướng có thêm đường thắng — với nguyên tắc cứng: **không thay đổi nước đi của bất kỳ quân nào, không thêm/bớt quân, không đổi vị trí xếp quân ban đầu**; chỉ thêm luật về điều kiện thắng/hòa, phong cấp, chiếu dai và hết nước.

- Mọi luật **mặc định tắt**. Tắt hết thì game chạy y hệt bản gốc.
- Chỉ áp dụng ở **trận lai** (Tướng đấu Vua). Trận gương (cùng loại quân hai bên) tắt hoàn toàn.
- Chọn ở màn hình thiết lập: preset **Bản gốc** (tắt hết), preset **Đề xuất** (Du kích N=3 + Hậu cần có hạn + Giữ thành), hoặc **Tùy chỉnh** từng luật. Chế độ online: chủ phòng chọn luật, khách vào phòng chỉ xem.

### Từng luật

1. **⚔️ Du kích** (`guerrillaChecks = N`): sau mỗi nước đi của bên Tướng, nếu Vua đang bị chiếu (kể cả chiếu phi tướng, chiếu đôi cũng chỉ tính 1 lần) thì bộ đếm tăng 1. Đủ N lần, bên Tướng **thắng ngay** mà không cần chiếu bí. Trên giao diện hiện "Du kích: x/N lần chiếu".
2. **🏯 Giữ thành** (`defenderWinsOnDraw`): mọi kết quả **hòa** của ván (lặp thế 3 lần, hòa hết nước theo luật Chính nghĩa) đều chuyển thành **bên Tướng thắng**. Lưu ý: bên Tướng hết nước mà luật Chính nghĩa (2) không bật thì vẫn là thua, không phải hòa để chuyển.
3. **⏳ Trường kỳ kháng chiến** (`moveLimit = X`): đếm số nước bên Vua đã đi. Bên Vua đi đủ X nước mà chưa thắng được thì **bên Tướng thắng**. Giao diện hiện số nước còn lại.
4. **🎒 Hậu cần có hạn** (`promoteOnlyCaptured`): bên Tướng ăn được quân cờ vua nào thuộc nhóm phong cấp (Hậu/Xe/Tượng/Mã) thì quân đó vào "kho". Tốt vua chỉ phong cấp thành quân **có trong kho**, và mỗi lần phong tiêu hao 1 quân khỏi kho (quân phong cấp bị ăn sau đó lại quay về kho theo loại). Kho trống thì Tốt **không đi/ăn vào hàng cuối được** (kiểu Grand Chess). Cách đi của Tốt không đổi.
5. **⚖️ Chính nghĩa — chiếu dai** (`chessNoPerpetualCheck`): khi thế cờ lặp lại 3 lần, nếu trong **vòng lặp cuối** (từ lần xuất hiện thứ hai tới thứ ba) mọi nước của bên Vua đều là nước chiếu thì **bên Vua thua** vì chiếu dai. Bên Tướng chiếu dai thì hợp lệ — chỉ bên Vua bị xử.
6. **⚖️ Chính nghĩa — hết nước hòa** (`xiangqiStalemateDraw`): bên Tướng hết nước đi hợp lệ mà **không** bị chiếu thì ván **hòa** thay vì thua. Bên Vua hết nước vẫn thua như thường.

### Thứ tự ưu tiên khi xác định kết quả ván

Khi nhiều điều kiện cùng xảy ra ở một nước đi, engine xét theo thứ tự cố định sau (và biên bản/thông báo kết thúc ghi rõ lý do):

1. **Chiếu bí / hết nước** (hết nước của bên Tướng chuyển thành hòa nếu bật Chính nghĩa (2)).
2. **Du kích** — bên Tướng đủ N lần chiếu thì thắng, ưu tiên hơn cả hòa lặp thế.
3. **Chiếu dai của bên Vua** (Chính nghĩa (1)) — bên Vua thua, ưu tiên hơn hòa lặp thế.
4. **Lặp thế 3 lần** — hòa.
5. **Trường kỳ** — bên Tướng thắng (nhưng nếu nước thứ X của bên Vua chính là nước chiếu bí thì bên Vua thắng theo mục 1).
6. **Giữ thành** — nếu kết quả cuối cùng là hòa (ở mục 1 hoặc 4) và luật này bật, chuyển thành bên Tướng thắng.

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

- Ván đó bạn có bật **luật bổ trợ** nào không? (preset "Bản gốc" / "Đề xuất" / "Tùy chỉnh" — nếu tùy chỉnh thì bật những luật nào)
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

- Chưa có: nhập thành, bắt tốt qua đường, đồng hồ, chấp quân, AI mạnh (AI hiện tại chỉ đánh giá 1 nước). Luật cấm chiếu dai đã có dưới dạng luật bổ trợ tùy chọn "Chính nghĩa" — nhưng chỉ xử bên Vua, và chỉ trong trận lai.
- Online Beta phụ thuộc dịch vụ môi giới PeerJS công cộng — thỉnh thoảng có thể kết nối chậm; nếu cần ổn định lâu dài nên dựng server riêng.
- Bàn không tự xoay theo lượt (hai người ngồi đối diện dùng chung một hướng nhìn).

## Giấy phép

Mã nguồn mở — cứ fork, sửa luật, và chia sẻ biến thể của bạn. Ghi công tác giả gốc là đủ.
