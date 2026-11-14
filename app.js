'use strict';
/* Cờ Vua vs Cờ Tướng — lớp giao diện & chế độ chơi (engine nằm ở game.js) */

// Chủ dự án: điền link trang góp ý của repo (ví dụ GitHub Issues) vào đây khi tung bản public.
const FEEDBACK_URL = 'https://github.com/DLoc03/co-vua-vs-co-tuong/issues';
const PEER_PREFIX = 'cvvct-game-';
const VERSION = 'v0.2.4';

const $ = id => document.getElementById(id);
const E = window.Engine;

const G = {
  mode: 'hotseat',
  board: null, skin: 'squares',
  selected: null, legalForSelected: [],
  history: [], snapshots: [],
  capturedBy: { top: [], bottom: [] },
  lastMove: null, over: false, result: null, lastReason: null,
  aiSide: 'top', mySide: null,
  viewBottom: 'bottom', p1Side: 'bottom',
  pendingPromo: null, pendingGlyphId: null, pieceEls: new Map(),
  online: { peer: null, conn: null, isHost: false, code: '', started: false },
};

function armyName(army) { return army === 'xiangqi' ? 'Cờ tướng' : 'Cờ vua'; }
function otherArmy(army) { return army === 'xiangqi' ? 'chess' : 'xiangqi'; }

/** Quân hai bên theo lựa chọn ở màn thiết lập: "Bạn cầm" luôn là bên DƯỚI trong hệ quy chiếu engine;
 *  đối thủ mặc định cầm bộ còn lại, riêng luyện tập với máy cho chọn trận gương qua "Đối thủ cầm". */
function plannedArmies() {
  const mode = currentMode();
  if (mode === 'online') return { top: 'xiangqi', bottom: 'chess' };
  const mine = $('myArmy').value;
  if (mode === 'ai') {
    const opp = $('oppArmy').value;
    return { bottom: mine, top: opp === 'auto' ? otherArmy(mine) : opp };
  }
  return { bottom: mine, top: otherArmy(mine) };
}
function sideName(side) {
  // Tên phe TUYỆT ĐỐI (không theo hướng nhìn): biên bản hai máy khớp nhau dù bàn lật ngược nhau.
  const army = G.board.armies[side];
  const label = army === 'xiangqi' ? 'Phe Tướng' : 'Phe Vua';
  if (G.mode === 'ai') return `${side === G.aiSide ? 'Máy' : 'Bạn'} — ${label}`;
  if (G.mode === 'online' && G.mySide) return `${side === G.mySide ? 'Bạn' : 'Đối thủ'} — ${label}`;
  if (G.board.armies.top === G.board.armies.bottom) {
    return `${label} (${side === (G.p1Side || 'bottom') ? 'P1' : 'P2'})`; // trận gương cùng máy: phân biệt P1/P2
  }
  return label;
}
/** Tên phe không kèm vai trò người chơi (dùng cho chú thích quân cờ). */
function pheName(side) {
  const n = sideName(side);
  const i = n.indexOf(' — ');
  return i >= 0 ? n.slice(i + 3) : n;
}
function skinName(skin) { return skin === 'squares' ? 'bàn ô vuông' : 'bàn vạch kẻ / giao điểm'; }

/* Glyph hiển thị: quân cờ vua thêm ký tự biến thể văn bản (U+FE0E) để iOS/Android không biến thành emoji màu. */
function glyphText(piece) { return E.glyphOf(piece) + (piece.army === 'chess' ? '\uFE0E' : ''); }

/* ---------------- Vẽ nền bàn cờ ---------------- */
/* Skin ô vuông có KHE SÔNG THẬT: hai nửa bàn tách nhau một khoảng trống nửa ô giữa hàng 5 và 6 (chỉ hình thức). */
const RIVER_GAP = 0.5; // đơn vị: ô cờ

/* LẬT BÀN chỉ là phép biến đổi HIỂN THỊ: G.viewBottom cho biết bên engine nào đang được vẽ ở phía dưới màn hình.
 * Khi bên "top" của engine ở dưới, toàn bộ bàn xoay 180° (đảo cả hàng lẫn cột) — tọa độ engine không đổi. */
function isFlipped() { return (G.viewBottom || 'bottom') === 'top'; }
function toDisplay(x, y) { return isFlipped() ? { x: 8 - x, y: 9 - y } : { x, y }; }

