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
  check('xiangqi tokens on top', doc.querySelectorAll('.piece.xiangqi.side-top').length === 16);
  check('chess pieces at bottom', doc.querySelectorAll('.piece.chess.side-bottom').length === 16);
  check('banner: xiangqi turn first', $('turnBanner').textContent.includes('Cờ tướng'), $('turnBanner').textContent);

  // --- Đi thử một nước Chốt: chọn chốt ở (0,3) rồi đi tới (0,4) ---
  const soldierEl = [...doc.querySelectorAll('.piece')].find(e => Math.abs(parseFloat(e.style.top) - 35) < 0.2 && Math.abs(parseFloat(e.style.left) - 5.56) < 0.2);
  check('found soldier element before move', !!soldierEl);
  clickBoard(0, 3);
  await sleep(60);
  check('legal move dots appear after selecting soldier', doc.querySelectorAll('.hl.move, .hl.capture').length >= 1,
    doc.querySelectorAll('.hl').length);
  clickBoard(0, 4);
  await sleep(60);
  check('sliding: same DOM element for the moved piece (persistent element)', !!soldierEl && soldierEl.isConnected);
  check('sliding: element position updated to destination (top 45%)', !!soldierEl && Math.abs(parseFloat(soldierEl.style.top) - 45) < 0.2,
    soldierEl && soldierEl.style.top);
  const cssText = require('fs').readFileSync(require('path').join(__dirname, '..', 'style.css'), 'utf8');
  check('sliding: stylesheet animates piece left/top', /\.piece\s*\{[^}]*transition:\s*left \.38s/.test(cssText));
  check('board note announces the last move', $('boardNote').textContent.includes('Nước vừa đi'), $('boardNote').textContent);
  check('move list has 1 entry', $('moveList').children.length === 1, $('moveList').children.length);
  check('banner switches to chess side', $('turnBanner').textContent.includes('Cờ vua'), $('turnBanner').textContent);
  check('still 32 pieces (no capture yet)', doc.querySelectorAll('.piece').length === 32);

  // --- Đi lại (undo) ---
  $('undoBtn').click();
  await sleep(60);
  check('undo empties move list', $('moveList').children.length === 0);
  check('banner back to xiangqi after undo', $('turnBanner').textContent.includes('Cờ tướng'));

  // --- Ván 2: chế độ AI, cả hai chọn bàn ô vuông ---
  $('newGameBtn').click();
  await sleep(60);
  const aiRadio = doc.querySelector('input[name="mode"][value="ai"]');
  aiRadio.checked = true;
  aiRadio.dispatchEvent(new window.Event('change', { bubbles: true }));
  $('skinP1').value = 'squares'; $('skinP2').value = 'squares';
  $('startBtn').click();
  await sleep(1200); // máy (bên trên = cờ tướng) tự đi sau ~420ms
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
  $('topArmy').value = 'chess'; $('topArmy').dispatchEvent(new window.Event('change', { bubbles: true }));
  check('rules box hidden in mirror matchup', $('rulesBox').hidden);
  $('topArmy').value = 'xiangqi'; $('topArmy').dispatchEvent(new window.Event('change', { bubbles: true }));
  check('rules box back when hybrid again', !$('rulesBox').hidden);

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
  const promotedEl = [...doc.querySelectorAll('.piece')].find(e => Math.abs(parseFloat(e.style.top) - 5) < 0.2 && Math.abs(parseFloat(e.style.left) - 5.56) < 0.2);
  check('pawn promoted to rook glyph', !!promotedEl && promotedEl.textContent === '♖', promotedEl && promotedEl.textContent);
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
  check('end text has the underdog honor line', $('endText').textContent.includes('giáo mác thắng súng đạn'), $('endText').textContent);
  check('guerrilla counter shows 1/1 after win', $('guerrillaCounter').textContent.includes('1/1'), $('guerrillaCounter').textContent);
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText: t => { window.__copied = t; return Promise.resolve(); } },
  });
  $('copyRecordBtn').click();
  await sleep(120);
  check('move record lists active rules', (window.__copied || '').includes('Luật bổ trợ') && (window.__copied || '').includes('Du kích'), window.__copied);
  check('move record includes the end reason code', (window.__copied || '').includes('guerrilla'), window.__copied);

  // Khách online: điều khiển luật bị khóa, chỉ xem
  setRadio('mode', 'online');
  window.applyRemoteState(craftState(JSON.parse(JSON.stringify(guerrillaState))), 'bottom');
  await sleep(100);
  const ruleInputs = [...doc.querySelectorAll('#rulesBox input, #rulesBox select')];
  check('guest: all rule controls disabled', ruleInputs.length > 0 && ruleInputs.every(el => el.disabled));
  check('guest: read-only note visible', !$('rulesGuestNote').hidden);
  check('guest: rules line still shows host rules', $('rulesLine').textContent.includes('Du kích'), $('rulesLine').textContent);
  setRadio('mode', 'hotseat');

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

  console.log(failures === 0 ? '\nALL UI TESTS PASSED' : `\n${failures} UI TEST(S) FAILED`);
  window.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('UI TEST ERROR', e); process.exit(2); });
