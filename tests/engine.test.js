'use strict';
const E = require('../game.js');
let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, extra || ''); }
}
function boardWith(pieces, turn, armies) {
  return { armies: armies || { top: 'xiangqi', bottom: 'chess' }, pieces, turn: turn || 'top' };
}
const P = (army, kind, side, x, y) => ({ army, kind, side, x, y });

// 1. Khởi tạo lai
const b = E.createBoard({ top: 'xiangqi', bottom: 'chess' });
check('hybrid has 32 pieces', b.pieces.length === 32, b.pieces.length);
check('xiangqi (top) moves first', b.turn === 'top');
const king = b.pieces.find(p => p.kind === 'king');
const general = b.pieces.find(p => p.kind === 'general');
check('king aligned with general on x=4', king.x === 4 && general.x === 4);
check('no chess piece in column 9', !b.pieces.some(p => p.army === 'chess' && p.x === 8));

// 2. Nước đi đầu của cờ tướng: bàn gương tướng-vs-tướng = 44 như cờ tướng chuẩn (kiểm chứng engine),
// còn bàn lai có 46 vì 2 Pháo dùng Tốt vua làm ngòi ăn được Mã vua — nước đi hợp lệ phát sinh từ ghép cờ.
const opening = E.legalMoves(b, 'top');
check('xiangqi opening legal moves on hybrid board = 46', opening.length === 46, opening.length);
const mirrorForCount = E.createBoard({ top: 'xiangqi', bottom: 'xiangqi' });
check('xiangqi mirror opening legal moves = 44 (standard)', E.legalMoves(mirrorForCount, 'top').length === 44);

// 3. Pháo đầu ván chỉ ăn được Mã (có Xe bảo vệ), không ăn được Xe miễn phí
const cannonCaptures = opening.filter(m => { const p = E.pieceAt(b, m.fx, m.fy); return p && p.kind === 'cannon' && E.pieceAt(b, m.tx, m.ty); });
check('exactly 2 opening cannon captures', cannonCaptures.length === 2, JSON.stringify(cannonCaptures));
check('opening cannon captures are knights', cannonCaptures.every(m => E.pieceAt(b, m.tx, m.ty).kind === 'knight'));
const defByRook = cannonCaptures.every(m => {
  const afterCapture = E.applyMove(b, m);
  // sau khi Pháo ăn Mã, Xe vua kề bên phải ăn lại được Pháo
  const replies = E.legalMoves(afterCapture, 'bottom');
  return replies.some(r => r.tx === m.tx && r.ty === m.ty && E.pieceAt(afterCapture, r.fx, r.fy).kind === 'rook');
});
check('both captured knights were defended by a rook', defByRook);

// 4. Mã tướng bị cản chân, Mã vua thì không
const horseBoard = boardWith([
  P('xiangqi', 'general', 'top', 4, 1), P('chess', 'king', 'bottom', 4, 9),
  P('xiangqi', 'horse', 'top', 4, 4), P('xiangqi', 'soldier', 'top', 4, 3),
]);
const horseMoves = E.pseudoMoves(horseBoard, horseBoard.pieces.find(p => p.kind === 'horse'));
check('horse cannot jump over leg-block upward', !horseMoves.some(m => m.x === 3 && m.y === 2) && !horseMoves.some(m => m.x === 5 && m.y === 2));
check('horse can still move downward', horseMoves.some(m => m.x === 3 && m.y === 6));
const knightBoard = boardWith([
  P('xiangqi', 'general', 'top', 4, 1), P('chess', 'king', 'bottom', 4, 9),
  P('chess', 'knight', 'bottom', 4, 4), P('chess', 'pawn', 'bottom', 4, 3),
]);
const knightMoves = E.pseudoMoves(knightBoard, knightBoard.pieces.find(p => p.kind === 'knight'));
check('chess knight ignores leg-block', knightMoves.some(m => m.x === 3 && m.y === 2));

// 5. Tượng tướng không qua sông + bị cản mắt tượng; Tượng vua đi chéo tự do
const eleBoard = boardWith([
  P('xiangqi', 'general', 'top', 4, 1), P('chess', 'king', 'bottom', 4, 9),
  P('xiangqi', 'elephant', 'top', 2, 4),
]);
const eleMoves = E.pseudoMoves(eleBoard, eleBoard.pieces.find(p => p.kind === 'elephant'));
check('elephant cannot cross river', eleMoves.every(m => m.y <= 4));
const eleBlocked = boardWith([
  P('xiangqi', 'general', 'top', 4, 1), P('chess', 'king', 'bottom', 4, 9),
  P('xiangqi', 'elephant', 'top', 2, 2), P('xiangqi', 'soldier', 'top', 1, 1),
]);
const eleMoves2 = E.pseudoMoves(eleBlocked, eleBlocked.pieces.find(p => p.kind === 'elephant'));
check('elephant blocked by eye piece', !eleMoves2.some(m => m.x === 0 && m.y === 0));

