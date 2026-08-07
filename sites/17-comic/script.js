/* ==========================================================================
   分镜社 PANEL HOUSE · 交互脚本（纯原生 JS，无外部依赖）
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. 移动端导航 ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- 2. 拟声词随机旋转（每张牌独立摇摆） ---------- */
  var fxEls = document.querySelectorAll("[data-spin]");
  fxEls.forEach(function (el) {
    if (reduceMotion) return;
    var base = parseFloat(el.getAttribute("data-spin")) || 0;
    var angle = base;
    if (el.classList.contains("cover-fx") || el.classList.contains("sb-fx") || el.classList.contains("portrait-fx")) {
      // 存一个小的随机抖动用于 hover 放大动画
      el.style.setProperty("--wob", (Math.random() * 8 - 4).toFixed(1) + "deg");
      el.style.transform = "rotate(" + angle + "deg)";
    } else {
      el.style.transform = "rotate(" + angle + "deg)";
    }
  });

  // hover 时拟声词加重旋转
  document.querySelectorAll(".cover-fx, .sb-fx, .portrait-fx").forEach(function (el) {
    if (reduceMotion) return;
    el.parentElement.addEventListener("mouseenter", function () {
      el.style.transform = "rotate(" + (parseFloat(el.getAttribute("data-spin")) + 6) + "deg) scale(1.12)";
    });
    el.parentElement.addEventListener("mouseleave", function () {
      el.style.transform = "rotate(" + parseFloat(el.getAttribute("data-spin")) + "deg)";
    });
  });

  /* ---------- 3. 滚动显现 ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el, i) {
      var d = el.getAttribute("data-delay") || (i % 3);
      el.style.setProperty("--r", el.getAttribute("data-spin") || "0");
      if (!reduceMotion) el.style.transitionDelay = (d * 0.09).toFixed(2) + "s";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- 4. 预售倒计时（目标 2026-08-20 20:00） ---------- */
  var countdown = document.getElementById("countdown");
  var target = new Date("2026-08-20T20:00:00");
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function tick() {
    if (!countdown) return;
    var diff = target.getTime() - Date.now();
    if (diff <= 0) { countdown.textContent = "00:00:00 开售中！"; return; }
    var s = Math.floor(diff / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var ss = s % 60;
    countdown.textContent = pad(h) + ":" + pad(m) + ":" + pad(ss);
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- 5. 表单校验工具 ---------- */
  function setFeedback(el, msg, ok) {
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("ok", !!ok && !msg);
    el.classList.toggle("err", !!msg && !ok);
  }

  /* ---------- 6. 读者来信表单：校验 + 挂上新气泡 ---------- */
  var letterForm = document.getElementById("letterForm");
  var letterFeedback = document.getElementById("letterFeedback");
  var wall = document.querySelector(".letters-wall");
  if (letterForm && wall) {
    letterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("letterName").value.trim();
      var city = document.getElementById("letterCity").value.trim();
      var text = document.getElementById("letterText").value.trim();

      if (!name) return setFeedback(letterFeedback, "落款还空着，画个花名也行呀。", false);
      if (!text) return setFeedback(letterFeedback, "信纸上是空的——想写点什么？", false);
      if (text.length > 240) return setFeedback(letterFeedback, "信太长了，邮差背不动。", false);

      // 新气泡挂到墙上
      var fig = document.createElement("figure");
      fig.className = "bubble bubble-white";
      fig.setAttribute("data-spin", String(Math.round(Math.random() * 4 - 2)));
      var quote = document.createElement("blockquote");
      quote.textContent = "“" + text + "”";
      var cap = document.createElement("figcaption");
      cap.textContent = "—— " + name + (city ? " · " + city : "") + " · 刚刚寄到";
      var tail = document.createElement("span");
      tail.className = "bubble-tail";
      tail.setAttribute("aria-hidden", "true");
      fig.appendChild(quote);
      fig.appendChild(cap);
      fig.appendChild(tail);

      var order = document.querySelectorAll(".letters-wall .bubble");
      if (order.length >= 4) { order[0].remove(); }
      wall.appendChild(fig);
      // 让新气泡滚入视野
      setTimeout(function () {
        fig.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
        fig.classList.add("just-posted");
      }, 60);

      setFeedback(letterFeedback, "已投进信箱，回信会贴在墙上。感谢！", true);
      letterForm.reset();
    });
  }

  /* ---------- 7. 预售预约表单 ---------- */
  var preForm = document.getElementById("preorderForm");
  var preFeedback = document.getElementById("preorderFeedback");
  if (preForm) {
    preForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("subscribeEmail").value.trim();
      var re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!email) return setFeedback(preFeedback, "先留个邮箱，开售才不会错过。", false);
      if (!re.test(email)) return setFeedback(preFeedback, "这串地址不像邮箱，再核对一下？", false);
      setFeedback(preFeedback, "预约成功！开售前 24 小时会发提醒到你邮箱：" + email, true);
      preForm.reset();
    });
  }

  /* ---------- 8. 速度线跟随鼠标（仅桌面，轻量） ---------- */
  var hero = document.querySelector(".hero");
  var linesA = document.querySelector(".speedlines-a");
  if (hero && linesA && !reduceMotion && window.matchMedia("(pointer:fine)").matches) {
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      linesA.style.transform = "skewY(-6deg) translate(" + (x * 22) + "px," + (y * 10) + "px)";
    });
    hero.addEventListener("mouseleave", function () {
      linesA.style.transform = "skewY(-6deg)";
    });
  }
})();
