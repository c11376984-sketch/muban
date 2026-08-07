/* ============================================================
   璃想 · 玻璃拟态 Glassmorphism —— 全部交互
   纯原生 JS，无外部依赖，控制台零报错。
   功能：
     1. 标记 JS 可用（控制 .reveal 初始隐藏）
     2. 页头滚动态
     3. 页脚年份
     4. 移动端导航开关（aria-expanded / Esc / 点击导航项关闭 / 视口变化复位）
     5. 滚动显现动画（IntersectionObserver + 兄弟错峰）
     6. 流程标签页（点击 + 方向键 / Home / End）
     7. 数据计数（进入视口后滚动计数，尊重 prefers-reduced-motion）
     8. 评价轮播（圆点导航 + 自动播放 + 触摸滑动 + 键盘 + 桌面网格高亮）
     9. 回到顶部
    10. 导航滚动高亮（scrollspy）
    11. Hero 玻璃原型 3D 视差倾斜（仅桌面精确指针）
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 工具 ---------- */
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.documentElement.classList.add('js');

  /* ---------- 2. 页头滚动态 ---------- */
  var header = $('#siteHeader');
  function updateHeader() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  /* ---------- 3. 页脚年份 ---------- */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- 4. 移动端导航 ---------- */
  var navToggle = $('#navToggle');
  var navMenu = $('#navMenu');
  var mqNav = window.matchMedia('(min-width: 1024px)');

  function setMenu(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    document.body.classList.toggle('menu-open', open);
    header.classList.toggle('is-open', open);
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
    });

    // 点击导航项后收起抽屉
    $$('a[data-nav]', navMenu).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });

    // Esc 关闭并归还焦点
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        navToggle.focus();
      }
    });

    // 视口回到桌面时复位
    mqNav.addEventListener('change', function (e) {
      if (e.matches && navToggle.getAttribute('aria-expanded') === 'true') setMenu(false);
    });
  }

  /* ---------- 5. 滚动显现动画 ---------- */
  var revealEls = $$('.reveal');
  function revealNow(el) {
    el.classList.add('is-visible');
  }
  if (revealEls.length) {
    if ('IntersectionObserver' in window) {
      // 同一父级内的 reveal 兄弟错峰
      revealEls.forEach(function (el) {
        if (el.closest('.flow-panel:not(.is-active)')) return; // 隐藏面板交给标签页逻辑
        var siblings = $$('.reveal', el.parentElement).filter(function (s) { return s.parentElement === el.parentElement; });
        var idx = siblings.indexOf(el);
        if (idx > -1) el.style.setProperty('--d', Math.min(idx, 6) * 90 + 'ms');
      });

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            revealNow(en.target);
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

      revealEls.forEach(function (el) {
        if (el.closest('.flow-panel:not(.is-active)')) return;
        if (!el.classList.contains('is-visible')) io.observe(el);
      });
    } else {
      revealEls.forEach(revealNow);
    }
  }

  /* ---------- 6. 流程标签页 ---------- */
  var tablist = $('.flow-tabs');
  var tabs = $$('.flow-tab');
  var panels = $$('.flow-panel');

  function activateStep(i) {
    tabs.forEach(function (t, idx) {
      var on = idx === i;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p) {
      var on = p.dataset.panel === String(i);
      p.classList.toggle('is-active', on);
      if (on) {
        // 激活时补触发内部 reveal（此前处于 display:none 不会被观察）
        revealNow(p);
        $$('.reveal', p).forEach(revealNow);
      }
    });
  }

  if (tablist && tabs.length) {
    tabs.forEach(function (t, idx) {
      t.addEventListener('click', function () { activateStep(idx); });
    });
    // 方向键 / Home / End 键盘导航
    tablist.addEventListener('keydown', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) === -1) return;
      e.preventDefault();
      var cur = tabs.indexOf(document.activeElement);
      var next = cur;
      if (e.key === 'ArrowRight') next = (cur + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (cur - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      tabs[next].focus();
      activateStep(next);
    });
  }

  /* ---------- 7. 数据计数 ---------- */
  var counters = $$('[data-count]');
  function runCounter(el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    var suffix = el.dataset.suffix || '';
    if (prefersReduced.matches) {
      el.textContent = target + suffix;
      return;
    }
    var duration = 1600;
    var start = null;
    function tick(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if (counters.length) {
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            runCounter(en.target);
            cio.unobserve(en.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (c) { cio.observe(c); });
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ---------- 8. 评价轮播 ---------- */
  var track = $('#voicesTrack');
  var dots = $$('.voice-dot');
  var voiceCards = $$('.voice-card');
  var mqDesktop = window.matchMedia('(min-width: 1024px)');
  var isDesktop = mqDesktop.matches;
  var vIdx = 0;
  var autoTimer = null;

  function setVoice(i, jump) {
    vIdx = (i + voiceCards.length) % voiceCards.length;
    dots.forEach(function (d, k) { d.classList.toggle('is-active', k === vIdx); });
    if (isDesktop) {
      voiceCards.forEach(function (c, k) { c.classList.toggle('is-active', k === vIdx); });
    } else {
      track.style.setProperty('--idx', vIdx);
      voiceCards.forEach(function (c) { c.classList.remove('is-active'); });
    }
  }
  function startAuto() {
    stopAuto();
    if (prefersReduced.matches || voiceCards.length < 2) return;
    autoTimer = setInterval(function () { setVoice(vIdx + 1); }, 5500);
  }
  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  if (track && voiceCards.length) {
    setVoice(0);

    dots.forEach(function (d, k) {
      d.addEventListener('click', function () { setVoice(k); startAuto(); });
    });

    // 悬停 / 聚焦时暂停自动播放
    track.addEventListener('mouseenter', stopAuto);
    track.addEventListener('mouseleave', startAuto);
    track.addEventListener('focusin', stopAuto);
    track.addEventListener('focusout', startAuto);

    // 键盘左右切换
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); setVoice(vIdx + 1); startAuto(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setVoice(vIdx - 1); startAuto(); }
    });

    // 触摸滑动
    var touchX = null;
    track.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; stopAuto(); }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) setVoice(dx < 0 ? vIdx + 1 : vIdx - 1);
      touchX = null;
      startAuto();
    }, { passive: true });

    // 断点切换
    mqDesktop.addEventListener('change', function (e) {
      isDesktop = e.matches;
      setVoice(vIdx);
      startAuto();
    });
  }

  /* ---------- 9. 回到顶部 ---------- */
  var toTop = $('#toTop');
  if (toTop) {
    window.addEventListener('scroll', function () {
      toTop.classList.toggle('is-visible', window.scrollY > 600);
    }, { passive: true });
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReduced.matches ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 10. 导航滚动高亮 ---------- */
  var navLinks = $$('.nav-list a[data-nav]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var sections = navLinks
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + en.target.id;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'location');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 11. Hero 玻璃原型 3D 视差 ---------- */
  var heroStage = $('#heroStage');
  var heroEl = $('#hero');
  if (heroStage && heroEl && !prefersReduced.matches && window.matchMedia('(pointer: fine)').matches) {
    var tiltRaf = null;
    heroEl.addEventListener('mousemove', function (e) {
      if (!heroStage.classList.contains('is-visible')) return;
      var r = heroEl.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      if (tiltRaf) cancelAnimationFrame(tiltRaf);
      tiltRaf = requestAnimationFrame(function () {
        heroStage.style.transform =
          'perspective(1200px) rotateX(' + (-py * 5).toFixed(2) + 'deg) rotateY(' + (px * 6).toFixed(2) + 'deg)';
      });
    });
    heroEl.addEventListener('mouseleave', function () {
      if (tiltRaf) cancelAnimationFrame(tiltRaf);
      heroStage.style.transform = '';
    });
  }
})();
