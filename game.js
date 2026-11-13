'use strict';
/*
 * Cờ Vua vs Cờ Tướng — game engine (vanilla JS, chạy được cả trên trình duyệt và Node để test)
 *
 * Luật đã chốt cho bản MVP (2026-11-13):
 * - Bàn thống nhất 9 cột x 10 hàng (tọa độ x:0..8, y:0..9; y=0 là hàng trên cùng — sân nhà của bên "top").
 * - Một luật chung cho cả 2 skin bàn (ô vuông / giao điểm), skin chỉ khác hình thức hiển thị.
 * - (1) Bên cờ tướng đi trước; hàng cuối cờ vua chiếm cột 1-8 (x:0..7), Vua ở cột 5 (x=4) đối cột với Tướng.
 * - (2) Phi tướng biến thể B: Tướng/Vua đối mặt trên cột trống chỉ tính là CHIẾU từ xa, Tướng không bay sang ăn.
 * - (3) Hết nước đi = THUA (kể cả không bị chiếu); lặp lại thế cờ 3 lần = HÒA; chưa xử lý luật cấm chiếu dai.
 * - (4) Không nhập thành, không bắt tốt qua đường. Tốt cờ vua được phong cấp (chỉ thành quân cờ vua).
 *       Chốt cờ tướng đến hàng cuối chỉ đi ngang, không phong cấp.
 * - (5) "Chiếu" được tính đúng theo luật đi của từng quân (Pháo cần ngòi, Mã bị cản chân,
 *       Tượng bị cản mắt tượng và không qua sông, Chốt theo hướng qua sông...).
 *       Không được đi nước để Vua/Tướng nhà bị chiếu; game kết thúc bằng chiếu bí / hết nước — không ăn thật Vua/Tướng.
 * - (6) Giữ nguyên hai bộ quân, chưa nerf/boost quân nào.
 * Ghi chú cân bằng phát hiện khi test (2026-11-13): với cách xếp cờ vua nguyên bản, Pháo ở cột x=7
 * có thể dùng Tốt vua làm ngòi để ăn Xe vua ở (7,9) ngay nước đầu mà Xe này không có quân bảo vệ
 * (vì cột 9 trống nên thiếu Xe cánh như cờ vua chuẩn). Để tránh mất Xe miễn phí, hàng cuối cờ vua
 * đổi chỗ Mã và Xe ở cánh vua (kiểu Chess960): Tượng(x=5), Xe(x=6), Mã(x=7). Khi đó cả hai Pháo
 * ở nước đầu chỉ ăn được Mã — mà Mã đều có Xe kề bên bảo vệ, thành trao đổi ngang như cờ tướng chuẩn.
 */

const COLS = 9;
const ROWS = 10;

const CHESS_BACK = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'rook', 'knight'];
const XIANGQI_BACK = ['chariot', 'horse', 'elephant', 'advisor', 'general', 'advisor', 'elephant', 'horse', 'chariot'];

const PIECE_VALUE = {
  king: 100000, queen: 900, rook: 500, bishop: 320, knight: 300, pawn: 100,
  general: 100000, chariot: 600, cannon: 285, horse: 270, elephant: 110, advisor: 110, soldier: 60,
};

const PIECE_NAME_VI = {
  king: 'Vua', queen: 'Hậu', rook: 'Xe vua', bishop: 'Tượng vua', knight: 'Mã vua', pawn: 'Tốt vua',
  general: 'Tướng', chariot: 'Xe', horse: 'Mã', cannon: 'Pháo', elephant: 'Tượng', advisor: 'Sĩ', soldier: 'Chốt',
};

const CHESS_GLYPH = {
  top: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
  bottom: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
};
const XIANGQI_CHAR = {
  top: { general: '帥', chariot: '俥', horse: '傌', cannon: '炮', elephant: '相', advisor: '仕', soldier: '兵' },
  bottom: { general: '將', chariot: '車', horse: '馬', cannon: '炮', elephant: '象', advisor: '士', soldier: '卒' },
};

