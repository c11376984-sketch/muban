/* ==========================================================================
   蓝图工场 BLUEPRINT WORKS · 交互脚本
   对接: 导航 / 标注图层切换 / 滚动显现 / 计数仪表 / SVG 标注动画 /
        CAD 十字光标 / 表单回执 / 吸顶头部状态
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---------- 1. 标注 / 图层 切换 ---------- */
  var dimsBtn = $('#dims-toggle');
  if (dimsBtn) {
    dimsBtn.addEventListener('click', function () {
      var off = doc.body.classList.toggle('dims-off');
      dimsBtn.setAttribute('aria-pressed', off ? 'true' : 'false');
      dimsBtn.classList.toggle('on', off);
    });
  }

  /* ---------- 2. 吸顶头部状态 ---------- */
  var header = $('.site-header');
  function syncHeader() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 24);
  }
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  /* ---------- 3. 平滑锚点滚动 + 高亮 ---------- */
  var navLinks = $$('.site-nav a');
  var anchorLinks = $$('a[href^="#"]');

  anchorLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      var target = $(id);
      if (!target) return;
      e.preventDefault();
      if (reduceMotion) {
        window.location.hash = id;
        return;
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', id);
    });
  });

  /* 滚动时高亮当前导航 */
  var sectionTargets = navLinks
    .map(function (a) { return $(a.getAttribute('href')); })
    .filter(Boolean);
  var navIO = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var id = '#' + en.target.id;
          navLinks.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === id);
          });
        });
      }, { rootMargin: '-40% 0px -55% 0px' })
    : null;
  if (navIO) sectionTargets.forEach(function (s) { navIO.observe(s); });

  /* ---------- 4. 滚动显现动画 (.rv / .rvstamp / .rvx / .rvy) ---------- */
  var revealTargets = $$('.rv, .rvstamp, .rvx, .rvy');
  function revealNow(el) { el.classList.add('in'); }

  if (reduceMotion) {
    revealTargets.forEach(revealNow);
  } else if ('IntersectionObserver' in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          revealNow(en.target);
          revealIO.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(function (t) { revealIO.observe(t); });
  } else {
    revealTargets.forEach(revealNow);
  }

  /* 兜底：IO 延迟/不可用时，主动检查视口内元素，避免内容滞留隐藏 */
  function revealInViewport() {
    var vh = window.innerHeight || doc.documentElement.clientHeight;
    revealTargets.forEach(function (el) {
      if (el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) revealNow(el);
    });
  }
  window.addEventListener('load', function () { setTimeout(revealInViewport, 300); });
  window.addEventListener('scroll', revealInViewport, { passive: true });
  revealInViewport();

  /* ---------- 5. SVG 标注线绘制动画 ---------- */
  var dimSvgs = $$('.dim-svg');
  if (reduceMotion) {
    dimSvgs.forEach(function (d) { d.classList.add('in'); });
  } else if ('IntersectionObserver' in window) {
    var dimIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          dimIO.unobserve(en.target);
        }
      });
    }, { threshold: 0.4 });
    dimSvgs.forEach(function (d) { dimIO.observe(d); });
  } else {
    dimSvgs.forEach(function (d) { d.classList.add('in'); });
  }

  /* 兜底：标注线绘制动画同样在视口内主动触发，避免线条滞留隐藏 */
  function dimRevealInViewport() {
    var vh = window.innerHeight || doc.documentElement.clientHeight;
    dimSvgs.forEach(function (el) {
      if (el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.95 && r.bottom > 0) el.classList.add('in');
    });
  }
  window.addEventListener('load', function () { setTimeout(dimRevealInViewport, 300); });
  window.addEventListener('scroll', dimRevealInViewport, { passive: true });
  dimRevealInViewport();

  /* ---------- 6. 计数仪表 (.dial) ---------- */
  var dials = $$('.dial');
  function runDial(el) {
    if (el.getAttribute('data-done')) return;
    el.setAttribute('data-done', '1');
    var target = parseFloat(el.getAttribute('data-count') || '0') || 0;
    if (reduceMotion || !('requestAnimationFrame' in window)) {
      el.textContent = target.toLocaleString('en-US');
      return;
    }
    var dur = 1600;
    var t0 = null;
    function fmt(v) { return Math.round(v).toLocaleString('en-US'); }
    function tick(now) {
      if (t0 === null) t0 = now;
      var p = Math.min((now - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(target);
    }
    el.textContent = '0';
    requestAnimationFrame(tick);
  }
  if (reduceMotion) {
    dials.forEach(runDial);
  } else if ('IntersectionObserver' in window) {
    var dialIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        runDial(en.target);
        dialIO.unobserve(en.target);
      });
    }, { threshold: 0.6 });
    dials.forEach(function (d) { dialIO.observe(d); });
  } else {
    dials.forEach(runDial);
  }

  /* 兜底：计数仪表在视口内直接触发 */
  function dialRevealInViewport() {
    var vh = window.innerHeight || doc.documentElement.clientHeight;
    dials.forEach(function (el) {
      if (el.getAttribute('data-done')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.85 && r.bottom > 0) runDial(el);
    });
  }
  window.addEventListener('load', function () { setTimeout(dialRevealInViewport, 350); });
  window.addEventListener('scroll', dialRevealInViewport, { passive: true });
  dialRevealInViewport();

  /* ---------- 7. CAD 十字光标 + 坐标读数 ---------- */
  var cross = $('.cad-cross');
  var readout = $('.cad-readout');
  var cx = $('#cad-x');
  var cy = $('#cad-y');
  if (cross && finePointer) {
    doc.body.classList.add('cad-capable');
    var hLine = cross.querySelector('.h');
    var vLine = cross.querySelector('.v');
    var reticle = doc.createElement('span');
    reticle.className = 'reticle';
    cross.appendChild(reticle);

    var pending = false;
    doc.addEventListener('mousemove', function (e) {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        var x = e.clientX;
        var y = e.clientY;
        if (hLine) hLine.style.top = y + 'px';
        if (vLine) vLine.style.left = x + 'px';
        reticle.style.left = x + 'px';
        reticle.style.top = y + 'px';
        cross.classList.add('on');
        if (readout) readout.classList.add('on');
        if (cx) cx.textContent = 'X ' + String(Math.round(x * 2) / 2).replace(/(\.0+)?$/, '.0').padStart(6, '0');
        if (cy) cy.textContent = 'Y ' + String(Math.round(y * 2) / 2).replace(/(\.0+)?$/, '.0').padStart(6, '0');
      });
    }, { passive: true });
  }

  /* ---------- 8. 表单校验 + 受理回执 ---------- */
  var form = $('#quote-form');
  if (form) {
    var unit = $('#q-unit');
    var mail = $('#q-mail');
    var stamp = $('#accept-stamp');
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setErr(el, msg) {
      var parent = el.parentElement;
      var prev = parent.querySelector('.field-err');
      if (prev) prev.remove();
      if (msg) {
        el.classList.add('invalid');
        el.setAttribute('aria-invalid', 'true');
        var s = doc.createElement('span');
        s.className = 'field-err';
        s.textContent = msg;
        parent.appendChild(s);
      } else {
        el.classList.remove('invalid');
        el.removeAttribute('aria-invalid');
      }
    }
    function validateField(el) {
      if (el === unit) {
        setErr(el, el.value.trim() ? '' : '请填写单位名称');
        return !!el.value.trim();
      }
      if (el === mail) {
        var v = el.value.trim();
        if (!v) { setErr(el, '请填写联系邮箱'); return false; }
        if (!emailRe.test(v)) { setErr(el, '邮箱格式不正确'); return false; }
        setErr(el);
        return true;
      }
      return true;
    }
    [unit, mail].forEach(function (el) {
      el.addEventListener('input', function () { validateField(el); });
      el.addEventListener('blur', function () { if (el.value.trim()) validateField(el); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = validateField(unit) & validateField(mail);
      if (!ok) {
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
        return;
      }
      var no = 'BW-' + String(Math.floor(1000 + Math.random() * 9000)) + '-' + String(Math.floor(10 + Math.random() * 90));
      if (stamp) {
        stamp.innerHTML = '受理回执<br>NO. ' + no + '<br>已盖章确认';
        stamp.classList.add('show');
      }
      form.reset();
      [unit, mail].forEach(function (el) { setErr(el); });
      setTimeout(function () {
        if (stamp) stamp.classList.remove('show');
      }, 5200);
    });
  }

  /* ---------- 9. 键盘可达性：Esc 关闭回执图章 ---------- */
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var stamp = $('#accept-stamp');
      if (stamp) stamp.classList.remove('show');
    }
  });
})();
