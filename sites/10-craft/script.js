/* =========================================================
   纸间 PAPER STITCH · script.js
   导航 / 翻转卡片 / 撕纸条 / 滚动显现 / 表单
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 年份 ---------- */
  var now = String(new Date().getFullYear());
  document.querySelectorAll('.js-year').forEach(function (el) {
    el.textContent = now;
  });

  /* ---------- 移动端导航 ---------- */
  var navToggle = document.getElementById('nav-toggle');
  var siteNav = document.getElementById('site-nav');

  function openNav() {
    root.classList.add('nav-open');
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', '关闭菜单');
  }
  function closeNav() {
    root.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', '打开菜单');
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      if (root.classList.contains('nav-open')) { closeNav(); } else { openNav(); }
    });
    siteNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { closeNav(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeNav(); }
    });
  }

  /* ---------- 成品集：翻转卡片 ---------- */
  function toggleFlip(card) {
    var flipped = card.classList.toggle('is-flipped');
    card.setAttribute('aria-pressed', flipped ? 'true' : 'false');
  }

  document.querySelectorAll('.g-card').forEach(function (card) {
    card.addEventListener('click', function () { toggleFlip(card); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFlip(card);
      }
    });
  });

  /* ---------- 撕开纸条 ---------- */
  document.querySelectorAll('.peel-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var peel = btn.closest('.peel');
      var open = peel.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- 滚动显现 ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-inview'); });
  }

  /* ---------- 报名表单 ---------- */
  var form = document.getElementById('signup-form');
  var success = document.getElementById('form-success');

  function showError(input, message) {
    var field = input.closest('.field');
    field.classList.add('field--error');
    input.setAttribute('aria-invalid', 'true');
    var err = field.querySelector('.field-error');
    if (!err) {
      err = document.createElement('p');
      err.className = 'field-error';
      err.id = 'err-' + input.id;
      field.appendChild(err);
      input.setAttribute('aria-describedby', err.id);
    }
    err.textContent = message;
  }
  function clearError(input) {
    var field = input.closest('.field');
    field.classList.remove('field--error');
    input.removeAttribute('aria-invalid');
    var err = field.querySelector('.field-error');
    if (err) {
      input.removeAttribute('aria-describedby');
      err.remove();
    }
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = form.querySelectorAll('input, select, textarea');
      fields.forEach(clearError);

      var name = document.getElementById('f-name');
      var phone = document.getElementById('f-phone');
      var email = document.getElementById('f-email');
      var course = document.getElementById('f-course');

      var firstInvalid = null;

      if (!name.value.trim()) {
        firstInvalid = firstInvalid || name;
        showError(name, '想先认识你一下，告诉我怎么称呼你');
      }
      if (!/^1[0-9]{10}$/.test(phone.value.replace(/\s+/g, ''))) {
        firstInvalid = firstInvalid || phone;
        showError(phone, '手机号要 11 位，以 1 开头');
      }
      if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        firstInvalid = firstInvalid || email;
        showError(email, '这封邮箱地址看起来不太对');
      }
      if (!course.value) {
        firstInvalid = firstInvalid || course;
        showError(course, '选一门想上的课吧');
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      form.hidden = true;
      success.hidden = false;
      success.setAttribute('tabindex', '-1');
      success.focus();
    });
  }
})();
