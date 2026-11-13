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

/*
 * LUẬT BỔ TRỢ PHE TƯỚNG (khung cấu hình — mọi luật MẶC ĐỊNH TẮT, tắt hết thì game chạy y hệt v0.1.1).
 * Chỉ thêm luật về điều kiện thắng/hòa, phong cấp, chiếu dai, hết nước — không đổi nước đi,
 * không thêm/bớt quân, không đổi vị trí xếp quân ban đầu.
 * Đã cài đủ 6 luật (giai đoạn 1: Du kích; giai đoạn 2: Giữ thành, Trường kỳ, Hậu cần có hạn,
 * Chính nghĩa 1 + 2). Mọi luật chỉ áp dụng ở trận lai; trận gương tắt hoàn toàn.
 */
const DEFAULT_RULES = {
  guerrillaChecks: 0,           // Du kích: bên Tướng chiếu đủ N lần thì thắng (0 = tắt)
  defenderWinsOnDraw: false,    // Giữ thành: mọi kết quả hòa đều tính bên Tướng thắng
  moveLimit: 0,                 // Trường kỳ kháng chiến: bên Vua đi đủ X nước chưa chiếu bí được thì bên Tướng thắng (0 = tắt)
  promoteOnlyCaptured: false,   // Hậu cần có hạn: Tốt chỉ phong cấp thành quân cờ vua đã bị ăn
  chessNoPerpetualCheck: false, // Chính nghĩa (1): bên Vua chiếu dai thì bên Vua thua
  xiangqiStalemateDraw: false,  // Chính nghĩa (2): bên Tướng hết nước mà không bị chiếu thì hòa
};

/** Cấu hình luật hiệu lực của một bàn cờ (bàn dựng tay không có trường rules thì coi như tắt hết). */
function rulesOf(board) { return board.rules || DEFAULT_RULES; }

/*
 * Phe cầm bộ cờ tướng / bộ cờ vua — CHỈ xác định được khi hai bên khác hệ (trận lai).
 * Trận gương (hai bên cùng một hệ) trả về null: các luật bổ trợ "phe Tướng vs phe Vua" không áp dụng.
 */
function xiangqiSideOf(board) {
  const top = board.armies.top === 'xiangqi';
  const bottom = board.armies.bottom === 'xiangqi';
  return top === bottom ? null : (top ? 'top' : 'bottom');
}
function chessSideOf(board) {
  const top = board.armies.top === 'chess';
  const bottom = board.armies.bottom === 'chess';
  return top === bottom ? null : (top ? 'top' : 'bottom');
}

/** Bộ đếm phục vụ luật bổ trợ, lưu ngay trong state để hoàn tác nước tự khôi phục đúng giá trị. */
function freshCounters() { return { xiangqiChecks: 0, chessMoves: 0 }; }

function createBoard(armies, rules) {
  const board = {
    armies: { top: armies.top, bottom: armies.bottom },
    pieces: [...buildArmy(armies.top, 'top'), ...buildArmy(armies.bottom, 'bottom')],
    turn: firstTurn(armies),
    rules: { ...DEFAULT_RULES, ...(rules || {}) },
    counters: freshCounters(),
    // Lịch sử phục vụ phát hiện lặp thế và luật chiếu dai — engine tự giữ, giao diện không tự đếm nữa.
    posHistory: [],   // khóa thế cờ tại vị trí 0 (mở ván) và sau mỗi nước đi
    moveFlags: [],    // moveFlags[i] = { by, check }: nước đi tạo ra thế cờ thứ i+1, có phải nước chiếu không
    capturedChess: [], // các loại quân cờ vua (Hậu/Xe/Tượng/Mã) đã bị ăn — dùng cho luật Hậu cần có hạn
  };
  board.posHistory.push(positionKey(board));
  return board;
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
  return {
    armies: { ...board.armies },
    pieces: board.pieces.map(p => ({ ...p })),
    turn: board.turn,
    rules: board.rules ? { ...board.rules } : { ...DEFAULT_RULES },
    counters: board.counters ? { ...board.counters } : freshCounters(),
    posHistory: board.posHistory ? [...board.posHistory] : [positionKey(board)],
    moveFlags: board.moveFlags ? board.moveFlags.map(f => ({ ...f })) : [],
    capturedChess: board.capturedChess ? [...board.capturedChess] : [],
  };
}

