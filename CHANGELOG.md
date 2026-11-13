# CHANGELOG — Cờ Vua vs Cờ Tướng

## v0.2.0 — Luật bổ trợ phe Tướng

Bộ luật tùy chọn giúp phe Tướng (phe yếu thế trong thực chiến) có thêm đường thắng, với nguyên tắc cứng: **không đổi nước đi của bất kỳ quân nào, không thêm/bớt quân, không đổi vị trí xếp quân ban đầu** — chỉ thêm luật về điều kiện thắng/hòa, phong cấp, chiếu dai, hết nước. Mọi luật mặc định **tắt**; tắt hết thì game chạy y hệt v0.1.1. Chỉ áp dụng ở trận lai, trận gương tắt hoàn toàn.

### Giai đoạn 1 — Khung cấu hình + luật Du kích (engine)

- Thêm object cấu hình `DEFAULT_RULES` truyền vào khi khởi tạo ván, gồm 6 khóa luật, mặc định tắt hết.
- State ván đấu mang thêm hai bộ đếm: số lần bên Tướng chiếu, số nước bên Vua đã đi (phục vụ Du kích và Trường kỳ).
- Cài luật **Du kích**: bên Tướng chiếu đủ N lần thì thắng ngay (`reason: 'guerrilla'`); chiếu bí vẫn ưu tiên hơn; chiếu đôi tính 1 lần; chiếu phi tướng cũng được đếm.
- `gameStatus` trả về kèm mã lý do kết thúc (`reason`) để giao diện hiển thị đúng tên luật.
- Thêm `tests/rules.test.js` kiểm tra khung cấu hình và luật Du kích.

### Giai đoạn 2 — Lặp thế vào engine + 5 luật còn lại

- Phát hiện **lặp thế chuyển từ giao diện vào engine**: engine tự ghi lịch sử khóa thế cờ và cờ "nước chiếu" cho từng nước đi; hoàn tác và đồng bộ online tự đúng vì lịch sử nằm trong state. Giao diện chỉ đọc kết quả từ engine.
- Cài **Giữ thành**: mọi kết quả hòa chuyển thành bên Tướng thắng, reason dạng `defenderWin:*`.
- Cài **Trường kỳ kháng chiến**: bên Vua đi đủ X nước chưa thắng thì bên Tướng thắng (`reason: 'moveLimit'`).
- Cài **Hậu cần có hạn**: Tốt chỉ phong cấp thành quân cờ vua thuộc nhóm phong cấp đã bị ăn (kho tiêu hao dần); kho trống thì Tốt không vào được hàng cuối.
- Cài **Chính nghĩa (1) — chiếu dai**: lặp thế mà mọi nước của bên Vua trong vòng lặp đều là nước chiếu thì bên Vua thua (`reason: 'perpetualCheck'`).
- Cài **Chính nghĩa (2) — hết nước hòa**: bên Tướng hết nước không bị chiếu thì hòa (`reason: 'stalemateDraw'`).
- Thứ tự ưu tiên kết quả ván cố định trong engine: chiếu bí/hết nước → Du kích → chiếu dai → lặp thế → Trường kỳ → Giữ thành.
- Nghiệm thu giai đoạn 2 chốt thêm: luật chiếu dai chỉ xét **vòng lặp cuối** (lần xuất hiện thứ hai → thứ ba); kho hậu cần tính theo **loại quân** bị ăn, kể cả quân phong cấp; AI luyện tập chỉ chọn nước từ `legalMoves` nên tôn trọng luật Hậu cần có hạn.

### Giai đoạn 3 — Giao diện

- Màn hình thiết lập (chỉ hiện ở trận lai): mục **Luật bổ trợ phe Tướng** với 3 preset — **Bản gốc** (tắt hết, mặc định), **Đề xuất** (Du kích N=3 + Hậu cần có hạn + Giữ thành), **Tùy chỉnh** (bật/tắt từng luật; Du kích chọn N = 3/4/5; Trường kỳ chọn X = 60/70/80). Mỗi luật kèm một dòng giải thích theo tên gọi câu chuyện. Áp dụng cho cả 3 chế độ chơi.
- Trong ván: dòng liệt kê các luật đang bật; chip **"Du kích: x/N lần chiếu"**; chip **"Trường kỳ: còn y nước"**; chip **kho phong cấp** liệt kê các quân có thể phong. Chọn preset Bản gốc thì không hiện bất cứ thành phần nào thêm — giao diện y hệt v0.1.1.
- Hộp chọn phong cấp chỉ hiện các lựa chọn hợp lệ khi bật Hậu cần có hạn.
- Thông báo kết thúc ghi rõ lý do theo từng luật (ví dụ "theo luật Du kích (chiếu 3 lần)", "theo luật Giữ thành (ván lặp thế 3 lần)", "bên Vua thua do chiếu dai"). Bên Tướng thắng trong trận lai có thêm dòng vinh danh "Chiến thắng của phe yếu thế — giáo mác thắng súng đạn!".
- Biên bản ván đấu ghi danh sách luật đã bật (kèm N, X) và mã lý do kết thúc.
- Online: chủ phòng chọn luật, cấu hình đi kèm state sang khách; phía khách các điều khiển luật bị khóa ở chế độ chỉ xem. Không bật luật nào thì đồng bộ hoạt động như cũ.
- README bổ sung mục "Luật bổ trợ phe Tướng" (giải thích từng luật + thứ tự ưu tiên). Test giao diện mở rộng: preset, bộ đếm, hộp phong cấp, thông báo kết thúc, khách online không sửa được luật.

## v0.1.1 — Animation trượt quân

- Quân cờ trượt mượt tới ô mới thay vì nhảy vị trí (kể cả nước của đối thủ/máy/online và khi đi lại); ô xuất phát/đích của nước vừa đi nhấp nháy; dòng "Nước vừa đi" luôn hiện dưới bàn cờ. Tôn trọng `prefers-reduced-motion`.

## v0.1.0 — Bản MVP đầu tiên

- Bàn lai 9×10 thống nhất, hai kiểu hiển thị (ô vuông / vạch kẻ giao điểm) chọn bằng bỏ phiếu + tung đồng xu khi khác ý; 3 chế độ: 2 người cùng máy, luyện tập với máy (chọn bất kỳ bộ quân nào, kể cả trận gương), Online Beta qua PeerJS/WebRTC.
- Luật lai đã chốt: cờ tướng đi trước, phi tướng biến thể B (chỉ tính chiếu từ xa), hết nước = thua, lặp thế 3 lần = hòa, không nhập thành/bắt tốt qua đường, phong cấp tốt vua giữ nguyên, cánh vua đổi chỗ Mã–Xe kiểu Chess960 để Pháo không ăn Xe miễn phí ở nước đầu.
