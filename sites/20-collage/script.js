/* =========================================================
   拼贴艺术 · 独立杂志「剪贴 CLIP CLUB」 script.js
   纯原生 JS，无外部依赖
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 1. 顶部导航（移动端菜单） ---------- */
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var open = mainNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // 点击导航链接后收起移动端菜单
    mainNav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
    // 焦点离开导航区时收起
    mainNav.addEventListener('focusout', function (e) {
      if (!mainNav.contains(e.relatedTarget)) {
        mainNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- 2. 封面日期自动生成 ---------- */
  var dateEl = document.querySelector('[data-date]');
  if (dateEl) {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    dateEl.textContent = '独立文化 · 第八卷 · 第 20 期 · ' + y + '.' + m;
  }

  /* ---------- 3. 阅读进度条（撕纸小条） ---------- */
  var bar = document.getElementById('progressBar');
  var ticking = false;
  function paintProgress() {
    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - doc.clientHeight;
    var p = scrollable > 0 ? (doc.scrollTop || window.pageYOffset) / scrollable : 0;
    bar.style.width = Math.min(100, p * 100) + '%';
    ticking = false;
  }
  if (bar) {
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(paintProgress);
      }
    }, { passive: true });
    paintProgress();
  }

  /* ---------- 4. 滚动显现（错落纸片逐片露出） ---------- */
  var revealEls = document.querySelectorAll('.feature, .piece, .founder-polaroid, .founder-text, .ticket');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) {
      el.classList.add('reveal');
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 5. 拼贴墙「重摆一遍」随机错落 ---------- */
  var grid = document.getElementById('worksGrid');
  var shuffleBtn = document.getElementById('shuffleBtn');

  if (grid && shuffleBtn) {
    var TILTS = [-2.2, -1.3, -0.4, 0.5, 1.2, 2, -2.6, 1.7];
    function shufflePieces() {
      // 随机旋转每件作品（符合拼贴感）
      Array.prototype.forEach.call(grid.children, function (piece, i) {
        var t = TILTS[(Math.random() * TILTS.length) | 0];
        piece.style.setProperty('--tilt', t + 'deg');
        if (reduceMotion) return;
        piece.style.transition = 'transform .45s cubic-bezier(.2,.7,.3,1.2)';
        piece.animate(
          [
            { transform: 'translateY(0) rotate(' + t + 'deg) scale(1)' },
            { transform: 'translateY(-18px) rotate(' + (t - 4) + 'deg) scale(1.04)' },
            { transform: 'translateY(0) rotate(' + t + 'deg) scale(1)' }
          ],
          { duration: 460, delay: i * 34, easing: 'cubic-bezier(.2,.7,.3,1.2)' }
        );
        piece.addEventListener('transitionend', function h() {
          piece.style.transition = '';
          piece.removeEventListener('transitionend', h);
        });
      });
    }
    shuffleBtn.addEventListener('click', shufflePieces);
  }

  /* ---------- 6. 订阅「盖章」交互 ---------- */
  var form = document.getElementById('subForm');
  var emailInput = document.getElementById('emailInput');
  var subNote = document.getElementById('subNote');
  var ticketStamp = document.getElementById('ticketStamp');

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function stampTicket() {
    if (!ticketStamp) return;
    ticketStamp.style.animation = 'none';
    // 强制重排以重启动画
    void ticketStamp.offsetWidth;
    ticketStamp.style.animation = 'stampIn .5s .2s both';
  }

  if (form && emailInput && subNote) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = emailInput.value.trim();

      if (!val) {
        subNote.textContent = '✂ 先写下一个邮箱，纸片才有地方寄出。';
        emailInput.focus();
        return;
      }
      if (!EMAIL_RE.test(val)) {
        subNote.textContent = '✂ 这个地址像是被撕坏了，请再检查一遍。';
        emailInput.focus();
        return;
      }

      subNote.textContent = '✓ 盖章成功！第 20 期已抄送你的收件箱（创意提示：订阅即赠手工拼贴素材包）。';
      stampTicket();
      emailInput.value = '';
    });
  }

  /* ---------- 7. 作品墙 hover 音感徽记（装饰，纯视觉旁白） ---------- */
  // 为键盘用户提示作品可聚焦（作品本身非交互，仅装饰，保持无 tabindex）
  // 此项仅为可读性注释，不做 DOM 改动，避免干扰无障碍树。

})();