function applyMove(board, move) {
  const next = cloneBoard(board);
  const piece = pieceAt(next, move.fx, move.fy);
  if (!piece) return next;
  const rules = rulesOf(next);
  const xqSide = xiangqiSideOf(next);
  // Luật bổ trợ chỉ áp dụng ở trận lai (đã chốt ở giai đoạn 1, điểm mơ hồ số 1 — phương án A).
  const hybrid = xqSide !== null;
  const captured = pieceAt(next, move.tx, move.ty);
  // Hậu cần có hạn: ghi nhận quân cờ vua thuộc nhóm phong cấp được (Hậu/Xe/Tượng/Mã) bị ăn.
  if (hybrid && rules.promoteOnlyCaptured && captured && captured.army === 'chess'
    && ['queen', 'rook', 'bishop', 'knight'].includes(captured.kind)) {
    next.capturedChess.push(captured.kind);
  }
  next.pieces = next.pieces.filter(p => !(p.x === move.tx && p.y === move.ty));
  const moved = pieceAt(next, move.fx, move.fy);
  moved.x = move.tx; moved.y = move.ty;
  if (moved.kind === 'pawn' && move.ty === promotionRow(moved.side)) {
    if (hybrid && rules.promoteOnlyCaptured) {
      // Chỉ phong được thành quân có trong danh sách đã bị ăn, và tiêu hao 1 quân tương ứng.
      // Không có quân phù hợp thì Tốt đứng ở hàng cuối mà không phong cấp
      // (qua legalMoves thì nước vào hàng cuối khi danh sách rỗng đã bị chặn từ đầu).
      const chosen = next.capturedChess.includes(move.promotion) ? move.promotion : next.capturedChess[0];
      if (chosen) {
        moved.kind = chosen;
        next.capturedChess.splice(next.capturedChess.indexOf(chosen), 1);
      }
    } else {
      moved.kind = move.promotion || 'queen';
    }
  }
  next.turn = otherSide(board.turn);
  // Ghi lịch sử lặp thế: khóa của thế cờ mới + cờ "nước vừa đi có phải nước chiếu không".
  // Cờ chiếu chỉ tính thật khi luật chiếu dai bật (tiết kiệm tính toán, hành vi không đổi).
  const opp = otherSide(piece.side);
  const needCheck = rules.chessNoPerpetualCheck
    || (hybrid && piece.side === xqSide && rules.guerrillaChecks > 0);
  const givesCheck = needCheck ? isInCheck(next, opp) : false;
  next.posHistory.push(positionKey(next));
  next.moveFlags.push({ by: piece.side, check: givesCheck });
  // Luật bổ trợ: cập nhật bộ đếm ngay trong state (bản sao mới — bàn cũ không đổi,
  // nên hoàn tác nước chỉ cần quay lại state trước là bộ đếm tự đúng).
  // Chỉ đếm khi luật tương ứng đang bật, để tắt hết thì hành vi y hệt v0.1.1.
  if (hybrid && piece.side === xqSide && rules.guerrillaChecks > 0 && givesCheck) {
    // Du kích: sau nước đi của bên Tướng, Vua địch bị chiếu (mọi loại chiếu, kể cả phi tướng) thì +1.
    next.counters.xiangqiChecks += 1;
  }
  if (hybrid && piece.side !== xqSide && rules.moveLimit > 0) {
    // Trường kỳ kháng chiến: đếm số nước bên Vua đã đi.
    next.counters.chessMoves += 1;
  }
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
  const rules = rulesOf(board);
  const limitPromotion = rules.promoteOnlyCaptured && xiangqiSideOf(board) !== null;
  for (const piece of board.pieces.filter(p => p.side === side)) {
    for (const dest of pseudoMoves(board, piece)) {
      const base = { fx: piece.x, fy: piece.y, tx: dest.x, ty: dest.y };
      if (piece.kind === 'pawn' && dest.y === promotionRow(side)) {
        if (limitPromotion) {
          // Hậu cần có hạn: chỉ sinh nước phong cấp thành các loại quân có trong danh sách đã bị ăn;
          // danh sách rỗng thì nước đi/ăn vào hàng cuối bị loại hẳn (kiểu Grand Chess).
          const kinds = [...new Set(board.capturedChess || [])];
          if (!kinds.length) continue;
          for (const kind of kinds) {
            const move = { ...base, promotion: kind };
            if (!isInCheck(applyMove(board, move), side)) out.push(move);
          }
          continue;
        }
        base.promotion = 'queen';
      }
      if (!isInCheck(applyMove(board, base), side)) out.push(base);
    }
  }
  return out;
}

function positionKey(board) {
  const parts = board.pieces.map(p => `${p.side[0]}${p.army[0]}${p.kind}@${p.x},${p.y}`).sort();
  return parts.join('|') + '#' + board.turn;
}

/** Thông tin lặp thế của thế cờ hiện tại: số lần xuất hiện của khóa hiện tại và vị trí các lần xuất hiện. */
function repetitionInfo(board) {
  const history = board.posHistory && board.posHistory.length ? board.posHistory : [positionKey(board)];
  const key = history[history.length - 1];
  const occurrences = [];
  history.forEach((k, i) => { if (k === key) occurrences.push(i); });
  return {
    count: occurrences.length,
    firstIndex: occurrences.length ? occurrences[0] : -1,
    // Vị trí lần xuất hiện áp chót — mốc bắt đầu của VÒNG LẶP CUỐI (dùng cho luật chiếu dai)
    secondIndex: occurrences.length >= 2 ? occurrences[occurrences.length - 2] : -1,
    lastIndex: history.length - 1,
  };
}