function boardSvg(skin, flipped) {
  if (skin === 'squares') {
    let cells = '';
    for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
      const dy = y * 100 + (y >= 5 ? RIVER_GAP * 100 : 0);
      cells += `<rect class="${(x + y) % 2 ? 'sq-b' : 'sq-a'}" x="${x * 100}" y="${dy}" width="100" height="100"/>`;
    }
    const innerSq = `${cells}
      <rect class="pal-a-fill" x="300" y="0" width="300" height="300"/>
      <rect class="pal-b-fill" x="300" y="750" width="300" height="300"/>
      <rect class="pal-a-line" x="300" y="0" width="300" height="300" fill="none" stroke-width="3"/>
      <rect class="pal-b-line" x="300" y="750" width="300" height="300" fill="none" stroke-width="3"/>
      <rect class="sq-gap" x="0" y="500" width="900" height="50"/>
      <line class="sq-gap-edge" x1="0" y1="500" x2="900" y2="500"/>
      <line class="sq-gap-edge" x1="0" y1="550" x2="900" y2="550"/>`;
    return `<svg viewBox="0 0 900 1050" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      ${flipped ? `<g transform="rotate(180 450 525)">${innerSq}</g>` : innerSq}
      <text class="sq-gap-text" x="450" y="537" text-anchor="middle" font-size="27" font-weight="700" letter-spacing="6">SỞ HÀ · HÁN GIỚI</text>
      <rect class="svg-frame" x="1.5" y="1.5" width="897" height="1047" fill="none" stroke-width="3"/>
    </svg>`;
  }
  let lines = '';
  for (let x = 0; x < 9; x++) {
    const px = x * 100 + 50;
    if (x === 0 || x === 8) lines += `<line x1="${px}" y1="50" x2="${px}" y2="950"/>`;
    else lines += `<line x1="${px}" y1="50" x2="${px}" y2="450"/><line x1="${px}" y1="550" x2="${px}" y2="950"/>`;
  }
  for (let y = 0; y < 10; y++) {
    const py = y * 100 + 50;
    lines += `<line x1="50" y1="${py}" x2="850" y2="${py}"/>`;
  }
  const innerLn = `<rect class="ln-bg" x="0" y="0" width="900" height="1000"/>
    <rect class="ln-inner" x="38" y="38" width="824" height="924" stroke-width="3"/>
    <g class="ln-lines" stroke-width="2.4">${lines}</g>
    <g class="ln-lines" stroke-width="2.4">
      <line x1="350" y1="50" x2="550" y2="250"/><line x1="550" y1="50" x2="350" y2="250"/>
      <line x1="350" y1="750" x2="550" y2="950"/><line x1="550" y1="750" x2="350" y2="950"/>
    </g>`;
  return `<svg viewBox="0 0 900 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    ${flipped ? `<g transform="rotate(180 450 500)">${innerLn}</g>` : innerLn}
    <text class="svg-river-text" x="450" y="516" text-anchor="middle" font-size="37" font-weight="700" letter-spacing="10">楚河 · 漢界</text>
    <rect class="ln-frame" x="38" y="38" width="824" height="924" fill="none" stroke-width="1.2"/>
  </svg>`;
}

/* ---------------- Render ---------------- */
function centerPct(x, y) {
  const d = toDisplay(x, y);
  if (G.skin === 'squares') {
    return { left: (d.x + 0.5) / 9 * 100, top: (d.y + 0.5 + (d.y >= 5 ? RIVER_GAP : 0)) / (10 + RIVER_GAP) * 100 };
  }
  return { left: (d.x + 0.5) / 9 * 100, top: (d.y + 0.5) / 10 * 100 };
}

/** Hàng HIỂN THỊ từ tọa độ chuột/chạm; bấm đúng vào khe sông (skin ô vuông) thì trả -1 để bỏ qua. */
function boardRowFromPoint(clientY, rect) {
  const fy = (clientY - rect.top) / rect.height;
  if (G.skin === 'squares') {
    const units = fy * (10 + RIVER_GAP);
    if (units < 5) return Math.floor(units);
    if (units < 5 + RIVER_GAP) return -1;
    return Math.floor(units - RIVER_GAP);
  }
  return Math.floor(fy * 10);
}

function render() {
  if (!G.board) return;
  // 2 người cùng máy + bật "Tự xoay bàn theo lượt": bên sắp đi luôn ở phía dưới
  if (G.mode === 'hotseat' && $('flipPerTurn') && $('flipPerTurn').checked) G.viewBottom = G.board.turn;
  $('boardBg').innerHTML = boardSvg(G.skin, isFlipped());
  const boardEl = $('board');
  boardEl.className = 'board skin-' + G.skin;

  const hl = $('hlLayer'); hl.innerHTML = '';
  if (G.lastMove) {
    for (const k of ['fx', 'tx']) {
      const x = k === 'fx' ? G.lastMove.fx : G.lastMove.tx;
      const y = k === 'fx' ? G.lastMove.fy : G.lastMove.ty;
      const c = centerPct(x, y);
      const d = document.createElement('div');
      d.className = 'hl lastmove';
      d.style.left = c.left + '%'; d.style.top = c.top + '%';
      hl.appendChild(d);
    }
  }
  for (const m of G.legalForSelected) {
    const c = centerPct(m.tx, m.ty);
    const d = document.createElement('div');
    d.className = 'hl ' + (E.pieceAt(G.board, m.tx, m.ty) ? 'capture' : 'move');
    d.style.left = c.left + '%'; d.style.top = c.top + '%';
    d.dataset.kind = E.pieceAt(G.board, m.tx, m.ty) ? 'capture' : 'move';
    hl.appendChild(d);
  }

  const layer = $('pieceLayer');
  const checkSide = !G.over && E.gameStatus(G.board).check ? G.board.turn : null;
  const seenIds = new Set();
  const glyphSwapId = G.pendingGlyphId;
  for (const p of G.board.pieces) {
    seenIds.add(p.id);
    let el = G.pieceEls.get(p.id);
    const isNew = !el;
    if (isNew) {
      el = document.createElement('div');
      G.pieceEls.set(p.id, el);
      layer.appendChild(el);
    }
    let cls = `piece ${p.army} side-${p.side}`;
    if (G.selected && G.selected.x === p.x && G.selected.y === p.y) cls += ' selected';
    if (checkSide && p.side === checkSide && E.isRoyal(p)) cls += ' in-check';
    if (G.lastMove && p.x === G.lastMove.tx && p.y === G.lastMove.ty) cls += ' moving';
    if (isNew && G.history.length) cls += ' entering';
    el.className = cls;
    const c = centerPct(p.x, p.y);
    // Phần tử được giữ nguyên giữa các lần vẽ — đổi left/top sẽ làm quân TRƯỢT đi nhờ CSS transition
    el.style.left = c.left + '%'; el.style.top = c.top + '%';
    if (glyphSwapId && p.id === glyphSwapId && !isNew) {
      // Vừa phong cấp: trượt bằng hình Tốt, tới nơi mới đổi thành hình quân được phong
      el.textContent = glyphText({ ...p, kind: 'pawn' });
      const targetGlyph = glyphText(p);
      setTimeout(() => { if (el.isConnected && G.pieceEls.get(p.id) === el) el.textContent = targetGlyph; }, 400);
    } else {
      el.textContent = glyphText(p);
    }
    el.title = `${E.PIECE_NAME_VI[p.kind]} — ${pheName(p.side)}`;
  }
  for (const [id, el] of [...G.pieceEls]) {
    if (!seenIds.has(id)) { el.remove(); G.pieceEls.delete(id); }
  }
  G.pendingGlyphId = null;
  sizePieces();

  const banner = $('turnBanner');
  if (G.over && G.result) {
    banner.textContent = G.result.text;
    banner.classList.remove('check');
  } else {
    const st = E.gameStatus(G.board);
    banner.textContent = `Lượt đi: ${sideName(G.board.turn)}${st.check ? ' — ĐANG BỊ CHIẾU!' : ''}`;
    banner.classList.toggle('check', !!st.check);
  }
  $('capturedByTop').textContent = G.capturedBy.top.length ? G.capturedBy.top.map(p => glyphText(p)).join(' ') : '—';
  $('capturedByBottom').textContent = G.capturedBy.bottom.length ? G.capturedBy.bottom.map(p => glyphText(p)).join(' ') : '—';
  const ml = $('moveList');
  ml.innerHTML = G.history.map((h, i) => `<li>${h.text}</li>`).join('');
  ml.scrollTop = ml.scrollHeight;
  $('undoBtn').disabled = G.mode === 'online' || !G.snapshots.length || (G.mode === 'ai' && G.board.turn === G.aiSide);
  const lastText = G.history.length ? G.history[G.history.length - 1].text : null;
  $('boardNote').innerHTML = (lastText ? `<span class="last-dot" aria-hidden="true"></span>Nước vừa đi: <strong>${lastText}</strong> · ` : '')
    + `Kiểu bàn: ${skinName(G.skin)} · Chế độ: ${G.mode === 'ai' ? 'luyện tập với máy' : G.mode === 'online' ? 'online beta' : '2 người cùng máy'} · ${VERSION}`;
  renderCards();
  updateRulesBar();
}

