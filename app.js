'use strict';
/* Cờ Vua vs Cờ Tướng — lớp giao diện & chế độ chơi (engine nằm ở game.js) */

// Chủ dự án: điền link trang góp ý của repo (ví dụ GitHub Issues) vào đây khi tung bản public.
const FEEDBACK_URL = 'https://github.com/DLoc03/co-vua-vs-co-tuong/issues';
const PEER_PREFIX = 'cvvct-game-';
const VERSION = 'v0.1.1';

const $ = id => document.getElementById(id);
const E = window.Engine;

const G = {
  mode: 'hotseat',
  board: null, skin: 'squares',
  selected: null, legalForSelected: [],
  history: [], snapshots: [], posCounts: {},
  capturedBy: { top: [], bottom: [] },
  lastMove: null, over: false, result: null,
  aiSide: 'top', mySide: null,
  pendingPromo: null, pendingGlyphId: null, pieceEls: new Map(),
  online: { peer: null, conn: null, isHost: false, code: '', started: false },
};

function armyName(army) { return army === 'xiangqi' ? 'Cờ tướng' : 'Cờ vua'; }
function sideName(side) {
  const base = `${armyName(G.board.armies[side])} (bên ${side === 'top' ? 'trên' : 'dưới'})`;
  if (G.mode === 'ai') return side === G.aiSide ? `Máy — ${base}` : `Bạn — ${base}`;
  if (G.mode === 'online' && G.mySide) return side === G.mySide ? `Bạn — ${base}` : `Đối thủ — ${base}`;
  return base;
}
function skinName(skin) { return skin === 'squares' ? 'bàn ô vuông' : 'bàn vạch kẻ / giao điểm'; }