/** Kết quả HÒA theo một lý do gốc — luật Giữ thành (nếu bật) chuyển thành thắng cho bên Tướng. */
function drawResult(board, reason, check) {
  const rules = rulesOf(board);
  const xqSide = xiangqiSideOf(board);
  if (rules.defenderWinsOnDraw && xqSide) {
    return { over: true, winner: xqSide, reason: 'defenderWin:' + reason, check };
  }
  return { over: true, winner: null, reason, check };
}

/*
 * Trạng thái ván cho bên sắp đi, xét theo THỨ TỰ ƯU TIÊN đã chốt:
 * 1) Chiếu bí / hết nước (riêng bên Tướng hết nước không bị chiếu thì hòa nếu bật xiangqiStalemateDraw).
 * 2) Du kích: bên Tướng chiếu đủ N lần.
 * 3) Chiếu dai của bên Vua (chessNoPerpetualCheck): bên Vua thua.
 * 4) Lặp thế 3 lần: hòa.
 * 5) Trường kỳ (moveLimit): bên Vua đã đi đủ X nước mà chưa thắng thì bên Tướng thắng.
 * 6) Mọi kết quả hòa (từ mục 1 hoặc 4) đều bị Giữ thành (defenderWinsOnDraw) chuyển thành bên Tướng thắng.
 */
function gameStatus(board) {
  const side = board.turn;
  const moves = legalMoves(board, side);
  const check = isInCheck(board, side);
  const rules = rulesOf(board);
  const xqSide = xiangqiSideOf(board);
  // 1) Chiếu bí / hết nước — luôn xét trước: nước thứ X của bên Vua mà chiếu bí
  //    thì bên Vua thắng theo mục này, không bị Trường kỳ "cướp" kết quả.
  if (moves.length === 0) {
    if (check) return { over: true, winner: otherSide(side), reason: 'checkmate', check };
    if (side === xqSide && rules.xiangqiStalemateDraw) return drawResult(board, 'stalemateDraw', check);
    return { over: true, winner: otherSide(side), reason: 'stalemate', check };
  }
  // 2) Du kích (ưu tiên hơn lặp thế — đã chốt ở giai đoạn 1, điểm mơ hồ số 3, phương án A;
  //    thứ tự nằm ngay trong engine này, không phụ thuộc giao diện).
  if (xqSide && rules.guerrillaChecks > 0 && board.counters
    && board.counters.xiangqiChecks >= rules.guerrillaChecks) {
    return { over: true, winner: xqSide, reason: 'guerrilla', check };
  }
  // 3) + 4) Lặp thế 3 lần: chiếu dai của bên Vua xét trước kết quả hòa.
  const rep = repetitionInfo(board);
  if (rep.count >= 3) {
    const chessSide = chessSideOf(board);
    if (chessSide && rules.chessNoPerpetualCheck) {
      // Chỉ xét VÒNG LẶP CUỐI: các nước đi từ lần xuất hiện thứ hai của thế cờ tới lần thứ ba (hiện tại).
      // Bên Vua thua nếu MỌI nước của bên Vua trong vòng lặp đó đều là nước chiếu.
      // (Bên Tướng chiếu dai thì hợp lệ — chỉ xét nước của bên Vua.)
      const cycleMoves = (board.moveFlags || []).slice(rep.secondIndex, rep.lastIndex);
      const chessMoves = cycleMoves.filter(f => f.by === chessSide);
      if (chessMoves.length && chessMoves.every(f => f.check)) {
        return { over: true, winner: xqSide, reason: 'perpetualCheck', check };
      }
    }
    return drawResult(board, 'repetition', check);
  }
  // 5) Trường kỳ kháng chiến: bên Vua đã đi đủ X nước mà ván chưa kết thúc.
  if (xqSide && rules.moveLimit > 0 && board.counters
    && board.counters.chessMoves >= rules.moveLimit) {
    return { over: true, winner: xqSide, reason: 'moveLimit', check };
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
  COLS, ROWS, PIECE_VALUE, PIECE_NAME_VI, DEFAULT_RULES,
  otherSide, dirOf, inBoard, inPalace, inHomeHalf, crossedRiver, promotionRow, isRoyal,
  rulesOf, xiangqiSideOf, chessSideOf,
  buildArmy, firstTurn, createBoard, pieceAt, pseudoMoves, attackSquares,
  applyMove, royalOf, isSquareAttacked, isInCheck, legalMoves, positionKey, repetitionInfo,
  gameStatus, evaluate, chooseAiMove, glyphOf, coordName, describeMove,
};
if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
if (typeof window !== 'undefined') window.Engine = Engine;
