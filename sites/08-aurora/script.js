/* ==========================================================
   流光 LUMEN GALLERY — 交互脚本
   1. 滚动渐入（reduced-motion 兼容）
   2. 评价轮播（键盘 + aria-pressed 状态）
   3. 数字计数动画
   4. 预约表单提交反馈
   5. 浮光跟随鼠标（桌面端，reduced-motion 关闭时启用）
   ========================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. 滚动渐入 ---------- */
  var revealTargets = document.querySelectorAll(
    ".exh-card, .artist-card, .work-card, .timeline li, .visit-info, .visit-form"
  );
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );
    revealTargets.forEach(function (el) {
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  /* ---------- 2. 评价轮播 ---------- */
  var quotes = document.querySelectorAll(".quote");
  var qBtns = document.querySelectorAll(".q-btn");
  var currentQ = 0;

  function showQuote(index) {
    quotes.forEach(function (q, i) {
      q.hidden = i !== index;
    });
    qBtns.forEach(function (b, i) {
      b.setAttribute("aria-pressed", String(i === index));
    });
    quotes[index].classList.remove("is-active");
    void quotes[index].offsetWidth; /* 重启动画 */
    quotes[index].classList.add("is-active");
    currentQ = index;
  }

  qBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      showQuote(Number(btn.getAttribute("data-q")));
    });
  });

  /* 自动轮播：仅在没有减弱动效时启用，用户手动切换后重置计时 */
  var autoTimer = null;
  if (!reduceMotion && quotes.length > 1) {
    function schedule() {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(function () {
        showQuote((currentQ + 1) % quotes.length);
        schedule();
      }, 6000);
    }
    qBtns.forEach(function (b) {
      b.addEventListener("click", schedule);
    });
    schedule();
  }

  /* 支持左右方向键切换 */
  document.addEventListener("keydown", function (e) {
    if (!e.target.closest) return;
    var inQuotes = e.target.closest("#quotes");
    if (!inQuotes) return;
    if (e.key === "ArrowRight") {
      showQuote((currentQ + 1) % quotes.length);
      if (autoTimer) schedule();
    } else if (e.key === "ArrowLeft") {
      showQuote((currentQ - 1 + quotes.length) % quotes.length);
      if (autoTimer) schedule();
    }
  });

  /* ---------- 3. 数字计数动画 ---------- */
  var counters = document.querySelectorAll(".hero-stats [data-count]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var target = Number(el.getAttribute("data-count"));
          var suffix = el.getAttribute("data-suffix") || "";
          var duration = 1800;
          var start = null;

          function step(ts) {
            if (!start) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(target * eased).toLocaleString("zh-CN") + suffix;
            if (progress < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
          cio.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) {
      el.textContent = Number(el.getAttribute("data-count")).toLocaleString("zh-CN") + (el.getAttribute("data-suffix") || "");
    });
  }

  /* ---------- 4. 预约表单提交反馈 ---------- */
  var form = document.getElementById("visitForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = document.getElementById("formOk");
      ok.hidden = false;
      form.querySelector("button[type='submit']").disabled = true;
      form.reset();
      ok.focus();
    });
  }

  /* ---------- 5. 浮光跟随鼠标（桌面，仅光效） ---------- */
  var glow = null;
  if (!reduceMotion && window.matchMedia("(min-width: 1025px)").matches) {
    glow = document.createElement("div");
    glow.className = "cursor-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.appendChild(glow);

    var ticking = false;
    document.addEventListener("pointermove", function (e) {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        glow.style.transform =
          "translate(" + (e.clientX - 200) + "px," + (e.clientY - 200) + "px)";
        ticking = false;
      });
    });
    document.addEventListener("pointerleave", function () {
      glow.style.opacity = "0";
    });
    document.addEventListener("pointerenter", function () {
      glow.style.opacity = "1";
    });
  }
})();