// 6. Chốt qua sông đi ngang được, chưa qua sông thì không; Tốt phong cấp
const soldierBoard = boardWith([
  P('xiangqi', 'general', 'top', 4, 1), P('chess', 'king', 'bottom', 0, 9),
  P('xiangqi', 'soldier', 'top', 4, 6),
]);
const sMoves = E.pseudoMoves(soldierBoard, soldierBoard.pieces.find(p => p.kind === 'soldier'));
check('crossed soldier can move sideways', sMoves.some(m => m.x === 3 && m.y === 6) && sMoves.some(m => m.x === 5 && m.y === 6));
check('soldier never moves backward', !sMoves.some(m => m.y === 5));
const pawnBoard = boardWith([
  P('xiangqi', 'general', 'top', 0, 0), P('chess', 'king', 'bottom', 4, 9),
  P('chess', 'pawn', 'bottom', 3, 1),
], 'bottom');
const promoted = E.applyMove(pawnBoard, { fx: 3, fy: 1, tx: 3, ty: 0, promotion: 'queen' });
check('pawn promotes to queen', promoted.pieces.find(p => p.x === 3 && p.y === 0).kind === 'queen');

// 7. Phi tướng biến thể B: đối mặt cột trống = chiếu, nhưng không có nước bay ăn
const faceBoard = boardWith([
  P('xiangqi', 'general', 'top', 4, 1), P('chess', 'king', 'bottom', 4, 9),
  P('chess', 'rook', 'bottom', 0, 9),
]);
check('facing general gives check to chess king', E.isInCheck(faceBoard, 'bottom') === true);
const genMoves = E.legalMoves(faceBoard, 'top');
check('general has no flying capture move', !genMoves.some(m => m.tx === 4 && m.ty === 9));

// 8. Chiếu bí và hết nước (stalemate = thua)
// Thế chiếu bí đơn giản: Xe vua chiếu Tướng trong cung, Xe thứ hai khóa đường chạy, Hậu khóa nốt
const mateBoard = boardWith([
  P('xiangqi', 'general', 'top', 4, 0),
  P('chess', 'king', 'bottom', 0, 9),
  P('chess', 'rook', 'bottom', 4, 5),   // chiếu thẳng cột
  P('chess', 'rook', 'bottom', 3, 5),   // khóa cột 3
  P('chess', 'queen', 'bottom', 5, 5),  // khóa cột 5 + ô (4,1) qua đường chéo? queen ở (5,5) tấn công (4,4)... cần khóa (4,1)
  P('chess', 'bishop', 'bottom', 2, 3), // tượng tấn công (4,1)? (2,3)->(3,2),(4,1) đúng
], 'top');
check('checkmate detected (no legal moves + in check)', (() => { const s = E.gameStatus(mateBoard); return s.over && s.reason === 'checkmate' && s.winner === 'bottom'; })());

// 9. Không được đi nước để lộ Tướng bị chiếu
const pinBoard = boardWith([
  P('xiangqi', 'general', 'top', 4, 0), P('xiangqi', 'advisor', 'top', 4, 1),
  P('chess', 'king', 'bottom', 0, 9), P('chess', 'rook', 'bottom', 4, 8),
], 'top');
check('general in check through advisor line? rook file attacks general only if advisor moves', E.isInCheck(pinBoard, 'top') === false);
const advMoves = E.legalMoves(pinBoard, 'top').filter(m => { const p = E.pieceAt(pinBoard, m.fx, m.fy); return p && p.kind === 'advisor'; });
check('advisor is absolutely pinned by the rook (0 legal moves)', advMoves.length === 0);
check('general can still step sideways out of the file', E.legalMoves(pinBoard, 'top').some(m => { const p = E.pieceAt(pinBoard, m.fx, m.fy); return p && p.kind === 'general'; }));

// 10. AI chọn được nước đi hợp lệ ở thế mở đầu
const aiMove = E.chooseAiMove(b, 'top');
check('AI returns a legal move', !!aiMove && opening.some(m => m.fx === aiMove.fx && m.fy === aiMove.fy && m.tx === aiMove.tx && m.ty === aiMove.ty));

// 11. Bàn gương: tướng vs tướng và vua vs vua khởi tạo đúng
const mirrorX = E.createBoard({ top: 'xiangqi', bottom: 'xiangqi' });
check('xiangqi mirror has 32 pieces, top first', mirrorX.pieces.length === 32 && mirrorX.turn === 'top');
const mirrorC = E.createBoard({ top: 'chess', bottom: 'chess' });
check('chess mirror has 32 pieces, bottom first', mirrorC.pieces.length === 32 && mirrorC.turn === 'bottom');
check('chess mirror opening moves exist for bottom', E.legalMoves(mirrorC, 'bottom').length === 20, E.legalMoves(mirrorC, 'bottom').length);

// 12. ID quân ổn định (phục vụ animation trượt ở giao diện)
check('every piece has a unique stable id', new Set(b.pieces.map(p => p.id)).size === 32 && b.pieces.every(p => typeof p.id === 'string'));
const soldier0 = b.pieces.find(p => p.kind === 'soldier' && p.x === 0 && p.y === 3);
const afterSoldierMove = E.applyMove(b, { fx: 0, fy: 3, tx: 0, ty: 4 });
check('piece id survives a move', afterSoldierMove.pieces.some(p => p.id === soldier0.id && p.x === 0 && p.y === 4));

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures ? 1 : 0);