function sizePieces() {
  const boardEl = $('board');
  const cell = boardEl.clientWidth / 9;
  if (!cell) return;
  document.querySelectorAll('.piece').forEach(el => {
    const isXq = el.classList.contains('xiangqi');
    el.style.width = cell * 0.94 + 'px';
    el.style.height = cell * 0.94 + 'px';
    el.style.fontSize = cell * (isXq ? 0.52 : 0.8) + 'px';
  });
  document.querySelectorAll('.hl.move').forEach(el => { el.style.width = cell * 0.3 + 'px'; el.style.height = cell * 0.3 + 'px'; });
  document.querySelectorAll('.hl.capture').forEach(el => { el.style.width = cell * 0.96 + 'px'; el.style.height = cell * 0.96 + 'px'; });
  document.querySelectorAll('.hl.lastmove').forEach(el => { el.style.width = cell * 0.98 + 'px'; el.style.height = cell * 0.98 + 'px'; });
}
window.addEventListener('resize', sizePieces);

/* ---------------- Luồng ván đấu ---------------- */
function snapshot() {
  return JSON.parse(JSON.stringify({
    board: G.board, history: G.history,
    capturedBy: G.capturedBy, lastMove: G.lastMove, over: G.over, result: G.result, lastReason: G.lastReason,
  }));
}
function restore(snap) {
  G.board = snap.board; G.history = snap.history;
  G.capturedBy = snap.capturedBy; G.lastMove = snap.lastMove; G.over = snap.over; G.result = snap.result;
  G.lastReason = snap.lastReason || null;
  G.selected = null; G.legalForSelected = [];
}

function startGame(skin, armies, rules) {
  G.skin = skin;
  G.board = E.createBoard(armies, rules || readRulesFromUI());
  G.pieceEls.clear();
  $('pieceLayer').innerHTML = '';
  G.pendingGlyphId = null;
  G.history = []; G.snapshots = []; G.capturedBy = { top: [], bottom: [] };
  G.lastMove = null; G.over = false; G.result = null; G.lastReason = null;
  G.selected = null; G.legalForSelected = [];
  $('setupScreen').hidden = true;
  $('gameScreen').hidden = false;
  $('endModal').hidden = true;
  hideConnStatus();
  render();
  maybeAiTurn();
}

/* Icon SVG nét mảnh cho hộp thoại kết thúc: cúp khi có người thắng, bắt tay khi hòa. */
const END_ICONS = {
  win: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 3.5h9V9a4.5 4.5 0 0 1-9 0V3.5z"/><path d="M7.5 5.8H4.6c0 2.9 1.3 4.4 3.4 4.7M16.5 5.8h2.9c0 2.9-1.3 4.4-3.4 4.7"/><path d="M12 13.5v3.2M8.6 20.5h6.8M10.2 16.7h3.6l.5 3.8H9.7l.5-3.8z"/></svg>',
  draw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 17.5l-1.6 1.6a1.9 1.9 0 0 1-2.7 0l-2-2a1.9 1.9 0 0 1 0-2.7L6 13.6"/><path d="M7.2 12.4L3.6 8.8a2 2 0 0 1 0-2.8l1-1a2 2 0 0 1 2.8 0l4 4"/><path d="M12.8 11.6l3.6-3.6a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8l-6.4 6.4a1.9 1.9 0 0 1-2.7 0l-.9-.9a1.9 1.9 0 0 1 0-2.7l1-1.1"/><path d="M13.9 15.2l-1.3 1.3a1.7 1.7 0 0 1-2.4 0l-.6-.6"/></svg>',
};

/** Điền nội dung hộp thoại kết thúc từ G.result (dùng cho cả máy mình và khi nhận state online). */
function showEndModal() {
  if (!G.result) return;
  const winner = G.result.winner;
  $('endTitle').textContent = winner ? 'Có người thắng!' : 'Hòa!';
  $('endIcon').innerHTML = END_ICONS[winner ? 'win' : 'draw'];
  $('endText').textContent = G.result.text;
  $('endHonor').hidden = !G.result.honor;
  $('endModal').hidden = false;
}

