/* ==========================================================================
   MONO · 时尚文化杂志 — 交互脚本
   1. Ticker 无缝滚动（复制一份内容保证循环无跳变）
   2. 滚动：阅读进度条 + 封面轻微视差
   3. 目录文章行：箭头游标跟随 hover / 键盘 focus 行
   4. 订阅弹层：打开 / 关闭 / Esc / 遮罩点击 / 焦点归还 / 表单成功态
   ========================================================================== */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Ticker 无缝滚动 ---------- */
  var tickerTrack = document.getElementById('tickerTrack');
  if (tickerTrack && !prefersReduced) {
    // 用一个包裹层装两份相同内容，translateX(-50%) 时无缝衔接
    var ticker = tickerTrack.parentNode;
    var run = document.createElement('div');
    run.className = 'ticker__run';
    var clone = tickerTrack.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    ticker.insertBefore(run, tickerTrack);
    run.appendChild(tickerTrack);
    run.appendChild(clone);
  }

  /* ---------- 2. 阅读进度条 + 封面视差 ---------- */
  var progressBar = document.getElementById('progressBar');
  var coverArt = document.querySelector('.cover__art');
  var coverText = document.querySelector('.cover__text');
  var ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateScrollFx);
      ticking = true;
    }
  }

  function updateScrollFx() {
    ticking = false;

    // 阅读进度条
    if (progressBar) {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progressBar.style.width = pct.toFixed(2) + '%';
    }

    // 封面轻微视差（减弱动效偏好下跳过）
    if (prefersReduced) return;
    if (coverArt) {
      var artRect = coverArt.getBoundingClientRect();
      if (artRect.bottom > 0 && artRect.top < window.innerHeight) {
        var amount = (window.scrollY % 160) * 0.06;
        coverArt.style.transform = 'translateY(' + amount.toFixed(1) + 'px)';
      }
    }
    if (coverText) {
      var txtRect = coverText.getBoundingClientRect();
      if (txtRect.bottom > 0 && txtRect.top < window.innerHeight) {
        var t = (window.scrollY % 200) * 0.05;
        coverText.style.transform = 'translateY(' + t.toFixed(1) + 'px)';
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 3. 目录行：箭头游标跟随 ---------- */
  var storySection = document.getElementById('stories');
  var storyList = document.getElementById('storyList');
  var cursor = document.getElementById('storyCursor');
  var rows = storyList ? storyList.querySelectorAll('.story-row') : [];

  function placeCursor(target) {
    if (!cursor || !target || !storyList || !storySection || prefersReduced) return;
    var sectionRect = storySection.getBoundingClientRect();
    var rowRect = target.getBoundingClientRect();
    var half = rowRect.height / 2;
    var x = rowRect.left - sectionRect.left - 28;
    var y = rowRect.top - sectionRect.top + half - 22;
    cursor.style.setProperty('--cursor-x', x.toFixed(1) + 'px');
    cursor.style.setProperty('--cursor-y', y.toFixed(1) + 'px');
    cursor.classList.add('is-on');
  }

  function clearCursor() {
    if (cursor) cursor.classList.remove('is-on');
  }

  if (storyList && cursor && rows.length && !prefersReduced) {
    rows.forEach(function (row) {
      var link = row.querySelector('a');
      row.addEventListener('mouseenter', function () { placeCursor(row); });
      if (link) {
        link.addEventListener('focusin', function () { placeCursor(row); });
        link.addEventListener('focusout', function () { clearCursor(); });
      }
    });
    storyList.addEventListener('mouseleave', clearCursor);
  }

  /* ---------- 4. 订阅弹层 ---------- */
  var modal = document.getElementById('subscribeModal');
  var openBtn = document.getElementById('openSubscribeBtn');
  var subscribeLink = document.querySelector('.navbar__last');
  var lastFocused = null;
  var openedOnce = false;

  function openModal() {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    openedOnce = true;
    var closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) closeBtn.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
  }

  if (modal) {
    // 顶栏按钮打开
    if (openBtn) openBtn.addEventListener('click', openModal);

    // 导航里的「订阅」同样打开弹层（而非跳转锚点）
    if (subscribeLink) {
      subscribeLink.addEventListener('click', function (e) {
        if (window.innerWidth <= 640) return; // 移动端允许直接滚动到订阅区
        e.preventDefault();
        openModal();
      });
    }

    // 关闭：关闭钮 / 遮罩点击
    modal.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });

    // Esc 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    // 自动弹出：首次访问延迟出现一次（会话内仅一次）
    if (!prefersReduced && !sessionStorage.getItem('mono-modal-shown')) {
      window.setTimeout(function () {
        if (!openedOnce && !modal.hidden) {
          openModal();
          sessionStorage.setItem('mono-modal-shown', '1');
        }
      }, 3200);
    }
  }

  /* ---------- 表单提交 ---------- */
  function handleSubmit(form, successEl, btn) {
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var email = input ? input.value.trim() : '';
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!valid) {
        if (input) {
          input.setAttribute('aria-invalid', 'true');
          input.focus();
          var err = form.querySelector('.form-error');
          if (!err) {
            err = document.createElement('p');
            err.className = 'form-error';
            err.setAttribute('role', 'alert');
            form.appendChild(err);
          }
          err.textContent = '请输入有效的邮箱地址。';
        }
        return;
      }
      if (input) input.removeAttribute('aria-invalid');
      var err = form.querySelector('.form-error');
      if (err) err.remove();

      if (successEl) {
        successEl.textContent = '订阅成功，欢迎登船。首期将于本周五送达。';
        form.hidden = true;
        successEl.hidden = false;
      }
      if (btn) btn.disabled = true;
    });
  }

  handleSubmit(
    document.getElementById('modalForm'),
    document.getElementById('modalSuccess'),
    modal ? modal.querySelector('.btn') : null
  );

  handleSubmit(
    document.getElementById('subscribeForm'),
    document.getElementById('subMessage'),
    null
  );
})();
