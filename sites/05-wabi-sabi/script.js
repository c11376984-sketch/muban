/* 苔庭 KOKEI NIWA — 交互脚本
   1. 滚动渐显（克制）
   2. 水墨笔触 SVG 描绘
   3. 茶道时间线进度
   4. 折叠菜单 + 预约表单
   均尊重 prefers-reduced-motion */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    /* ---------- 1. 滚动渐显 ---------- */
    var revealEls = document.querySelectorAll('[data-reveal]');
    if ('IntersectionObserver' in window && !reduce) {
      var revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            revealIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
      revealEls.forEach(function (el) { revealIO.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('is-in'); });
    }

    /* ---------- 2. 水墨笔触描绘 ---------- */
    var brushes = document.querySelectorAll('.brush[data-draw]');
    function drawBrush(el) {
      var path = el.querySelector('path');
      if (!path) return;
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      /* 强制重排，使 transition 生效 */
      void path.getBoundingClientRect();
      path.style.transition =
        'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1) ' + (el.dataset.delay || 80) + 'ms';
      requestAnimationFrame(function () {
        path.style.strokeDashoffset = '0';
      });
    }
    if ('IntersectionObserver' in window && !reduce) {
      brushes.forEach(function (el) { el.classList.add('is-armed'); });
      var brushIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            drawBrush(entry.target);
            brushIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      brushes.forEach(function (el) { brushIO.observe(el); });
    }
    /* reduce 或无 IO：直接显示整条笔触 */

    /* ---------- 3. 茶道时间线进度 ---------- */
    var timeline = document.querySelector('.timeline');
    var progress = document.querySelector('.timeline__progress');
    if (timeline && progress) {
      if (!reduce) {
        var updateProgress = function () {
          var rect = timeline.getBoundingClientRect();
          var vh = window.innerHeight;
          var start = vh * 0.78;
          var end = vh * 0.22;
          var t = (start - rect.top) / (start - end);
          t = Math.max(0, Math.min(1, t));
          progress.style.transform = 'scaleY(' + t + ')';
        };
        window.addEventListener('scroll', updateProgress, { passive: true });
        window.addEventListener('resize', updateProgress);
        updateProgress();
      } else {
        progress.style.transform = 'scaleY(1)';
      }
    }

    /* ---------- 4a. 折叠菜单 ---------- */
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        toggle.setAttribute('aria-label', open ? '开启菜单' : '关闭菜单');
        nav.classList.toggle('is-open', !open);
      });
      /* 点击菜单内链接后收起 */
      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          toggle.setAttribute('aria-expanded', 'false');
          toggle.setAttribute('aria-label', '开启菜单');
          nav.classList.remove('is-open');
        }
      });
      /* Esc 关闭 */
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) {
          toggle.setAttribute('aria-expanded', 'false');
          nav.classList.remove('is-open');
          toggle.focus();
        }
      });
    }

    /* ---------- 4b. 预约表单 ---------- */
    var form = document.querySelector('.reserve-form');
    if (form) {
      var dateInput = form.querySelector('input[type="date"]');
      if (dateInput) {
        var t = new Date();
        t.setDate(t.getDate() + 1);
        var iso = t.getFullYear() + '-' +
          String(t.getMonth() + 1).padStart(2, '0') + '-' +
          String(t.getDate()).padStart(2, '0');
        dateInput.min = iso;
        dateInput.value = iso;
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var done = form.querySelector('.reserve-form__done');
        if (done) done.hidden = false;
        var btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
      });
    }
  });
})();
