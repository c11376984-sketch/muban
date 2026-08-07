/* ==========================================================================
   北境 NORDEN LIVING · 交互脚本
   核心：滚动渐入 / 数据温和递增 / 工艺时间线进度 + 辅助交互
   全部尊重 prefers-reduced-motion
   ========================================================================== */
(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     1. 页头滚动状态 + 回到顶部按钮
     ------------------------------------------------------------------ */
  var header = document.querySelector('.site-header');
  var toTop = document.querySelector('.to-top');
  var ticking = false;

  function onScrollState() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-scrolled', y > 24);
    if (toTop) toTop.classList.toggle('is-visible', y > 700);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScrollState);
      ticking = true;
    }
  }, { passive: true });
  onScrollState();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ------------------------------------------------------------------
     2. 移动端导航
     ------------------------------------------------------------------ */
  var navToggle = document.querySelector('.nav-toggle');
  var navList = document.querySelector('.nav-list');

  function closeNav() {
    if (navList) navList.classList.remove('is-open');
    if (navToggle) navToggle.classList.remove('is-active');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
  }

  if (navToggle && navList) {
    navToggle.addEventListener('click', function () {
      var open = navList.classList.toggle('is-open');
      navToggle.classList.toggle('is-active', open);
      navToggle.setAttribute('aria-expanded', String(open));
    });

    navList.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* ------------------------------------------------------------------
     3. 滚动渐入（IntersectionObserver，支持交错延迟）
       动画结束后移除 data-reveal，恢复卡片自身原生的 hover 过渡
     ------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll('[data-reveal]');

  function finishReveal(el) {
    // 延迟通过 setTimeout 完成，动画结束后清理属性避免影响 hover
    var done = false;
    function cleanup() {
      if (done) return;
      done = true;
      el.classList.remove('is-visible');
      el.removeAttribute('data-reveal');
      el.removeEventListener('transitionend', cleanup);
    }
    el.addEventListener('transitionend', cleanup);
    // 兜底：万一 transitionend 未触发，也恢复原生状态
    window.setTimeout(cleanup, 1400);
  }

  function revealEl(el) {
    var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
    window.setTimeout(function () {
      el.classList.add('is-visible');
      finishReveal(el);
    }, delay);
  }

  function revealAll() {
    revealEls.forEach(function (el) {
      el.classList.add('is-visible');
      el.removeAttribute('data-reveal');
    });
  }

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          revealEl(entry.target);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

    revealEls.forEach(function (el) { revealObserver.observe(el); });

    // 兜底：若异常环境导致 IO 未触发，2.5s 后直接显现已在视口内的元素
    window.setTimeout(function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      revealEls.forEach(function (el) {
        if (!el.hasAttribute('data-reveal')) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) revealEl(el);
      });
    }, 2500);
  }

  /* ------------------------------------------------------------------
     4. 数据温和递增
     ------------------------------------------------------------------ */
  var counters = document.querySelectorAll('[data-count]');

  function setCounterText(el, value) {
    el.textContent = Number(value).toLocaleString('zh-CN') + (el.dataset.suffix || '');
  }

  function animateCounter(el) {
    var target = parseFloat(el.dataset.count);
    var duration = 1600;
    var startTime = null;

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function frame(now) {
      if (startTime === null) startTime = now;
      var progress = Math.min((now - startTime) / duration, 1);
      setCounterText(el, Math.round(target * easeOutCubic(progress)));
      if (progress < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  if (prefersReducedMotion) {
    counters.forEach(function (el) { setCounterText(el, el.dataset.count); });
  } else if ('IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.7 });

    counters.forEach(function (el) { counterObserver.observe(el); });

    // 兜底：异常环境导致 IO 未触发时，直接定格最终数值
    window.setTimeout(function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      counters.forEach(function (el) {
        if (el.textContent === '0') {
          var r = el.getBoundingClientRect();
          if (r.top < vh && r.bottom > 0) animateCounter(el);
        }
      });
    }, 3000);
  } else {
    counters.forEach(function (el) { setCounterText(el, el.dataset.count); });
  }

  /* ------------------------------------------------------------------
     5. 工艺时间线：进度条 + 节点点亮
     ------------------------------------------------------------------ */
  var timeline = document.querySelector('.timeline');
  var timelineFill = document.querySelector('.timeline__fill');
  var timelineItems = document.querySelectorAll('.timeline__item');

  function updateTimeline() {
    if (!timeline) return;
    var rect = timeline.getBoundingClientRect();
    var viewportH = window.innerHeight || document.documentElement.clientHeight;
    // 时间线从进入视口 65% 处开始填充，滑到视口底部完成
    var startAt = viewportH * 0.65;
    var passed = Math.max(startAt - rect.top, 0);
    var progress = Math.min(passed / rect.height, 1);

    if (timelineFill) timelineFill.style.height = Math.round(progress * 100) + '%';

    timelineItems.forEach(function (item) {
      var itemRect = item.getBoundingClientRect();
      if (itemRect.top < startAt) {
        item.classList.add('is-reached');
      } else {
        item.classList.remove('is-reached');
      }
    });
  }

  if (timeline && timelineFill) {
    if (prefersReducedMotion) {
      timelineFill.style.height = '100%';
      timelineItems.forEach(function (item) { item.classList.add('is-reached'); });
    } else {
      var timelineTicking = false;
      window.addEventListener('scroll', function () {
        if (!timelineTicking) {
          window.requestAnimationFrame(function () {
            updateTimeline();
            timelineTicking = false;
          });
          timelineTicking = true;
        }
      }, { passive: true });
      updateTimeline();
    }
  }

  /* ------------------------------------------------------------------
     6. 心愿单按钮
     ------------------------------------------------------------------ */
  var wishButtons = document.querySelectorAll('.btn--wish');

  wishButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var added = btn.getAttribute('aria-pressed') === 'true';
      if (added) {
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.remove('is-added');
        btn.lastChild.textContent = ' 加入心愿单';
      } else {
        btn.setAttribute('aria-pressed', 'true');
        btn.classList.add('is-added');
        btn.lastChild.textContent = ' 已在心愿单';
      }
    });
  });

  /* ------------------------------------------------------------------
     7. 订阅表单
     ------------------------------------------------------------------ */
  var form = document.querySelector('.newsletter-form');
  var formMsg = document.querySelector('.newsletter-form__msg');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('.newsletter-form__input');
      var email = input.value.trim();

      if (!formMsg) return;

      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

      if (!email) {
        formMsg.textContent = '请先写下你的邮箱地址。';
        formMsg.className = 'newsletter-form__msg is-err';
        input.focus();
        return;
      }
      if (!emailPattern.test(email)) {
        formMsg.textContent = '这个邮箱看起来不对，再检查一下？';
        formMsg.className = 'newsletter-form__msg is-err';
        input.focus();
        return;
      }

      formMsg.textContent = '谢谢你，「北境季报」正在飞向你。';
      formMsg.className = 'newsletter-form__msg is-ok';
      input.value = '';
      input.setAttribute('aria-invalid', 'false');
    });

    form.addEventListener('input', function (e) {
      if (e.target.matches('.newsletter-form__input')) {
        e.target.setAttribute('aria-invalid', 'false');
        if (formMsg && formMsg.className.indexOf('is-') !== -1) {
          formMsg.textContent = '';
          formMsg.className = 'newsletter-form__msg';
        }
      }
    });
  }

  /* ------------------------------------------------------------------
     8. 导航滚动高亮（Scrollspy）
     ------------------------------------------------------------------ */
  var navLinks = document.querySelectorAll('.nav-list a[href^="#"]');

  if (navLinks.length && 'IntersectionObserver' in window) {
    var sections = [];
    navLinks.forEach(function (link) {
      var el = document.querySelector(link.getAttribute('href'));
      if (el) sections.push(el);
    });

    if (sections.length) {
      var spyObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navLinks.forEach(function (l) { l.classList.remove('is-active'); });
            var active = document.querySelector('.nav-list a[href="#' + entry.target.id + '"]');
            if (active) active.classList.add('is-active');
          }
        });
      }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

      sections.forEach(function (sec) { spyObserver.observe(sec); });
    }
  }
})();