function otherSide(side) { return side === 'top' ? 'bottom' : 'top'; }
function dirOf(side) { return side === 'top' ? 1 : -1; }
function inBoard(x, y) { return x >= 0 && x < COLS && y >= 0 && y < ROWS; }
function inPalace(side, x, y) {
  if (x < 3 || x > 5) return false;
  return side === 'top' ? (y >= 0 && y <= 2) : (y >= 7 && y <= 9);
}
function inHomeHalf(side, y) { return side === 'top' ? y <= 4 : y >= 5; }
function crossedRiver(piece) {
  return piece.side === 'top' ? piece.y >= 5 : piece.y <= 4;
}
function promotionRow(side) { return side === 'top' ? ROWS - 1 : 0; }
function isRoyal(piece) { return piece.kind === 'king' || piece.kind === 'general'; }

function buildArmy(army, side) {
  const pieces = [];
  const backY = side === 'top' ? 0 : ROWS - 1;
  // Mỗi quân có ID ổn định (không đổi khi di chuyển/phong cấp) để giao diện theo dõi và chạy animation trượt.
  const push = (kind, x, y) => pieces.push({ id: `${side}-${army}-${pieces.length}`, army, kind, side, x, y });
  if (army === 'chess') {
    CHESS_BACK.forEach((kind, i) => push(kind, i, backY));
    const pawnY = side === 'top' ? 1 : ROWS - 2;
    for (let x = 0; x < 8; x++) push('pawn', x, pawnY);
  } else {
    XIANGQI_BACK.forEach((kind, x) => push(kind, x, backY));
    const cannonY = side === 'top' ? 2 : ROWS - 3;
    push('cannon', 1, cannonY); push('cannon', 7, cannonY);
    const soldierY = side === 'top' ? 3 : ROWS - 4;
    [0, 2, 4, 6, 8].forEach(x => push('soldier', x, soldierY));
  }
  return pieces;
}

function firstTurn(armies) {
  const topIsXq = armies.top === 'xiangqi';
  const botIsXq = armies.bottom === 'xiangqi';
  if (topIsXq !== botIsXq) return topIsXq ? 'top' : 'bottom'; // bên cờ tướng đi trước
  if (topIsXq) return 'top'; // tướng vs tướng: bên trên (Đỏ) đi trước
  return 'bottom'; // vua vs vua: bên dưới (Trắng) đi trước
}

function createBoard(armies) {
  return {
    armies: { top: armies.top, bottom: armies.bottom },
    pieces: [...buildArmy(armies.top, 'top'), ...buildArmy(armies.bottom, 'bottom')],
    turn: firstTurn(armies),
  };
}

function pieceAt(board, x, y) {
  return board.pieces.find(p => p.x === x && p.y === y) || null;
}

function slideMoves(board, piece, dirs, opts) {
  const out = [];
  for (const [dx, dy] of dirs) {
    let x = piece.x + dx, y = piece.y + dy;
    while (inBoard(x, y)) {
      const occ = pieceAt(board, x, y);
      if (!occ) { out.push({ x, y }); }
      else { if (occ.side !== piece.side) out.push({ x, y }); break; }
      x += dx; y += dy;
    }
  }
  return out;
}

function stepMoves(board, piece, offsets, extraOk) {
  const out = [];
  for (const [dx, dy] of offsets) {
    const x = piece.x + dx, y = piece.y + dy;
    if (!inBoard(x, y)) continue;
    if (extraOk && !extraOk(x, y)) continue;
    const occ = pieceAt(board, x, y);
    if (!occ || occ.side !== piece.side) out.push({ x, y });
  }
  return out;
}

const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KING8 = [...ORTHO, ...DIAG];
const KNIGHT_L = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];

