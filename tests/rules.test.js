'use strict';
/*
 * Test LUẬT BỔ TRỢ PHE TƯỚNG — Giai đoạn 1: khung DEFAULT_RULES + luật Du kích.
 * Chạy: node tests/rules.test.js
 */
const E = require('../game.js');
let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, extra || ''); }
}
const P = (army, kind, side, x, y) => ({ army, kind, side, x, y });
// Bàn dựng tay: trên = cờ vua, dưới = cờ tướng (trận lai), kèm rules + counters như createBoard.
function boardWith(pieces, turn, rules, armies, extra) {
  const b = {
    armies: armies || { top: 'chess', bottom: 'xiangqi' },
    pieces, turn: turn || 'bottom',
    rules: { ...E.DEFAULT_RULES, ...(rules || {}) },
    counters: { xiangqiChecks: 0, chessMoves: 0 },
    moveFlags: [],
    capturedChess: (extra && extra.capturedChess) || [],
  };
  b.posHistory = [E.positionKey(b)];
  return b;
}
const mv = (fx, fy, tx, ty) => ({ fx, fy, tx, ty });

// ---------- 1. Khung cấu hình ----------
const cb = E.createBoard({ top: 'xiangqi', bottom: 'chess' }, { guerrillaChecks: 3 });
check('createBoard nhận rules: guerrillaChecks = 3', cb.rules.guerrillaChecks === 3);
check('các luật không truyền vào vẫn tắt theo DEFAULT_RULES',
  cb.rules.defenderWinsOnDraw === false && cb.rules.moveLimit === 0 && cb.rules.promoteOnlyCaptured === false
  && cb.rules.chessNoPerpetualCheck === false && cb.rules.xiangqiStalemateDraw === false);
check('bộ đếm khởi tạo bằng 0', cb.counters.xiangqiChecks === 0 && cb.counters.chessMoves === 0);
const cbDefault = E.createBoard({ top: 'xiangqi', bottom: 'chess' });
check('không truyền rules thì mọi luật đều tắt', Object.values(cbDefault.rules).every(v => v === 0 || v === false));
check('trận lai xác định được phe: tướng = top, vua = bottom', E.xiangqiSideOf(cb) === 'top' && E.chessSideOf(cb) === 'bottom');
const cbMirror = E.createBoard({ top: 'xiangqi', bottom: 'xiangqi' });
check('trận gương không xác định được phe tướng/vua', E.xiangqiSideOf(cbMirror) === null && E.chessSideOf(cbMirror) === null);

// ---------- 2. Du kích: chiếu đủ N lần thì thắng, N-1 lần thì chưa ----------
// Thế cờ: Vua (4,0); Tướng (3,9); Xe tướng (0,5). Xe lên (0,0) chiếu theo hàng, Vua chạy (4,1), Xe lên (0,1) chiếu lần 2.
function guerrillaBoard(rules) {
  return boardWith([
    P('chess', 'king', 'top', 4, 0),
    P('xiangqi', 'general', 'bottom', 3, 9),
    P('xiangqi', 'chariot', 'bottom', 0, 5),
  ], 'bottom', rules);
}
{
  const b0 = guerrillaBoard({ guerrillaChecks: 2 });
  const b1 = E.applyMove(b0, mv(0, 5, 0, 0)); // chiếu lần 1
  check('sau nước chiếu, bộ đếm = 1', b1.counters.xiangqiChecks === 1, b1.counters.xiangqiChecks);
  check('bàn cũ giữ nguyên bộ đếm 0 (hoàn tác bằng state cũ là đúng)', b0.counters.xiangqiChecks === 0);
  const st1 = E.gameStatus(b1);
  check('chiếu lần 1 (N-1): ván chưa kết thúc', st1.over === false, JSON.stringify(st1));
  check('chiếu lần 1: trạng thái báo đang chiếu', st1.check === true);
  const b2 = E.applyMove(b1, mv(4, 0, 4, 1)); // Vua chạy
  check('nước của bên Vua không tăng bộ đếm chiếu', b2.counters.xiangqiChecks === 1);
  const b3 = E.applyMove(b2, mv(0, 0, 0, 1)); // chiếu lần 2
  check('sau nước chiếu thứ hai, bộ đếm = 2', b3.counters.xiangqiChecks === 2);
  const st3 = E.gameStatus(b3);
  check('chiếu đủ N=2 lần: ván kết thúc', st3.over === true, JSON.stringify(st3));
  check('thắng thuộc về bên Tướng', st3.winner === 'bottom', st3.winner);
  check("lý do thắng là 'guerrilla'", st3.reason === 'guerrilla', st3.reason);
}

