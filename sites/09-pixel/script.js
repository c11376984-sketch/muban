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
})();