function endGame(winner, reasonText) {
  G.over = true;
  const text = winner ? `${sideName(winner)} THẮNG — ${reasonText}` : `HÒA — ${reasonText}`;
  // Vinh danh khi phe yếu thế (bên Tướng trong trận lai) giành chiến thắng — hiện thành dải riêng trong hộp thoại
  const honor = !!(winner && G.board && E.xiangqiSideOf(G.board) === winner);
  G.result = { winner, text, honor };
  render();
  showEndModal();
  if (G.mode === 'online' && G.online.isHost) broadcastState();
}

/* Chuyển mã lý do kết thúc của engine thành câu hiển thị cho người chơi. */
function reasonText(reason) {
  if (!reason) return '';
  const rules = (G.board && G.board.rules) || {};
  const counters = (G.board && G.board.counters) || { xiangqiChecks: 0, chessMoves: 0 };
  if (reason.startsWith('defenderWin:')) {
    const src = reason.slice('defenderWin:'.length);
    return src === 'repetition'
      ? 'theo luật Giữ thành (ván lặp thế 3 lần).'
      : 'theo luật Giữ thành (bên Tướng hết nước nhưng không bị chiếu).';
  }
  return {
    checkmate: 'chiếu bí!',
    stalemate: 'đối thủ hết nước đi hợp lệ (theo luật đã chốt, hết nước = thua).',
    stalemateDraw: 'bên Tướng hết nước đi nhưng không bị chiếu — hòa theo luật Chính nghĩa.',
    guerrilla: `theo luật Du kích (chiếu ${counters.xiangqiChecks} lần).`,
    perpetualCheck: 'bên Vua thua do chiếu dai (luật Chính nghĩa).',
    moveLimit: `theo luật Trường kỳ kháng chiến (bên Vua đã đi đủ ${rules.moveLimit || counters.chessMoves} nước).`,
    repetition: 'lặp lại thế cờ 3 lần.',
  }[reason] || reason;
}

function performMove(move, source) {
  if (G.over) return false;
  const legal = E.legalMoves(G.board, G.board.turn);
  const ok = legal.some(m => m.fx === move.fx && m.fy === move.fy && m.tx === move.tx && m.ty === move.ty);
  if (!ok) return false;
  const finalMove = { ...move };
  const piece = E.pieceAt(G.board, move.fx, move.fy);
  if (piece.kind === 'pawn' && move.ty === E.promotionRow(piece.side) && !finalMove.promotion) finalMove.promotion = 'queen';

  G.snapshots.push(snapshot());
  const text = E.describeMove(G.board, finalMove);
  const captured = E.pieceAt(G.board, finalMove.tx, finalMove.ty);
  G.board = E.applyMove(G.board, finalMove);
  if (finalMove.promotion) {
    const movedPiece = E.pieceAt(G.board, finalMove.tx, finalMove.ty);
    if (movedPiece) G.pendingGlyphId = movedPiece.id;
  }
  if (captured) G.capturedBy[G.board.turn === 'top' ? 'bottom' : 'top'].push(captured);
  G.history.push({ move: finalMove, text });
  G.lastMove = finalMove;
  G.selected = null; G.legalForSelected = [];

  // Online: khách cũng đi NGAY ở máy mình như bình thường, đồng thời gửi nước cho chủ phòng.
  // Chủ phòng kiểm chứng ngầm (chống lệch bàn / sửa code) — lệch thì khách tự đồng bộ lại theo state chuẩn, không hề thông báo.
  if (G.mode === 'online' && !G.online.isHost && source === 'local' && G.online.conn && G.online.conn.open) {
    G.online.conn.send({ type: 'move', move: finalMove });
  }

  // Kết quả ván (kể cả lặp thế) do engine quyết định toàn bộ — giao diện chỉ đọc.
  const st = E.gameStatus(G.board);
  if (st.over) {
    G.lastReason = st.reason;
    endGame(st.winner, reasonText(st.reason));
    return true;
  }
  if (st.check) {
    G.history[G.history.length - 1].text += ' +';
  }
  render();
  if (G.mode === 'online' && G.online.isHost) broadcastState();
  maybeAiTurn();
  return true;
}

function maybeAiTurn() {
  if (G.mode !== 'ai' || G.over || !G.board || G.board.turn !== G.aiSide) return;
  render();
  const boardAtSchedule = G.board;
  setTimeout(() => {
    // Kiểm tra lại khi timer chạy: người chơi có thể đã rời ván / mở ván khác trong lúc chờ
    if (G.mode !== 'ai' || G.over || G.board !== boardAtSchedule || G.board.turn !== G.aiSide) return;
    const move = E.chooseAiMove(G.board, G.aiSide);
    if (move) performMove(move, 'ai');
  }, 420);
}

/* ---------------- Tương tác bàn cờ ---------------- */
$('board').addEventListener('click', ev => {
  if (!G.board || G.over) return;
  if (G.mode === 'ai' && G.board.turn === G.aiSide) return;
  if (G.mode === 'online' && G.board.turn !== G.mySide) return;
  const rect = $('board').getBoundingClientRect();
  const dx = Math.floor((ev.clientX - rect.left) / rect.width * 9);
  const dy = boardRowFromPoint(ev.clientY, rect);
  if (dy < 0) return;
  const x = isFlipped() ? 8 - dx : dx;
  const y = isFlipped() ? 9 - dy : dy;
  if (!E.inBoard(x, y)) return;

  if (G.selected) {
    const move = G.legalForSelected.find(m => m.tx === x && m.ty === y);
    if (move) {
      const piece = E.pieceAt(G.board, move.fx, move.fy);
      if (piece.kind === 'pawn' && move.ty === E.promotionRow(piece.side)) {
        G.pendingPromo = { ...move };
        syncPromoChoices(move);
        $('promoModal').hidden = false;
        return;
      }
      performMove(move, 'local');
      return;
    }
  }
  const piece = E.pieceAt(G.board, x, y);
  if (piece && piece.side === G.board.turn) {
    G.selected = { x, y };
    G.legalForSelected = E.legalMoves(G.board, G.board.turn).filter(m => m.fx === x && m.fy === y);
  } else {
    G.selected = null; G.legalForSelected = [];
  }
  render();
});