// ---------- 3. Nước không chiếu thì không đếm ----------
{
  const b0 = guerrillaBoard({ guerrillaChecks: 2 });
  const b1 = E.applyMove(b0, mv(0, 5, 1, 5)); // Xe đi ngang, không chiếu
  check('nước không chiếu không tăng bộ đếm', b1.counters.xiangqiChecks === 0);
}

// ---------- 4. Tắt luật thì không đếm, không thắng kiểu Du kích ----------
{
  const b0 = guerrillaBoard({}); // mọi luật tắt
  const b1 = E.applyMove(b0, mv(0, 5, 0, 0));
  const b2 = E.applyMove(b1, mv(4, 0, 4, 1));
  const b3 = E.applyMove(b2, mv(0, 0, 0, 1));
  check('tắt luật: bộ đếm luôn 0 dù chiếu 2 lần', b3.counters.xiangqiChecks === 0);
  check('tắt luật: chiếu 2 lần không kết thúc ván', E.gameStatus(b3).over === false);
}

// ---------- 5. Chiếu từ xa (phi tướng) cũng được tính là một lần chiếu ----------
{
  const b0 = boardWith([
    P('chess', 'king', 'top', 4, 0),
    P('xiangqi', 'general', 'bottom', 3, 7),
  ], 'bottom', { guerrillaChecks: 2 });
  const b1 = E.applyMove(b0, mv(3, 7, 4, 7)); // Tướng sang cột 4, đối mặt Vua -> chiếu từ xa
  check('chiếu phi tướng được đếm', b1.counters.xiangqiChecks === 1, b1.counters.xiangqiChecks);
  check('sau chiếu phi tướng, trạng thái báo bên Vua bị chiếu', E.gameStatus(b1).check === true);
  check('chiếu phi tướng 1 lần (N=2) chưa thắng', E.gameStatus(b1).over === false);
}

// ---------- 6. Chiếu bí được ưu tiên hơn thắng Du kích ----------
// Vua (4,0) bị Xe tướng từ (0,1) sang (4,1) chiếu trực diện theo cột. Các ô chạy đều bị khóa:
// (3,1) và (5,1) do chính Xe chiếu theo hàng, (3,0) do Mã (2,2) khóa, (5,0) do Mã (7,1) khóa,
// còn ăn Xe ở (4,1) thì bị Mã (2,2) bảo vệ (Mã tấn công (4,1), chân mã (3,2) trống) -> chiếu bí.
{
  const b0 = boardWith([
    P('chess', 'king', 'top', 4, 0),
    P('xiangqi', 'general', 'bottom', 3, 9),
    P('xiangqi', 'chariot', 'bottom', 0, 1),
    P('xiangqi', 'horse', 'bottom', 2, 2), P('xiangqi', 'horse', 'bottom', 7, 1),
  ], 'bottom', { guerrillaChecks: 1 }); // N=1: nếu không ưu tiên chiếu bí thì nước này sẽ ghi reason 'guerrilla'
  check('nước chiếu bí nằm trong danh sách nước hợp lệ', E.legalMoves(b0, 'bottom').some(m => m.fx === 0 && m.fy === 1 && m.tx === 4 && m.ty === 1));
  const b1 = E.applyMove(b0, mv(0, 1, 4, 1));
  check('bộ đếm vẫn tăng lên 1 ở nước chiếu bí', b1.counters.xiangqiChecks === 1);
  const st = E.gameStatus(b1);
  check('ván kết thúc', st.over === true);
  check("lý do là 'checkmate', không phải 'guerrilla'", st.reason === 'checkmate', st.reason);
  check('bên Tướng vẫn là bên thắng', st.winner === 'bottom');
}

