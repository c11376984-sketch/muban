/* 一墨轩 · 水墨工作室 — 交互脚本 */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 移动端菜单 ---------- */
  var navToggle = document.getElementById("navToggle");
  var mobileMenu = document.getElementById("mobileMenu");
  if (navToggle && mobileMenu) {
    function closeMenu() {
      mobileMenu.classList.remove("is-open");
      navToggle.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-locked");
    }
    navToggle.addEventListener("click", function () {
      var open = !mobileMenu.classList.contains("is-open");
      mobileMenu.classList.toggle("is-open", open);
      navToggle.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("menu-locked", open);
    });
    mobileMenu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1025) closeMenu();
    });
  }

  /* ---------- 顶栏滚动状态 ---------- */
  var masthead = document.getElementById("masthead");
  if (masthead) {
    function onHeaderScroll() {
      masthead.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    onHeaderScroll();
    window.addEventListener("scroll", onHeaderScroll, { passive: true });
  }

  /* ---------- 滚动高亮当前栏目 ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".masthead-nav a[href^='#']"));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);
  if (sections.length) {
    function onSpy() {
      var pos = window.scrollY + window.innerHeight * 0.32;
      var current = sections[0].id;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= pos) current = sections[i].id;
      }
      navLinks.forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("href") === "#" + current);
      });
    }
    onSpy();
    window.addEventListener("scroll", onSpy, { passive: true });
  }

  /* ---------- 朱砂闲章：盖印回弹 ---------- */
  var stamp = document.getElementById("heroStamp");
  if (stamp) {
    stamp.addEventListener("click", function () {
      stamp.classList.remove("stamped");
      var echo = stamp.querySelector(".seal-echo");
      if (echo) echo.remove();
      void stamp.offsetWidth; /* 重触发动画 */
      stamp.classList.add("stamped");

      var chars = stamp.querySelector(".stamp-chars");
      echo = document.createElement("span");
      echo.className = "seal-echo";
      echo.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      inner.className = "seal-chars";
      inner.textContent = chars ? chars.textContent : "闲章";
      echo.appendChild(inner);
      stamp.appendChild(echo);
      window.setTimeout(function () { echo.remove(); }, 1000);
      window.setTimeout(function () { stamp.classList.remove("stamped"); }, 220);
    });
  }

  /* ---------- 滚动渐显 ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (reveals.length) {
    if ("IntersectionObserver" in window && !reduced) {
      var revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            revealIO.unobserve(e.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
      reveals.forEach(function (el) { revealIO.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("is-visible"); });
    }
  }

  /* ---------- 数字滚动 ---------- */
  var nums = Array.prototype.slice.call(document.querySelectorAll(".num[data-target]"));
  function countUp(el) {
    var target = parseInt(el.getAttribute("data-target"), 10) || 0;
    if (reduced) { el.textContent = target; return; }
    var dur = 1300;
    var t0 = null;
    function step(now) {
      if (t0 === null) t0 = now;
      var p = Math.min((now - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (nums.length) {
    if ("IntersectionObserver" in window) {
      var numIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            countUp(e.target);
            numIO.unobserve(e.target);
          }
        });
      }, { threshold: 0.6 });
      nums.forEach(function (el) { numIO.observe(el); });
    } else {
      nums.forEach(countUp);
    }
  }

  /* ---------- 墨水光标（仅精细指针） ---------- */
  var cursor = document.getElementById("inkCursor");
  if (cursor && window.matchMedia("(pointer: fine)").matches) {
    var cx = 0, cy = 0, tx = 0, ty = 0, raf = null, shown = false;
    function tick() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = "translate(" + (cx - 11) + "px," + (cy - 11) + "px)";
      raf = null;
    }
    window.addEventListener("mousemove", function (e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!shown) {
        shown = true;
        cursor.classList.add("is-active");
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener("mouseleave", function () {
      shown = false;
      cursor.classList.remove("is-active");
    });
    document.querySelectorAll("a, button, .work-card, [tabindex]").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cursor.classList.add("is-link"); });
      el.addEventListener("mouseleave", function () { cursor.classList.remove("is-link"); });
    });
  }

  /* ---------- 回到顶部 ---------- */
  var backTop = document.getElementById("backTop");
  if (backTop) {
    function onBackTop() {
      backTop.classList.toggle("is-visible", window.scrollY > 560);
    }
    onBackTop();
    window.addEventListener("scroll", onBackTop, { passive: true });
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ---------- 页脚年份 ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
