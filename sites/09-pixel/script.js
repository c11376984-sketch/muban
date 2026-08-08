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
    /* 游戏舱打开时不拦截方向键，避免玩着玩着触发彩蛋 */
    var cab = document.getElementById('arcadeCabinet');
    if (cab && !cab.hidden) return;

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
   街机游戏舱：4 合 1 可玩游戏（Canvas 像素 + 原生 JS，无依赖）
   共享框架 + invaders / blocky / ghost / candy 四款游戏
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
  var hudLabel3 = document.getElementById('hudLabel3');
  var hudSlot3 = document.getElementById('hudSlot3');
  var hudLabel4 = document.getElementById('hudLabel4');
  var hudSlot4 = document.getElementById('hudSlot4');
  var cabinetStatus = document.getElementById('cabinetStatus');
  var cabinetHint = document.getElementById('cabinetHint');
  var cabinetTitle = document.getElementById('arcadeTitle');
  var cabinetTouch = document.getElementById('cabinetTouch');

  /* ---------- 共享状态 ---------- */
  var state = 'idle';      // idle | ready | playing | paused | gameover | win
  var score = 0;
  var lastRecord = false;
  var keys = { left: false, right: false, up: false, down: false, fire: false, action: false };
  var loopId = 0, lastT = 0, readyLeft = 0;
  var currentGame = null;
  var currentId = 'invaders';

  /* ---------- 共享工具 ---------- */
  function fmt(n) { return String(n).padStart(6, '0'); }
  function setStatus(t) { if (cabinetStatus) cabinetStatus.textContent = t; }
  function setHud3(label, val) { if (hudLabel3) hudLabel3.textContent = label; if (hudSlot3) hudSlot3.textContent = val; }
  function setHud4(label, val) { if (hudLabel4) hudLabel4.textContent = label; if (hudSlot4) hudSlot4.textContent = val; }
  function updateHud() {
    if (hudScore) hudScore.textContent = fmt(score);
    if (hudHi) hudHi.textContent = fmt(Math.max(hi, score));
    if (currentGame) currentGame.updateHud();
  }

  /* 字符画 → 像素块（共享精灵绘制） */
  function drawSprite(spr, x, y) {
    ctx.fillStyle = spr.c;
    for (var r = 0; r < spr.g.length; r++) {
      var row = spr.g[r];
      for (var ci = 0; ci < row.length; ci++) {
        if (row.charAt(ci) === '#') ctx.fillRect(x + ci * 4, y + r * 4, 4, 4);
      }
    }
  }

  function resetKeys() { keys.left = keys.right = keys.up = keys.down = keys.fire = keys.action = false; }

  /* ============================================================
     游戏注册表
     ============================================================ */
  var GAMES = {};

  /* ---- 占位游戏（未实装时显示"敬请期待"） ---- */
  function comingSoon(id, title, hint) {
    return {
      id: id, title: title, hint: hint || '敬请期待 · 即将上线', labels: ['状态', ''],
      reset: function () {},
      start: function () {},
      update: function () {},
      draw: function (c) {
        c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
        c.textAlign = 'center';
        c.fillStyle = '#ffb900'; c.font = '14px "Press Start 2P", monospace';
        c.fillText('COMING SOON', W / 2, 112);
        c.fillStyle = '#ffffff'; c.font = '8px "Press Start 2P", monospace';
        c.fillText('敬请期待', W / 2, 132);
        c.textAlign = 'left';
      },
      updateHud: function () { setHud3('状态', '--'); setHud4('', ''); },
      onKey: function () { return false; },
      onTouch: function () {},
      touchButtons: function () { return []; }
    };
  }

  /* ============================================================
     游戏 1：星穹入侵者（太空射击）
     ============================================================ */
  GAMES.invaders = (function () {
    var lives = 3, wave = 1;
    var bullets = [], eBullets = [], enemies = [];
    var fleet = { dir: 1, stepY: 14, speed: 26 };
    var player = { x: 0, y: 214, w: 24, h: 14, inv: 0 };
    var lastShot = 0, waveMsg = 0, ended = false;
    var stars = [];

    var SPRITES = {
      a: { c: '#0c9c23', g: ['.##.##', '#.#.#.', '######', '##..##', '.#..#.'] },
      b: { c: '#e52521', g: ['..#...', '.#.#..', '######', '##..##'] },
      c: { c: '#8359a3', g: ['..##..', '.###..', '######', '##..##', '#.##.#'] }
    };
    var ROWS = 4, COLS = 5;
    var ROW_TYPES = [['a', 30], ['a', 30], ['b', 20], ['c', 10]];
    var EN_W = 24, EN_H = 20, EN_X_GAP = 30, EN_Y_GAP = 26;
    var SHOT_CD = 280, PLAYER_SPD = 175, BULLET_SPD = 260;

    function makeStars() {
      stars = [];
      for (var i = 0; i < 42; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() < 0.25 ? 2 : 1, tw: 4000 + Math.random() * 6000 });
      }
    }
    function initFleet(w) {
      enemies = [];
      var gridW = COLS * EN_X_GAP - 6;
      var startX = (W - gridW) / 2;
      var startY = 40;
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var t = ROW_TYPES[r];
          enemies.push({ x: startX + c * EN_X_GAP, y: startY + r * EN_Y_GAP, w: EN_W, h: EN_H, spr: SPRITES[t[0]], pts: t[1], row: r, col: c });
        }
      }
      fleet.dir = 1;
      fleet.speed = 26 + (w - 1) * 8;
    }
    function resetPlayer() { player.x = (W - player.w) / 2; player.inv = 0; }
    function waveStr() { return ('0' + Math.min(wave, 99)).slice(-2); }
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
    function doGameOver() { if (ended) return; ended = true; endGame(false); }
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

    makeStars();

    return {
      id: 'invaders',
      title: '★ 星穹入侵者 ★',
      hint: '← → / A D 移动 · 空格 射击 · P 暂停 · Esc 退出',
      labels: ['波次', '生命'],
      reset: function () {
        lives = 3; wave = 1; bullets = []; eBullets = [];
        resetKeys(); resetPlayer(); initFleet(1); ended = false; waveMsg = 0; makeStars();
      },
      start: function () {},
      update: function (dt) {
        if (waveMsg > 0) waveMsg -= dt;

        var mv = PLAYER_SPD * dt / 1000;
        if (keys.left) player.x = Math.max(4, player.x - mv);
        if (keys.right) player.x = Math.min(W - 4 - player.w, player.x + mv);

        if (keys.fire && Date.now() - lastShot >= SHOT_CD && waveMsg <= 0) {
          lastShot = Date.now();
          bullets.push({ x: player.x + player.w / 2 - 1, y: player.y - 6, w: 2, h: 8 });
          FX.beep(880, 0.06, 'square', 0.05);
        }

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

        if (enemies.length === 0) { nextWave(); return; }

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

          for (var m = 0; m < enemies.length; m++) {
            if (enemies[m].y + enemies[m].h >= player.y - 4) { doGameOver(); return; }
          }
          fireFromEnemies(dt);
        }

        for (var n = eBullets.length - 1; n >= 0; n--) {
          var eb = eBullets[n];
          eb.y += eb.vy * dt / 1000;
          if (eb.y > H) { eBullets.splice(n, 1); continue; }
          if (player.inv <= 0 &&
              eb.x < player.x + player.w && eb.x + eb.w > player.x &&
              eb.y < player.y + player.h && eb.y + eb.h > player.y) {
            eBullets.splice(n, 1);
            onPlayerHit();
            return;
          }
        }
        if (player.inv > 0) player.inv -= dt;
      },
      draw: function (c) {
        c.fillStyle = '#000';
        c.fillRect(0, 0, W, H);

        for (var s = 0; s < stars.length; s++) {
          var st = stars[s];
          var a = reduced ? 0.5 : 0.35 + 0.3 * Math.sin(Date.now() / st.tw);
          c.globalAlpha = Math.max(0.12, a);
          c.fillStyle = '#ffffff';
          c.fillRect(st.x, st.y, st.s, st.s);
        }
        c.globalAlpha = 1;

        for (var i = 0; i < enemies.length; i++) drawSprite(enemies[i].spr, enemies[i].x, enemies[i].y);

        c.fillStyle = '#ffb900';
        for (var j = 0; j < eBullets.length; j++) c.fillRect(eBullets[j].x, eBullets[j].y, eBullets[j].w, eBullets[j].h);

        c.fillStyle = '#ffffff';
        for (var k = 0; k < bullets.length; k++) c.fillRect(bullets[k].x, bullets[k].y, bullets[k].w, bullets[k].h);

        if (player.inv <= 0 || Math.floor(player.inv / 90) % 2 !== 0) {
          var x = player.x, y = player.y;
          c.fillStyle = '#00a2e8';
          c.fillRect(x + 8, y, 8, 6);
          c.fillRect(x, y + 6, 24, 8);
          c.fillStyle = '#ffffff';
          c.fillRect(x + 4, y + 6, 6, 3);
        }

        if (waveMsg > 0) {
          c.fillStyle = '#ffb900';
          c.font = '10px "Press Start 2P", monospace';
          c.textAlign = 'center';
          c.fillText('WAVE ' + waveStr(), W / 2, 128);
          c.textAlign = 'left';
        }
      },
      updateHud: function () { setHud3('波次', waveStr()); setHud4('生命', '×' + lives); },
      onKey: function (e, down) {
        var k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = down; return true; }
        if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = down; return true; }
        if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') {
          keys.fire = down;
          if (down && (state === 'ready' || state === 'gameover' || state === 'win')) startPlaying();
          return true;
        }
        return false;
      },
      onTouch: function (act, down) {
        if (act === 'left') keys.left = down;
        else if (act === 'right') keys.right = down;
        else if (act === 'fire') {
          keys.fire = down;
          if (down && (state === 'ready' || state === 'gameover' || state === 'win')) startPlaying();
        }
      },
      touchButtons: function () {
        return [
          { label: '◀', act: 'left' },
          { label: 'FIRE', act: 'fire', cls: 'touch-fire' },
          { label: '▶', act: 'right' }
        ];
      }
    };
  })();

  /* ============================================================
     游戏 2：方块王历险记（横版跳跃平台）
     ============================================================ */
  GAMES.blocky = (function () {
    var GRAV = 0.42, JUMP = -8.6, MOVE = 2.0;
    var LEVEL_W = 1280, GROUND_Y = 200, GRASS = 4;
    var COYOTE = 8, JUMP_BUF = 10; /* 宽容帧：离开地面后仍可跳 / 提前按跳也响应 */

    /* 碰撞盒 = 视觉精灵尺寸（32×34），否则大精灵会明显"穿"进平台 */
    var player = { x: 20, y: 0, vx: 0, vy: 0, w: 32, h: 34, onGround: false, facing: 1, anim: 0, coyote: 0, jumpBuf: 0 };
    var camera = 0, tick = 0;
    var platforms = [], coins = [], spikes = [], goal = { x: 0, y: 0 };
    var coinsCollected = 0, totalCoins = 0;
    var ended = false, winFlash = 0;

    /* 王冠方块精灵：蓝身 + 金王冠 + 眼睛（8 列 × 10 行，4px 单元） */
    var SPR_R = {
      c: '#2b6fff',
      g: [
        '.##....#',
        '########',
        '#.####.#',
        '#.####.#',
        '########',
        '.######.',
        '.######.',
        '.#....#.',
        '........',
        '........'
      ]
    };
    var CROWN = { c: '#ffcc00', g: ['#.#..#.#', '########'] };
    var EYE = { c: '#ffffff', g: ['..#.#...', '..#.#...'] };

    function buildLevel() {
      platforms = []; coins = []; spikes = []; goal = { x: LEVEL_W - 48, y: GROUND_Y - 28 };
      /* 地面段（含缺口） */
      var segs = [
        [0, 260], [300, 160], [500, 120], [660, 140], [840, 180], [1060, 60], [1180, 100]
      ];
      for (var i = 0; i < segs.length; i++) {
        platforms.push({ x: segs[i][0], y: GROUND_Y, w: segs[i][1], h: H - GROUND_Y });
      }
      /* 漂浮平台 */
      var fp = [
        [210, 150, 56], [340, 120, 48], [470, 150, 56],
        [640, 130, 56], [760, 100, 48], [880, 140, 56],
        [980, 110, 64], [1100, 150, 56]
      ];
      for (var j = 0; j < fp.length; j++) {
        platforms.push({ x: fp[j][0], y: fp[j][1], w: fp[j][2], h: 14 });
      }
      /* 尖刺行（放在缺口边缘或地面上） */
      var sp = [[272, 28], [460, 28], [624, 28], [800, 24], [1040, 20], [1124, 24]];
      for (var s = 0; s < sp.length; s++) {
        var sw = sp[s][1], sx = sp[s][0];
        for (var k = 0; k < sw; k += 8) spikes.push({ x: sx + k, y: GROUND_Y - 8, w: 8, h: 8 });
      }
      /* 金币弧线/散点 */
      var cl = [
        [90, 160], [130, 160], [170, 150], [210, 120], [240, 120],
        [350, 90], [380, 90], [410, 100], [470, 120], [510, 120],
        [600, 110], [640, 90], [680, 90], [760, 70], [800, 70],
        [880, 100], [920, 100], [980, 80], [1020, 80], [1100, 120],
        [1140, 120], [1200, 150], [1230, 150]
      ];
      for (var c = 0; c < cl.length; c++) coins.push({ x: cl[c][0], y: cl[c][1], got: false, phase: c * 0.5 });
      totalCoins = coins.length;
    }

    function resetPlayer() {
      player.x = 20; player.y = GROUND_Y - player.h;
      player.vx = 0; player.vy = 0; player.onGround = false; player.facing = 1; player.anim = 0;
      player.coyote = 0; player.jumpBuf = 0;
    }

    function aabb(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    /* 扫掠碰撞：玩家 AABB 从 (x,y) 以 (dx,dy) 移动，对静态平台做连续碰撞检测。
       把玩家当质点、平台按玩家尺寸做 Minkowski 膨胀，求最早相交时刻 t(0..1) 与碰撞轴。
       t<0 表示起点已相交（穿模兜底）；返回 null 表示本步不相交。 */
    function sweepHit(pl, x, y, w, h, dx, dy) {
      var ex = pl.x - w / 2, ew = pl.w + w;
      var ey = pl.y - h / 2, eh = pl.h + h;
      var cx = x + w / 2, cy = y + h / 2;
      var tnx, tfx, tny, tfy, tp;
      if (dx === 0) {
        if (cx < ex || cx > ex + ew) return null;
        tnx = -1e9; tfx = 1e9;
      } else {
        tnx = (ex - cx) / dx; tfx = (ex + ew - cx) / dx;
        if (tnx > tfx) { tp = tnx; tnx = tfx; tfx = tp; }
      }
      if (dy === 0) {
        if (cy < ey || cy > ey + eh) return null;
        tny = -1e9; tfy = 1e9;
      } else {
        tny = (ey - cy) / dy; tfy = (ey + eh - cy) / dy;
        if (tny > tfy) { tp = tny; tny = tfy; tfy = tp; }
      }
      var tEnter = Math.max(tnx, tny);
      var tExit = Math.min(tfx, tfy);
      if (tEnter > tExit || tExit < 0 || tEnter > 1) return null;
      return { pl: pl, t: tEnter, axis: tEnter === tnx ? 'x' : 'y', dx: dx, dy: dy };
    }

    return {
      id: 'blocky',
      title: '★ 方块王历险记 ★',
      hint: '← → / A D 移动 · 空格/↑ 跳跃 · 收金币到终点 · P 暂停 · Esc 退出',
      labels: ['金币', '进度'],
      reset: function () {
        buildLevel(); resetPlayer();
        camera = 0; tick = 0; coinsCollected = 0;
        ended = false; winFlash = 0;
      },
      start: function () {},
      update: function (dt) {
        if (ended) return;
        /* 固定子步积分：把 dt 切成 ~16ms 的整数步，消除手机帧率抖动对跳跃高度的影响 */
        var steps = Math.max(1, Math.round(dt / 16));
        var sub = dt / steps;
        var s = sub / 16.67;
        if (reduced) s *= 0.7;

        for (var st = 0; st < steps; st++) {
          tick++;

          var dir = 0;
          if (keys.left) { dir = -1; player.facing = -1; }
          if (keys.right) { dir = 1; player.facing = 1; }
          player.vx = dir * MOVE;
          if (dir === 0 && player.onGround) player.vx *= 0.6;

          /* 跳跃缓冲：按下时记下，落地或仍在地面窗口内时消费 */
          if ((keys.fire || keys.up)) player.jumpBuf = JUMP_BUF;
          else if (player.jumpBuf > 0) player.jumpBuf -= s;

          /* 重力 */
          player.vy += GRAV * s;
          if (player.vy > 16) player.vy = 16;

          /* ---- 扫掠碰撞：整步积分 + 连续碰撞解析（替代原来分开的 Y/X 碰撞） ---- */
          var mx = player.x + player.vx * s;
          var my = player.y + player.vy * s;
          player.onGround = false;
          var guard = 5;
          while (guard-- > 0) {
            var best = null;
            for (var j = 0; j < platforms.length; j++) {
              var pl = platforms[j];
              var h = sweepHit(pl, player.x, player.y, player.w, player.h, mx - player.x, my - player.y);
              if (!h) continue;
              if (h.t < 0 && !aabb(player, pl)) continue; /* 起点贴边/贴在顶上不算撞，只有真正相交才兜底 */
              if (!best || h.t < best.t) best = h;
            }
            if (!best) break;
            var pb = best.pl;
            if (best.t >= 0) {
              /* 先移到接触点，再按碰撞轴推出 */
              player.x += (mx - player.x) * best.t;
              player.y += (my - player.y) * best.t;
              if (best.axis === 'x') {
                var sideHit = (player.y + player.h) > pb.y + 4;
                if (sideHit) {
                  /* 脚底真正压进平台（>4px）→ 侧面挡停 */
                  if (best.dx > 0) player.x = pb.x - player.w;
                  else if (best.dx < 0) player.x = pb.x + pb.w;
                  player.vx = 0;
                  mx = player.x;
                } else {
                  /* 跑上/斜切进平台顶面 → 落在顶上（不挡水平） */
                  player.y = pb.y - player.h;
                  player.vy = 0;
                  player.onGround = true;
                  my = player.y;
                }
              } else {
                if (best.dy > 0) { player.y = pb.y - player.h; player.onGround = true; }
                else if (best.dy < 0) { player.y = pb.y + pb.h; }
                player.vy = 0;
                my = player.y;
              }
            } else {
              /* 穿模兜底：沿穿透最浅的轴推出，绝不强行吸到顶上 */
              var pR = (pb.x + pb.w) - player.x, pL = (player.x + player.w) - pb.x;
              var pD = (pb.y + pb.h) - player.y, pU = (player.y + player.h) - pb.y;
              var minP = Math.min(pR, pL, pD, pU);
              if (minP === pU) { player.y = pb.y - player.h; player.vy = 0; player.onGround = true; my = player.y; }
              else if (minP === pD) { player.y = pb.y + pb.h; player.vy = 0; my = player.y; }
              else if (minP === pL) { player.x = pb.x - player.w; player.vx = 0; mx = player.x; }
              else { player.x = pb.x + pb.w; player.vx = 0; mx = player.x; }
            }
          }
          player.x = mx;
          player.y = my;
          if (player.x < 0) player.x = 0;
          if (player.x + player.w > LEVEL_W) player.x = LEVEL_W - player.w;

          /* 地面窗口（coyote）：刚离开平台顶部一小段时间仍可跳 */
          if (player.onGround) player.coyote = COYOTE;
          else if (player.coyote > 0) player.coyote -= s;

          /* 消费跳跃缓冲：地面窗口内 + 有跳跃缓冲 → 起跳 */
          if (player.jumpBuf > 0 && player.coyote > 0) {
            player.vy = JUMP;
            player.onGround = false;
            player.coyote = 0;
            player.jumpBuf = 0;
            FX.beep(660, 0.06, 'square', 0.07);
          }

          /* 掉入深渊 */
          if (player.y > H + 8) { ended = true; gameOver(); return; }

          /* 尖刺碰撞 → 死亡 */
          for (var sp = 0; sp < spikes.length; sp++) {
            if (aabb(player, spikes[sp])) { ended = true; gameOver(); return; }
          }
        }

        /* 动画帧（每 update 一次，不必每子步） */
        if (player.onGround && Math.abs(player.vx) > 0.1) player.anim += s * 0.3;
        else player.anim = 0;

        /* 金币拾取 */
        for (var ci = 0; ci < coins.length; ci++) {
          var co = coins[ci];
          if (co.got) continue;
          if (player.x < co.x + 8 && player.x + player.w > co.x &&
              player.y < co.y + 8 && player.y + player.h > co.y) {
            co.got = true; coinsCollected++;
            score += 10; updateHud(); FX.coin();
          }
        }

        /* 到达旗帜 → 胜利 */
        if (player.x + player.w >= goal.x) {
          ended = true; winFlash = 1;
          score += 100; updateHud();
          winGame();
          return;
        }

        /* 摄像机跟随 */
        camera = player.x - 120;
        if (camera < 0) camera = 0;
        if (camera > LEVEL_W - W) camera = LEVEL_W - W;
      },
      draw: function (c) {
        /* 天空渐变带 */
        var bands = ['#5fc6f0', '#7fd0f2', '#a7e2f8', '#cdeefb'];
        var bh = H / bands.length;
        for (var b = 0; b < bands.length; b++) { c.fillStyle = bands[b]; c.fillRect(0, b * bh, W, bh + 1); }
        /* 远景云朵（视差） */
        c.fillStyle = 'rgba(255,255,255,0.6)';
        var par = camera * 0.3;
        for (var cl = 0; cl < 6; cl++) {
          var cx = ((cl * 220 + 40) - par) % (LEVEL_W + 200);
          if (cx < 0) cx += LEVEL_W + 200;
          c.fillRect(cx, 36 + (cl % 2) * 16, 28, 8);
          c.fillRect(cx + 6, 30 + (cl % 2) * 16, 20, 6);
        }

        c.save();
        c.translate(-Math.round(camera), 0);

        /* 平台：棕体 + 绿草顶 */
        for (var i = 0; i < platforms.length; i++) {
          var p = platforms[i];
          c.fillStyle = '#7a4a1e';
          c.fillRect(p.x, p.y, p.w, p.h);
          c.fillStyle = '#5a3414';
          for (var tx = p.x; tx < p.x + p.w; tx += 16) c.fillRect(tx, p.y + GRASS, 1, p.h - GRASS);
          c.fillStyle = '#2fa84f';
          c.fillRect(p.x, p.y, p.w, GRASS);
          c.fillStyle = '#56d97a';
          c.fillRect(p.x, p.y, p.w, 2);
        }

        /* 尖刺：灰色三角 */
        c.fillStyle = '#9aa0a6';
        for (var s = 0; s < spikes.length; s++) {
          var sp = spikes[s];
          for (var t = 0; t < sp.w; t += 4) {
            c.beginPath();
            c.moveTo(sp.x + t, sp.y + sp.h);
            c.lineTo(sp.x + t + 2, sp.y);
            c.lineTo(sp.x + t + 4, sp.y + sp.h);
            c.closePath(); c.fill();
          }
          c.fillStyle = '#c8ced3';
          for (var t2 = 0; t2 < sp.w; t2 += 4) c.fillRect(sp.x + t2 + 1, sp.y, 1, 2);
          c.fillStyle = '#9aa0a6';
        }

        /* 金币：脉动金色方块 */
        for (var ci = 0; ci < coins.length; ci++) {
          var co = coins[ci];
          if (co.got) continue;
          var bob = reduced ? 0 : Math.sin(tick * 0.08 + co.phase) * 2;
          var sz = 8 + (reduced ? 0 : Math.round(Math.sin(tick * 0.12 + co.phase) * 1));
          if (sz < 6) sz = 6;
          var cx = co.x + (8 - sz) / 2, cy = co.y + bob + (8 - sz) / 2;
          c.fillStyle = '#ffcc00';
          c.fillRect(cx, cy, sz, sz);
          c.fillStyle = '#fff099';
          c.fillRect(cx + 1, cy + 1, 2, 2);
        }

        /* 终点旗帜：杆 + 飘动红旗 */
        var fl = reduced ? 0 : Math.sin(tick * 0.1) * 2;
        c.fillStyle = '#6b4a2a';
        c.fillRect(goal.x, goal.y, 3, 28);
        c.fillStyle = '#e52521';
        c.beginPath();
        c.moveTo(goal.x + 3, goal.y + 2);
        c.lineTo(goal.x + 22 + fl, goal.y + 8);
        c.lineTo(goal.x + 3, goal.y + 14);
        c.closePath(); c.fill();
        c.fillStyle = '#ff6b67';
        c.fillRect(goal.x + 5, goal.y + 4, 4, 4);

        /* 玩家：王冠方块王 */
        var px = Math.round(player.x), py = Math.round(player.y);
        if (player.facing < 0) {
          c.save();
          c.translate(px + player.w, py);
          c.scale(-1, 1);
          c.translate(-px, -py);
          drawSprite(SPR_R, px, py + 2);
          drawSprite(CROWN, px, py);
          drawSprite(EYE, px, py + 6);
          c.restore();
        } else {
          drawSprite(SPR_R, px, py + 2);
          drawSprite(CROWN, px, py);
          drawSprite(EYE, px, py + 6);
        }

        c.restore();

        /* 胜利闪光 */
        if (winFlash > 0) {
          c.fillStyle = 'rgba(255,255,255,' + (winFlash * 0.5) + ')';
          c.fillRect(0, 0, W, H);
          winFlash *= 0.9;
          if (winFlash < 0.05) winFlash = 0;
        }
      },
      updateHud: function () {
        setHud3('金币', coinsCollected + '/' + totalCoins);
        var prog = Math.min(100, Math.floor((player.x / (LEVEL_W - 48)) * 100));
        setHud4('进度', prog + '%');
      },
      onKey: function (e, down) {
        var k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = down; return true; }
        if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = down; return true; }
        if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') {
          keys.fire = down; keys.up = down;
          if (down && (state === 'ready' || state === 'gameover' || state === 'win')) startPlaying();
          return true;
        }
        return false;
      },
      onTouch: function (act, down) {
        if (act === 'left') keys.left = down;
        else if (act === 'right') keys.right = down;
        else if (act === 'fire') {
          keys.fire = down; keys.up = down;
          if (down && (state === 'ready' || state === 'gameover' || state === 'win')) startPlaying();
        }
      },
      touchButtons: function () {
        return [
          { label: '◀', act: 'left' },
          { label: 'JUMP', act: 'fire', cls: 'touch-fire' },
          { label: '▶', act: 'right' }
        ];
      }
    };
  })();
  GAMES.ghost = (function () {
    /* ---- 常量 ---- */
    var COLS = 10, ROWS = 8, CELL = 24, OX = 40, OY = 24;
    var R = 2.3;                 // 手电筒半径（格）
    var GHOST_STEP = 380;        // 幽灵移动间隔 ms

    /* ---- 迷宫：0=地板 1=墙（手绘走廊+死胡同） ---- */
    var MAZE = [
      [1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,0,0,1],
      [1,0,1,0,1,0,1,1,0,1],
      [1,0,1,0,0,0,1,0,0,1],
      [1,0,1,1,1,1,1,0,1,1],
      [1,0,0,0,0,0,0,0,0,1],
      [1,1,1,0,1,1,1,1,0,1],
      [1,1,1,1,1,1,1,1,1,1]
    ];

    /* ---- 状态 ---- */
    var player = { col: 0, row: 0, dir: 1, free: true };
    var ghosts = [];
    var treasures = [];
    var exit = { col: 8, row: 6 };
    var total = 8, got = 0, steps = 0;

    /* 精灵 */
    var SPR_PLAYER = {
      c: '#39e6d6',
      g: ['.##..##.', '########', '##.##.##', '########', '.######.', '..####..', '..####..', '...##...']
    };
    var SPR_PLAYER_FACE = {
      c: '#0a0612',
      g: ['........', '........', '##.##.##', '........', '........', '........', '........', '........']
    };

    function isWall(c, r) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
      return MAZE[r][c] === 1;
    }

    function canStep(c, r) { return !isWall(c, r); }

    /* 收集所有地板格 */
    function floorCells() {
      var arr = [];
      for (var r = 0; r < ROWS; r++)
        for (var c = 0; c < COLS; c++)
          if (MAZE[r][c] === 0) arr.push({ col: c, row: r });
      return arr;
    }

    /* 行/列是否畅通（无墙遮挡），用于幽灵直线追击判定 */
    function lineClear(a, b) {
      if (a.col === b.col) {
        var r1 = Math.min(a.row, b.row), r2 = Math.max(a.row, b.row);
        for (var r = r1 + 1; r < r2; r++) if (isWall(a.col, r)) return false;
        return true;
      }
      if (a.row === b.row) {
        var c1 = Math.min(a.col, b.col), c2 = Math.max(a.col, b.col);
        for (var c = c1 + 1; c < c2; c++) if (isWall(c, a.row)) return false;
        return true;
      }
      return false;
    }

    /* 尝试朝方向走一步，成功返回 true */
    function tryStep(ent, dcol, drow) {
      var nc = ent.col + dcol, nr = ent.row + drow;
      if (canStep(nc, nr)) { ent.col = nc; ent.row = nr; return true; }
      return false;
    }

    function dirToDelta(d) {
      if (d === 0) return [0, -1];
      if (d === 1) return [1, 0];
      if (d === 2) return [0, 1];
      return [-1, 0];
    }

    /* 幽灵有效方向（不掉头除非死路） */
    function ghostValidDirs(g, excludeBack) {
      var dirs = [];
      for (var d = 0; d < 4; d++) {
        if (excludeBack && d === ((g.dir + 2) % 4)) continue;
        var dd = dirToDelta(d);
        if (canStep(g.col + dd[0], g.row + dd[1])) dirs.push(d);
      }
      return dirs;
    }

    function reset() {
      player.col = 1; player.row = 1; player.dir = 1; player.free = true;
      ghosts = [
        { col: 4, row: 5, dir: 1, t: 0, interval: GHOST_STEP, chase: false },
        { col: 7, row: 3, dir: 2, t: GHOST_STEP / 2, interval: GHOST_STEP, chase: false }
      ];
      /* 散布 8 个宝藏于地板格（避开起点、出口、幽灵起点） */
      treasures = [];
      var cells = floorCells().filter(function (c) {
        if (c.col === 1 && c.row === 1) return false;          // 起点
        if (c.col === exit.col && c.row === exit.row) return false; // 出口
        if (ghosts.some(function (g) { return g.col === c.col && g.row === c.row; })) return false;
        return true;
      });
      /* 洗牌取前 8 */
      for (var i = cells.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = cells[i]; cells[i] = cells[j]; cells[j] = tmp;
      }
      var n = Math.min(8, cells.length);
      for (var k = 0; k < n; k++) treasures.push({ col: cells[k].col, row: cells[k].row, got: false });
      total = treasures.length; got = 0; steps = 0;
    }

    function start() {}

    /* 玩家走一步 */
    function playerStep(dcol, drow) {
      if (!player.free) return;
      var nc = player.col + dcol, nr = player.row + drow;
      if (!canStep(nc, nr)) { FX.error(); return; }
      player.col = nc; player.row = nr; steps++;
      if (dcol > 0) player.dir = 1; else if (dcol < 0) player.dir = 3;
      else if (drow > 0) player.dir = 2; else player.dir = 0;

      /* 拾取宝藏 */
      for (var i = 0; i < treasures.length; i++) {
        if (!treasures[i].got && treasures[i].col === player.col && treasures[i].row === player.row) {
          treasures[i].got = true; got++; score += 100; updateHud(); FX.coin();
          if (got === total) FX.unlock();
        }
      }
      /* 撞幽灵 */
      checkGhostHit();
      /* 到达出口且收齐 */
      if (got === total && player.col === exit.col && player.row === exit.row) winGame();
    }

    function checkGhostHit() {
      for (var i = 0; i < ghosts.length; i++) {
        if (ghosts[i].col === player.col && ghosts[i].row === player.row) { gameOver(); return; }
      }
    }

    function update(dt) {
      if (state !== 'playing') return;
      /* 方向键按下且空闲 → 走一步 */
      if (player.free) {
        if (keys.left) playerStep(-1, 0);
        else if (keys.right) playerStep(1, 0);
        else if (keys.up) playerStep(0, -1);
        else if (keys.down) playerStep(0, 1);
      }

      /* 幽灵推进 */
      var iv = reduced ? GHOST_STEP * 1.63 : GHOST_STEP;
      for (var i = 0; i < ghosts.length; i++) {
        var g = ghosts[i];
        g.t += dt;
        if (g.t < iv) continue;
        g.t -= iv;

        /* 同行/同列且无墙遮挡 → 追击一步 */
        var moved = false;
        if ((g.col === player.col || g.row === player.row) && lineClear(g, player)) {
          g.chase = true;
          var dc = Math.sign(player.col - g.col), dr = Math.sign(player.row - g.row);
          if (g.col === player.col) { if (tryStep(g, 0, dr)) { g.dir = dr > 0 ? 2 : 0; moved = true; } }
          else { if (tryStep(g, dc, 0)) { g.dir = dc > 0 ? 1 : 3; moved = true; } }
          if (!moved) {
            /* 该方向被堵，转而尝试另一轴 */
            if (g.col === player.col) { if (tryStep(g, dc, 0)) { g.dir = dc > 0 ? 1 : 3; moved = true; } }
            else { if (tryStep(g, 0, dr)) { g.dir = dr > 0 ? 2 : 0; moved = true; } }
          }
        } else {
          g.chase = false;
        }

        /* 随机有效方向（不掉头） */
        if (!moved) {
          var dirs = ghostValidDirs(g, true);
          if (!dirs.length) dirs = ghostValidDirs(g, false);
          if (dirs.length) {
            var pick = dirs[Math.floor(Math.random() * dirs.length)];
            var dd = dirToDelta(pick);
            tryStep(g, dd[0], dd[1]); g.dir = pick;
          }
        }

        checkGhostHit();
      }
    }

    /* ---- 绘制 ---- */
    function draw(c) {
      /* 背景 */
      c.fillStyle = '#0a0612';
      c.fillRect(0, 0, W, H);

      /* 地板与墙 */
      for (var r = 0; r < ROWS; r++) {
        for (var col = 0; col < COLS; col++) {
          var x = OX + col * CELL, y = OY + r * CELL;
          if (MAZE[r][col] === 1) {
            /* 砖墙 */
            c.fillStyle = '#4a2a1a';
            c.fillRect(x, y, CELL, CELL);
            c.fillStyle = '#2e1810';
            c.fillRect(x, y + CELL - 2, CELL, 2);          // 横灰浆
            c.fillRect(x + CELL - 2, y, 2, CELL);          // 竖灰浆
            c.fillStyle = '#5e3826';
            c.fillRect(x + 2, y + 2, CELL - 4, 2);         // 高光
          } else {
            /* 地板 */
            c.fillStyle = '#241634';
            c.fillRect(x, y, CELL, CELL);
            c.fillStyle = '#1c1028';
            c.fillRect(x, y + CELL - 1, CELL, 1);
            c.fillRect(x + CELL - 1, y, 1, CELL);
          }
        }
      }

      /* 出口门 */
      var ex = OX + exit.col * CELL, ey = OY + exit.row * CELL;
      var unlocked = got >= total;
      c.fillStyle = unlocked ? '#0c9c23' : '#9a2020';
      c.fillRect(ex + 3, ey + 3, CELL - 6, CELL - 6);
      c.fillStyle = unlocked ? '#7dff8a' : '#e54040';
      c.fillRect(ex + 5, ey + 5, CELL - 10, 3);
      c.fillStyle = '#ffd700';
      c.fillRect(ex + CELL / 2 - 1, ey + CELL / 2, 2, 4); // 门把手

      /* 宝藏（金色菱形脉冲） */
      var pulse = reduced ? 0.5 : (0.5 + 0.5 * Math.sin(Date.now() / 200));
      for (var ti = 0; ti < treasures.length; ti++) {
        if (treasures[ti].got) continue;
        var tx = OX + treasures[ti].col * CELL + CELL / 2;
        var ty = OY + treasures[ti].row * CELL + CELL / 2;
        c.fillStyle = '#ffd700';
        c.globalAlpha = 0.6 + 0.4 * pulse;
        c.beginPath();
        c.moveTo(tx, ty - 6);
        c.lineTo(tx + 6, ty);
        c.lineTo(tx, ty + 6);
        c.lineTo(tx - 6, ty);
        c.closePath();
        c.fill();
        c.globalAlpha = 1;
        c.fillStyle = '#fff7c0';
        c.fillRect(tx - 1, ty - 4, 2, 2);
      }

      /* 玩家（兜帽青色） */
      var px = OX + player.col * CELL, py = OY + player.row * CELL;
      drawSprite(SPR_PLAYER, px + 4, py + 2);
      drawSprite(SPR_PLAYER_FACE, px + 4, py + 2);

      /* 幽灵（白色波浪 + 暗眼，sin 摆动） */
      for (var gi = 0; gi < ghosts.length; gi++) {
        var gh = ghosts[gi];
        var gx = OX + gh.col * CELL, gy = OY + gh.row * CELL;
        var bob = reduced ? 0 : Math.sin(Date.now() / 180 + gi) * 1.5;
        drawGhost(c, gx, gy + bob, gh.chase);
      }

      /* 手电筒：径向黑色遮罩，以玩家像素为中心 */
      var cx = OX + player.col * CELL + CELL / 2;
      var cy = OY + player.row * CELL + CELL / 2;
      var rad = R * CELL;
      var grad = c.createRadialGradient(cx, cy, rad * 0.15, cx, cy, rad);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0.35)');
      grad.addColorStop(1, 'rgba(0,0,0,0.93)');
      c.fillStyle = grad;
      c.fillRect(0, 0, W, H);

      /* 顶部步骤提示条（小字） */
      c.fillStyle = 'rgba(255,255,255,0.5)';
      c.font = '6px "Press Start 2P", monospace';
      c.fillText('STEPS ' + steps, OX, OY - 6);
    }

    function drawGhost(c, x, y, chase) {
      var baseY = y + 2;
      var body = chase ? '#e8e8ff' : '#f4f4ff';
      /* 头部圆顶 */
      c.fillStyle = body;
      c.fillRect(x + 5, baseY, 14, 4);
      c.fillRect(x + 3, baseY + 4, 18, 8);
      c.fillRect(x + 3, baseY + 12, 4, 3);
      c.fillRect(x + 9, baseY + 12, 6, 3);
      c.fillRect(x + 17, baseY + 12, 4, 3);
      /* 波浪底 */
      c.fillRect(x + 3, baseY + 15, 3, 2);
      c.fillRect(x + 8, baseY + 15, 4, 2);
      c.fillRect(x + 14, baseY + 15, 3, 2);
      c.fillRect(x + 19, baseY + 15, 2, 2);
      /* 暗眼 */
      c.fillStyle = chase ? '#e52521' : '#1a1030';
      c.fillRect(x + 7, baseY + 5, 3, 4);
      c.fillRect(x + 14, baseY + 5, 3, 4);
    }

    function updateHud() {
      setHud3('宝物', got + '/' + total);
      setHud4('分数', score);
    }

    function onKey(e, down) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = down; if (down && state === 'playing') playerStep(-1, 0); return true; }
      if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = down; if (down && state === 'playing') playerStep(1, 0); return true; }
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { keys.up = down; if (down && state === 'playing') playerStep(0, -1); return true; }
      if (k === 'ArrowDown' || k === 's' || k === 'S') { keys.down = down; if (down && state === 'playing') playerStep(0, 1); return true; }
      return false;
    }

    function onTouch(act, down) {
      if (act === 'left') { keys.left = down; if (down && state === 'playing') playerStep(-1, 0); }
      else if (act === 'right') { keys.right = down; if (down && state === 'playing') playerStep(1, 0); }
      else if (act === 'up') { keys.up = down; if (down && state === 'playing') playerStep(0, -1); }
      else if (act === 'down') { keys.down = down; if (down && state === 'playing') playerStep(0, 1); }
    }

    function touchButtons() {
      return [
        { label: '▲', act: 'up' },
        { label: '◀', act: 'left' },
        { label: '▶', act: 'right' },
        { label: '▼', act: 'down' }
      ];
    }

    return {
      id: 'ghost',
      title: '★ 鬼屋寻宝 ★',
      hint: '方向键/WASD 移动 · 收齐 8 件宝藏到达出口 · 躲开幽灵 · P 暂停 · Esc 退出',
      labels: ['宝物', '分数'],
      reset: reset,
      start: start,
      update: update,
      draw: draw,
      updateHud: updateHud,
      onKey: onKey,
      onTouch: onTouch,
      touchButtons: touchButtons
    };
  })();
  GAMES.candy = (function () {
    var COLS = 6, ROWS = 7, CELL = 36;
    var BX = (W - COLS * CELL) / 2;
    var BY = (H - ROWS * CELL) / 2;
    var WIN_SCORE = 800, GAME_TIME = 60000;
    var COL = ['#ff4b6e', '#ffd93b', '#6bff7a', '#4bb8ff', '#b96bff'];
    var LIT = ['#ff8aa3', '#ffe87a', '#a4ffaf', '#8acdff', '#d09aff'];
    var DRK = ['#c93250', '#c9a30f', '#3fc94d', '#2a8fc9', '#8a3fc9'];
    var grid = [], fy = [];
    var cursor = { r: 3, c: 2 }, selected = null;
    var swapAnim = null;
    var phase = 'idle', chain = 0, timeLeft = GAME_TIME, moves = 0;
    var removeTimer = 0, hudTimer = 0, comboMsg = 0;
    var particles = [];
    var inp = { l: { on: 0, t: 0 }, r: { on: 0, t: 0 }, u: { on: 0, t: 0 }, d: { on: 0, t: 0 } };
    var actPrev = false, actEdge = false;
    var DAS_INIT = 200, DAS_REP = 130;

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    function findGroups() {
      var groups = [];
      for (var r = 0; r < ROWS; r++) {
        var s = 0;
        for (var c = 1; c <= COLS; c++) {
          if (c < COLS && grid[r][c] !== -1 && grid[r][c] === grid[r][s] && grid[r][s] !== -1) continue;
          if (c - s >= 3 && grid[r][s] !== -1) {
            var g = [];
            for (var k = s; k < c; k++) g.push([r, k]);
            groups.push(g);
          }
          s = c;
        }
      }
      for (var c = 0; c < COLS; c++) {
        var s2 = 0;
        for (var r = 1; r <= ROWS; r++) {
          if (r < ROWS && grid[r][c] !== -1 && grid[r][c] === grid[s2][c] && grid[s2][c] !== -1) continue;
          if (r - s2 >= 3 && grid[s2][c] !== -1) {
            var g2 = [];
            for (var k = s2; k < r; k++) g2.push([k, c]);
            groups.push(g2);
          }
          s2 = r;
        }
      }
      return groups;
    }

    function fillBoard() {
      grid = []; fy = [];
      for (var r = 0; r < ROWS; r++) {
        grid[r] = []; fy[r] = [];
        for (var c = 0; c < COLS; c++) { grid[r][c] = Math.floor(Math.random() * 5); fy[r][c] = 0; }
      }
      var guard = 0;
      while (guard++ < 300) {
        var g = findGroups();
        if (g.length === 0) break;
        for (var i = 0; i < g.length; i++)
          for (var j = 0; j < g[i].length; j++) {
            var p = g[i][j];
            grid[p[0]][p[1]] = Math.floor(Math.random() * 5);
          }
      }
    }

    function spawnParticles(r, c, idx) {
      if (reduced) return;
      if (particles.length > 220) return;
      var px = BX + c * CELL + CELL / 2, py = BY + r * CELL + CELL / 2, col = COL[idx];
      for (var i = 0; i < 5; i++) {
        var a = Math.random() * 6.283, sp = 0.04 + Math.random() * 0.07;
        particles.push({ x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.04, life: 360 + Math.random() * 140, max: 500, col: col });
      }
    }

    function startRemove(groups) {
      var total = 0;
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i], len = g.length;
        total += len <= 3 ? 30 : (len === 4 ? 50 : 80);
        for (var j = 0; j < g.length; j++) {
          var r = g[j][0], c = g[j][1];
          if (grid[r][c] !== -1) { spawnParticles(r, c, grid[r][c]); grid[r][c] = -1; }
        }
      }
      score += chain * total;
      if (chain >= 2) comboMsg = 700;
      updateHud();
      if (score >= WIN_SCORE) { phase = 'idle'; swapAnim = null; winGame(); return; }
      FX.coin();
      removeTimer = reduced ? 16 : 120;
      phase = 'remove';
    }

    function startFall() {
      for (var c = 0; c < COLS; c++) {
        var stack = [];
        for (var r = 0; r < ROWS; r++) if (grid[r][c] !== -1) stack.push([grid[r][c], r]);
        var m = stack.length;
        for (var r = 0; r < ROWS; r++) { grid[r][c] = -1; fy[r][c] = 0; }
        for (var j = 0; j < m; j++) {
          var nr = ROWS - m + j;
          grid[nr][c] = stack[j][0];
          fy[nr][c] = (stack[j][1] - nr) * CELL;
        }
        var k = ROWS - m;
        for (var r = 0; r < k; r++) {
          grid[r][c] = Math.floor(Math.random() * 5);
          fy[r][c] = -k * CELL;
        }
      }
      phase = 'fall';
    }

    function pollInput(dt) {
      var mv = null;
      var D = [['l', 'left', 0, -1], ['r', 'right', 0, 1], ['u', 'up', -1, 0], ['d', 'down', 1, 0]];
      for (var i = 0; i < 4; i++) {
        var d = D[i], st = inp[d[0]], key = keys[d[1]];
        if (key) {
          if (!st.on) { st.on = 1; st.t = DAS_INIT; mv = d; }
          else { st.t -= dt; if (st.t <= 0) { st.t = DAS_REP; mv = d; } }
        } else { st.on = 0; st.t = 0; }
      }
      actEdge = keys.action && !actPrev;
      actPrev = keys.action;
      return mv;
    }

    function doAction() {
      if (selected) {
        if (cursor.r === selected.r && cursor.c === selected.c) { selected = null; FX.select(); return; }
        if (Math.abs(cursor.r - selected.r) + Math.abs(cursor.c - selected.c) === 1) {
          swapAnim = { a: { r: selected.r, c: selected.c }, b: { r: cursor.r, c: cursor.c }, t: 0, dur: reduced ? 16 : 150, back: false, p: 0 };
          phase = 'swap'; selected = null; moves++; FX.select();
        } else { selected = { r: cursor.r, c: cursor.c }; FX.select(); }
      } else { selected = { r: cursor.r, c: cursor.c }; FX.select(); }
    }

    function updateSwap(dt) {
      swapAnim.t += dt;
      var p = Math.min(1, swapAnim.t / swapAnim.dur);
      swapAnim.p = swapAnim.back ? 1 - p : p;
      if (swapAnim.t < swapAnim.dur) return;
      var a = swapAnim.a, b = swapAnim.b;
      if (!swapAnim.back) {
        var tmp = grid[a.r][a.c]; grid[a.r][a.c] = grid[b.r][b.c]; grid[b.r][b.c] = tmp;
        var g = findGroups();
        if (g.length > 0) { chain++; startRemove(g); }
        else {
          tmp = grid[a.r][a.c]; grid[a.r][a.c] = grid[b.r][b.c]; grid[b.r][b.c] = tmp;
          swapAnim.back = true; swapAnim.t = 0; FX.error();
        }
      } else { phase = 'idle'; }
    }
    function updateRemove(dt) { removeTimer -= dt; if (removeTimer <= 0) startFall(); }
    function updateFall(dt) {
      if (reduced) { for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) fy[r][c] = 0; phase = 'settle'; return; }
      var fs = 0.55, done = true;
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        if (fy[r][c] < 0) { fy[r][c] += fs * dt; if (fy[r][c] < 0) done = false; else fy[r][c] = 0; }
      }
      if (done) phase = 'settle';
    }
    function updateSettle() {
      var g = findGroups();
      if (g.length > 0) { chain++; startRemove(g); }
      else { chain = 0; phase = 'idle'; }
    }
    function updateParticles(dt) {
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.0007 * dt;
      }
    }

    function rr(c, x, y, w, h, r, color) {
      c.fillStyle = color;
      c.fillRect(x + r, y, w - 2 * r, h);
      c.fillRect(x, y + r, w, h - 2 * r);
    }
    function drawCandy(c, cellX, cellY, idx) {
      var x = cellX + 3, y = cellY + 3;
      rr(c, x, y, 30, 30, 2, DRK[idx]);
      rr(c, x + 2, y + 2, 26, 26, 2, COL[idx]);
      c.fillStyle = LIT[idx]; c.fillRect(x + 5, y + 5, 6, 6);
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(x + 5, y + 5, 3, 3);
    }
    function box(c, x, y, sz, color, th) {
      c.fillStyle = color;
      c.fillRect(x, y, sz, th);
      c.fillRect(x, y + sz - th, sz, th);
      c.fillRect(x, y + th, th, sz - 2 * th);
      c.fillRect(x + sz - th, y + th, th, sz - 2 * th);
    }
    function drawVBar(c, x, y, w, h, frac, color) {
      c.fillStyle = '#241634'; c.fillRect(x, y, w, h);
      var fh = clamp(frac, 0, 1) * h;
      c.fillStyle = color; c.fillRect(x, y + h - fh, w, fh);
      c.fillStyle = '#000';
      c.fillRect(x - 1, y - 1, w + 2, 1); c.fillRect(x - 1, y + h, w + 2, 1);
      c.fillRect(x - 1, y - 1, 1, h + 2); c.fillRect(x + w, y - 1, 1, h + 2);
    }

    return {
      id: 'candy',
      title: '★ 甜蜜炸弹 ★',
      hint: '方向键/WASD 移动光标 · 空格 选中/交换 · 连成 3+ 消除 · 60 秒内得 800 分通关 · P 暂停 · Esc 退出',
      labels: ['时间', '连击'],
      reset: function () {
        fillBoard();
        cursor = { r: 3, c: 2 }; selected = null; swapAnim = null;
        phase = 'idle'; chain = 0; timeLeft = GAME_TIME; moves = 0;
        removeTimer = 0; hudTimer = 0; comboMsg = 0; particles = [];
        inp.l.on = inp.r.on = inp.u.on = inp.d.on = 0;
        inp.l.t = inp.r.t = inp.u.t = inp.d.t = 0;
        actPrev = false; actEdge = false;
      },
      start: function () {},
      update: function (dt) {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; gameOver(); return; }
        updateParticles(dt);
        if (comboMsg > 0) comboMsg -= dt;
        var mv = pollInput(dt);
        if (phase === 'idle') {
          if (mv) { cursor.r = clamp(cursor.r + mv[2], 0, ROWS - 1); cursor.c = clamp(cursor.c + mv[3], 0, COLS - 1); }
          if (actEdge) doAction();
        }
        if (phase === 'swap') updateSwap(dt);
        else if (phase === 'remove') updateRemove(dt);
        else if (phase === 'fall') updateFall(dt);
        else if (phase === 'settle') updateSettle();
        hudTimer -= dt;
        if (hudTimer <= 0) { hudTimer = 250; updateHud(); }
      },
      draw: function (c) {
        c.fillStyle = '#160e22'; c.fillRect(0, 0, W, H);
        var tp = timeLeft / GAME_TIME;
        drawVBar(c, 22, 70, 8, 100, score / WIN_SCORE, '#6bff7a');
        drawVBar(c, 290, 70, 8, 100, tp, tp < 0.2 ? '#ff4b6e' : (tp < 0.5 ? '#ffd93b' : '#4bb8ff'));
        c.fillStyle = '#7a6a8a'; c.font = '8px "Press Start 2P", monospace'; c.textAlign = 'center';
        c.fillText('分', 26, 64); c.fillText('时', 294, 64);
        c.textAlign = 'left';
        c.fillStyle = '#241634'; c.fillRect(BX - 4, 0, COLS * CELL + 8, H);
        for (var r = 0; r < ROWS; r++) {
          for (var cc = 0; cc < COLS; cc++) {
            var cx = BX + cc * CELL, cy = BY + r * CELL;
            c.fillStyle = '#140c20'; c.fillRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
            if (grid[r][cc] === -1) continue;
            if (phase === 'swap' && swapAnim && ((r === swapAnim.a.r && cc === swapAnim.a.c) || (r === swapAnim.b.r && cc === swapAnim.b.c))) continue;
            drawCandy(c, cx, cy + fy[r][cc], grid[r][cc]);
          }
        }
        if (phase === 'swap' && swapAnim) {
          var a = swapAnim.a, b = swapAnim.b, p = swapAnim.p;
          var ax = BX + a.c * CELL, ay = BY + a.r * CELL, bx = BX + b.c * CELL, by = BY + b.r * CELL;
          drawCandy(c, ax + (bx - ax) * p, ay + (by - ay) * p, grid[a.r][a.c]);
          drawCandy(c, bx + (ax - bx) * p, by + (ay - by) * p, grid[b.r][b.c]);
        }
        if (selected) {
          var sx = BX + selected.c * CELL, sy = BY + selected.r * CELL;
          box(c, sx, sy, CELL, '#ffd93b', 2);
          if (Math.floor(Date.now() / 200) % 2 === 0) box(c, sx + 2, sy + 2, CELL - 4, '#ffffff', 1);
        }
        if (!(selected && selected.r === cursor.r && selected.c === cursor.c)) {
          if (Math.floor(Date.now() / 300) % 2 === 0) box(c, BX + cursor.c * CELL, BY + cursor.r * CELL, CELL, '#ffffff', 2);
        }
        for (var i = 0; i < particles.length; i++) {
          var pp = particles[i];
          c.globalAlpha = Math.max(0, pp.life / pp.max);
          c.fillStyle = pp.col;
          c.fillRect(Math.round(pp.x) - 2, Math.round(pp.y) - 2, 4, 4);
        }
        c.globalAlpha = 1;
        if (comboMsg > 0 && chain >= 2) {
          c.globalAlpha = Math.min(1, comboMsg / 200);
          c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(W / 2 - 44, 2, 88, 16);
          c.fillStyle = '#ffd93b'; c.font = '10px "Press Start 2P", monospace'; c.textAlign = 'center';
          c.fillText('连击 ×' + chain, W / 2, 14);
          c.textAlign = 'left';
          c.globalAlpha = 1;
        }
      },
      updateHud: function () { setHud3('时间', Math.ceil(timeLeft / 1000) + 's'); setHud4('连击', '×' + chain); },
      onKey: function (e, down) {
        var k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = down; return true; }
        if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = down; return true; }
        if (k === 'ArrowUp' || k === 'w' || k === 'W') { keys.up = down; return true; }
        if (k === 'ArrowDown' || k === 's' || k === 'S') { keys.down = down; return true; }
        if (k === ' ') {
          keys.action = down;
          if (down && (state === 'ready' || state === 'gameover' || state === 'win')) { startPlaying(); actPrev = true; }
          return true;
        }
        return false;
      },
      onTouch: function (act, down) {
        if (act === 'left') keys.left = down;
        else if (act === 'right') keys.right = down;
        else if (act === 'up') keys.up = down;
        else if (act === 'down') keys.down = down;
        else if (act === 'action') { keys.action = down; if (down && (state === 'ready' || state === 'gameover' || state === 'win')) actPrev = true; }
      },
      touchButtons: function () {
        return [
          { label: '◀', act: 'left' }, { label: '▲', act: 'up' }, { label: '▼', act: 'down' },
          { label: '▶', act: 'right' }, { label: 'ACT', act: 'action', cls: 'touch-fire' }
        ];
      }
    };
  })();

  /* ============================================================
     共享框架
     ============================================================ */
  function resetGame() {
    score = 0;
    resetKeys();
    currentGame.reset();
    updateHud();
  }

  function startPlaying() {
    if (state === 'ready') { state = 'playing'; setStatus(''); FX.select(); }
    else if (state === 'gameover' || state === 'win') { resetGame(); state = 'playing'; setStatus(''); }
  }

  function togglePause() {
    if (state === 'playing') { state = 'paused'; setStatus('PAUSED · 按 P 继续'); FX.select(); }
    else if (state === 'paused') { state = 'playing'; setStatus(''); FX.select(); }
  }

  function endGame(isWin) {
    if (state === 'gameover' || state === 'win') return;
    state = isWin ? 'win' : 'gameover';
    lastRecord = score > hi;
    if (lastRecord) { hi = score; store.setItem(HI_KEY, String(hi)); }
    updateHud();
    FX.powerUp();
    setStatus((isWin ? '通关！' : 'GAME OVER') + ' · 按回车再来一局');
  }
  /* 暴露给各游戏模块（闭包内可见） */
  function gameOver() { endGame(false); }
  function winGame() { endGame(true); }

  function drawOverlays() {
    if (state === 'idle') return;
    ctx.textAlign = 'center';
    if (state === 'ready') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 98, W, 50);
      ctx.fillStyle = '#ffb900';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillText('READY', W / 2, 126);
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('PRESS START', W / 2, 140);
    } else if (state === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 102, W, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.fillText('PAUSED', W / 2, 130);
    } else if (state === 'gameover' || state === 'win') {
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 82, W, 82);
      ctx.fillStyle = state === 'win' ? '#0c9c23' : '#e52521';
      ctx.font = '16px "Press Start 2P", monospace';
      ctx.fillText(state === 'win' ? 'YOU WIN!' : 'GAME OVER', W / 2, 112);
      ctx.fillStyle = '#ffb900';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('SCORE ' + fmt(score), W / 2, 132);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lastRecord ? 'NEW RECORD!' : 'PRESS ENTER', W / 2, 150);
    }
    ctx.textAlign = 'left';
  }

  function frame(t) {
    if (cabinet.hidden) return;
    var dt = Math.min(t - lastT || 16, 50);
    lastT = t;
    if (state === 'ready') {
      readyLeft -= dt;
      if (readyLeft <= 0) { state = 'playing'; setStatus(''); }
    } else if (state === 'playing') {
      currentGame.update(dt);
    }
    currentGame.draw(ctx);
    drawOverlays();
    loopId = requestAnimationFrame(frame);
  }

  function renderTouch() {
    if (!cabinetTouch) return;
    cabinetTouch.innerHTML = '';
    var btns = currentGame.touchButtons();

    /* 把按钮按 act 分成方向键与动作键两组 */
    var dirMap = { up: 'tp-up', down: 'tp-down', left: 'tp-left', right: 'tp-right' };
    var dirBtns = btns.filter(function (b) { return dirMap[b.act]; });
    var actBtns = btns.filter(function (b) { return !dirMap[b.act]; });

    function makeBtn(b, extraCls) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'touch-btn' + (b.cls ? ' ' + b.cls : '') + (extraCls ? ' ' + extraCls : '');
      btn.textContent = b.label;
      function down(e) {
        e.preventDefault();
        FX.unlock();
        btn.classList.add('is-down');
        currentGame.onTouch(b.act, true);
        if (state === 'ready' || state === 'gameover' || state === 'win') startPlaying();
      }
      function up() { btn.classList.remove('is-down'); currentGame.onTouch(b.act, false); }
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      /* 不用 pointerleave：多指触控时第二指落下会让第一指触发 leave，误取消移动 */
      return btn;
    }

    /* 有方向键的游戏：十字方向键 + 动作键（手柄布局） */
    if (dirBtns.length) {
      var pad = document.createElement('div');
      pad.className = 'touch-pad';
      /* 中心占位 */
      var mid = document.createElement('span');
      mid.className = 'touch-btn tp-mid';
      mid.textContent = '•';
      pad.appendChild(mid);
      dirBtns.forEach(function (b) { pad.appendChild(makeBtn(b, dirMap[b.act])); });
      cabinetTouch.appendChild(pad);
      actBtns.forEach(function (b) { cabinetTouch.appendChild(makeBtn(b)); });
    } else {
      /* 无方向键的游戏（如 invaders）：线性排列 */
      btns.forEach(function (b) { cabinetTouch.appendChild(makeBtn(b)); });
    }
  }

  function applyGameChrome() {
    if (cabinetTitle) cabinetTitle.textContent = currentGame.title;
    if (cabinetHint) cabinetHint.textContent = currentGame.hint;
    document.querySelectorAll('.cabinet-tab').forEach(function (t) {
      t.classList.toggle('is-active', t.getAttribute('data-play') === currentId);
    });
    setHud3(currentGame.labels[0] || '', '');
    setHud4(currentGame.labels[1] || '', '');
    renderTouch();
  }

  function openGame(id) {
    if (!GAMES[id]) id = 'invaders';
    var wasOpen = !cabinet.hidden;
    currentId = id;
    currentGame = GAMES[id];
    applyGameChrome();
    resetGame();
    state = 'ready';
    readyLeft = 1200;
    setStatus('READY · 按空格或回车开始');
    if (!wasOpen) {
      cabinet.hidden = false;
      cabinet.setAttribute('aria-hidden', 'false');
      document.body.classList.add('cabinet-locked');
      FX.unlock();
      FX.coin();
      if (canvas) canvas.focus();
    }
    if (!loopId) { lastT = 0; loopId = requestAnimationFrame(frame); }
  }

  function closeGame() {
    if (cabinet.hidden) return;
    cabinet.hidden = true;
    cabinet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cabinet-locked');
    if (loopId) { cancelAnimationFrame(loopId); loopId = 0; }
    resetKeys();
    state = 'idle';
  }

  /* ---------- 输入：键盘 ---------- */
  function onKeyDown(e) {
    if (cabinet.hidden) return;
    var k = e.key;
    if (k === 'Escape') { closeGame(); e.preventDefault(); return; }
    if (k === 'p' || k === 'P') { togglePause(); e.preventDefault(); return; }
    if (k === 'Enter') { FX.unlock(); startPlaying(); e.preventDefault(); return; }
    var handled = currentGame.onKey(e, true);
    if (handled) { e.preventDefault(); return; }
    if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') {
      FX.unlock();
      startPlaying();
      e.preventDefault();
    }
  }
  function onKeyUp(e) {
    if (cabinet.hidden) return;
    currentGame.onKey(e, false);
  }

  /* ---------- 绑定 ---------- */
  document.querySelectorAll('[data-play]').forEach(function (btn) {
    btn.addEventListener('click', function () { openGame(btn.getAttribute('data-play')); });
  });
  var closeBtn = document.getElementById('cabinetClose');
  if (closeBtn) closeBtn.addEventListener('click', closeGame);
  if (canvas) {
    canvas.addEventListener('click', function () {
      FX.unlock();
      if (state === 'ready' || state === 'gameover' || state === 'win') startPlaying();
    });
  }
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  /* 切走窗口自动暂停 */
  window.addEventListener('blur', function () {
    if (!cabinet.hidden && state === 'playing') {
      state = 'paused';
      setStatus('PAUSED · 按 P 继续');
    }
  });
})();
