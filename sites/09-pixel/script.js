/* ============================================================
   像素方糖 ARCADE BIT · 交互脚本（纯原生 JS，无依赖）
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 8-bit 音效引擎（WebAudio） ---------- */
  var AudioFX = (function () {
    var ctx = null;
    var unlocked = false;

    function ensureCtx() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    /* 播放一个矩形波 beep */
    function beep(freq, duration, type, vol) {
      var c = ensureCtx();
      if (!c) return;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.12, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    }

    /* 经典"投币"音：两声下行的哔哔 */
    function coin() {
      beep(987, 0.08, 'square', 0.12);
      setTimeout(function () { beep(659, 0.12, 'square', 0.12); }, 90);
    }

    /* 选择音：单声短哔 */
    function select() {
      beep(440, 0.06, 'square', 0.09);
    }

    /* 确认/开始音：上行琶音 */
    function confirm() {
      beep(523, 0.09, 'square', 0.12);
      setTimeout(function () { beep(659, 0.09, 'square', 0.12); }, 100);
      setTimeout(function () { beep(784, 0.14, 'square', 0.12); }, 200);
    }

    /* 彩蛋音：快速高频抖动 */
    function powerUp() {
      var notes = [880, 1046, 1318, 1568, 2093];
      notes.forEach(function (n, i) {
        setTimeout(function () { beep(n, 0.09, 'square', 0.11); }, i * 80);
      });
    }

    /* 错误音：低频"嗡嗡" */
    function error() {
      beep(196, 0.2, 'sawtooth', 0.08);
      setTimeout(function () { beep(147, 0.25, 'sawtooth', 0.08); }, 220);
    }

    /* 首次交互解锁音频（浏览器自动播放策略） */
    function unlock() {
      if (unlocked) return;
      unlocked = true;
      ensureCtx();
      beep(220, 0.03, 'square', 0.02);
    }

    return { beep: beep, coin: coin, select: select, confirm: confirm, powerUp: powerUp, error: error, unlock: unlock };
  })();

  /* ---------- Toast（8-bit 弹窗） ---------- */
  var toastEl = null;

  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2200);
  }

  /* Toast 样式注入（保持 CSS 全在一个文件里的要求，动态补充） */
  var toastStyle = document.createElement('style');
  toastStyle.textContent =
    '.toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,30px);z-index:500;' +
    'background:var(--yellow, #ffb900);color:#000;font-family:var(--font-title,"Press Start 2P");' +
    'font-size:11px;padding:14px 16px;box-shadow:0 0 0 4px #000,0 0 0 8px #fff;' +
    'opacity:0;pointer-events:none;transition:opacity .15s steps(3),transform .15s steps(3);text-align:center;max-width:90vw}' +
    '.toast.show{opacity:1;transform:translate(-50%,0)}';
  document.head.appendChild(toastStyle);

  /* ---------- 音频解锁（首次任意交互） ---------- */
  document.addEventListener('pointerdown', AudioFX.unlock, { once: true });
  document.addEventListener('keydown', AudioFX.unlock, { once: true });
  document.addEventListener('click', function () {
    if (!AudioFX._unlocked) AudioFX.unlock();
  });

  /* ---------- 全局 beep 按钮（[data-beep]） ---------- */
  document.querySelectorAll('[data-beep]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      AudioFX.select();
    });
  });

  /* ---------- 投币 & 开始游戏 ---------- */
  var coinBtn = document.querySelector('.hero-actions .coin-btn');
  if (coinBtn) {
    coinBtn.addEventListener('click', function () {
      AudioFX.coin();
      showToast('◆ 叮—— 收到硬币 1 枚，请开始游戏');
    });
  }

  document.querySelectorAll('[data-start]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var game = btn.getAttribute('data-start');
      AudioFX.confirm();
      showToast('▶ 正在读取卡带……《' + game + '》 LOADING 请稍候');
    });
  });

  /* 投币区大按钮（底部 CTA） */
  document.querySelectorAll('.cta-coin').forEach(function (btn) {
    btn.addEventListener('click', function () {
      AudioFX.coin();
      showToast('★ 投入一枚硬币！现在选个游戏吧');
    });
  });

  /* ---------- 移动端导航 ---------- */
  var navToggle = document.querySelector('.nav-toggle');
  var siteNav = document.getElementById('site-nav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var open = siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
      AudioFX.select();
    });

    siteNav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- 高分榜：进入视野时分数滚动 ---------- */
  var scoreEls = document.querySelectorAll('.score-points');
  if ('IntersectionObserver' in window && scoreEls.length) {
    var scoreObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('ticking');
          var note = document.getElementById('score-note');
          if (note) note.textContent = '◆ 读取排行榜中……TOP 5 已就绪';
          setTimeout(function () {
            if (note) note.textContent = '';
          }, 1800);
          scoreObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    scoreEls.forEach(function (el) { scoreObs.observe(el); });
  }

  /* ---------- 秘技系统 ---------- */
  var cheatCodes = {
    KONAMI: {
      text: '你按下了传说中的指令！隐藏图层已解锁——画面开始"反色"。按一次关掉，再按一次打开。',
      action: function () {
        document.body.classList.toggle('egg-mode');
        AudioFX.powerUp();
      }
    },
    XIANGLUO: {
      text: '香螺快跑！整条街的像素香螺都醒来了，好在它们只是可爱。隐藏皮肤已发放。',
      action: function () { AudioFX.confirm(); }
    },
    '1UP': {
      text: '+1 条命已放入你的口袋。生命值充足，可以放心从最高的砖块上跳下去。',
      action: function () { AudioFX.powerUp(); }
    }
  };

  var cheatForm = document.getElementById('cheat-form');
  var cheatInput = document.getElementById('cheat-input');
  var cheatDisplay = document.getElementById('cheat-display');
  var cheatResult = document.getElementById('cheat-result');
  var cheatFail = document.getElementById('cheat-fail');
  var resultText = cheatResult ? cheatResult.querySelector('.cheat-result-text') : null;

  function updateDisplay(str) {
    if (!cheatDisplay) return;
    var line = 'READY .........';
    if (str) line = '>> ' + str + Array(Math.max(1, 10 - str.length)).join('_');
    cheatDisplay.textContent = line;
  }

  function resetPanels() {
    if (cheatResult) cheatResult.hidden = true;
    if (cheatFail) cheatFail.hidden = true;
  }

  if (cheatForm && cheatInput) {
    cheatInput.addEventListener('input', function () {
      updateDisplay(cheatInput.value.trim().toUpperCase());
    });

    cheatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var code = cheatInput.value.trim().toUpperCase();
      if (!code) {
        updateDisplay('');
        if (cheatDisplay) cheatDisplay.textContent = '……至少输入点什么吧';
        return;
      }

      if (Object.prototype.hasOwnProperty.call(cheatCodes, code)) {
        resetPanels();
        var hit = cheatCodes[code];
        if (cheatResult) cheatResult.hidden = false;
        if (resultText) resultText.textContent = hit.text;
        hit.action();
        updateDisplay('CHEAT OK!');
        if (cheatInput) cheatInput.value = '';
      } else {
        AudioFX.error();
        resetPanels();
        if (cheatFail) cheatFail.hidden = false;
        updateDisplay('WRONG! RETRY');
        if (cheatInput) cheatInput.value = '';
      }
    });

    /* 快速填充标签 */
    document.querySelectorAll('[data-cheat-fill]').forEach(function (tag) {
      tag.addEventListener('click', function () {
        cheatInput.value = tag.getAttribute('data-cheat-fill');
        updateDisplay(cheatInput.value);
        AudioFX.select();
        cheatInput.focus();
      });
    });
  }

  /* 再放一次 */
  var replayBtn = document.getElementById('cheat-replay');
  if (replayBtn && cheatResult) {
    replayBtn.addEventListener('click', function () {
      AudioFX.confirm();
      cheatResult.classList.remove('playing');
      void cheatResult.offsetWidth;
      cheatResult.classList.add('playing');
    });
  }

  /* ---------- 隐藏彩蛋：全页监听科乐美指令 ---------- */
  var konamiSeq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var keyBuffer = [];

  document.addEventListener('keydown', function (e) {
    /* 秘技输入框内不干扰打字 */
    if (e.target && e.target.tagName === 'INPUT') return;

    var key = e.key;
    var target = konamiSeq[keyBuffer.length];
    if (key.length === 1) key = key.toLowerCase();

    if (key === target) {
      keyBuffer.push(key);
      if (keyBuffer.length === konamiSeq.length) {
        keyBuffer = [];
        document.body.classList.toggle('egg-mode');
        AudioFX.powerUp();
        showToast('🎉 科乐美指令生效！隐藏图层已解锁');
      }
    } else {
      keyBuffer = [];
      if (key === konamiSeq[0]) keyBuffer.push(key);
    }
  });

  /* ---------- 玩家名牌闪烁（点缀） ---------- */
  var firstName = document.querySelector('.score-name');
  if (firstName) {
    setInterval(function () {
      var active = document.querySelector('.score-row-1 .score-name');
      if (active) active.style.color = active.style.color === 'var(--yellow)' ? 'var(--white)' : 'var(--yellow)';
    }, 500);
  }

  /* ---------- 暴露音效引擎给游戏模块 ---------- */
  window.ArcadeFX = AudioFX;
})();