document.querySelectorAll('[data-promo]').forEach(btn => {
  btn.addEventListener('click', () => {
    const move = { ...G.pendingPromo, promotion: btn.dataset.promo };
    G.pendingPromo = null;
    $('promoModal').hidden = true;
    performMove(move, 'local');
  });
});

/* ---------------- Luật bổ trợ phe Tướng: cấu hình & hiển thị ---------------- */
const SUGGESTED_RULES = {
  guerrillaChecks: 3, defenderWinsOnDraw: true, moveLimit: 0,
  promoteOnlyCaptured: true, chessNoPerpetualCheck: false, xiangqiStalemateDraw: false,
};

/** Đọc cấu hình luật từ màn hình thiết lập theo preset đang chọn. */
function readRulesFromUI() {
  const preset = (document.querySelector('input[name="rulesPreset"]:checked') || {}).value || 'original';
  if (preset === 'suggested') return { ...SUGGESTED_RULES };
  if (preset === 'custom') {
    return {
      guerrillaChecks: $('ruleGuerrilla').checked ? parseInt($('ruleGuerrillaN').value, 10) : 0,
      defenderWinsOnDraw: $('ruleDefender').checked,
      moveLimit: $('ruleMoveLimit').checked ? parseInt($('ruleMoveLimitX').value, 10) : 0,
      promoteOnlyCaptured: $('rulePromote').checked,
      chessNoPerpetualCheck: $('rulePerpetual').checked,
      xiangqiStalemateDraw: $('ruleStalemate').checked,
    };
  }
  return { ...E.DEFAULT_RULES };
}

/** Danh sách luật đang bật của một bàn cờ, dạng câu chữ để hiển thị và ghi biên bản. */
function activeRulesList(board) {
  if (!board || !board.rules || !E.xiangqiSideOf(board)) return [];
  const r = board.rules, out = [];
  if (r.guerrillaChecks > 0) out.push(`Du kích (chiếu ${r.guerrillaChecks} lần)`);
  if (r.defenderWinsOnDraw) out.push('Giữ thành');
  if (r.moveLimit > 0) out.push(`Trường kỳ kháng chiến (${r.moveLimit} nước)`);
  if (r.promoteOnlyCaptured) out.push('Hậu cần có hạn');
  if (r.chessNoPerpetualCheck) out.push('Chính nghĩa — chiếu dai');
  if (r.xiangqiStalemateDraw) out.push('Chính nghĩa — hết nước hòa');
  return out;
}

/** Mục luật bổ trợ chỉ hiện ở trận lai; panel Tùy chỉnh chỉ hiện khi chọn preset Tùy chỉnh. */
function syncRulesBox() {
  const mode = currentMode();
  const armies = plannedArmies();
  const hybrid = armies.top !== armies.bottom;
  $('rulesBox').hidden = !hybrid;
  const preset = (document.querySelector('input[name="rulesPreset"]:checked') || {}).value;
  $('rulesCustom').hidden = preset !== 'custom';
  $('rulesOnlineNote').hidden = mode !== 'online';
}

/** Khóa/mở khóa toàn bộ điều khiển luật (khách online chỉ xem, không sửa). */
function setRulesReadOnly(readOnly) {
  document.querySelectorAll('#rulesBox input, #rulesBox select').forEach(el => { el.disabled = readOnly; });
  $('rulesGuestNote').hidden = !readOnly;
}

/** Tạo (hoặc di chuyển) một chip bộ đếm luật vào thẻ người chơi thích hợp, giữ nguyên id cũ. */
function ensureChip(id, cls, parent) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('span');
    el.id = id; el.hidden = true;
  }
  cls.split(' ').forEach(c => el.classList.add(c));
  if (el.parentElement !== parent) parent.appendChild(el);
  return el;
}

const capSide = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Thẻ người chơi hai đầu bàn: avatar + tên phe + dòng phụ, gắn chip bộ đếm vào đúng phe, sáng viền bên sắp đi. */
/** Tên trên thẻ người chơi: vai trò của người đang xem + phe quân. */
function cardRoleName(side, isXq) {
  const armyLabel = isXq ? 'Phe Tướng' : 'Phe Vua';
  if (G.mode === 'ai') return `${side === G.aiSide ? 'Máy' : 'Bạn'} — ${armyLabel}`;
  if (G.mode === 'online') return `${side === G.mySide ? 'Bạn' : 'Đối thủ (online)'} — ${armyLabel}`;
  return `${side === (G.p1Side || 'bottom') ? 'Bạn' : 'Đối thủ'} — ${armyLabel}`;
}

