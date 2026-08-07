/* ============================================================
   金线 GILT LINE · script.js
   交互：金线滚动进度 / 章节高亮 / 视差微光 / 入场动画 / 预约校验
   ============================================================ */
(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 金线滚动进度 ---------- */
  const progress = document.querySelector(".gold-progress");
  if (progress) {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? Math.min(h.scrollTop / max, 1) : 0;
      progress.style.transform = `scaleX(${p})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 导航高亮当前章节 ---------- */
  const navLinks = [...document.querySelectorAll(".hero-nav a, .footer-nav a")];
  const sections = [...document.querySelectorAll("main section[id]")];
  const map = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));

  if (sections.length && navLinks.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => {
            a.classList.toggle("is-active", map.get(entry.target.id) === a);
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- 入场动画（respects reduced motion） ---------- */
  const revealEls = document.querySelectorAll(
    ".piece, .step, .history-text > * , .history-facade, .reserve-card, .section-head"
  );
  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const reveal = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );
    revealEls.forEach((el, i) => {
      el.style.setProperty("--d", `${Math.min(i % 6, 5) * 90}ms`);
      reveal.observe(el);
    });
  }

  /* ---------- 视差微光（desktop, reduced-motion 关闭） ---------- */
  if (!prefersReduced && window.matchMedia("(min-width: 1025px)").matches) {
    const arch = document.querySelector(".hero-arch");
    if (arch) {
      window.addEventListener("pointermove", (e) => {
        const x = (e.clientX / innerWidth - 0.5) * 8;
        const y = (e.clientY / innerHeight - 0.5) * 6;
        arch.style.transform = `translateX(-50%) translate(${x}px, ${y}px)`;
      }, { passive: true });
    }
  }

  /* ---------- 预约表单校验 ---------- */
  const form = document.querySelector(".appt-form");
  if (form) {
    const status = form.querySelector(".form-status");

    const setStatus = (text, ok) => {
      status.textContent = text;
      status.className = "form-status " + (ok ? "ok" : "err");
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.elements["f-name"].value.trim();
      const phone = form.elements["f-phone"].value.trim();
      const date = form.elements["f-date"].value;

      if (!name) { setStatus("请留下您的姓名。", false); form.elements["f-name"].focus(); return; }
      if (!phone) { setStatus("请填写联系方式，方便我们与您确认。", false); form.elements["f-phone"].focus(); return; }
      if (!date) { setStatus("请选择到访日期。", false); form.elements["f-date"].focus(); return; }

      const btn = form.querySelector("button[type=submit]");
      const old = btn.textContent;
      btn.disabled = true;
      btn.textContent = "递交中…";
      setStatus("正在为您登记，请稍候。", true);

      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = old;
        setStatus(
          `收到，${name}。我们将在 1926 年 8 月 26 日前致电确认预约。`,
          true
        );
        form.reset();
      }, 1400);
    });
  }
})();
