'use strict';
/* Smoke test giao diện bằng jsdom: nạp index.html thật, bấm bắt đầu ván, đi thử 1 nước, thử chế độ AI và skin vạch kẻ.
 * Chạy: vào thư mục tests, `npm install jsdom` rồi `node ui.test.js`. (Test engine không cần cài gì: `node engine.test.js`) */
const { JSDOM } = require('jsdom');
const path = require('path');

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, extra || ''); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true,
  });
  const { window } = dom;
  await new Promise(r => { if (window.document.readyState === 'complete') r(); else window.addEventListener('load', r); });
  await sleep(300);
  const doc = window.document;
  const $ = id => doc.getElementById(id);

  check('setup screen visible', !$('setupScreen').hidden);
  check('engine loaded', !!window.Engine);
  check('start button exists', !!$('startBtn'));

  // Vá kích thước bàn (jsdom không layout): board 900x1000 tại gốc tọa độ
  $('board').getBoundingClientRect = () => ({ left: 0, top: 0, width: 900, height: 1000, right: 900, bottom: 1000, x: 0, y: 0 });

  function clickBoard(x, y) {
    const ev = new window.MouseEvent('click', {
      bubbles: true, clientX: (x + 0.5) / 9 * 900, clientY: (y + 0.5) / 10 * 1000,
    });
    $('board').dispatchEvent(ev);
  }

  // --- Ván 1: mặc định 2 người, 2 người chọn 2 kiểu bàn khác nhau -> tung đồng xu ---
  $('startBtn').click();
  await sleep(300);
  check('coin modal appears when skins differ', !$('coinModal').hidden);
  await sleep(2400);
  check('game screen shown after coin flip', !$('gameScreen').hidden);
  check('32 pieces on board', doc.querySelectorAll('.piece').length === 32, doc.querySelectorAll('.piece').length);
  check('xiangqi tokens at bottom (P1 army)', doc.querySelectorAll('.piece.xiangqi.side-bottom').length === 16);
  check('chess pieces on top', doc.querySelectorAll('.piece.chess.side-top').length === 16);
  check('banner: xiangqi turn first', $('turnBanner').textContent.includes('Phe Tướng'), $('turnBanner').textContent);

  // --- Đi thử một nước Chốt: chọn chốt ở (0,6) rồi đi tới (0,5) ---
  const soldierPos = window.centerPct(0, 6);
  const soldierEl = [...doc.querySelectorAll('.piece')].find(e => Math.abs(parseFloat(e.style.top) - soldierPos.top) < 0.2 && Math.abs(parseFloat(e.style.left) - soldierPos.left) < 0.2);
  check('found soldier element before move', !!soldierEl);
  clickBoard(0, 6);
  await sleep(60);
  check('legal move dots appear after selecting soldier', doc.querySelectorAll('.hl.move, .hl.capture').length >= 1,
    doc.querySelectorAll('.hl').length);
  clickBoard(0, 5);
  await sleep(60);
  check('sliding: same DOM element for the moved piece (persistent element)', !!soldierEl && soldierEl.isConnected);
  check('sliding: element position updated to destination', !!soldierEl && Math.abs(parseFloat(soldierEl.style.top) - window.centerPct(0, 5).top) < 0.2,
    soldierEl && soldierEl.style.top);
  const cssText = require('fs').readFileSync(require('path').join(__dirname, '..', 'style.css'), 'utf8');
  check('sliding: stylesheet animates piece left/top', /\.piece\s*\{[^}]*transition:\s*left \.38s/.test(cssText));
  check('board note announces the last move', $('boardNote').textContent.includes('Nước vừa đi'), $('boardNote').textContent);
  check('move list has 1 entry', $('moveList').children.length === 1, $('moveList').children.length);
  check('banner switches to chess side', $('turnBanner').textContent.includes('Phe Vua'), $('turnBanner').textContent);
  check('still 32 pieces (no capture yet)', doc.querySelectorAll('.piece').length === 32);

  // --- Đi lại (undo) ---
  $('undoBtn').click();
  await sleep(60);
  check('undo empties move list', $('moveList').children.length === 0);
  check('banner back to xiangqi after undo', $('turnBanner').textContent.includes('Phe Tướng'));

  // --- Ván 2: chế độ AI, cả hai chọn bàn ô vuông ---
  $('newGameBtn').click();
  await sleep(60);
  const aiRadio = doc.querySelector('input[name="mode"][value="ai"]');
  aiRadio.checked = true;
  aiRadio.dispatchEvent(new window.Event('change', { bubbles: true }));
  $('skinP1').value = 'squares'; $('skinP2').value = 'squares';
  $('myArmy').value = 'chess'; // người cầm Vua, máy cầm Tướng đi trước
  $('startBtn').click();
  await sleep(1200); // máy (phe Tướng) tự đi sau ~420ms
  check('AI mode: AI made the first move', $('moveList').children.length === 1, $('moveList').children.length);
  check('AI mode: banner now waits for player (Bạn)', $('turnBanner').textContent.includes('Bạn'), $('turnBanner').textContent);

  // --- Ván 3: skin vạch kẻ / giao điểm ---
  $('newGameBtn').click();
  await sleep(60);
  const hsRadio = doc.querySelector('input[name="mode"][value="hotseat"]');
  hsRadio.checked = true;
  hsRadio.dispatchEvent(new window.Event('change', { bubbles: true }));
  $('skinP1').value = 'lines'; $('skinP2').value = 'lines';
  $('startBtn').click();
  await sleep(400);
  check('lines skin applied to board', $('board').className.includes('skin-lines'), $('board').className);
  check('lines skin still renders 32 pieces', doc.querySelectorAll('.piece').length === 32);
  const bg = $('boardBg').innerHTML;
  check('lines skin draws intersection grid + river text', bg.includes('楚河') && bg.includes('<line'), bg.slice(0, 80));

  // ================= GIAI ĐOẠN 3: LUẬT BỔ TRỢ TRÊN GIAO DIỆN =================
  const setRadio = (name, value) => {
    const r = doc.querySelector(`input[name="${name}"][value="${value}"]`);
    r.checked = true; r.dispatchEvent(new window.Event('change', { bubbles: true }));
  };

  // --- Mục luật chỉ hiện ở trận lai ---
  $('newGameBtn').click();
  await sleep(60);
  check('rules box visible in hybrid matchup', !$('rulesBox').hidden);
  setRadio('mode', 'ai');
  $('myArmy').value = 'chess'; $('myArmy').dispatchEvent(new window.Event('change', { bubbles: true }));
  $('oppArmy').value = 'chess'; $('oppArmy').dispatchEvent(new window.Event('change', { bubbles: true }));
  check('rules box hidden in mirror matchup', $('rulesBox').hidden);
  $('oppArmy').value = 'auto'; $('oppArmy').dispatchEvent(new window.Event('change', { bubbles: true }));
  check('rules box back when hybrid again', !$('rulesBox').hidden);
  setRadio('mode', 'hotseat');

  // --- Preset Đề xuất: thanh luật + bộ đếm hiện trong ván ---
  setRadio('rulesPreset', 'suggested');
  $('skinP1').value = 'squares'; $('skinP2').value = 'squares';
  $('startBtn').click();
  await sleep(300);
  check('suggested preset: rules bar visible', !$('rulesBar').hidden);
  check('rules line lists Du kich + Giu thanh + Hau can', $('rulesLine').textContent.includes('Du kích')
    && $('rulesLine').textContent.includes('Giữ thành') && $('rulesLine').textContent.includes('Hậu cần có hạn'),
    $('rulesLine').textContent);
  check('guerrilla counter shows 0/3', !$('guerrillaCounter').hidden && $('guerrillaCounter').textContent.includes('0/3'),
    $('guerrillaCounter').textContent);
  check('promotion pool chip shows empty pool', !$('promoPool').hidden && $('promoPool').textContent.includes('trống'),
    $('promoPool').textContent);

  // --- Preset Bản gốc: không hiện bất cứ thứ gì thêm (giống v0.1.1) ---
  $('newGameBtn').click();
  await sleep(60);
  setRadio('rulesPreset', 'original');
  $('startBtn').click();
  await sleep(300);
  check('original preset: rules bar hidden', $('rulesBar').hidden);

  // --- Thế cờ dựng sẵn qua applyRemoteState (dùng chung đường đồng bộ của online) ---
  const CP = (id, army, kind, side, x, y) => ({ id, army, kind, side, x, y });
  const craftState = board => ({
    skin: 'squares', board, history: [], capturedBy: { top: [], bottom: [] },
    lastMove: null, over: false, result: null, lastReason: null,
  });
  const freshCounters = () => ({ xiangqiChecks: 0, chessMoves: 0 });

  // Hộp phong cấp chỉ hiện quân có trong kho (chỉ Xe)
  const promoBoardState = {
    armies: { top: 'xiangqi', bottom: 'chess' },
    pieces: [CP('g1', 'xiangqi', 'general', 'top', 3, 0), CP('c1', 'xiangqi', 'chariot', 'top', 0, 5),
      CP('k1', 'chess', 'king', 'bottom', 4, 9), CP('p1', 'chess', 'pawn', 'bottom', 0, 1)],
    turn: 'bottom',
    rules: { ...window.Engine.DEFAULT_RULES, promoteOnlyCaptured: true },
    counters: freshCounters(), posHistory: [], moveFlags: [], capturedChess: ['rook'],
  };
  window.applyRemoteState(craftState(JSON.parse(JSON.stringify(promoBoardState))), null);
  await sleep(100);
  clickBoard(0, 1);
  await sleep(60);
  clickBoard(0, 0);
  await sleep(60);
  check('promotion modal opens', !$('promoModal').hidden);
  const visiblePromos = [...doc.querySelectorAll('[data-promo]')].filter(b => !b.hidden).map(b => b.dataset.promo);
  check('promotion modal only offers pieces in the pool (rook)', JSON.stringify(visiblePromos) === '["rook"]', JSON.stringify(visiblePromos));
  doc.querySelector('[data-promo="rook"]').click();
  await sleep(500);
  check('promotion modal closes after choosing', $('promoModal').hidden);
  const promotedPos = window.centerPct(0, 0);
  const promotedEl = [...doc.querySelectorAll('.piece')].find(e => Math.abs(parseFloat(e.style.top) - promotedPos.top) < 0.2 && Math.abs(parseFloat(e.style.left) - promotedPos.left) < 0.2);
  check('pawn promoted to rook glyph (with text variation selector)', !!promotedEl && promotedEl.textContent === '♖\uFE0E', promotedEl && JSON.stringify(promotedEl.textContent));
  check('pool chip back to empty after promotion', $('promoPool').textContent.includes('trống'), $('promoPool').textContent);

  // Thắng Du kích: thông báo đúng reason + dòng vinh danh + biên bản ghi luật và mã lý do
  const guerrillaState = {
    armies: { top: 'chess', bottom: 'xiangqi' },
    pieces: [CP('k2', 'chess', 'king', 'top', 4, 0), CP('g2', 'xiangqi', 'general', 'bottom', 3, 9),
      CP('c2', 'xiangqi', 'chariot', 'bottom', 0, 5)],
    turn: 'bottom',
    rules: { ...window.Engine.DEFAULT_RULES, guerrillaChecks: 1 },
    counters: freshCounters(), posHistory: [], moveFlags: [], capturedChess: [],
  };
  window.applyRemoteState(craftState(JSON.parse(JSON.stringify(guerrillaState))), null);
  await sleep(100);
  clickBoard(0, 5);
  await sleep(60);
  clickBoard(0, 0);
  await sleep(150);
  check('guerrilla win: end modal shows', !$('endModal').hidden);
  check('end text names the Du kich rule', $('endText').textContent.includes('Du kích'), $('endText').textContent);
  check('honor ribbon shows for the underdog win', !$('endHonor').hidden && $('endHonor').textContent.includes('giáo mác thắng súng đạn'), $('endHonor').textContent);
  check('end title has no emoji, icon is an SVG trophy', $('endTitle').textContent === 'Có người thắng!' && $('endIcon').innerHTML.includes('<svg'), $('endTitle').textContent);
  check('guerrilla counter shows 1/1 after win', $('guerrillaCounter').textContent.includes('1/1'), $('guerrillaCounter').textContent);
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: t => { window.__copied = t; return Promise.resolve(); } },
  });
  $('copyRecordBtn').click();
  await sleep(120);
  check('move record lists active rules', (window.__copied || '').includes('Luật bổ trợ') && (window.__copied || '').includes('Du kích'), window.__copied);
  check('move record includes the end reason code', (window.__copied || '').includes('guerrilla'), window.__copied);

  // ================= SƠN MÀI CUNG ĐÌNH — BƯỚC 1 =================
  {
    const cssText2 = require('fs').readFileSync(require('path').join(__dirname, '..', 'style.css'), 'utf8');
    check('lacquer palette variables declared', cssText2.includes('--nen: #1A0E0B') && cssText2.includes('--vang: #D4A64A')
      && cssText2.includes('--quan-tuong-chu: #A3201B') && cssText2.includes('--song: #5A2A1E'));
    const htmlText = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
    check('google fonts linked (Playfair + Be Vietnam Pro)', htmlText.includes('Playfair+Display') && htmlText.includes('Be+Vietnam+Pro'));
    check('Noto Serif SC subset linked', htmlText.includes('Noto+Serif+SC') && htmlText.includes('text=%E5%B0%87'));
    check('river band element with lacquer text', !!$('riverBand') && $('riverBand').textContent.includes('SỞ HÀ · HÁN GIỚI'));
    // Bước 2 + chỉnh thêm
    check('squares skin river collapses to a gold line', cssText2.includes('.skin-squares #riverBand'));
    check('compact player cards under 720px height', cssText2.includes('@media (max-height: 719px)'));
    check('room code input uses Playfair', cssText2.includes('#roomCodeInput') && cssText2.includes('letter-spacing: 3px'));
    check('promo choices are 56px lacquer cells', cssText2.includes('#promoModal .promo-choices button') && cssText2.includes('width: 56px'));
    check('move record box variable + monospace', cssText2.includes('--hop-ban: #120A08') && cssText2.includes('ui-monospace'));
    check('honor ribbon styled', cssText2.includes('.end-honor'));
    check('coin is an inline SVG, not an emoji', !!doc.querySelector('#coinEl svg'));
    check('copy room code button with aria-label', !!$('copyCodeBtn') && $('copyCodeBtn').getAttribute('aria-label') === 'Sao chép mã phòng');
    check('promo buttons carry FE0E + aria-labels', doc.querySelector('[data-promo="queen"]').textContent.includes('\uFE0E')
      && !!doc.querySelector('[data-promo="queen"]').getAttribute('aria-label'));
  }
  $('newGameBtn').click();
  await sleep(60);
  setRadio('rulesPreset', 'suggested');
  $('startBtn').click();
  await sleep(300);
  check('player cards: Ban (Vua) at bottom / Doi thu (Tuong) at top', $('pcNameBottom').textContent === 'Bạn — Phe Vua' && $('pcNameTop').textContent === 'Đối thủ — Phe Tướng',
    $('pcNameTop').textContent + '/' + $('pcNameBottom').textContent);
  check('card subtitles follow the story', $('pcSubTop').textContent.includes('Giáo mác') && $('pcSubBottom').textContent.includes('Súng đạn'));
  check('avatars show royal glyphs', $('avatarTop').textContent === '帥' && $('avatarBottom').textContent === '♔\uFE0E',
    JSON.stringify($('avatarTop').textContent) + '/' + JSON.stringify($('avatarBottom').textContent));
  check('guerrilla chip lives in the xiangqi card', $('guerrillaCounter').closest('.player-card').id === 'cardTop');
  check('promotion pool chip lives in the chess card', $('promoPool').closest('.player-card').id === 'cardBottom');
  check('active turn card highlighted (xiangqi/top first)', $('cardTop').classList.contains('active') && !$('cardBottom').classList.contains('active'));
  const chessPieceEl = [...doc.querySelectorAll('.piece.chess')][0];
  check('chess glyphs carry the FE0E variation selector', !!chessPieceEl && chessPieceEl.textContent.endsWith('\uFE0E'), chessPieceEl && JSON.stringify(chessPieceEl.textContent));
  clickBoard(0, 3);
  await sleep(60);
  clickBoard(0, 4);
  await sleep(120);
  check('last-move line bolds the move name', !!$('boardNote').querySelector('strong') && $('boardNote').textContent.includes('Nước vừa đi'));

  // Khách online: điều khiển luật bị khóa, chỉ xem
  setRadio('mode', 'online');
  window.applyRemoteState(craftState(JSON.parse(JSON.stringify(guerrillaState))), 'bottom');
  await sleep(100);
  const ruleInputs = [...doc.querySelectorAll('#rulesBox input, #rulesBox select')];
  check('guest: all rule controls disabled', ruleInputs.length > 0 && ruleInputs.every(el => el.disabled));
  check('guest: read-only note visible', !$('rulesGuestNote').hidden);
  check('guest: rules line still shows host rules', $('rulesLine').textContent.includes('Du kích'), $('rulesLine').textContent);
  setRadio('mode', 'hotseat');

  // --- v0.2.3: hành vi online — khách đi ngay, cảnh báo chiếu trên thẻ, trạng thái kết nối ---
  {
    const checkState = {
      armies: { top: 'xiangqi', bottom: 'chess' },
      pieces: [CP('g3', 'xiangqi', 'general', 'top', 3, 0), CP('c3', 'xiangqi', 'chariot', 'top', 4, 5),
        CP('k3', 'chess', 'king', 'bottom', 4, 9), CP('p3', 'chess', 'pawn', 'bottom', 0, 6)],
      turn: 'bottom',
      rules: { ...window.Engine.DEFAULT_RULES },
      counters: freshCounters(), posHistory: [], moveFlags: [], capturedChess: [],
    };
    window.applyRemoteState(craftState(JSON.parse(JSON.stringify(checkState))), 'bottom');
    await sleep(80);
    check('check badge shows on the checked player card', !$('pcCheckBottom').hidden && $('pcCheckBottom').textContent.includes('Đang bị chiếu'));
    check('check badge hidden on the other card', $('pcCheckTop').hidden);
    check('checked royal piece glows (in-check)', [...doc.querySelectorAll('.piece')].some(e => e.classList.contains('in-check')));

    window.eval("G.mode = 'online'; G.online.isHost = false; G.online.started = true; window.__sent = []; G.online.conn = { open: true, send(m) { window.__sent.push(m); } };");
    clickBoard(4, 9);
    await sleep(60);
    clickBoard(5, 9);
    await sleep(80);
    check('guest move applies immediately on own screen', window.eval('G.board.turn') === 'top');
    check('guest move sent to host in background', window.eval('window.__sent.length') === 1 && window.eval('window.__sent[0].type') === 'move');
    check('no waiting-for-host text anywhere', !$('boardNote').textContent.includes('chờ') && !$('boardNote').textContent.includes('xác nhận'),
      $('boardNote').textContent);
    check('check badge clears after escaping check', $('pcCheckBottom').hidden);
    window.eval("G.mode = 'hotseat'; G.online.conn = null;");

    check('conn status hidden by default', $('connStatus').hidden && $('connStatus').textContent.includes('Mất kết nối, đang thử lại'));
    window.eval('showConnStatus()');
    check('conn status appears only on disconnect', !$('connStatus').hidden);
    window.eval('hideConnStatus()');
    check('conn status hides again when reconnected', $('connStatus').hidden);
    const css3 = require('fs').readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
    check('css has check badge + conn status styles', css3.includes('.pc-check') && css3.includes('.conn-status'));
  }

  // ================= v0.2.1: KIỂM TRA CSS MOBILE =================
  {
    const css = require('fs').readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
    check('css has mobile breakpoint 720px', css.includes('@media (max-width: 720px)'));
    check('mobile: board sized by viewport height (dvh)', css.includes('100dvh'));
    check('mobile: touch targets at least 44px', css.includes('min-height: 44px'));
    check('mobile: form inputs 16px (no iOS auto-zoom)', css.includes('font-size: 16px'));
    check('landscape phones: dedicated media query', css.includes('orientation: landscape'));
    check('viewport meta present', doc.querySelector('meta[name="viewport"]') !== null);
  }

  // --- v0.2.3 bổ sung: vòng đời CHỦ PHÒNG — đi ngay ở mọi thời điểm, isHost không bao giờ bị lật ---
  {
    class FakeConn {
      constructor() { this.handlers = {}; this.sent = []; this.open = true; }
      on(ev, cb) { this.handlers[ev] = cb; }
      emit(ev, arg) { if (this.handlers[ev]) this.handlers[ev](arg); }
      send(m) { this.sent.push(m); }
    }
    class FakePeer {
      constructor(id) { this.id = id; this.handlers = {}; window.__hostPeer = this; }
      on(ev, cb) { this.handlers[ev] = cb; }
      emit(ev, arg) { if (this.handlers[ev]) this.handlers[ev](arg); }
      reconnect() {}
      destroy() {}
    }
    window.Peer = FakePeer;
    // Click theo tọa độ ENGINE (đã tính cả lật bàn qua centerPct)
    const clickCanonical = (x, y) => {
      const c = window.centerPct(x, y);
      $('board').dispatchEvent(new window.MouseEvent('click', { bubbles: true, clientX: c.left / 100 * 900, clientY: c.top / 100 * 1000 }));
    };
    setRadio('mode', 'online');
    $('hostArmy').value = 'xiangqi';
    $('mySkinOnline').value = 'squares';
    $('createRoomBtn').click();
    await sleep(80);
    const peer = window.__hostPeer;
    check('host: room created with a peer', !!peer);
    peer.emit('open', 'cvvct-test');
    check('host: isHost true after creating room', window.eval('G.online.isHost') === true);
    const conn = new FakeConn();
    peer.emit('connection', conn);
    conn.emit('open');
    conn.emit('data', { type: 'hello', skinPref: 'squares', version: 'v0.0.0-old' });
    await sleep(50);
    check('host: outdated guest version is reported, game not started',
      $('onlineStatus').textContent.includes('phiên bản khác') && window.eval('G.online.started') === false,
      $('onlineStatus').textContent);
    check('host: outdated guest is told via versionMismatch', conn.sent.some(m => m.type === 'versionMismatch'));
    conn.emit('data', { type: 'hello', skinPref: 'squares', version: window.eval('VERSION') });
    await sleep(80);
    check('host: game started in the room', !$('gameScreen').hidden && window.eval('G.online.started') === true);
    check('host: initial state broadcast to guest', conn.sent.some(m => m.type === 'state'));
    check('host view: host (Tuong/top) flipped to bottom', window.eval('G.viewBottom') === 'top' && window.centerPct(4, 0).top > 50);
    check('host view: own card at bottom, online rival at top',
      $('pcNameBottom').textContent === 'Bạn — Phe Tướng' && $('pcNameTop').textContent === 'Đối thủ (online) — Phe Vua',
      $('pcNameBottom').textContent + '/' + $('pcNameTop').textContent);
    clickCanonical(0, 3);
    await sleep(50);
    clickCanonical(0, 4);
    await sleep(80);
    check('host: first move applies immediately', window.eval('G.history.length') === 1 && window.eval('G.board.turn') === 'bottom',
      window.eval('JSON.stringify(G.history.length)'));
    check('host: no confirmation-wait text after own move', !$('boardNote').textContent.includes('xác nhận'), $('boardNote').textContent);
    check('host: isHost still true after own move', window.eval('G.online.isHost') === true);
    conn.emit('data', { type: 'move', move: { fx: 0, fy: 8, tx: 0, ty: 7 } });
    await sleep(80);
    check('host: guest move applied, turn returns', window.eval('G.history.length') === 2 && window.eval('G.board.turn') === 'top');
    conn.emit('data', { type: 'hello', skinPref: 'squares', version: window.eval('VERSION') });
    await sleep(50);
    check('host: duplicate hello does not reset the running game', window.eval('G.history.length') === 2);
    check('host: isHost still true after guest reconnect-hello', window.eval('G.online.isHost') === true);
    conn.emit('data', { type: 'resign' });
    await sleep(80);
    check('host: end modal shows after guest resigns', !$('endModal').hidden && window.eval('G.over') === true);
    $('endSetupBtn').click();
    await sleep(80);
    check('host: new-game button rematches inside the same room', window.eval('G.history.length') === 0 && window.eval('G.over') === false && !$('gameScreen').hidden);
    check('host: rematch state broadcast to guest', conn.sent.filter(m => m.type === 'state').length >= 3);
    check('host: isHost still true after rematch', window.eval('G.online.isHost') === true);
    check('host: rematch keeps the flipped view', window.eval('G.viewBottom') === 'top');
    clickCanonical(0, 3);
    await sleep(50);
    clickCanonical(0, 4);
    await sleep(80);
    check('host: moves immediately in the rematch game', window.eval('G.history.length') === 1);
    check('host: isHost true at the end of the lifecycle', window.eval('G.online.isHost') === true);
    window.eval("G.mode = 'hotseat';");
    setRadio('mode', 'hotseat');
  }

  // --- v0.2.4 LỖI 2: khe sông thật ở skin ô vuông ---
  {
    const svgSq = window.eval("boardSvg('squares')");
    check('squares svg has a real river gap (viewBox 900x1050 + gap)', svgSq.includes('viewBox="0 0 900 1050"') && svgSq.includes('sq-gap'));
    check('river gap carries the river name', svgSq.includes('SỞ HÀ · HÁN GIỚI'));
    check('lines skin svg unchanged', window.eval("boardSvg('lines')").includes('viewBox="0 0 900 1000"'));
    window.eval("G.skin = 'squares'; G.viewBottom = 'bottom';");
    check('geometry: last row above river sits at 42.86%', Math.abs(window.centerPct(0, 4).top - 42.86) < 0.1, window.centerPct(0, 4).top);
    check('geometry: first row below river shifted to 57.14%', Math.abs(window.centerPct(0, 5).top - 57.14) < 0.1, window.centerPct(0, 5).top);
    window.eval("G.skin = 'lines';");
    check('geometry: lines skin stays uniform (55%)', Math.abs(window.centerPct(0, 5).top - 55) < 0.1);
    window.eval("G.viewBottom = 'bottom';");
    const gapState = {
      armies: { top: 'xiangqi', bottom: 'chess' },
      pieces: [CP('g4', 'xiangqi', 'general', 'top', 3, 0), CP('k4', 'chess', 'king', 'bottom', 4, 9),
        CP('s4', 'xiangqi', 'soldier', 'top', 0, 3)],
      turn: 'top',
      rules: { ...window.Engine.DEFAULT_RULES },
      counters: freshCounters(), posHistory: [], moveFlags: [], capturedChess: [],
    };
    window.applyRemoteState(craftState(JSON.parse(JSON.stringify(gapState))), null);
    await sleep(80);
    $('board').dispatchEvent(new window.MouseEvent('click', { bubbles: true, clientX: 50, clientY: 500 }));
    await sleep(50);
    check('clicking into the river gap selects nothing', window.eval('G.selected') === null && doc.querySelectorAll('.hl.move, .hl.capture').length === 0);
    clickBoard(0, 3);
    await sleep(60);
    check('clicking a piece above the river still selects it', window.eval('G.selected') !== null && doc.querySelectorAll('.hl.move, .hl.capture').length >= 1);
    const css4 = require('fs').readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
    check('css: squares board aspect accounts for the gap', css4.includes('.board.skin-squares { aspect-ratio: 6 / 7; }'));
    check('css: html river band hidden on squares skin', css4.includes('.board.skin-squares #riverBand { display: none; }'));
  }

  // --- v0.2.4 ĐỢT B: chọn phe theo người chơi, quân của mình luôn ở dưới ---
  {
    const clickCanonical = (x, y) => {
      const c = window.centerPct(x, y);
      $('board').dispatchEvent(new window.MouseEvent('click', { bubbles: true, clientX: c.left / 100 * 900, clientY: c.top / 100 * 1000 }));
    };
    const flipBoard = {
      armies: { top: 'xiangqi', bottom: 'chess' },
      pieces: [CP('g5', 'xiangqi', 'general', 'top', 4, 0), CP('k5', 'chess', 'king', 'bottom', 4, 9),
        CP('s5', 'xiangqi', 'soldier', 'top', 0, 3)],
      turn: 'top',
      rules: { ...window.Engine.DEFAULT_RULES },
      counters: freshCounters(), posHistory: [], moveFlags: [], capturedChess: [],
    };
    const flipState = skin => ({ ...craftState(JSON.parse(JSON.stringify(flipBoard))), skin });

    // (1) Khách online cầm Tướng (bên trên của engine): bàn lật để Tướng ở dưới, click trúng ô engine
    window.eval("G.mode = 'online';");
    window.applyRemoteState(flipState('squares'), 'top');
    await sleep(80);
    check('flip(squares): viewer army shown at bottom', window.eval('G.viewBottom') === 'top' && window.centerPct(4, 0).top > 50 && window.centerPct(4, 9).top < 50);
    check('flip(squares): cards follow the view', $('pcNameBottom').textContent === 'Bạn — Phe Tướng' && $('pcNameTop').textContent === 'Đối thủ (online) — Phe Vua');
    check('flip(squares): background svg rotated 180', $('boardBg').innerHTML.includes('rotate(180'));
    clickCanonical(0, 3);
    await sleep(60);
    check('flip(squares): click selects the engine square', window.eval('JSON.stringify(G.selected)') === JSON.stringify({ x: 0, y: 3 }),
      window.eval('JSON.stringify(G.selected)'));
    clickCanonical(0, 4);
    await sleep(100);
    check('flip(squares): move lands on the engine square', (window.eval('E.pieceAt(G.board, 0, 4) || {}') || {}).kind === 'soldier' && window.eval('G.history.length') === 1);
    const recordFlipped = $('moveList').innerHTML;

    // (2) Cùng thế cờ nhìn từ hướng ngược lại: biên bản phải giống hệt
    window.eval("G.viewBottom = 'bottom';");
    window.applyRemoteState(flipState('squares'), null);
    await sleep(80);
    clickCanonical(0, 3);
    await sleep(60);
    clickCanonical(0, 4);
    await sleep(100);
    check('record identical from both orientations', $('moveList').innerHTML === recordFlipped);
    check('unflipped: background svg not rotated', !$('boardBg').innerHTML.includes('rotate(180'));

    // (3) Skin vạch kẻ khi lật: click trúng ô engine, quân trượt tới đúng ô hiển thị
    window.eval("G.viewBottom = 'top';");
    window.applyRemoteState(flipState('lines'), null);
    await sleep(80);
    clickCanonical(0, 3);
    await sleep(60);
    clickCanonical(0, 4);
    await sleep(150);
    const movedEl = [...doc.querySelectorAll('.piece')].find(e => Math.abs(parseFloat(e.style.top) - window.centerPct(0, 4).top) < 0.2);
    check('flip(lines): click + slide land on the engine square', window.eval('G.history.length') === 1 && !!movedEl);

    // (4) Luyện với máy: người cầm Vua ở dưới, máy cầm Tướng đi trước
    window.eval("G.viewBottom = 'bottom';");
    setRadio('mode', 'ai');
    $('myArmy').value = 'chess'; $('myArmy').dispatchEvent(new window.Event('change', { bubbles: true }));
    $('oppArmy').value = 'auto'; $('oppArmy').dispatchEvent(new window.Event('change', { bubbles: true }));
    $('skinP1').value = 'squares'; $('skinP2').value = 'squares';
    $('startBtn').click();
    await sleep(150);
    check('ai: human chess at bottom, ai xiangqi on top', window.eval('G.board.armies.bottom') === 'chess' && window.eval('G.board.armies.top') === 'xiangqi');
    check('ai: cards name the machine', $('pcNameTop').textContent === 'Máy — Phe Tướng' && $('pcNameBottom').textContent === 'Bạn — Phe Vua');
    await sleep(700);
    check('ai: xiangqi (machine) moves first', window.eval('G.history.length') === 1 && window.eval('G.board.turn') === 'bottom',
      window.eval('JSON.stringify(G.history.length)'));

    // (5) Trận gương với máy: cả hai cùng Tướng, quân của người vẫn ở dưới
    $('newGameBtn').click();
    await sleep(60);
    $('myArmy').value = 'xiangqi'; $('myArmy').dispatchEvent(new window.Event('change', { bubbles: true }));
    $('oppArmy').value = 'xiangqi'; $('oppArmy').dispatchEvent(new window.Event('change', { bubbles: true }));
    $('startBtn').click();
    await sleep(200);
    check('ai mirror: both armies xiangqi, no supplementary rules', window.eval('G.board.armies.bottom') === 'xiangqi' && window.eval('G.board.armies.top') === 'xiangqi' && $('rulesBar').hidden === true);
    check('ai mirror: human army displayed at bottom', window.centerPct(4, 9).top > 50 && window.eval('G.viewBottom') === 'bottom');

    // (6) Cùng máy + tự xoay bàn theo lượt: bên sắp đi luôn ở dưới
    $('newGameBtn').click();
    await sleep(60);
    setRadio('mode', 'hotseat');
    $('myArmy').value = 'chess'; $('myArmy').dispatchEvent(new window.Event('change', { bubbles: true }));
    $('flipPerTurn').checked = true;
    $('startBtn').click();
    await sleep(200);
    check('hotseat auto-flip: side to move (xiangqi) at bottom', window.eval('G.viewBottom') === 'top');
    clickCanonical(0, 3);
    await sleep(60);
    clickCanonical(0, 4);
    await sleep(120);
    check('hotseat auto-flip: board rotates after the move', window.eval('G.viewBottom') === 'bottom' && window.eval('G.history.length') === 1);
    $('flipPerTurn').checked = false;
    window.eval("G.mode = 'hotseat';");
  }

  // --- v0.2.4 chỉnh cuối: tên phe tuyệt đối (không "bên trên/dưới") + glyph đứng thẳng khi lật bàn ---
  {
    check('side names are absolute (Phe Tuong / Phe Vua), no positional wording',
      window.eval("sideName('top')").includes('Phe') && !/bên (trên|dưới)/.test(window.eval("sideName('top') + '|' + sideName('bottom')")),
      window.eval("sideName('top') + '|' + sideName('bottom')"));
    const visibleTexts = [$('turnBanner').textContent, $('boardNote').textContent, $('moveList').textContent,
      ...[...doc.querySelectorAll('.piece')].map(e => e.title || '')].join(' ');
    check('no "ben tren/ben duoi" in any visible game text', !/bên (trên|dưới)/.test(visibleTexts));
    const uprightState = {
      armies: { top: 'xiangqi', bottom: 'chess' },
      pieces: [CP('g6', 'xiangqi', 'general', 'top', 4, 0), CP('k6', 'chess', 'king', 'bottom', 4, 9),
        CP('c6', 'xiangqi', 'cannon', 'top', 1, 2), CP('q6', 'chess', 'queen', 'bottom', 3, 9)],
      turn: 'top',
      rules: { ...window.Engine.DEFAULT_RULES },
      counters: freshCounters(), posHistory: [], moveFlags: [], capturedChess: [],
    };
    window.eval("G.mode = 'online';");
    window.applyRemoteState(craftState(JSON.parse(JSON.stringify(uprightState))), 'top'); // bị lật: top ở dưới
    await sleep(80);
    check('flipped: board background is rotated', $('boardBg').innerHTML.includes('rotate(180'));
    check('flipped: NO piece element is rotated (glyphs stay upright)',
      ![...doc.querySelectorAll('.piece')].some(e => (e.style.transform || '').includes('rotate')));
    check('flipped: river text stays outside the rotated group (upright)',
      (() => { const s = window.eval("boardSvg('squares', true)"); return s.indexOf('SỞ HÀ') > s.indexOf('</g>'); })());
    window.eval("G.mode = 'hotseat'; G.viewBottom = 'bottom';");
  }

  console.log(failures === 0 ? '\nALL UI TESTS PASSED' : `\n${failures} UI TEST(S) FAILED`);
  window.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('UI TEST ERROR', e); process.exit(2); });