function renderCards() {
  const b = G.board;
  if (!b) return;
  const checkSide = !G.over && E.gameStatus(b).check ? b.turn : null;
  const bottomSide = G.viewBottom || 'bottom';
  const positions = [['Bottom', bottomSide], ['Top', E.otherSide(bottomSide)]];
  for (const [pos, side] of positions) {
    const army = b.armies[side];
    const isXq = army === 'xiangqi';
    const avatar = $('avatar' + pos);
    avatar.textContent = glyphText({ army, kind: isXq ? 'general' : 'king', side });
    avatar.className = 'pc-avatar ' + (isXq ? 'pc-avatar-xq' : 'pc-avatar-chess');
    $('pcName' + pos).textContent = cardRoleName(side, isXq);
    $('pcSub' + pos).textContent = isXq ? 'Giáo mác · đi trước' : 'Súng đạn';
    $('card' + pos).classList.toggle('active', b.turn === side && !G.over);
    $('pcCheck' + pos).hidden = checkSide !== side;
  }
  const posOf = side => (side === bottomSide ? 'Bottom' : 'Top');
  const xqChips = $('chips' + posOf(E.xiangqiSideOf(b) || 'top'));
  const chChips = $('chips' + posOf(E.chessSideOf(b) || 'top'));
  ensureChip('guerrillaCounter', 'rule-chip chip-guerrilla', xqChips);
  ensureChip('moveLimitCounter', 'rule-chip', xqChips);
  ensureChip('promoPool', 'rule-chip', chChips);
}

/** Thanh thông tin luật trong ván: tắt hết luật thì ẩn hẳn (giống hệt bản gốc). */
function updateRulesBar() {
  const list = G.board ? activeRulesList(G.board) : [];
  if (!list.length) { $('rulesBar').hidden = true; return; }
  const r = G.board.rules, c = G.board.counters || { xiangqiChecks: 0, chessMoves: 0 };
  $('rulesBar').hidden = false;
  $('rulesLine').textContent = 'Luật bổ trợ đang bật: ' + list.join(' · ');
  $('guerrillaCounter').hidden = !(r.guerrillaChecks > 0);
  if (r.guerrillaChecks > 0) $('guerrillaCounter').textContent = `Du kích: ${c.xiangqiChecks}/${r.guerrillaChecks} lần chiếu`;
  $('moveLimitCounter').hidden = !(r.moveLimit > 0);
  if (r.moveLimit > 0) $('moveLimitCounter').textContent = `Trường kỳ: còn ${Math.max(0, r.moveLimit - c.chessMoves)} nước`;
  $('promoPool').hidden = !r.promoteOnlyCaptured;
  if (r.promoteOnlyCaptured) {
    const pool = (G.board.capturedChess || []).map(k => E.PIECE_NAME_VI[k]);
    $('promoPool').textContent = 'Kho phong cấp: ' + (pool.length ? pool.join(', ') : 'trống');
  }
}

/** Hộp chọn phong cấp: bật Hậu cần có hạn thì chỉ hiện các quân còn trong kho. */
function syncPromoChoices(move) {
  const board = G.board;
  let kinds = ['queen', 'rook', 'bishop', 'knight'];
  if (board && board.rules && board.rules.promoteOnlyCaptured && E.xiangqiSideOf(board)) {
    kinds = [...new Set(G.legalForSelected
      .filter(m => m.tx === move.tx && m.ty === move.ty && m.promotion)
      .map(m => m.promotion))];
  }
  document.querySelectorAll('[data-promo]').forEach(b => { b.hidden = !kinds.includes(b.dataset.promo); });
}

/* ---------------- Thiết lập & điều khiển ---------------- */
function currentMode() { return document.querySelector('input[name="mode"]:checked').value; }

function syncSetupVisibility() {
  const mode = currentMode();
  G.mode = mode;
  $('onlineFields').hidden = mode !== 'online';
  $('startBtn').hidden = mode === 'online';
  $('oppArmyField').hidden = mode !== 'ai';
  $('flipPerTurnField').hidden = mode !== 'hotseat';
  $('matchupFields').style.opacity = mode === 'online' ? '.45' : '1';
  $('skinVoteFields').style.opacity = mode === 'online' ? '.45' : '1';
  syncRulesBox();
}
document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', syncSetupVisibility));
$('myArmy').addEventListener('change', syncRulesBox);
$('oppArmy').addEventListener('change', syncRulesBox);
document.querySelectorAll('input[name="rulesPreset"]').forEach(r => r.addEventListener('change', syncRulesBox));

function resolveSkin(pref1, pref2, done) {
  if (pref1 === pref2) { done(pref1, false); return; }
  $('coinModal').hidden = false;
  $('coinText').textContent = 'Hai người chọn hai kiểu bàn khác nhau — tung đồng xu quyết định…';
  const picked = Math.random() < 0.5 ? pref1 : pref2;
  setTimeout(() => {
    $('coinText').textContent = `Kết quả: dùng ${skinName(picked)}!`;
    setTimeout(() => { $('coinModal').hidden = true; done(picked, true); }, 950);
  }, 1100);
}

$('startBtn').addEventListener('click', () => {
  const mode = currentMode();
  G.mode = mode;
  G.aiSide = 'top';
  G.mySide = null;
  G.p1Side = 'bottom';   // người chọn "Bạn cầm" (P1) luôn ở phía dưới
  G.viewBottom = 'bottom';
  const armies = plannedArmies();
  resolveSkin($('skinP1').value, $('skinP2').value, skin => startGame(skin, armies));
});

$('undoBtn').addEventListener('click', () => {
  if (!G.snapshots.length) return;
  if (G.mode === 'ai') {
    // đi lại cả cặp nước (máy + bạn) để trở về lượt của bạn
    let snap = G.snapshots.pop();
    if (G.snapshots.length && snap.board.turn === G.aiSide) snap = G.snapshots.pop();
    restore(snap);
  } else {
    restore(G.snapshots.pop());
  }
  $('endModal').hidden = true;
  render();
});

$('resignBtn').addEventListener('click', () => {
  if (!G.board || G.over) return;
  let resignSide;
  if (G.mode === 'online') {
    if (!confirm('Bạn chắc chắn muốn xin thua ván này?')) return;
    resignSide = G.mySide;
    if (!G.online.isHost && G.online.conn) { G.online.conn.send({ type: 'resign' }); return; }
  } else if (G.mode === 'ai') {
    if (!confirm('Bạn chắc chắn muốn xin thua ván này?')) return;
    resignSide = 'bottom';
  } else {
    if (!confirm(`Bên đang đi (${sideName(G.board.turn)}) xin thua?`)) return;
    resignSide = G.board.turn;
  }
  endGame(E.otherSide(resignSide), `${sideName(resignSide)} đã xin thua.`);
});