// ---------- 7. Trận gương (hai bên cùng hệ): luật Du kích không áp dụng ----------
{
  const b0 = boardWith([
    P('xiangqi', 'general', 'top', 3, 0), P('xiangqi', 'general', 'bottom', 4, 9),
    P('xiangqi', 'chariot', 'top', 0, 5),
  ], 'top', { guerrillaChecks: 1 }, { top: 'xiangqi', bottom: 'xiangqi' });
  const b1 = E.applyMove(b0, mv(0, 5, 0, 9)); // Xe chiếu Tướng dưới theo hàng 9
  check('trận gương: bộ đếm không tăng', b1.counters.xiangqiChecks === 0);
  const st = E.gameStatus(b1);
  check('trận gương: không thắng kiểu Du kích dù đã chiếu', st.over === false && st.reason !== 'guerrilla', JSON.stringify(st));
}

// ================= GIAI ĐOẠN 2 =================

// ---------- 8. Lặp thế do ENGINE phát hiện (tắt hết luật bổ trợ: hành vi y hệt v0.1.1) ----------
// Hai Xe đi qua lại: sau 4 nước thế cờ quay lại ban đầu (2 lần), sau 8 nước là 3 lần -> hòa.
function shuffleBoard(rules) {
  return boardWith([
    P('xiangqi', 'general', 'top', 4, 0), P('xiangqi', 'chariot', 'top', 0, 5),
    P('chess', 'king', 'bottom', 3, 9), P('chess', 'rook', 'bottom', 8, 8),
  ], 'top', rules, { top: 'xiangqi', bottom: 'chess' });
}
function playShuffle(b) {
  b = E.applyMove(b, mv(0, 5, 1, 5)); b = E.applyMove(b, mv(8, 8, 7, 8));
  b = E.applyMove(b, mv(1, 5, 0, 5)); b = E.applyMove(b, mv(7, 8, 8, 8));
  return b;
}
{
  let b = playShuffle(shuffleBoard({}));
  check('lặp 2 lần: ván chưa kết thúc', E.gameStatus(b).over === false);
  b = playShuffle(b);
  const st = E.gameStatus(b);
  check('lặp 3 lần (tắt hết luật): ván kết thúc', st.over === true);
  check('lặp 3 lần: hòa, không bên nào thắng', st.winner === null);
  check("lặp 3 lần: reason 'repetition'", st.reason === 'repetition', st.reason);
  check('engine tự ghi đủ lịch sử thế cờ', b.posHistory.length === 9 && b.moveFlags.length === 8);
}
{
  // Giữ thành: hòa lặp thế chuyển thành bên Tướng (top) thắng
  let b = playShuffle(playShuffle(shuffleBoard({ defenderWinsOnDraw: true })));
  const st = E.gameStatus(b);
  check('Giữ thành: lặp thế thành bên Tướng thắng', st.winner === 'top', st.winner);
  check("Giữ thành: reason 'defenderWin:repetition'", st.reason === 'defenderWin:repetition', st.reason);
}
{
  // Ưu tiên: lặp thế (mục 4) xét trước Trường kỳ (mục 5) — cùng lúc đạt cả hai thì vẫn hòa lặp thế
  let b = playShuffle(playShuffle(shuffleBoard({ moveLimit: 4 })));
  const st = E.gameStatus(b);
  check('lặp thế + đủ số nước Trường kỳ cùng lúc: reason vẫn là repetition', st.reason === 'repetition' && st.winner === null, JSON.stringify(st));
}
{
  // Bật Chính nghĩa (1) nhưng chu kỳ không có nước chiếu nào của bên Vua -> vẫn hòa lặp thế
  let b = playShuffle(playShuffle(shuffleBoard({ chessNoPerpetualCheck: true })));
  const st = E.gameStatus(b);
  check('chiếu dai bật nhưng không ai chiếu trong chu kỳ: vẫn hòa lặp thế', st.winner === null && st.reason === 'repetition', JSON.stringify(st));
}

