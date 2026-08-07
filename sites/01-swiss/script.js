/* ============================================================
   01-swiss · script.js
   纯原生 JS，无外部依赖，控制台零报错。
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 工具 ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.prototype.slice.call((ctx || document).querySelectorAll(sel));

  /* ---------- 顶部导航：滚动后加底色 ---------- */
  const header = $("#siteHeader");
  const backTop = $("#backTop");

  const onScroll = function () {
    const y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle("scrolled", y > 8);
    if (backTop) backTop.classList.toggle("show", y > 600);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 回到顶部 ---------- */
  if (backTop) {
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 移动端菜单 ---------- */
  const navToggle = $("#navToggle");
  const mobileMenu = $("#mobileMenu");

  const setMenu = function (open) {
    if (!mobileMenu || !navToggle) return;
    mobileMenu.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    document.body.style.overflow = open ? "hidden" : "";
  };

  if (navToggle && mobileMenu) {
    navToggle.addEventListener("click", function () {
      setMenu(navToggle.getAttribute("aria-expanded") !== "true");
    });
    // 点击菜单内链接后关闭
    $$("a", mobileMenu).forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    // Esc 关闭
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---------- 栅格覆盖层切换 ---------- */
  const gridToggle = $("#gridToggle");
  if (gridToggle) {
    gridToggle.addEventListener("click", function () {
      const on = document.body.classList.toggle("grid-on");
      gridToggle.setAttribute("aria-pressed", String(on));
    });
  }

  /* ---------- 反白模式切换 ---------- */
  const invertToggle = $("#invertToggle");
  if (invertToggle) {
    invertToggle.addEventListener("click", function () {
      const on = document.body.classList.toggle("inverted");
      invertToggle.setAttribute("aria-pressed", String(on));
    });
  }

  /* ---------- 当前区块高亮导航 ---------- */
  const navLinks = $$(".main-nav a");
  const sections = $$("main section[id]");

  const spy = function () {
    const probe = window.scrollY + window.innerHeight * 0.35;
    let current = null;
    sections.forEach(function (sec) {
      if (sec.offsetTop <= probe) current = sec.id;
    });
    navLinks.forEach(function (a) {
      const target = a.getAttribute("href").slice(1);
      a.classList.toggle("active", target === current);
    });
  };
  if (navLinks.length && sections.length) {
    window.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("resize", spy, { passive: true });
    spy();
  }

  /* ---------- 数据滚动计数 ---------- */
  const statValues = $$(".stat-value[data-target]");
  const fmt = new Intl.NumberFormat("zh-CN");

  const runCounter = function (el) {
    const target = parseInt(el.getAttribute("data-target"), 10) || 0;
    const dur = 1400;
    const t0 = performance.now();
    const step = function (now) {
      const p = Math.min((now - t0) / dur, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt.format(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (statValues.length && "IntersectionObserver" in window) {
    const statIO = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          runCounter(en.target);
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.5 });
    statValues.forEach(function (el) { statIO.observe(el); });
  } else {
    statValues.forEach(function (el) {
      el.textContent = fmt.format(parseInt(el.getAttribute("data-target"), 10) || 0);
    });
  }

  /* ---------- 活字样本：字号滑块 ---------- */
  const slider = $("#specSlider");
  const display = $("#specDisplay");
  const readout = $("#specReadout");

  const setSize = function (val) {
    if (!display || !readout) return;
    display.style.fontSize = val + "px";
    readout.textContent = val + " px";
  };
  if (slider) {
    setSize(slider.value);
    slider.addEventListener("input", function () { setSize(slider.value); });
  }

  /* ---------- 滚动入场 ---------- */
  const revealEls = $$(".work-card, .stat, .principle, .section-head, .quote, .specimen");

  if (revealEls.length && "IntersectionObserver" in window) {
    const revIO = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in-view");
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) {
      el.classList.add("reveal");
      revIO.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------- 键盘导航：作品卡可达性 ---------- */
  $$(".work-card").forEach(function (card) {
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.classList.add("is-active");
        setTimeout(function () { card.classList.remove("is-active"); }, 400);
      }
    });
  });
})();