/** Bấm "Ván mới": đang đấu online trong phòng thì TÁI ĐẤU ngay trong cùng phòng
 *  (chủ phòng mở ván mới, khách gửi yêu cầu để chủ phòng mở) — ngoài online thì về màn hình thiết lập. */
function newGameOrRematch() {
  if (G.mode === 'online' && G.online.started && G.online.conn) {
    $('endModal').hidden = true;
    if (G.online.isHost) startRematch();
    else if (G.online.conn.open) G.online.conn.send({ type: 'rematch' });
    return;
  }
  $('gameScreen').hidden = true;
  $('setupScreen').hidden = false;
  $('endModal').hidden = true;
}
$('newGameBtn').addEventListener('click', newGameOrRematch);
$('endSetupBtn').addEventListener('click', newGameOrRematch);
$('endWatchBtn').addEventListener('click', () => { $('endModal').hidden = true; });

$('copyRecordBtn').addEventListener('click', async () => {
  const ruleList = activeRulesList(G.board);
  const lines = [
    `Cờ Vua vs Cờ Tướng — biên bản ván đấu (${VERSION})`,
    `Chế độ: ${G.mode} · Bàn: ${skinName(G.skin)} · ${pheName('top')} vs ${pheName('bottom')}`,
    `Luật bổ trợ: ${ruleList.length ? ruleList.join('; ') : 'không (bản gốc)'}`,
    `Kết quả: ${G.over && G.result ? G.result.text.replace('\n', ' ') : 'ván chưa kết thúc'}${G.over && G.lastReason ? ` [mã lý do: ${G.lastReason}]` : ''}`,
    '',
    ...G.history.map((h, i) => `${i + 1}. ${h.text}`),
  ].join('\n');
  try {
    await navigator.clipboard.writeText(lines);
    $('copyStatus').textContent = 'Đã sao chép biên bản. Dán vào trang góp ý kèm nhận xét của bạn nhé!';
  } catch (_) {
    $('copyStatus').textContent = 'Trình duyệt chặn sao chép tự động — hãy chọn toàn bộ biên bản ở cột phải và sao chép thủ công.';
  }
});

/* ---------------- Online Beta (PeerJS / WebRTC) ---------------- */
function loadPeerJs() {
  return new Promise((resolve, reject) => {
    if (window.Peer) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Không tải được thư viện kết nối (cần có mạng).'));
    document.head.appendChild(s);
  });
}
function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}
function onlineStatus(text) { $('onlineStatus').textContent = text; }

/* Trạng thái kết nối TRONG ván: chỉ hiện khi mất kết nối, ngoài ra luôn ẩn. */
function showConnStatus() { const el = $('connStatus'); if (el) el.hidden = false; }
function hideConnStatus() { const el = $('connStatus'); if (el) el.hidden = true; }

$('copyCodeBtn').addEventListener('click', async () => {
  if (!G.online.code) return;
  try {
    await navigator.clipboard.writeText(G.online.code);
    onlineStatus(`Đã sao chép mã phòng ${G.online.code}. Gửi cho đối thủ của bạn nhé!`);
  } catch (_) {
    onlineStatus(`Mã phòng của bạn là: ${G.online.code} — hãy chép tay mã này gửi cho đối thủ.`);
  }
});

function serializeGame() {
  return JSON.parse(JSON.stringify({
    skin: G.skin, board: G.board, history: G.history,
    capturedBy: G.capturedBy, lastMove: G.lastMove, over: G.over, result: G.result, lastReason: G.lastReason,
  }));
}
function applyRemoteState(s, yourSide) {
  if (yourSide) { G.mySide = yourSide; G.viewBottom = yourSide; } // quân của mình luôn ở dưới trên máy mình
  if (G.mode === 'online') {
    G.online.started = true;
    hideConnStatus(); // nhận được state tức là kết nối đang sống
    if (!G.online.isHost) {
      setRulesReadOnly(true); // khách chỉ xem luật của chủ phòng
      // Lệch thế cờ (nước đi lạc quan bị chủ phòng bác): tự đồng bộ im lặng theo state chuẩn, chỉ ghi log debug
      if (G.history && s.history && s.history.length < G.history.length) {
        console.warn('[online] Thế cờ lệch — tự đồng bộ theo state của chủ phòng.');
      }
    }
  }
  if (!s.history || s.history.length === 0) {
    G.pieceEls.clear();
    $('pieceLayer').innerHTML = '';
  }
  G.skin = s.skin; G.board = s.board; G.history = s.history;
  G.capturedBy = s.capturedBy; G.lastMove = s.lastMove; G.over = s.over; G.result = s.result;
  G.lastReason = s.lastReason || null;
  G.selected = null; G.legalForSelected = []; G.snapshots = [];
  $('setupScreen').hidden = true;
  $('gameScreen').hidden = false;
  render();
  if (G.over && G.result) showEndModal();
}
function broadcastState() {
  if (G.online.conn && G.online.conn.open) {
    G.online.conn.send({ type: 'state', state: serializeGame(), yourSide: E.otherSide(G.mySide), version: VERSION });
  }
}

/** Tái đấu trong cùng phòng: giữ nguyên quân hai bên, kiểu bàn và luật của ván trước. Chỉ chủ phòng gọi. */
function startRematch() {
  if (G.mode !== 'online' || !G.online.isHost || !G.board) return;
  const armies = { ...G.board.armies };
  const rules = G.board.rules ? { ...G.board.rules } : undefined;
  startGame(G.skin, armies, rules);
  G.online.started = true;
  broadcastState();
}