// ---------- 9. Chính nghĩa (1): bên Vua chiếu dai thì bên Vua thua ----------
// Tướng (4,8) bị Xe (0,8) chiếu, chạy lên (4,9); Xe lên (0,9) chiếu tiếp; qua lại 2 chu kỳ -> lặp 3 lần,
// mọi nước của bên Vua trong chu kỳ đều là nước chiếu.
function perpetualBoard(rules) {
  return boardWith([
    P('chess', 'king', 'top', 8, 0), P('chess', 'rook', 'top', 0, 8),
    P('xiangqi', 'general', 'bottom', 4, 8),
  ], 'bottom', rules);
}
function playPerpetualCycle(b) {
  b = E.applyMove(b, mv(4, 8, 4, 9)); b = E.applyMove(b, mv(0, 8, 0, 9));
  b = E.applyMove(b, mv(4, 9, 4, 8)); b = E.applyMove(b, mv(0, 9, 0, 8));
  return b;
}
{
  let b = playPerpetualCycle(perpetualBoard({ chessNoPerpetualCheck: true }));
  check('chiếu dai: lặp 2 lần chưa kết thúc', E.gameStatus(b).over === false);
  b = playPerpetualCycle(b);
  const st = E.gameStatus(b);
  check('chiếu dai đủ chu kỳ: ván kết thúc', st.over === true);
  check('chiếu dai: bên Vua thua, bên Tướng thắng', st.winner === 'bottom', st.winner);
  check("chiếu dai: reason 'perpetualCheck'", st.reason === 'perpetualCheck', st.reason);
}
{
  let b = playPerpetualCycle(playPerpetualCycle(perpetualBoard({})));
  const st = E.gameStatus(b);
  check('tắt Chính nghĩa (1): cùng thế cờ chỉ hòa lặp thế', st.winner === null && st.reason === 'repetition', JSON.stringify(st));
}
{
  // Phân biệt cách xét VÒNG LẶP CUỐI (đã chốt ở nghiệm thu giai đoạn 2):
  // vòng lặp đầu có nước của bên Vua KHÔNG chiếu, vòng lặp cuối mọi nước của bên Vua đều chiếu
  // -> vẫn xử bên Vua thua chiếu dai (nếu xét cả hai vòng thì sẽ chỉ hòa).
  let b = perpetualBoard({ chessNoPerpetualCheck: true });
  // Vòng 1 (8 nước): Xe chiếu, Vua đi 2 nước không chiếu, Xe đi 1 nước không chiếu
  b = E.applyMove(b, mv(4, 8, 4, 9)); b = E.applyMove(b, mv(0, 8, 0, 9)); // Tướng chạy, Xe chiếu
  b = E.applyMove(b, mv(4, 9, 4, 8)); b = E.applyMove(b, mv(8, 0, 7, 0)); // Tướng về, Vua đi ngang (không chiếu)
  b = E.applyMove(b, mv(4, 8, 4, 7)); b = E.applyMove(b, mv(0, 9, 0, 8)); // Tướng xuống, Xe về (không chiếu Tướng ở (4,7))
  b = E.applyMove(b, mv(4, 7, 4, 8)); b = E.applyMove(b, mv(7, 0, 8, 0)); // Tướng lên (bị chiếu), Vua về -> thế mở đầu lần 2
  check('sau vòng 1 (có nước không chiếu): chưa kết thúc', E.gameStatus(b).over === false);
  // Vòng 2 (4 nước): mọi nước của bên Vua đều chiếu
  b = playPerpetualCycle(b);
  const st = E.gameStatus(b);
  check('chỉ xét vòng lặp cuối: bên Vua vẫn thua chiếu dai', st.winner === 'bottom' && st.reason === 'perpetualCheck', JSON.stringify(st));
}

