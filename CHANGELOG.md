# CHANGELOG — Cờ Vua vs Cờ Tướng

## v0.2.4 — Khe sông thật cho skin ô vuông (LỖI 2) + chọn phe theo người chơi, quân của mình luôn ở dưới (Đợt B)

**Đợt B — chọn phe & hướng nhìn:**

- Màn thiết lập đổi hẳn cách chọn quân: **"Bạn cầm"** (Cờ Tướng / Cờ Vua) và **"Đối thủ"** (Người cùng máy / Máy / Online). Đối thủ mặc định cầm bộ còn lại; riêng chế độ luyện tập với máy có thêm mục **"Đối thủ cầm"** để đấu trận gương (Tướng–Tướng, Vua–Vua). Online: chủ phòng chọn "Bạn cầm", khách tự động nhận bộ còn lại.
- **Quân của người đang nhìn luôn ở phía dưới**: luyện với máy thì người ở dưới, máy ở trên; online thì mỗi máy tự lật bàn theo hướng của mình (chủ phòng và khách nhìn hai hướng ngược nhau); 2 người cùng máy thì người chọn "Bạn cầm" (P1) ở dưới, kèm tùy chọn **"Tự xoay bàn theo lượt"** (mặc định tắt) để bàn tự lật cho người sắp đi. Trận gương: P1 ở dưới.
- Lật bàn thuần túy là phép biến đổi hiển thị (xoay 180°: nền bàn, cung, khe sông, quân, ô đánh dấu, chấm gợi ý, animation trượt và tọa độ click/chạm đều đi qua cùng một phép đổi) — tọa độ engine, luật chơi và biên bản ván đấu giữ nguyên hệ quy chiếu cũ, nên biên bản giống hệt nhau dù nhìn từ hướng nào. Bên Tướng vẫn luôn đi trước.
- Thẻ người chơi đi theo hướng nhìn: thẻ **"Bạn"** luôn ở dưới bàn, đối thủ ở trên; tên thẻ ghi rõ vai trò và phe ("Bạn — Phe Tướng", "Đối thủ — Phe Vua", online là "Đối thủ (online)", luyện tập là "Máy"). Bộ đếm luật bổ trợ và nhãn "Đang bị chiếu!" đi theo đúng thẻ của phe tương ứng.
- Gói tin online có thêm trường phiên bản: nếu hai máy lệch phiên bản, cả hai đều nhận thông báo **"Đối thủ đang dùng phiên bản khác, hãy tải lại trang"** thay vì âm thầm lệch bàn.
- Mọi chữ trong ván (thanh lượt đi, thông báo kết thúc, biên bản) gọi phe bằng **tên tuyệt đối** — "Lượt đi: Phe Tướng", "Phe Vua THẮNG" (trận gương ghi thêm (P1)/(P2)) — bỏ hẳn cách ghi "(bên trên)/(bên dưới)", nên biên bản hai máy khớp nhau tuyệt đối dù bàn lật ngược nhau. Mặc định "Bạn cầm" là **Cờ Tướng**.
- Sửa thêm một lỗi tiềm ẩn từ trước: nước đi của máy đã lên lịch có thể "rò" sang ván mới nếu người chơi mở ván khác trong vòng 420ms — timer nay kiểm tra lại đúng ván trước khi đi.

**LỖI 2 — khe sông thật:**

- Skin **ô vuông** giờ có **khe sông thật**: hai nửa bàn tách hẳn nhau bởi một khoảng trống cao nửa ô nằm giữa hàng 5 và hàng 6, thay cho vạch vàng 2px vẽ đè lên mép ô ở bản trước. Trong khe là dải sông sơn mài viền vàng kèm chữ "SỞ HÀ · HÁN GIỚI" — đúng tinh thần Sở hà Hán giới.
- Chỉ thay đổi hình thức và hình học hiển thị của skin ô vuông: vị trí quân, vùng sáng nước đi và thao tác chạm/click được căn lại theo khe sông (bấm đúng vào khe thì bỏ qua, không chọn nhầm hàng kề); luật chơi và engine không đổi. Skin vạch kẻ giữ nguyên như cũ.

## v0.2.3 — Sửa hành vi chế độ Online

Đưa trải nghiệm online về đúng chuẩn game cờ online thông thường (không đổi luật, không đổi giao diện sơn mài):