$('createRoomBtn').addEventListener('click', async () => {
  try {
    await loadPeerJs();
    G.mode = 'online';
    G.online.started = false; // phòng mới = phiên mới: hello đầu tiên phải được tính là bắt đầu ván
    setRulesReadOnly(false); // chủ phòng được chọn luật
    const code = makeRoomCode();
    G.online.code = code;
    G.online.isHost = true;
    if (G.online.peer) { try { G.online.peer.destroy(); } catch (_) {} } // dọn peer cũ nếu tạo phòng lại
    const peer = new window.Peer(PEER_PREFIX + code);
    G.online.peer = peer;
    peer.on('open', () => {
      onlineStatus(`Đã tạo phòng. Gửi mã này cho đối thủ của bạn: ${code} — đang chờ họ vào phòng…`);
      $('copyCodeBtn').hidden = false;
    });
    peer.on('connection', conn => {
      G.online.conn = conn;
      conn.on('open', () => onlineStatus('Đối thủ đã kết nối, chờ họ chọn kiểu bàn…'));
      conn.on('data', msg => {
        hideConnStatus();
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'hello') {
          if (msg.version !== VERSION) {
            // Lệch phiên bản: báo rõ thay vì để hai máy lệch bàn âm thầm
            onlineStatus('Đối thủ đang dùng phiên bản khác, hãy tải lại trang');
            if (conn.open) conn.send({ type: 'versionMismatch', version: VERSION });
            return;
          }
          if (G.online.started) { broadcastState(); return; } // hello trùng / khách kết nối lại: chỉ đồng bộ lại state, KHÔNG reset ván đang đấu
          const hostArmy = $('hostArmy').value;
          G.mySide = hostArmy === 'xiangqi' ? 'top' : 'bottom';
          G.viewBottom = G.mySide; // quân của chủ phòng ở dưới trên máy chủ phòng
          const armies = { top: 'xiangqi', bottom: 'chess' };
          resolveSkin($('mySkinOnline').value, msg.skinPref, skin => {
            startGame(skin, armies);
            G.online.started = true;
            broadcastState();
            onlineStatus('Ván đấu online đã bắt đầu!');
          });
        } else if (msg.type === 'move') {
          const guestsTurn = G.board && G.board.turn === E.otherSide(G.mySide);
          if (!guestsTurn || !performMove(msg.move, 'remote')) {
            // Kiểm chứng ngầm: nước đi lệch hoặc không hợp lệ — KHÔNG báo người chơi,
            // chỉ gửi lại state chuẩn để máy khách tự đồng bộ, ghi log để debug.
            console.warn('[online] Nước đi của khách không khớp thế cờ — đã gửi lại state chuẩn để đồng bộ.', msg.move);
            broadcastState();
          }
        } else if (msg.type === 'rematch') {
          startRematch(); // khách xin tái đấu trong cùng phòng
        } else if (msg.type === 'resign') {
          endGame(G.mySide, `${sideName(E.otherSide(G.mySide))} đã xin thua.`);
        }
      });
      conn.on('close', () => {
        if (G.online.started) showConnStatus();
        else onlineStatus('Đối thủ đã ngắt kết nối.');
      });
    });
    peer.on('disconnected', () => { if (G.online.started) showConnStatus(); peer.reconnect(); });
    peer.on('error', err => onlineStatus('Lỗi kết nối: ' + err.type + '. Hãy thử tạo lại phòng.'));
  } catch (e) {
    onlineStatus(e.message);
  }
});

$('joinRoomBtn').addEventListener('click', async () => {
  try {
    await loadPeerJs();
    G.mode = 'online';
    G.online.started = false; // vào phòng mới = phiên mới
    setRulesReadOnly(true); // khách vào phòng: luật do chủ phòng quyết định
    const code = $('roomCodeInput').value.trim().toUpperCase();
    if (code.length !== 5) { onlineStatus('Mã phòng gồm 5 ký tự — hãy kiểm tra lại.'); return; }
    G.online.isHost = false;
    if (G.online.peer) { try { G.online.peer.destroy(); } catch (_) {} } // dọn peer cũ nếu vào phòng lại
    const peer = new window.Peer();
    G.online.peer = peer;
    peer.on('open', () => {
      const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
      G.online.conn = conn;
      conn.on('open', () => {
        onlineStatus('Đã kết nối tới phòng — chờ chủ phòng bắt đầu ván…');
        conn.send({ type: 'hello', skinPref: $('mySkinOnline').value, version: VERSION });
      });
      conn.on('data', msg => {
        if (msg && msg.type === 'versionMismatch') {
          onlineStatus('Đối thủ đang dùng phiên bản khác, hãy tải lại trang');
          return;
        }
        if (msg && msg.type === 'state') {
          if (msg.version !== VERSION) {
            onlineStatus('Đối thủ đang dùng phiên bản khác, hãy tải lại trang');
            return;
          }
          applyRemoteState(msg.state, msg.yourSide);
        }
      });
      conn.on('close', () => {
        if (G.online.started) showConnStatus();
        else onlineStatus('Chủ phòng đã ngắt kết nối.');
      });
    });
    peer.on('disconnected', () => { if (G.online.started) showConnStatus(); peer.reconnect(); });
    peer.on('error', err => onlineStatus('Không vào được phòng (' + err.type + ') — kiểm tra mã phòng và đường truyền.'));
  } catch (e) {
    onlineStatus(e.message);
  }
});

/* ---------------- Khởi tạo ---------------- */
(function init() {
  syncSetupVisibility();
  if (FEEDBACK_URL) {
    $('feedbackLink').href = FEEDBACK_URL;
  } else {
    $('feedbackLink').addEventListener('click', ev => {
      ev.preventDefault();
      $('copyStatus').textContent = 'Chủ dự án chưa cấu hình link góp ý — hãy điền FEEDBACK_URL ở đầu file app.js (xem README) sau khi tạo repo GitHub.';
    });
  }
})();