// ---------- 10. Chính nghĩa (2) + Giữ thành trên thế hết nước ----------
// Tướng (4,9) hết nước mà không bị chiếu: (3,9)/(5,9) bị hai Xe khóa cột, (4,8) bị Hậu khóa hàng.
function xiangqiStalemateBoard(rules) {
  return boardWith([
    P('chess', 'king', 'top', 8, 0), P('chess', 'rook', 'top', 3, 5),
    P('chess', 'rook', 'top', 5, 5), P('chess', 'queen', 'top', 0, 8),
    P('xiangqi', 'general', 'bottom', 4, 9),
  ], 'bottom', rules);
}
{
  const stOff = E.gameStatus(xiangqiStalemateBoard({}));
  check('hết nước (tắt hết luật): bên Tướng thua như cũ', stOff.winner === 'top' && stOff.reason === 'stalemate', JSON.stringify(stOff));
  const stDraw = E.gameStatus(xiangqiStalemateBoard({ xiangqiStalemateDraw: true }));
  check("Chính nghĩa (2): bên Tướng hết nước không bị chiếu -> hòa, reason 'stalemateDraw'", stDraw.winner === null && stDraw.reason === 'stalemateDraw', JSON.stringify(stDraw));
  const stDef = E.gameStatus(xiangqiStalemateBoard({ xiangqiStalemateDraw: true, defenderWinsOnDraw: true }));
  check("Chính nghĩa (2) + Giữ thành: hòa chuyển thành bên Tướng thắng, reason 'defenderWin:stalemateDraw'", stDef.winner === 'bottom' && stDef.reason === 'defenderWin:stalemateDraw', JSON.stringify(stDef));
  const stDefOnly = E.gameStatus(xiangqiStalemateBoard({ defenderWinsOnDraw: true }));
  check('chỉ bật Giữ thành (không Chính nghĩa 2): hết nước vẫn là thua, không phải hòa để chuyển', stDefOnly.winner === 'top' && stDefOnly.reason === 'stalemate', JSON.stringify(stDefOnly));
}
{
  // Bên Vua hết nước thì vẫn thua kể cả khi Chính nghĩa (2) bật (luật chỉ cứu bên Tướng)
  const b = boardWith([
    P('xiangqi', 'general', 'top', 4, 0), P('xiangqi', 'chariot', 'top', 1, 5), P('xiangqi', 'chariot', 'top', 5, 8),
    P('chess', 'king', 'bottom', 0, 9),
  ], 'bottom', { xiangqiStalemateDraw: true }, { top: 'xiangqi', bottom: 'chess' });
  const st = E.gameStatus(b);
  check('bên Vua hết nước: vẫn thua dù Chính nghĩa (2) đang bật', st.winner === 'top' && st.reason === 'stalemate', JSON.stringify(st));
}

// ---------- 11. Trường kỳ kháng chiến ----------
{
  let b = boardWith([
    P('chess', 'king', 'top', 4, 0), P('chess', 'rook', 'top', 8, 0),
    P('xiangqi', 'general', 'bottom', 3, 9), P('xiangqi', 'chariot', 'bottom', 0, 5),
  ], 'bottom', { moveLimit: 2 });
  b = E.applyMove(b, mv(0, 5, 0, 4)); b = E.applyMove(b, mv(8, 0, 8, 1)); // bên Vua đi nước 1
  check('Trường kỳ: mới 1/2 nước của bên Vua, ván tiếp tục', E.gameStatus(b).over === false);
  check('bộ đếm nước bên Vua = 1', b.counters.chessMoves === 1);
  b = E.applyMove(b, mv(0, 4, 0, 5)); b = E.applyMove(b, mv(8, 1, 8, 0)); // bên Vua đi nước 2
  const st = E.gameStatus(b);
  check('Trường kỳ: đủ 2 nước mà chưa thắng -> bên Tướng thắng', st.over === true && st.winner === 'bottom', JSON.stringify(st));
  check("Trường kỳ: reason 'moveLimit'", st.reason === 'moveLimit', st.reason);
}
{
  // Xung đột: nước thứ X của bên Vua lại là nước chiếu bí -> bên Vua thắng (mục 1 ưu tiên mục 5)
  const b0 = boardWith([
    P('chess', 'king', 'top', 8, 0), P('chess', 'queen', 'top', 6, 3),
    P('chess', 'rook', 'top', 4, 5), P('chess', 'rook', 'top', 0, 8),
    P('xiangqi', 'general', 'bottom', 3, 9),
  ], 'top', { moveLimit: 1 });
  const b1 = E.applyMove(b0, mv(6, 3, 3, 3)); // Hậu về (3,3) chiếu bí Tướng
  const st = E.gameStatus(b1);
  check('nước thứ X chiếu bí: bên Vua thắng bằng chiếu bí', st.winner === 'top' && st.reason === 'checkmate', JSON.stringify(st));
}

