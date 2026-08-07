/* ==========================================================================
   06 · 街头涂鸦 / 泼墨 BOARD MOB —— 交互脚本
   导航 / 喷漆模式 / 滚动浮现 / 在线定制 / 地图路线 / 倒计时 / 入会表单
   ========================================================================== */
(function () {
  'use strict';

  var body = document.body;
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 工具 ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var SPLAT_COLORS = ['#ff5a00', '#00b2a9', '#ff4fa0', '#111111'];
  var BASE_COLORS = ['#ff5a00', '#00b2a9', '#ff4fa0', '#111111', '#f2ead9'];

  /* ==========================================================================
     喷漆模式（光标 + 点击泼溅 + data-mark 晃动）
     ========================================================================== */
  var sprayToggle = $('#sprayToggle');
  var sprayTxt = $('#sprayTxt');
  var sprayHero = $('#sprayHero');
  var marker = $('#marker');
  var sprayOn = false;

  function spawnSplat(x, y, opts) {
    opts = opts || {};
    var s = document.createElement('span');
    s.className = 'splat-pop';
    var size = opts.size || randInt(16, 46);
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.left = (x - size / 2) + 'px';
    s.style.top = (y - size / 2) + 'px';
    s.style.setProperty('--sp', opts.color || pick(SPLAT_COLORS));
    s.style.setProperty('--r', (opts.rotate || rand(-24, 24)).toFixed(1) + 'deg');
    body.appendChild(s);
    setTimeout(function () { s.remove(); }, 900);
  }

  function burstSplat(rect, n) {
    var i;
    for (i = 0; i < n; i++) {
      spawnSplat(rect.left + rand(0, rect.width), rect.top + rand(0, rect.height));
    }
  }

  function setSpray(on) {
    sprayOn = on;
    body.classList.toggle('spray', on);
    sprayToggle.setAttribute('aria-pressed', String(on));
    sprayTxt.textContent = on ? '开' : '关';
    if (!on) { marker.style.left = ''; marker.style.top = ''; }
    setNav(false); /* 移动端点喷漆时收起菜单 */
  }

  /* 初始同步：视觉默认是关闭状态 */
  setSpray(false);

  sprayToggle.addEventListener('click', function () { setSpray(!sprayOn); });

  if (sprayHero) {
    sprayHero.addEventListener('click', function () {
      setSpray(true);
      if (!reduceMotion) burstSplat(sprayHero.getBoundingClientRect(), 10);
    });
  }

  /* 光标标记跟随 */
  document.addEventListener('pointermove', function (e) {
    if (!sprayOn) return;
    marker.style.left = e.clientX + 'px';
    marker.style.top = e.clientY + 'px';
  }, { passive: true });

  /* 点击：泼溅 + 命中 data-mark 晃动 */
  document.addEventListener('click', function (e) {
    if (!sprayOn || reduceMotion) return;
    spawnSplat(e.clientX, e.clientY);
    var target = e.target.closest('[data-mark]');
    if (target && !target.classList.contains('marked')) {
      target.classList.add('marked');
      target.addEventListener('animationend', function h() {
        target.classList.remove('marked');
        target.removeEventListener('animationend', h);
      }, { once: true });
    }
  });

  /* ==========================================================================
     响应式导航（汉堡菜单）
     ========================================================================== */
  var navToggle = $('#navToggle');
  var menu = $('#menu');
  var menuLinks = menu ? menu.querySelectorAll('a') : [];
  var navMq = window.matchMedia('(max-width: 860px)');

  function setNav(open) {
    body.classList.toggle('nav-open', open);
    if (navToggle) navToggle.setAttribute('aria-expanded', String(open));
    body.style.overflow = open ? 'hidden' : '';
  }

  if (navToggle && menu) {
    navToggle.addEventListener('click', function () {
      setNav(!body.classList.contains('nav-open'));
    });
    menuLinks.forEach(function (a) {
      a.addEventListener('click', function () { setNav(false); });
    });
    /* 点击页头以外的区域收起菜单 */
    document.addEventListener('click', function (e) {
      if (body.classList.contains('nav-open') && !e.target.closest('.site-header')) {
        setNav(false);
      }
    });
  }

  function handleNavMq(e) {
    if (!e.matches && body.classList.contains('nav-open')) setNav(false);
  }
  if (navMq.addEventListener) {
    navMq.addEventListener('change', handleNavMq);
  } else if (navMq.addListener) {
    navMq.addListener(handleNavMq);
  }

  /* Escape：先收菜单，再退喷漆模式 */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (body.classList.contains('nav-open')) setNav(false);
    else if (sprayOn) setSpray(false);
  });

  /* ==========================================================================
     滚动浮现
     ========================================================================== */
  var reveals = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (r) { r.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.12 });
    reveals.forEach(function (r) { io.observe(r); });
  }

  /* ==========================================================================
     在线定制：底色 / 墨点密度 / 贴纸 / 随机 / 价格
     ========================================================================== */
  var custDeck = $('#cust-board');
  var custSplats = $('#cust-splats');
  var splatRange = $('#splatRange');
  var splatCount = $('#splatCount');
  var priceVal = $('#priceVal');
  var randomSplat = $('#randomSplat');
  var swatches = document.querySelectorAll('.swatch');
  var stickOpts = document.querySelectorAll('.stick-opt');
  var stickers = {
    lightning: $('#stk-lightning'),
    heart: $('#stk-heart'),
    star: $('#stk-star')
  };
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function makeSplat() {
    var c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', rand(28, 192).toFixed(1));
    c.setAttribute('cy', rand(28, 72).toFixed(1));
    c.setAttribute('r', rand(2.5, 10).toFixed(1));
    c.setAttribute('fill', pick(SPLAT_COLORS));
    return c;
  }

  function drawSplats(n) {
    if (!custSplats) return;
    custSplats.textContent = '';
    var frag = document.createDocumentFragment();
    var i;
    for (i = 0; i < n; i++) frag.appendChild(makeSplat());
    custSplats.appendChild(frag);
  }

  function setPrice(n) {
    if (priceVal) priceVal.textContent = 300 + n * 10;
  }

  function setBaseColor(color) {
    var sw = Array.prototype.filter.call(swatches, function (s) {
      return s.dataset.base === color;
    })[0] || swatches[0];
    swatches.forEach(function (s) {
      s.classList.toggle('active', s === sw);
    });
    if (custDeck) custDeck.setAttribute('fill', color);
  }

  swatches.forEach(function (sw) {
    sw.addEventListener('click', function () {
      setBaseColor(sw.dataset.base);
    });
  });

  if (splatRange) {
    splatRange.addEventListener('input', function () {
      var n = Number(splatRange.value);
      if (splatCount) splatCount.textContent = n;
      drawSplats(n);
      setPrice(n);
    });
  }

  stickOpts.forEach(function (btn) {
    btn.addEventListener('click', function () {
      stickOpts.forEach(function (b) { b.classList.toggle('active', b === btn); });
      var key = btn.dataset.sticker;
      Object.keys(stickers).forEach(function (k) {
        if (stickers[k]) stickers[k].style.display = (k === key) ? '' : 'none';
      });
    });
  });

  if (randomSplat) {
    randomSplat.addEventListener('click', function () {
      var color = pick(BASE_COLORS);
      setBaseColor(color);
      var n = randInt(3, 16);
      if (splatRange) splatRange.value = n;
      if (splatCount) splatCount.textContent = n;
      drawSplats(n);
      setPrice(n);
      if (Math.random() < 0.33 && stickOpts.length) {
        stickOpts[randInt(0, stickOpts.length - 1)].click();
      }
    });
  }

  /* 初始化定制预览 */
  drawSplats(8);
  setPrice(8);

  /* ==========================================================================
     地图：推荐路线
     ========================================================================== */
  var routeToggle = $('#routeToggle');
  var mapWrap = $('.map-wrap');

  if (routeToggle && mapWrap) {
    routeToggle.addEventListener('click', function () {
      var on = mapWrap.classList.toggle('route-on');
      routeToggle.textContent = on ? '隐藏推荐路线' : '今日推荐路线';
    });
  }

  /* ==========================================================================
     倒计时：每年 8/16 19:00 开版派对
     ========================================================================== */
  var countdown = $('#countdown');

  function tick() {
    if (!countdown) return;
    var now = new Date();
    var target = new Date(now.getFullYear(), 7, 16, 19, 0, 0);
    if (now >= target) {
      target = new Date(now.getFullYear() + 1, 7, 16, 19, 0, 0);
    }
    var diff = target - now;
    if (diff <= 0) {
      countdown.textContent = '开版派对就是今天，走！';
      return;
    }
    var d = Math.floor(diff / 86400000);
    var h = Math.floor(diff / 3600000) % 24;
    var m = Math.floor(diff / 60000) % 60;
    var s = Math.floor(diff / 1000) % 60;
    function pad(v) { return String(v).padStart(2, '0'); }
    countdown.textContent = '距开版派对还有 ' + d + ' 天 ' +
      pad(h) + ' 时 ' + pad(m) + ' 分 ' + pad(s) + ' 秒';
  }

  tick();
  setInterval(tick, 1000);

  /* ==========================================================================
     入会表单
     ========================================================================== */
  var form = $('#joinForm');
  var formMsg = $('#formMsg');
  var joinOk = $('#joinOk');
  var okName = joinOk ? joinOk.querySelector('.ok-name') : null;

  if (form) {
    var fields = {
      name: $('#fname'),
      city: $('#fcity'),
      email: $('#fmail'),
      why: $('#fwhy')
    };

    function markInvalid(input) {
      var f = input.closest('.field');
      if (f) f.classList.add('invalid');
    }
    function clearInvalid(input) {
      var f = input.closest('.field');
      if (f) f.classList.remove('invalid');
    }
    Object.keys(fields).forEach(function (k) {
      fields[k].addEventListener('input', function () { clearInvalid(fields[k]); });
      fields[k].addEventListener('change', function () { clearInvalid(fields[k]); });
    });

    function showMsg(text) {
      if (!formMsg) return;
      formMsg.textContent = text;
      formMsg.classList.add('show');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (formMsg) formMsg.classList.remove('show');

      var name = fields.name.value.trim();
      var city = fields.city.value.trim();
      var email = fields.email.value.trim();
      var why = fields.why.value.trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      var bad = false;

      if (!name) { markInvalid(fields.name); bad = true; }
      if (!city) { markInvalid(fields.city); bad = true; }
      if (!email) { markInvalid(fields.email); bad = true; }
      if (!why) { markInvalid(fields.why); bad = true; }

      if (email && !emailOk) {
        markInvalid(fields.email);
        showMsg('邮箱看起来不像真的，再描一笔？');
        return;
      }
      if (bad) {
        showMsg('还差几笔：带 * 的都要填，城市记得选一个。');
        return;
      }

      /* 成功：隐藏表单，露出手印卡片 */
      form.hidden = true;
      if (okName) okName.textContent = name;
      if (joinOk) {
        joinOk.hidden = false;
        requestAnimationFrame(function () {
          joinOk.classList.add('in');
          joinOk.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        });
        if (!reduceMotion) burstSplat(joinOk.getBoundingClientRect(), 12);
      }
    });
  }
})();