function horseMoves(board, piece, attack) {
  const out = [];
  for (const [dx, dy] of KNIGHT_L) {
    const x = piece.x + dx, y = piece.y + dy;
    if (!inBoard(x, y)) continue;
    // ô/giao điểm "chân mã": kề trực giao theo thành phần dài của nước đi
    const legX = piece.x + (Math.abs(dx) === 2 ? Math.sign(dx) : 0);
    const legY = piece.y + (Math.abs(dy) === 2 ? Math.sign(dy) : 0);
    if (pieceAt(board, legX, legY)) continue; // bị cản chân
    if (attack) { out.push({ x, y }); continue; }
    const occ = pieceAt(board, x, y);
    if (!occ || occ.side !== piece.side) out.push({ x, y });
  }
  return out;
}

function cannonMoves(board, piece, attack) {
  const out = [];
  for (const [dx, dy] of ORTHO) {
    let x = piece.x + dx, y = piece.y + dy, screens = 0;
    while (inBoard(x, y)) {
      const occ = pieceAt(board, x, y);
      if (screens === 0) {
        if (!occ) { if (!attack) out.push({ x, y }); }
        else screens = 1;
      } else {
        if (!occ) { if (attack) out.push({ x, y }); }
        else {
          if (attack || occ.side !== piece.side) out.push({ x, y });
          break;
        }
      }
      x += dx; y += dy;
    }
  }
  return out;
}

function slideAttacks(board, piece, dirs) {
  const out = [];
  for (const [dx, dy] of dirs) {
    let x = piece.x + dx, y = piece.y + dy;
    while (inBoard(x, y)) {
      out.push({ x, y });
      if (pieceAt(board, x, y)) break;
      x += dx; y += dy;
    }
  }
  return out;
}

/** Các ô mà quân này có thể ĂN tới (dùng để tính chiếu). */
function attackSquares(board, piece) {
  switch (piece.kind) {
    case 'king':
      return KING8.map(([dx, dy]) => ({ x: piece.x + dx, y: piece.y + dy })).filter(s => inBoard(s.x, s.y));
    case 'general': {
      const out = stepMoves(board, piece, ORTHO, (x, y) => inPalace(piece.side, x, y));
      // Phi tướng (biến thể B): đối mặt Vua/Tướng địch trên cột trống = chiếu từ xa
      for (const dy of [1, -1]) {
        let y = piece.y + dy;
        while (inBoard(piece.x, y)) {
          const occ = pieceAt(board, piece.x, y);
          if (occ) { if (occ.side !== piece.side && isRoyal(occ)) out.push({ x: piece.x, y }); break; }
          y += dy;
        }
      }
      return out;
    }
    case 'queen': return slideAttacks(board, piece, KING8);
    case 'rook': case 'chariot': return slideAttacks(board, piece, ORTHO);
    case 'bishop': return slideAttacks(board, piece, DIAG);
    case 'cannon': return cannonMoves(board, piece, true);
    case 'knight': return KNIGHT_L.map(([dx, dy]) => ({ x: piece.x + dx, y: piece.y + dy })).filter(s => inBoard(s.x, s.y));
    case 'horse': return horseMoves(board, piece, true);
    case 'elephant':
      return DIAG.map(([dx, dy]) => ({ x: piece.x + dx * 2, y: piece.y + dy * 2 }))
        .filter(s => inBoard(s.x, s.y) && inHomeHalf(piece.side, s.y)
          && !pieceAt(board, piece.x + (s.x - piece.x) / 2, piece.y + (s.y - piece.y) / 2));
    case 'advisor':
      return DIAG.map(([dx, dy]) => ({ x: piece.x + dx, y: piece.y + dy }))
        .filter(s => inBoard(s.x, s.y) && inPalace(piece.side, s.x, s.y));
    case 'pawn': {
      const d = dirOf(piece.side);
      return [[-1, d], [1, d]].map(([dx, dy]) => ({ x: piece.x + dx, y: piece.y + dy })).filter(s => inBoard(s.x, s.y));
    }
    case 'soldier': {
      const d = dirOf(piece.side);
      const offs = [[0, d]];
      if (crossedRiver(piece)) offs.push([-1, 0], [1, 0]);
      return offs.map(([dx, dy]) => ({ x: piece.x + dx, y: piece.y + dy })).filter(s => inBoard(s.x, s.y));
    }
    default: return [];
  }
}

