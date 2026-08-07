/* =====================================================================
   星港 NOVA PORT · 星际殖民计划 —— script.js
   canvas 星尘粒子 / 倒计时 / 导航 / 滚动视差 / 数据流 / 表单校验
===================================================================== */
(function () {
  'use strict';

  /* ---------- 工具 ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==================================================================
     1. canvas 星尘粒子背景（流星 / 闪烁）
  ================================================================== */
  function initStarfield() {
    const canvas = $('#starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const hero = canvas.parentElement;

    let stars = [];
    let meteors = [];
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

    const PALETTE = ['#eaf6ff', '#ffffff', '#9fd8ff', '#c9b8ff', '#ffd9a8'];

    function resize() {
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }

    function buildStars() {
      const count = Math.min(240, Math.floor((w * h) / 4200));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.3,
        baseAlpha: Math.random() * 0.5 + 0.25,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.004,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)]
      }));
    }

    function spawnMeteor() {
      meteors.push({
        x: Math.random() * w,
        y: -20,
        vx: (Math.random() * 2.4 + 1.4) * (w / 900),
        vy: Math.random() * 1.4 + 1.6,
        life: 1,
        tail: 6 + Math.random() * 10
      });
      if (meteors.length > 6) meteors.shift();
    }

    let frame = 0;
    function draw(t) {
      ctx.clearRect(0, 0, w, h);

      // 星尘
      for (const s of stars) {
        s.twinkle += s.speed;
        const alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(s.twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }

      // 流星
      if (frame % 90 === 0 && meteors.length < 3) spawnMeteor();
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx;
        m.y += m.vy;
        m.life -= 0.008;
        if (m.life <= 0 || m.x > w + 40 || m.y > h + 40) {
          meteors.splice(i, 1);
          continue;
        }
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * m.tail, m.y - m.vy * m.tail);
        grad.addColorStop(0, 'rgba(234,246,255,' + (0.9 * m.life) + ')');
        grad.addColorStop(1, 'rgba(123,92,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * m.tail, m.y - m.vy * m.tail);
        ctx.stroke();
        ctx.globalAlpha = m.life;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame++;

      if (prefersReducedMotion) return; // 静态渲染一帧
      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();

    if (prefersReducedMotion) {
      draw(0); // 只画一帧静态星空
    } else {
      requestAnimationFrame(draw);
    }
  }

  /* ==================================================================
     2. 实时倒计时（距目标日期）
  ================================================================== */
  function initCountdown() {
    const el = { d: $('#cd-days'), h: $('#cd-hours'), m: $('#cd-min'), s: $('#cd-sec') };
    if (!el.d) return;

    // 目标：2026-08-17 首发窗口（本地时间）
    const target = new Date('2026-08-17T09:00:00').getTime();

    function pad(n, len) {
      return String(Math.max(0, n)).padStart(len || 2, '0');
    }

    function tick() {
      let diff = target - Date.now();
      if (diff < 0) diff = 0; // 已发射
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.d.textContent = pad(d, 3);
      el.h.textContent = pad(h);
      el.m.textContent = pad(m);
      el.s.textContent = pad(s);
    }

    tick();
    setInterval(tick, 1000);
  }

  /* ==================================================================
     3. 移动端导航开关
  ================================================================== */
  function initNav() {
    const toggle = $('.nav__toggle');
    const menu = $('#nav-menu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
    }

    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // 点击链接后关闭菜单
    $$('a', menu).forEach((a) => {
      a.addEventListener('click', () => setOpen(false));
    });

    // Escape 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  /* ==================================================================
     4. 视差滚动（星球 / 开屏元素）
  ================================================================== */
  function initParallax() {
    const targets = $$('[data-parallax]');
    if (!targets.length) return;

    if (prefersReducedMotion) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        targets.forEach((el) => {
          const speed = parseFloat(el.dataset.parallax || 0.2);
          el.style.transform = 'translateY(' + (y * speed) + 'px)';
        });
        ticking = false;
      });
    }, { passive: true });
  }

  /* ==================================================================
     5. 滚动进场动画（IntersectionObserver）
  ================================================================== */
  function initReveal() {
    const els = $$('.section, .timeline__card, .fleet__card, .log__feed, .log__entry, .apply__intro, .apply__form, .route-map');
    els.forEach((el) => el.classList.add('reveal'));

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach((el) => io.observe(el));
  }

  /* ==================================================================
     6. 科考日志数据流（模拟深空遥测）
  ================================================================== */
  function initLogFeed() {
    const stream = $('#log-stream');
    if (!stream) return;

    const tags = ['TRANSMISSION', 'ICE-DRILL', 'BIOSCAN', 'ORBIT', 'WARNING', 'POWER-CELL', 'METEOR'];
    const texts = [
      '特提斯-7 钻机深度 9.2km，热流稳定。',
      '木卫二表面冰壳反照率 +0.8%，潮汐热活动增强。',
      '轨道器捕获到 12 Hz 周期性的冰震信号。',
      '样本舱 SE-17 温控正常，有机物衰减率 0.3%/h。',
      '太阳高能粒子通量偏低，适合舱外作业。',
      '生态舱 O₂ 循环利用率 99.4%，叶绿素指标正常。',
      '中继站正在同步 40 TB 光谱数据至泰坦轨道。'
    ];

    let i = 0;

    function push() {
      const msg = document.createElement('p');
      const time = new Date().toUTCString().slice(17, 25);
      msg.className = 'log__msg' + (i % 4 === 0 ? ' log__msg--alert' : '');
      msg.innerHTML =
        '<span class="log__msg-time">[' + time + ' · ' + tags[i % tags.length] + ']</span>' +
        '<span class="log__msg-text">' + texts[i % texts.length] + '</span>';
      stream.prepend(msg);
      // 限制条数
      while (stream.children.length > 9) stream.lastElementChild.remove();
      i++;
    }

    push();
    if (!prefersReducedMotion) setInterval(push, 3500);
  }

  /* ==================================================================
     7. 报名表单校验与反馈
  ================================================================== */
  function initForm() {
    const form = $('#apply-form');
    if (!form) return;
    const errorBox = $('#form-error');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.elements.name.value.trim();
      const consent = form.elements.consent.checked;
      errorBox.hidden = true;

      if (!name) {
        errorBox.textContent = '错误：请填写全名，星际公民档案需要实名登记。';
        errorBox.hidden = false;
        form.elements.name.focus();
        return;
      }
      if (!consent) {
        errorBox.textContent = '错误：需同意《深空移民协议》后方可提交。';
        errorBox.hidden = false;
        form.elements.consent.focus();
        return;
      }

      // 生成 8 位公民编号
      const code = 'NP-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      form.innerHTML =
        '<div class="apply__success" role="status">' +
          '<p class="apply__form-title">TRANSMISSION ACCEPTED</p>' +
          '<p class="apply__success-code" style="font-family:var(--font-display);font-size:1.6rem;letter-spacing:0.12em;color:var(--electric-blue);text-shadow:0 0 16px rgba(31,182,255,.6);margin-bottom:14px;">' + code + '</p>' +
          '<p style="color:#bcd3ea;">欢迎加入深空殖民计划，' + escapeHtml(name) + '。' +
          '你的星际公民档案已加密上传至星港指挥中心，出发前 90 日将收到生理适配评估通知。</p>' +
        '</div>';
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ==================================================================
     启动
  ================================================================== */
  function init() {
    initStarfield();
    initCountdown();
    initNav();
    initParallax();
    initReveal();
    initLogFeed();
    initForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
