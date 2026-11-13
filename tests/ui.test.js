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

  console.log(failures === 0 ? '\nALL UI TESTS PASSED' : `\n${failures} UI TEST(S) FAILED`);
  window.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('UI TEST ERROR', e); process.exit(2); });