/* ============================================================
   街机游戏舱：星穹入侵者（可玩的太空射击）
   纯 Canvas 像素渲染 + 原生 JS，无依赖
   ============================================================ */
(function () {
  'use strict';

  var FX = window.ArcadeFX || {
    beep: function () {}, coin: function () {}, select: function () {},
    confirm: function () {}, powerUp: function () {}, error: function () {}, unlock: function () {}
  };

  var cabinet = document.getElementById('arcadeCabinet');
  var canvas = document.getElementById('gameCanvas');
  if (!cabinet || !canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var W = 320, H = 240;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HI_KEY = 'arcadebit-hi-score';

  /* localStorage 兜底（隐私模式等场景可能抛错） */
  var store = (function () {
    try {
      var t = '__arcade_t';
      localStorage.setItem(t, '1');
      localStorage.removeItem(t);
      return localStorage;
    } catch (e) {
      var mem = {};
      return {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); }
      };
    }
  })();
  var hi = parseInt(store.getItem(HI_KEY) || '0', 10) || 0;

  /* HUD 元素 */
  var hudScore = document.getElementById('hudScore');
  var hudHi = document.getElementById('hudHi');
  var hudWave = document.getElementById('hudWave');
  var hudLives = document.getElementById('hudLives');
  var cabinetStatus = document.getElementById('cabinetStatus');

  /* ---------- 精灵定义：字符画 → 像素块 ---------- */
  var SPRITES = {
    a: { c: '#0c9c23', g: ['.##.##', '#.#.#.', '######', '##..##', '.#..#.'] },
    b: { c: '#e52521', g: ['..#...', '.#.#..', '######', '##..##'] },
    c: { c: '#8359a3', g: ['..##..', '.###..', '######', '##..##', '#.##.#'] }
  };
  var CELL = 4;

  function drawSprite(spr, x, y) {
    ctx.fillStyle = spr.c;
    for (var r = 0; r < spr.g.length; r++) {
      var row = spr.g[r];
      for (var ci = 0; ci < row.length; ci++) {
        if (row.charAt(ci) === '#') ctx.fillRect(x + ci * CELL, y + r * CELL, CELL, CELL);
      }
    }
  }

  /* ---------- 常量与状态 ---------- */
  var ROWS = 4, COLS = 5;
  var ROW_TYPES = [['a', 30], ['a', 30], ['b', 20], ['c', 10]];
  var EN_W = 24, EN_H = 20;
  var EN_X_GAP = 30, EN_Y_GAP = 26;
  var SHOT_CD = 280;
  var PLAYER_SPD = 175;
  var BULLET_SPD = 260;

  var state = 'idle'; // idle | ready | playing | paused | gameover
  var score = 0, lives = 3, wave = 1;
  var player = { x: 0, y: 214, w: 24, h: 14, inv: 0 };
  var bullets = [];
  var eBullets = [];
  var enemies = [];
  var keys = { left: false, right: false, fire: false };
  var fleet = { dir: 1, stepY: 14, speed: 26 };
  var lastShot = 0;
  var loopId = 0;
  var lastT = 0;
  var readyLeft = 0;
  var waveMsg = 0;
  var ended = false;
  var lastNewRecord = false;
  var stars = [];

  function makeStars() {
    stars = [];
    for (var i = 0; i < 42; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() < 0.25 ? 2 : 1, tw: 4000 + Math.random() * 6000 });
    }
  }
  makeStars();

  function initFleet(w) {
    enemies = [];
    var gridW = COLS * EN_X_GAP - 6;
    var startX = (W - gridW) / 2;
    var startY = 40;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var t = ROW_TYPES[r];
        enemies.push({
          x: startX + c * EN_X_GAP,
          y: startY + r * EN_Y_GAP,
          w: EN_W, h: EN_H,
          spr: SPRITES[t[0]], pts: t[1],
          row: r, col: c
        });
      }
    }
    fleet.dir = 1;
    fleet.speed = 26 + (w - 1) * 8;
  }

  function resetPlayer() { player.x = (W - player.w) / 2; player.inv = 0; }

  function waveStr() { return ('0' + Math.min(wave, 99)).slice(-2); }
  function fmt(n) { return String(n).padStart(6, '0'); }

  function updateHud() {
    if (hudScore) hudScore.textContent = fmt(score);
    if (hudHi) hudHi.textContent = fmt(Math.max(hi, score));
    if (hudWave) hudWave.textContent = waveStr();
    if (hudLives) hudLives.textContent = '×' + lives;
  }

  function setStatus(t) { if (cabinetStatus) cabinetStatus.textContent = t; }

  function resetGame() {
    score = 0; lives = 3; wave = 1;
    bullets = []; eBullets = [];
    keys.left = keys.right = keys.fire = false;
    resetPlayer();
    initFleet(1);
    ended = false;
    lastNewRecord = false;
    waveMsg = 0;
    updateHud();
    state = 'ready';
    readyLeft = 1600;
    setStatus('READY · 按空格或回车开始');
  }

  function nextWave() {
    wave++;
    initFleet(wave);
    bullets = []; eBullets = [];
    resetPlayer();
    waveMsg = 1400;
    updateHud();
    setStatus('WAVE ' + waveStr());
    FX.confirm();
  }

  function drawPlayer() {
    if (player.inv > 0 && Math.floor(player.inv / 90) % 2 === 0) return;
    var x = player.x, y = player.y;
    ctx.fillStyle = '#00a2e8';
    ctx.fillRect(x + 8, y, 8, 6);
    ctx.fillRect(x, y + 6, 24, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 4, y + 6, 6, 3);
  }

  function moveFleetX(dx) { for (var i = 0; i < enemies.length; i++) enemies[i].x += dx; }
  function moveFleetY() { for (var i = 0; i < enemies.length; i++) enemies[i].y += fleet.stepY; }

  function fireFromEnemies(dt) {
    if (eBullets.length >= 3 + wave) return;
    var chance = (0.7 + wave * 0.25) * dt / 1000;
    if (Math.random() > chance) return;
    var colsWith = {};
    for (var i = 0; i < enemies.length; i++) colsWith[enemies[i].col] = true;
    var cols = Object.keys(colsWith).map(Number);
    if (!cols.length) return;
    var col = cols[Math.floor(Math.random() * cols.length)];
    var lowest = null;
    for (var j = 0; j < enemies.length; j++) {
      if (enemies[j].col === col && (!lowest || enemies[j].y > lowest.y)) lowest = enemies[j];
    }
    if (!lowest) return;
    var vy = 80 + wave * 10 + Math.random() * 30;
    eBullets.push({ x: lowest.x + lowest.w / 2 - 2, y: lowest.y + lowest.h, w: 4, h: 8, vy: vy });
  }

  function onPlayerHit() {
    lives--;
    updateHud();
    FX.error();
    if (lives <= 0) { doGameOver(); return; }
    resetPlayer();
    player.inv = 2000;
    eBullets = [];
    setStatus('防护罩充能中……');
    setTimeout(function () { if (state === 'playing') setStatus(''); }, 1200);
  }

  function doGameOver() {
    if (ended) return;
    ended = true;
    state = 'gameover';
    lastNewRecord = score > hi;
    if (lastNewRecord) {
      hi = score;
      store.setItem(HI_KEY, String(hi));
    }
    updateHud();
    FX.powerUp();
    setStatus(lastNewRecord ? '新纪录！按回车再来一局' : 'GAME OVER · 按回车再来一局');
  }

  function update(dt) {
    if (waveMsg > 0) waveMsg -= dt;

    if (state === 'ready') {
      readyLeft -= dt;
      if (readyLeft <= 0) { state = 'playing'; setStatus(''); }
      return;
    }
    if (state !== 'playing') return;

    /* 玩家移动 */
    var mv = PLAYER_SPD * dt / 1000;
    if (keys.left) player.x = Math.max(4, player.x - mv);
    if (keys.right) player.x = Math.min(W - 4 - player.w, player.x + mv);

    /* 射击 */
    if (keys.fire && Date.now() - lastShot >= SHOT_CD && waveMsg <= 0) {
      lastShot = Date.now();
      bullets.push({ x: player.x + player.w / 2 - 1, y: player.y - 6, w: 2, h: 8 });
      FX.beep(880, 0.06, 'square', 0.05);
    }

    /* 玩家子弹移动 + 命中判定 */
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.y -= BULLET_SPD * dt / 1000;
      if (b.y < 0) { bullets.splice(i, 1); continue; }
      var hit = false;
      for (var j = enemies.length - 1; j >= 0; j--) {
        var e = enemies[j];
        if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
          enemies.splice(j, 1);
          score += e.pts;
          updateHud();
          FX.beep(220, 0.05, 'square', 0.07);
          hit = true;
          break;
        }
      }
      if (hit) bullets.splice(i, 1);
    }

    /* 清空舰队 → 下一波 */
    if (enemies.length === 0) { nextWave(); return; }

    /* 舰队移动 */
    if (waveMsg <= 0) {
      var minX = W, maxX = 0;
      for (var k = 0; k < enemies.length; k++) {
        if (enemies[k].x < minX) minX = enemies[k].x;
        if (enemies[k].x + enemies[k].w > maxX) maxX = enemies[k].x + enemies[k].w;
      }
      var step = fleet.speed * dt / 1000;
      if (fleet.dir > 0 && maxX >= W - 4) { fleet.dir = -1; moveFleetY(); }
      else if (fleet.dir < 0 && minX <= 4) { fleet.dir = 1; moveFleetY(); }
      moveFleetX(step * fleet.dir);

      /* 入侵到底 → 游戏结束 */
      for (var m = 0; m < enemies.length; m++) {
        if (enemies[m].y + enemies[m].h >= player.y - 4) { doGameOver(); return; }
      }

      fireFromEnemies(dt);
    }

    /* 敌方子弹移动 + 命中玩家 */
    for (var n = eBullets.length - 1; n >= 0; n--) {
      var eb = eBullets[n];
      eb.y += eb.vy * dt / 1000;
      if (eb.y > H) { eBullets.splice(n, 1); continue; }
      if (player.inv <= 0 &&
          eb.x < player.x + player.w && eb.x + eb.w > player.x &&
          eb.y < player.y + player.h && eb.y + eb.h > player.y) {
        eBullets.splice(n, 1);
        onPlayerHit();
        return; /* onPlayerHit 已接管本帧（可能清空 eBullets） */
      }
    }
    if (player.inv > 0) player.inv -= dt;
  }

  function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    /* 星星 */
    for (var s = 0; s < stars.length; s++) {
      var st = stars[s];
      var a = reduced ? 0.5 : 0.35 + 0.3 * Math.sin(Date.now() / st.tw);
      ctx.globalAlpha = Math.max(0.12, a);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }
    ctx.globalAlpha = 1;

    /* 敌方 */
    for (var i = 0; i < enemies.length; i++) drawSprite(enemies[i].spr, enemies[i].x, enemies[i].y);

    /* 敌方子弹 */
    ctx.fillStyle = '#ffb900';
    for (var j = 0; j < eBullets.length; j++) ctx.fillRect(eBullets[j].x, eBullets[j].y, eBullets[j].w, eBullets[j].h);

    /* 玩家子弹 */
    ctx.fillStyle = '#ffffff';
    for (var k = 0; k < bullets.length; k++) ctx.fillRect(bullets[k].x, bullets[k].y, bullets[k].w, bullets[k].h);

    /* 玩家 */
    if (state === 'ready' || state === 'playing' || state === 'paused') drawPlayer();

    /* 波次提示 */
    if (waveMsg > 0 && state === 'playing') {
      ctx.fillStyle = '#ffb900';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('WAVE ' + waveStr(), W / 2, 128);
      ctx.textAlign = 'left';
    }

    /* 状态覆盖层 */
    ctx.textAlign = 'center';
    if (state === 'ready') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 98, W, 50);
      ctx.fillStyle = '#ffb900';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillText('READY', W / 2, 126);
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('SPACE TO START', W / 2, 140);
    } else if (state === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 102, W, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillText('PAUSED', W / 2, 130);
    } else if (state === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 82, W, 78);
      ctx.fillStyle = '#e52521';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.fillText('GAME OVER', W / 2, 112);
      ctx.fillStyle = '#ffb900';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('SCORE ' + fmt(score), W / 2, 132);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lastNewRecord ? 'NEW RECORD!' : 'PRESS ENTER', W / 2, 150);
    }
    ctx.textAlign = 'left';
  }

  function frame(t) {
    if (cabinet.hidden) return;
    var dt = Math.min(t - lastT || 16, 50);
    lastT = t;
    if (state !== 'paused') update(dt);
    draw();
    loopId = requestAnimationFrame(frame);
  }

  function startPlaying() {
    if (state === 'ready') { state = 'playing'; setStatus(''); }
    else if (state === 'gameover') { resetGame(); }
  }

  /* ---------- 输入：键盘 ---------- */
  function onKeyDown(e) {
    if (cabinet.hidden) return;
    var k = e.key;
    var handled = true;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = true;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = true;
    else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') {
      keys.fire = true;
      FX.unlock();
      if (state === 'ready' || state === 'gameover') startPlaying();
    } else if (k === 'Enter') {
      FX.unlock();
      if (state === 'ready' || state === 'gameover') startPlaying();
      else if (state === 'paused') { state = 'playing'; setStatus(''); }
    } else if (k === 'p' || k === 'P') {
      if (state === 'playing') { state = 'paused'; setStatus('PAUSED · 按 P 继续'); FX.select(); }
      else if (state === 'paused') { state = 'playing'; setStatus(''); FX.select(); }
    } else if (k === 'Escape') {
      closeGame();
    } else {
      handled = false;
    }
    if (handled) e.preventDefault();
  }

  function onKeyUp(e) {
    if (cabinet.hidden) return;
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
    else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') keys.fire = false;
  }

  /* ---------- 输入：触控按钮 ---------- */
  document.querySelectorAll('[data-touch]').forEach(function (btn) {
    var which = btn.getAttribute('data-touch');
    function down(e) {
      e.preventDefault();
      FX.unlock();
      if (which === 'left') keys.left = true;
      else if (which === 'right') keys.right = true;
      else keys.fire = true;
      if (state === 'ready' || state === 'gameover') startPlaying();
    }
    function up() {
      if (which === 'left') keys.left = false;
      else if (which === 'right') keys.right = false;
      else keys.fire = false;
    }
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('pointerleave', up);
  });

  /* ---------- 开关游戏舱 ---------- */
  function openGame() {
    if (!cabinet.hidden) return;
    cabinet.hidden = false;
    cabinet.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cabinet-locked');
    resetGame();
    FX.unlock();
    FX.coin();
    if (canvas) canvas.focus();
    if (!loopId) {
      lastT = 0;
      loopId = requestAnimationFrame(frame);
    }
  }

  function closeGame() {
    if (cabinet.hidden) return;
    cabinet.hidden = true;
    cabinet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cabinet-locked');
    if (loopId) { cancelAnimationFrame(loopId); loopId = 0; }
    keys.left = keys.right = keys.fire = false;
  }

  document.querySelectorAll('.js-play').forEach(function (btn) {
    btn.addEventListener('click', function () { openGame(); });
  });

  var closeBtn = document.getElementById('cabinetClose');
  if (closeBtn) closeBtn.addEventListener('click', closeGame);

  if (canvas) {
    canvas.addEventListener('click', function () {
      FX.unlock();
      if (state === 'ready' || state === 'gameover') startPlaying();
    });
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  /* 切走窗口自动暂停，避免"莫名死亡" */
  window.addEventListener('blur', function () {
    if (!cabinet.hidden && state === 'playing') {
      state = 'paused';
      setStatus('PAUSED · 按 P 继续');
    }
  });
})();