/* ---------------- Vẽ nền bàn cờ ---------------- */
function boardSvg(skin) {
  if (skin === 'squares') {
    let cells = '';
    for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
      cells += `<rect x="${x * 100}" y="${y * 100}" width="100" height="100" fill="${(x + y) % 2 ? '#b58863' : '#f0d9b5'}"/>`;
    }
    return `<svg viewBox="0 0 900 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      ${cells}
      <rect x="300" y="0" width="300" height="300" fill="rgba(176,48,36,.14)"/>
      <rect x="300" y="700" width="300" height="300" fill="rgba(40,83,107,.16)"/>
      <rect x="300" y="0" width="300" height="300" fill="none" stroke="rgba(90,40,20,.55)" stroke-width="3"/>
      <rect x="300" y="700" width="300" height="300" fill="none" stroke="rgba(20,50,80,.55)" stroke-width="3"/>
      <rect x="0" y="486" width="900" height="28" fill="rgba(58,110,165,.55)"/>
      <text x="450" y="508" text-anchor="middle" font-size="21" font-weight="700" fill="#ffffff" letter-spacing="6">SÔNG</text>
      <rect x="1.5" y="1.5" width="897" height="997" fill="none" stroke="#5d3a1a" stroke-width="3"/>
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
  return `<svg viewBox="0 0 900 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="900" height="1000" fill="#f3d9a4"/>
    <rect x="38" y="38" width="824" height="924" fill="#f7e3b5" stroke="#4a3421" stroke-width="3"/>
    <g stroke="#4a3421" stroke-width="2.4">${lines}</g>
    <g stroke="#4a3421" stroke-width="2.4">
      <line x1="350" y1="50" x2="550" y2="250"/><line x1="550" y1="50" x2="350" y2="250"/>
      <line x1="350" y1="750" x2="550" y2="950"/><line x1="550" y1="750" x2="350" y2="950"/>
    </g>
    <text x="450" y="516" text-anchor="middle" font-size="37" font-weight="700" fill="#6b4423" letter-spacing="10">楚河 · 漢界</text>
    <rect x="38" y="38" width="824" height="924" fill="none" stroke="#4a3421" stroke-width="1.2"/>
  </svg>`;
}

/* ---------------- Render ---------------- */
function centerPct(x, y) { return { left: (x + 0.5) / 9 * 100, top: (y + 0.5) / 10 * 100 }; }

function render() {
  if (!G.board) return;
  $('boardBg').innerHTML = boardSvg(G.skin);
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
      el.textContent = E.glyphOf({ ...p, kind: 'pawn' });
      const targetGlyph = E.glyphOf(p);
      setTimeout(() => { if (el.isConnected && G.pieceEls.get(p.id) === el) el.textContent = targetGlyph; }, 400);
    } else {
      el.textContent = E.glyphOf(p);
    }
    el.title = `${E.PIECE_NAME_VI[p.kind]} — ${armyName(p.army)} bên ${p.side === 'top' ? 'trên' : 'dưới'}`;
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
  $('capturedByTop').textContent = G.capturedBy.top.length ? G.capturedBy.top.map(p => E.glyphOf(p)).join(' ') : '—';
  $('capturedByBottom').textContent = G.capturedBy.bottom.length ? G.capturedBy.bottom.map(p => E.glyphOf(p)).join(' ') : '—';
  const ml = $('moveList');
  ml.innerHTML = G.history.map((h, i) => `<li>${h.text}</li>`).join('');
  ml.scrollTop = ml.scrollHeight;
  $('undoBtn').disabled = G.mode === 'online' || !G.snapshots.length || (G.mode === 'ai' && G.board.turn === G.aiSide);
  const lastText = G.history.length ? G.history[G.history.length - 1].text : null;
  $('boardNote').textContent = (lastText ? `👉 Nước vừa đi: ${lastText} · ` : '')
    + `Kiểu bàn: ${skinName(G.skin)} · Chế độ: ${G.mode === 'ai' ? 'luyện tập với máy' : G.mode === 'online' ? 'online beta' : '2 người cùng máy'} · ${VERSION}`;
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
    board: G.board, history: G.history, posCounts: G.posCounts,
    capturedBy: G.capturedBy, lastMove: G.lastMove, over: G.over, result: G.result,
  }));
}
function restore(snap) {
  G.board = snap.board; G.history = snap.history; G.posCounts = snap.posCounts;
  G.capturedBy = snap.capturedBy; G.lastMove = snap.lastMove; G.over = snap.over; G.result = snap.result;
  G.selected = null; G.legalForSelected = [];
}

function startGame(skin, armies) {
  G.skin = skin;
  G.board = E.createBoard(armies);
  G.pieceEls.clear();
  $('pieceLayer').innerHTML = '';
  G.pendingGlyphId = null;
  G.history = []; G.snapshots = []; G.capturedBy = { top: [], bottom: [] };
  G.lastMove = null; G.over = false; G.result = null;
  G.selected = null; G.legalForSelected = [];
  G.posCounts = {}; G.posCounts[E.positionKey(G.board)] = 1;
  $('setupScreen').hidden = true;
  $('gameScreen').hidden = false;
  $('endModal').hidden = true;
  render();
  maybeAiTurn();
}

function endGame(winner, reasonText) {
  G.over = true;
  G.result = { winner, text: winner ? `🏆 ${sideName(winner)} THẮNG — ${reasonText}` : `🤝 HÒA — ${reasonText}` };
  render();
  $('endTitle').textContent = winner ? '🏆 Có người thắng!' : '🤝 Hòa!';
  $('endText').textContent = G.result.text;
  $('endModal').hidden = false;
  if (G.mode === 'online' && G.online.isHost) broadcastState();
}

function performMove(move, source) {
  if (G.over) return false;
  // Online: khách không tự áp nước đi, gửi cho chủ phòng xác nhận
  if (G.mode === 'online' && !G.online.isHost && source === 'local') {
    if (G.online.conn) G.online.conn.send({ type: 'move', move });
    $('boardNote').textContent = 'Đã gửi nước đi, chờ chủ phòng xác nhận…';
    return true;
  }
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

  const key = E.positionKey(G.board);
  G.posCounts[key] = (G.posCounts[key] || 0) + 1;

  const st = E.gameStatus(G.board);
  if (st.over) {
    endGame(st.winner, st.reason === 'checkmate' ? 'chiếu bí!' : 'đối thủ hết nước đi hợp lệ (theo luật đã chốt, hết nước = thua).');
    return true;
  }
  if (G.posCounts[key] >= 3) {
    endGame(null, 'lặp lại thế cờ 3 lần.');
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
  setTimeout(() => {
    if (G.over) return;
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
  const x = Math.floor((ev.clientX - rect.left) / rect.width * 9);
  const y = Math.floor((ev.clientY - rect.top) / rect.height * 10);
  if (!E.inBoard(x, y)) return;

  if (G.selected) {
    const move = G.legalForSelected.find(m => m.tx === x && m.ty === y);
    if (move) {
      const piece = E.pieceAt(G.board, move.fx, move.fy);
      if (piece.kind === 'pawn' && move.ty === E.promotionRow(piece.side)) {
        G.pendingPromo = { ...move };
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

/* ---------------- Thiết lập & điều khiển ---------------- */
function currentMode() { return document.querySelector('input[name="mode"]:checked').value; }

function syncSetupVisibility() {
  const mode = currentMode();
  G.mode = mode;
  $('onlineFields').hidden = mode !== 'online';
  $('startBtn').hidden = mode === 'online';
  $('matchupFields').style.opacity = mode === 'online' ? '.45' : '1';
  $('skinVoteFields').style.opacity = mode === 'online' ? '.45' : '1';
}
document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', syncSetupVisibility));

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
  const armies = { top: $('topArmy').value, bottom: $('bottomArmy').value };
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

$('newGameBtn').addEventListener('click', () => {
  $('gameScreen').hidden = true;
  $('setupScreen').hidden = false;
  $('endModal').hidden = true;
});
$('endSetupBtn').addEventListener('click', () => {
  $('endModal').hidden = true;
  $('gameScreen').hidden = true;
  $('setupScreen').hidden = false;
});
$('endWatchBtn').addEventListener('click', () => { $('endModal').hidden = true; });

$('copyRecordBtn').addEventListener('click', async () => {
  const lines = [
    `Cờ Vua vs Cờ Tướng — biên bản ván đấu (${VERSION})`,
    `Chế độ: ${G.mode} · Bàn: ${skinName(G.skin)} · Trên: ${armyName(G.board.armies.top)} · Dưới: ${armyName(G.board.armies.bottom)}`,
    `Kết quả: ${G.over && G.result ? G.result.text : 'ván chưa kết thúc'}`,
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

function serializeGame() {
  return JSON.parse(JSON.stringify({
    skin: G.skin, board: G.board, history: G.history, posCounts: G.posCounts,
    capturedBy: G.capturedBy, lastMove: G.lastMove, over: G.over, result: G.result,
  }));
}
function applyRemoteState(s, yourSide) {
  if (yourSide) G.mySide = yourSide;
  if (!s.history || s.history.length === 0) {
    G.pieceEls.clear();
    $('pieceLayer').innerHTML = '';
  }
  G.skin = s.skin; G.board = s.board; G.history = s.history; G.posCounts = s.posCounts;
  G.capturedBy = s.capturedBy; G.lastMove = s.lastMove; G.over = s.over; G.result = s.result;
  G.selected = null; G.legalForSelected = []; G.snapshots = [];
  $('setupScreen').hidden = true;
  $('gameScreen').hidden = false;
  render();
  if (G.over && G.result) {
    $('endTitle').textContent = G.result.winner ? '🏆 Có người thắng!' : '🤝 Hòa!';
    $('endText').textContent = G.result.text;
    $('endModal').hidden = false;
  }
}
function broadcastState() {
  if (G.online.conn && G.online.conn.open) {
    G.online.conn.send({ type: 'state', state: serializeGame(), yourSide: E.otherSide(G.mySide) });
  }
}

$('createRoomBtn').addEventListener('click', async () => {
  try {
    await loadPeerJs();
    G.mode = 'online';
    const code = makeRoomCode();
    G.online.code = code;
    G.online.isHost = true;
    const peer = new window.Peer(PEER_PREFIX + code);
    G.online.peer = peer;
    peer.on('open', () => onlineStatus(`✅ Đã tạo phòng. Gửi mã này cho đối thủ của bạn: ${code} — đang chờ họ vào phòng…`));
    peer.on('connection', conn => {
      G.online.conn = conn;
      conn.on('open', () => onlineStatus('Đối thủ đã kết nối, chờ họ chọn kiểu bàn…'));
      conn.on('data', msg => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'hello') {
          const hostArmy = $('hostArmy').value;
          G.mySide = hostArmy === 'xiangqi' ? 'top' : 'bottom';
          const armies = { top: 'xiangqi', bottom: 'chess' };
          resolveSkin($('mySkinOnline').value, msg.skinPref, skin => {
            startGame(skin, armies);
            G.online.started = true;
            broadcastState();
            onlineStatus('Ván đấu online đã bắt đầu!');
          });
        } else if (msg.type === 'move') {
          if (G.board && G.board.turn === E.otherSide(G.mySide)) performMove(msg.move, 'remote');
        } else if (msg.type === 'resign') {
          endGame(G.mySide, `${sideName(E.otherSide(G.mySide))} đã xin thua.`);
        }
      });
      conn.on('close', () => onlineStatus('Đối thủ đã ngắt kết nối.'));
    });
    peer.on('error', err => onlineStatus('Lỗi kết nối: ' + err.type + '. Hãy thử tạo lại phòng.'));
  } catch (e) {
    onlineStatus(e.message);
  }
});

$('joinRoomBtn').addEventListener('click', async () => {
  try {
    await loadPeerJs();
    G.mode = 'online';
    const code = $('roomCodeInput').value.trim().toUpperCase();
    if (code.length !== 5) { onlineStatus('Mã phòng gồm 5 ký tự — hãy kiểm tra lại.'); return; }
    G.online.isHost = false;
    const peer = new window.Peer();
    G.online.peer = peer;
    peer.on('open', () => {
      const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
      G.online.conn = conn;
      conn.on('open', () => {
        onlineStatus('Đã kết nối tới phòng — chờ chủ phòng bắt đầu ván…');
        conn.send({ type: 'hello', skinPref: $('mySkinOnline').value });
      });
      conn.on('data', msg => {
        if (msg && msg.type === 'state') applyRemoteState(msg.state, msg.yourSide);
      });
      conn.on('close', () => onlineStatus('Chủ phòng đã ngắt kết nối.'));
    });
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