// ---------- 12. Hậu cần có hạn ----------
function promoBoard(rules, capturedChess, armies) {
  return boardWith([
    P('xiangqi', 'general', 'top', 3, 0), // lệch cột với Vua (4,9) để tránh chiếu phi tướng ngoài ý muốn
    P('chess', 'king', 'bottom', 4, 9), P('chess', 'pawn', 'bottom', 0, 1),
  ], 'bottom', rules, armies, { capturedChess });
}
{
  const bEmpty = promoBoard({ promoteOnlyCaptured: true }, []);
  check('Hậu cần có hạn + danh sách rỗng: Tốt không được vào hàng cuối',
    !E.legalMoves(bEmpty, 'bottom').some(m => m.fx === 0 && m.fy === 1 && m.ty === 0));
  const bRook = promoBoard({ promoteOnlyCaptured: true }, ['rook']);
  const promoMoves = E.legalMoves(bRook, 'bottom').filter(m => m.fx === 0 && m.fy === 1 && m.ty === 0);
  check('có Xe trong danh sách: được phong Xe', promoMoves.length === 1 && promoMoves[0].promotion === 'rook', JSON.stringify(promoMoves));
  check('không được phong Hậu khi danh sách chỉ có Xe', !promoMoves.some(m => m.promotion === 'queen'));
  const bAfter = E.applyMove(bRook, promoMoves[0]);
  const promoted = E.pieceAt(bAfter, 0, 0);
  check('phong xong: quân ở hàng cuối là Xe', !!promoted && promoted.kind === 'rook');
  check('phong xong: danh sách bị tiêu hao 1 Xe', bAfter.capturedChess.length === 0);
  const bOff = promoBoard({}, []);
  check('tắt luật: Tốt phong Hậu như cũ dù danh sách rỗng',
    E.legalMoves(bOff, 'bottom').some(m => m.fx === 0 && m.fy === 1 && m.ty === 0 && m.promotion === 'queen'));
  const bMirror = promoBoard({ promoteOnlyCaptured: true }, [], { top: 'chess', bottom: 'chess' });
  check('trận gương Vua-Vua: luật không áp dụng, vẫn phong Hậu được',
    E.legalMoves(bMirror, 'bottom').some(m => m.fx === 0 && m.fy === 1 && m.ty === 0 && m.promotion === 'queen'));
}
{
  // Ăn quân cờ vua thuộc nhóm phong cấp được thì danh sách tăng; ăn quân khác thì không
  const mkBoard = target => boardWith([
    P('chess', 'king', 'top', 4, 0), target,
    P('xiangqi', 'general', 'bottom', 3, 9), P('xiangqi', 'chariot', 'bottom', 0, 5),
  ], 'bottom', { promoteOnlyCaptured: true });
  const bRook = E.applyMove(mkBoard(P('chess', 'rook', 'top', 0, 0)), mv(0, 5, 0, 0));
  check('Xe tướng ăn Xe vua: danh sách +1 Xe', JSON.stringify(bRook.capturedChess) === '["rook"]', JSON.stringify(bRook.capturedChess));
  const bPawn = E.applyMove(mkBoard(P('chess', 'pawn', 'top', 0, 3)), mv(0, 5, 0, 3));
  check('ăn Tốt vua: danh sách không đổi', bPawn.capturedChess.length === 0);
}
{
  // Kho hậu cần tính theo LOẠI quân bị ăn, kể cả quân phong cấp (đã chốt ở nghiệm thu giai đoạn 2):
  // Tốt phong Hậu (tiêu hao 'queen'), sau đó quân Hậu phong cấp đó bị Xe tướng ăn -> kho lại có 'queen'.
  let b = boardWith([
    P('xiangqi', 'general', 'top', 3, 0), P('xiangqi', 'chariot', 'top', 0, 5),
    P('chess', 'king', 'bottom', 4, 9), P('chess', 'pawn', 'bottom', 0, 1),
  ], 'bottom', { promoteOnlyCaptured: true }, undefined, { capturedChess: ['queen'] });
  const promo = E.legalMoves(b, 'bottom').find(m => m.fx === 0 && m.fy === 1 && m.ty === 0);
  check('có sẵn nước phong Hậu từ kho', !!promo && promo.promotion === 'queen');
  b = E.applyMove(b, promo);
  check('phong xong kho rỗng', b.capturedChess.length === 0);
  b = E.applyMove(b, mv(0, 5, 0, 0)); // Xe tướng ăn quân Hậu vừa phong
  check('Hậu phong cấp bị ăn: kho lại có queen', JSON.stringify(b.capturedChess) === '["queen"]', JSON.stringify(b.capturedChess));
}