/** Nước đi giả hợp lệ (chưa lọc tự chiếu). */
function pseudoMoves(board, piece) {
  switch (piece.kind) {
    case 'king': return stepMoves(board, piece, KING8);
    case 'general': return stepMoves(board, piece, ORTHO, (x, y) => inPalace(piece.side, x, y));
    case 'queen': return slideMoves(board, piece, KING8);
    case 'rook': case 'chariot': return slideMoves(board, piece, ORTHO);
    case 'bishop': return slideMoves(board, piece, DIAG);
    case 'cannon': return cannonMoves(board, piece, false);
    case 'knight': return stepMoves(board, piece, KNIGHT_L);
    case 'horse': return horseMoves(board, piece, false);
    case 'elephant':
      return DIAG.map(([dx, dy]) => ({ x: piece.x + dx * 2, y: piece.y + dy * 2 }))
        .filter(s => inBoard(s.x, s.y) && inHomeHalf(piece.side, s.y)
          && !pieceAt(board, piece.x + (s.x - piece.x) / 2, piece.y + (s.y - piece.y) / 2))
        .filter(s => { const o = pieceAt(board, s.x, s.y); return !o || o.side !== piece.side; });
    case 'advisor':
      return stepMoves(board, piece, DIAG, (x, y) => inPalace(piece.side, x, y));
    case 'pawn': {
      const d = dirOf(piece.side);
      const out = [];
      const fwdY = piece.y + d;
      if (inBoard(piece.x, fwdY) && !pieceAt(board, piece.x, fwdY)) {
        out.push({ x: piece.x, y: fwdY });
        const startY = piece.side === 'top' ? 1 : ROWS - 2;
        const fwd2Y = piece.y + 2 * d;
        if (piece.y === startY && !pieceAt(board, piece.x, fwd2Y)) out.push({ x: piece.x, y: fwd2Y });
      }
      for (const dx of [-1, 1]) {
        const x = piece.x + dx;
        if (!inBoard(x, fwdY)) continue;
        const occ = pieceAt(board, x, fwdY);
        if (occ && occ.side !== piece.side) out.push({ x, y: fwdY });
      }
      return out;
    }
    case 'soldier': {
      const d = dirOf(piece.side);
      const offs = [[0, d]];
      if (crossedRiver(piece)) offs.push([-1, 0], [1, 0]);
      return stepMoves(board, piece, offs);
    }
    default: return [];
  }
}

function cloneBoard(board) {
  return { armies: { ...board.armies }, pieces: board.pieces.map(p => ({ ...p })), turn: board.turn };
}

function applyMove(board, move) {
  const next = cloneBoard(board);
  const piece = pieceAt(next, move.fx, move.fy);
  if (!piece) return next;
  next.pieces = next.pieces.filter(p => !(p.x === move.tx && p.y === move.ty));
  const moved = pieceAt(next, move.fx, move.fy);
  moved.x = move.tx; moved.y = move.ty;
  if (moved.kind === 'pawn' && move.ty === promotionRow(moved.side)) {
    moved.kind = move.promotion || 'queen';
  }
  next.turn = otherSide(board.turn);
  return next;
}

function royalOf(board, side) {
  return board.pieces.find(p => p.side === side && isRoyal(p)) || null;
}

function isSquareAttacked(board, x, y, bySide) {
  return board.pieces.filter(p => p.side === bySide)
    .some(p => attackSquares(board, p).some(s => s.x === x && s.y === y));
}

