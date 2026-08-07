/* ============================================================
   午夜驱动 MIDNIGHT DRIVE — 交互脚本（纯原生，无外部依赖）
   功能：混音带播放器 / 节目表实时高亮 / 移动菜单 / 回到顶部 / 表单校验
   ============================================================ */
(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. 移动端导航 ---------- */
  const navToggle = $('#navToggle');
  const primaryMenu = $('#primaryMenu');

  if (navToggle && primaryMenu) {
    navToggle.addEventListener('click', function () {
      const open = primaryMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });
    // 点击菜单链接后收起
    $$('.nav-link', primaryMenu).forEach(function (link) {
      link.addEventListener('click', function () {
        primaryMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- 2. 回到顶部按钮 ---------- */
  const backTop = $('#backTop');
  if (backTop) {
    const onScroll = function () {
      const show = window.scrollY > 500;
      backTop.classList.toggle('show', show);
      backTop.setAttribute('aria-hidden', String(!show));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 3. 混音带播放器（模拟播放） ---------- */
  const tapes = $$('.tape');
  const npTitle = $('#npTitle');
  const npDesc = $('#npDesc');
  const npProgress = $('#npProgress');
  const tapesData = [
    { name: 'M-001 城市光脉', desc: 'CITY PULSE · 45 分钟', total: 2700 },
    { name: 'M-002 南岸霓虹', desc: 'NEON COAST · 52 分钟', total: 3120 },
    { name: 'M-003 蒸汽黎明', desc: 'STEAM DAWN · 38 分钟', total: 2280 },
    { name: 'M-004 天际线以下', desc: 'BELOW SKYLINE · 61 分钟', total: 3660 }
  ];

  let current = 0;   // 当前播放的磁带序号
  let playing = true; // 第一盘默认播放
  let elapsed = 0;
  let timerId = null;

  const pad = function (n) { return n < 10 ? '0' + n : String(n); };
  const fmt = function (sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return pad(m) + ':' + pad(s);
  };

  function renderNow() {
    const data = tapesData[current];
    if (npTitle) npTitle.textContent = data.name;
    if (npDesc) npDesc.textContent = data.desc;
    if (npProgress) npProgress.style.width = Math.min(100, (elapsed / data.total) * 100) + '%';
    // 同步磁带条 UI
    tapes.forEach(function (tape, i) {
      const active = (i === current);
      tape.classList.toggle('playing', active && playing);
      tape.classList.toggle('paused', active && !playing);
      tape.setAttribute('aria-pressed', String(active && playing));
      const timeEl = $('.tape-time', tape);
      if (timeEl) timeEl.textContent = active ? fmt(elapsed) : timeEl.getAttribute('data-time');
      const icon = $('.tape-btn svg', tape);
      if (icon) icon.innerHTML = (active && playing)
        ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>'   // 暂停
        : '<path d="M8 5v14l11-7z"/>';              // 播放
    });
  }

  function tick() {
    elapsed += 1;
    if (elapsed >= tapesData[current].total) elapsed = 0; // 循环播放
    renderNow();
  }

  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  function playTape(index) {
    if (index === current) {
      // 同一盘：切换播放/暂停
      playing = !playing;
    } else {
      current = index;
      elapsed = 0;
      playing = true;
    }
    if (playing) {
      stopTimer();
      timerId = setInterval(tick, 1000);
    } else {
      stopTimer();
    }
    renderNow();
  }

  function initTapes() {
    if (!tapes.length) return;
    // 初始 UI 状态
    renderNow();
    if (playing) timerId = setInterval(tick, 1000);

    tapes.forEach(function (tape, i) {
      tape.addEventListener('click', function () { playTape(i); });
    });

    // 空格键播放/暂停（焦点在页面时）
    document.addEventListener('keydown', function (e) {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'button' || tag === 'a') return;
      if (e.code === 'Space') {
        e.preventDefault();
        playTape(current);
      }
    });
  }
  initTapes();

  /* ---------- 4. 节目表：按当前时间高亮 ---------- */
  const rows = $$('.sched-table tbody tr[data-hour]');
  function highlightSchedule() {
    const now = new Date();
    const hour = now.getHours();
    const min = now.getMinutes();
    const val = hour * 100 + min;
    rows.forEach(function (row) {
      const h = Number(row.getAttribute('data-hour'));
      const start = h * 100;
      const end = start + 100;
      let live = false;
      if (h === 0) {
        live = (val >= 0 && val < 100);           // 00:00-00:59
      } else {
        live = (val >= start && val < end);
      }
      row.classList.toggle('live-now', live);
      const badge = $('.badge', row);
      if (badge) {
        if (live) {
          badge.textContent = '直播中';
          badge.className = 'badge badge-live';
        }
      }
    });
  }
  if (rows.length) {
    highlightSchedule();
    setInterval(highlightSchedule, 60000); // 每分钟刷新
  }

  /* ---------- 5. 加入表单校验 ---------- */
  const joinForm = $('#joinForm');
  if (joinForm) {
    const msg = $('#formMsg');
    joinForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const handle = $('#handle');
      const email = $('#email');
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      const handleOk = handle.value.trim().length >= 2;

      let error = '';
      if (!handleOk) error = '请先输入你的呼号（至少 2 个字符）。';
      else if (!emailOk) error = '电子邮箱格式不正确，请重新输入。';

      if (error) {
        msg.textContent = '!! ' + error;
        msg.classList.add('error');
        (handleOk ? email : handle).focus();
        return;
      }
      msg.classList.remove('error');
      msg.textContent = '信号已发射，欢迎加入午夜家族。';
      joinForm.reset();
      // 故障小彩蛋：短暂横条划过
      if (!reducedMotion) {
        joinForm.style.animation = 'none';
        void joinForm.offsetWidth;
        joinForm.style.animation = 'form-glitch .3s steps(2) 1';
      }
    });
  }

  /* ---------- 6. 顶栏滚动阴影 + 开屏视差 ---------- */
  const header = $('.site-header');
  const heroGrid = $('.hero-grid');
  let ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      const y = window.scrollY;
      if (header) header.classList.toggle('scrolled', y > 10);
      if (heroGrid && !reducedMotion && y < window.innerHeight) {
        heroGrid.style.transform =
          'translateX(-50%) perspective(420px) rotateX(' + (58 - y * 0.02) + 'deg)';
      }
      ticking = false;
    });
  }, { passive: true });
})();