// ---------- 14. AI luyện tập chỉ chọn nước từ legalMoves (gồm cả khi bật Hậu cần có hạn) ----------
{
  const bEmpty = promoBoard({ promoteOnlyCaptured: true }, []);
  const aiMove = E.chooseAiMove(bEmpty, 'bottom');
  const legal = E.legalMoves(bEmpty, 'bottom');
  check('AI chọn được nước khi kho rỗng', !!aiMove);
  check('nước của AI nằm trong legalMoves', !!aiMove && legal.some(m => m.fx === aiMove.fx && m.fy === aiMove.fy && m.tx === aiMove.tx && m.ty === aiMove.ty && m.promotion === aiMove.promotion));
  check('AI không đi nước phong cấp khi kho rỗng', !!aiMove && !(aiMove.fx === 0 && aiMove.fy === 1 && aiMove.ty === 0));
}
{
  // Tốt ăn Xe tướng ở hàng cuối là nước giá trị cao nhất -> AI chọn, và chỉ phong thành Mã có trong kho
  const b = boardWith([
    P('xiangqi', 'general', 'top', 3, 0), P('xiangqi', 'chariot', 'top', 0, 0),
    P('chess', 'king', 'bottom', 4, 9), P('chess', 'pawn', 'bottom', 1, 1),
  ], 'bottom', { promoteOnlyCaptured: true }, undefined, { capturedChess: ['knight'] });
  const aiMove = E.chooseAiMove(b, 'bottom');
  check('AI chọn nước ăn Xe ở hàng cuối', !!aiMove && aiMove.fx === 1 && aiMove.fy === 1 && aiMove.tx === 0 && aiMove.ty === 0, JSON.stringify(aiMove));
  check("AI chỉ phong thành quân có trong kho ('knight')", !!aiMove && aiMove.promotion === 'knight', aiMove && aiMove.promotion);
}

// ---------- 13. Xung đột Du kích vs lặp thế (ưu tiên đã chốt: Du kích trước) ----------
// Xe tướng (0,0) chiếu Vua (4,0) theo hàng; Vua chạy (4,1); Xe theo lên (0,1) chiếu tiếp; qua lại 2 chu kỳ:
// nước chiếu thứ 4 đồng thời hoàn tất lần lặp thế thứ 3.
function guerrillaRepBoard(n) {
  return boardWith([
    P('chess', 'king', 'top', 4, 0),
    P('xiangqi', 'general', 'bottom', 3, 9), P('xiangqi', 'chariot', 'bottom', 0, 0),
  ], 'top', { guerrillaChecks: n });
}
function playGuerrillaRepCycle(b) {
  b = E.applyMove(b, mv(4, 0, 4, 1)); b = E.applyMove(b, mv(0, 0, 0, 1));
  b = E.applyMove(b, mv(4, 1, 4, 0)); b = E.applyMove(b, mv(0, 1, 0, 0));
  return b;
}
{
  let b = playGuerrillaRepCycle(playGuerrillaRepCycle(guerrillaRepBoard(4)));
  check('bộ đếm chiếu = 4 sau 2 chu kỳ', b.counters.xiangqiChecks === 4, b.counters.xiangqiChecks);
  const st = E.gameStatus(b);
  check('chiếu thứ N trùng lúc lặp thế 3 lần: Du kích thắng, không hòa', st.winner === 'bottom' && st.reason === 'guerrilla', JSON.stringify(st));
  let b2 = playGuerrillaRepCycle(playGuerrillaRepCycle(guerrillaRepBoard(99)));
  const st2 = E.gameStatus(b2);
  check('chưa đủ N lần chiếu thì cùng thế cờ là hòa lặp thế', st2.winner === null && st2.reason === 'repetition', JSON.stringify(st2));
}

console.log(failures === 0 ? '\nALL RULES TESTS PASSED' : `\n${failures} RULES TEST(S) FAILED`);
process.exit(failures ? 1 : 0);