- **Khách đi ngay, không chờ:** trước đây khách bấm nước đi phải chờ chủ phòng xác nhận mới thấy quân di chuyển, kèm dòng chữ "Đã gửi nước đi, chờ chủ phòng xác nhận…". Nay cả khách lẫn chủ phòng bấm là quân đi ngay tại máy mình; nước của khách được gửi cho chủ phòng kiểm chứng ngầm.
- **Kiểm chứng ngầm, im lặng tuyệt đối:** chủ phòng kiểm tra lại nước của khách chỉ để chống lệch bàn và chống sửa code. Lệch thì chủ phòng gửi lại state chuẩn, máy khách tự đồng bộ theo — không hiện bất kỳ thông báo "nước đi không hợp lệ" nào (giao diện vốn chỉ cho chọn nước hợp lệ); sự kiện chỉ ghi `console.warn` để debug.
- **Cảnh báo chiếu rõ hơn ở cả hai máy:** ngoài quân vương phát sáng và banner lượt đi như trước, thẻ của người chơi đang bị chiếu nay hiện thêm nhãn đỏ "Đang bị chiếu!".
- **Trạng thái kết nối:** trong ván chỉ hiện khi thật sự mất kết nối — dòng "Mất kết nối, đang thử lại…" — và tự ẩn khi kết nối lại; không còn thông báo trạng thái nào khác chen vào ván đấu.
- **Tái đấu trong cùng phòng + rà soát vòng đời chủ phòng:** nút "Ván mới" khi đang ở trong phòng online giờ mở ván mới ngay trong cùng phòng (chủ phòng mở ván, khách bấm sẽ gửi yêu cầu để chủ phòng mở) thay vì đá cả hai về màn hình thiết lập như trước — trước đây về thiết lập rồi thì không có đường nào bắt đầu ván mới trong phòng cũ. Khách kết nối lại và gửi lại "hello" giữa ván thì chủ phòng chỉ đồng bộ lại state, không reset ván đang đấu; mỗi lần tạo/vào phòng mới, trạng thái phiên được đặt lại sạch. Đã rà soát toàn bộ vòng đời cờ `isHost`: cờ chỉ được gán khi tạo phòng (= true) / vào phòng (= false) và không bị ghi đè bởi đồng bộ state, kết nối lại, đổi quân hay bắt đầu ván mới; có test tự động mô phỏng trọn vòng đời chủ phòng (tạo phòng → khách vào → đi nước đầu → khách đi → khách hello lại → khách xin thua → tái đấu → đi tiếp) khẳng định chủ phòng đi ngay ở mọi thời điểm.

## v0.2.2 — Giao diện "Sơn mài cung đình"

Đổi toàn bộ hình thức sang phong cách sơn mài cung đình (nền đen sơn mài, vàng, đỏ son, gỗ) — **chỉ đổi hình thức, không đụng logic game và engine**. Bộ màu khai báo thành biến CSS trong `:root`, ba font có hỗ trợ tiếng Việt: Playfair Display (tiêu đề), Be Vietnam Pro (chữ thường), Noto Serif SC subset đúng 13 ký tự quân tướng (chữ trên quân cờ tướng). Glyph cờ vua được nối ký tự biến thể văn bản (U+FE0E) để không bị biến thành emoji màu trên iOS/Android. Toàn bộ emoji trong giao diện được gỡ bỏ.

- **Bước 1 — màn hình chơi chính:** bàn cờ khung vàng nhiều lớp; skin ô vuông ô gỗ xen kẽ viền mảnh, skin vạch kẻ nền gỗ đường kẻ nâu; dải sông "SỞ HÀ · HÁN GIỚI" dùng chung cả 2 skin; quân tướng đĩa ngà chữ đỏ son có bóng đổ, quân vua glyph gỗ mun; thêm **thẻ người chơi** hai đầu bàn (avatar quân chủ lực, tên phe, dòng phụ "Giáo mác · đi trước" / "Súng đạn", sáng viền theo lượt đi) và chuyển các chip bộ đếm luật vào thẻ (Du kích nền đỏ son; Trường kỳ, Kho phong cấp viền vàng); dòng nước vừa đi có chấm vàng và tên nước in đậm; nút trong ván theo chuẩn nút chính vàng / nút phụ viền.
- **Chỉnh thêm sau bước 1:** skin ô vuông đổi dải sông thành đường kẻ vàng 2px giữa hai hàng giữa (skin vạch kẻ giữ dải sông); thẻ người chơi có chế độ gọn khi chiều cao màn hình dưới 720px (ẩn dòng phụ, avatar 28px) và công thức cỡ bàn trên mobile được tính lại để điện thoại 390×700 chơi trọn ván không phải cuộn kể cả khi thanh luật đang hiện; khai báo rõ font dự phòng offline (Georgia / system-ui).
- **Bước 2 — các màn còn lại:** màn chuẩn bị ván nền thẻ tối, lựa chọn đang chọn viền vàng nền thẻ; đồng xu tung chọn skin vẽ bằng SVG vàng–nâu; ô nhập mã phòng font Playfair cỡ lớn giãn chữ viền vàng, thêm nút "Sao chép mã" (có aria-label); hộp phong cấp nền thẻ viền vàng, mỗi lựa chọn là ô 56px chỉ hiện lựa chọn hợp lệ; thông báo kết thúc dùng icon SVG cúp/bắt tay màu vàng, tiêu đề Playfair, dòng vinh danh phe Tướng thắng thành dải riêng nền đỏ son viền vàng; biên bản ván đấu thành hộp nền tối chữ monospace, nút sao chép là nút chính.

## v0.2.1 — Tối ưu giao diện mobile

- Thêm CSS responsive cho màn hình nhỏ (≤720px): màn hình thiết lập xếp 1 cột; trong ván, bàn cờ căn giữa và tự giới hạn kích thước theo chiều cao màn hình (`dvh`) để thấy trọn bàn mà không phải cuộn; tiêu đề và khoảng đệm thu gọn.
- Nút bấm và ô nhập đạt kích thước thân thiện với cảm ứng (nút cao tối thiểu 44px, ô nhập 16px để tránh iOS tự phóng to khi chạm); hàng nút thao tác (Đi lại / Xin thua / Ván mới) chia đều chiều ngang; hộp chọn phong cấp và các hộp thoại co gọn theo màn hình.
- Điện thoại nằm ngang (chiều cao thấp): bố cục 2 cột, bàn cờ theo chiều cao màn hình, ẩn dòng khẩu hiệu cho gọn.
- Chỉ thay đổi CSS và số phiên bản — engine, luật chơi và giao diện desktop không đổi.

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