function isInCheck(board, side) {
  const royal = royalOf(board, side);
  if (!royal) return true;
  return isSquareAttacked(board, royal.x, royal.y, otherSide(side));
}

function legalMoves(board, side) {
  const out = [];
  for (const piece of board.pieces.filter(p => p.side === side)) {
    for (const dest of pseudoMoves(board, piece)) {
      const move = { fx: piece.x, fy: piece.y, tx: dest.x, ty: dest.y };
      if (piece.kind === 'pawn' && dest.y === promotionRow(side)) move.promotion = 'queen';
      const after = applyMove(board, move);
      if (!isInCheck(after, side)) out.push(move);
    }
  }
  return out;
}

function positionKey(board) {
  const parts = board.pieces.map(p => `${p.side[0]}${p.army[0]}${p.kind}@${p.x},${p.y}`).sort();
  return parts.join('|') + '#' + board.turn;
}

/** Trạng thái ván cho bên sắp đi. stalemate ở đây là THUA theo luật đã chốt. */
function gameStatus(board) {
  const side = board.turn;
  const moves = legalMoves(board, side);
  const check = isInCheck(board, side);
  if (moves.length === 0) {
    return { over: true, winner: otherSide(side), reason: check ? 'checkmate' : 'stalemate', check };
  }
  return { over: false, winner: null, reason: null, check };
}

function evaluate(board, side) {
  let score = 0;
  for (const p of board.pieces) {
    let v = PIECE_VALUE[p.kind] || 0;
    if (p.kind === 'soldier' && crossedRiver(p)) v += 70;
    if (p.kind === 'pawn') v += (p.side === 'top' ? p.y : ROWS - 1 - p.y) * 4;
    if (p.kind === 'soldier') v += (p.side === 'top' ? p.y : ROWS - 1 - p.y) * 3;
    score += p.side === side ? v : -v;
  }
  return score;
}

function chooseAiMove(board, side) {
  const moves = legalMoves(board, side);
  if (!moves.length) return null;
  let best = -Infinity, bestMoves = [];
  for (const move of moves) {
    const after = applyMove(board, move);
    let s = evaluate(after, side);
    const status = gameStatus(after);
    if (status.over && status.winner === side) s += 1000000;
    else if (status.check) s += 35;
    s += Math.random() * 12;
    if (s > best + 0.001) { best = s; bestMoves = [move]; }
    else if (Math.abs(s - best) <= 12) bestMoves.push(move);
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function glyphOf(piece) {
  return piece.army === 'chess' ? CHESS_GLYPH[piece.side][piece.kind] : XIANGQI_CHAR[piece.side][piece.kind];
}
function coordName(x, y) { return 'abcdefghi'[x] + String(ROWS - y); }
function describeMove(boardBefore, move) {
  const piece = pieceAt(boardBefore, move.fx, move.fy);
  if (!piece) return '';
  const captured = pieceAt(boardBefore, move.tx, move.ty);
  let s = `${PIECE_NAME_VI[piece.kind]} ${coordName(move.fx, move.fy)} → ${coordName(move.tx, move.ty)}`;
  if (captured) s += ` ăn ${PIECE_NAME_VI[captured.kind]}`;
  if (piece.kind === 'pawn' && move.ty === promotionRow(piece.side)) s += ` phong ${PIECE_NAME_VI[move.promotion || 'queen']}`;
  return s;
}

const Engine = {
  COLS, ROWS, PIECE_VALUE, PIECE_NAME_VI,
  otherSide, dirOf, inBoard, inPalace, inHomeHalf, crossedRiver, promotionRow, isRoyal,
  buildArmy, firstTurn, createBoard, pieceAt, pseudoMoves, attackSquares,
  applyMove, royalOf, isSquareAttacked, isInCheck, legalMoves, positionKey,
  gameStatus, evaluate, chooseAiMove, glyphOf, coordName, describeMove,
};
if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
if (typeof window !== 'undefined') window.Engine = Engine;
