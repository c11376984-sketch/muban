/* ==========================================================================
   混凝土 CONCRETE CO. — 粗野主义交互脚本（纯原生 JS，无依赖）
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. 页脚年份 ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 2. 移动端导航 ---------- */
  var navToggle = document.getElementById("nav-toggle");
  var mainNav = document.getElementById("main-nav");
  var navToggleLabel = navToggle ? navToggle.querySelector(".nav-toggle-label") : null;

  function closeNav() {
    if (!mainNav || !navToggle) return;
    mainNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    if (navToggleLabel) navToggleLabel.textContent = navToggleLabel.dataset.open;
  }

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var open = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
      if (navToggleLabel) navToggleLabel.textContent = open ? navToggleLabel.dataset.close : navToggleLabel.dataset.open;
    });

    // Escape 关闭
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });

    // 点击导航链接后收起（移动端）
    mainNav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") closeNav();
    });
  }

  /* ---------- 3. 滚动进场：元素怼入视野（尊重 reduced-motion） ---------- */
  var revealEls = document.querySelectorAll(".work, .stat, .manifesto-item, .log-item, .team-row, .section-head, .hero-declare");
  if (reduceMotion) {
    // 关闭动效时直接展示，不加过渡
    revealEls.forEach(function (el) { el.style.opacity = "1"; });
  } else if ("IntersectionObserver" in window) {
    revealEls.forEach(function (el) {
      el.style.opacity = "0";
      el.style.transform = "translateY(18px)";
      el.style.transition = "opacity .3s ease, transform .3s ease";
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // 给入场块一个极轻微的随机偏移：粗糙但有序
          var el = entry.target;
          var jitter = (Math.random() * 4 - 2).toFixed(1);
          el.style.transform = "translateY(0) translate(" + jitter + "px, " + jitter + "px)";
          el.style.opacity = "1";
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 4. 数据条数字递增 ---------- */
  var statNums = document.querySelectorAll(".stat-num[data-count]");
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (target === 0) { el.textContent = "0"; return; }
    var dur = 900;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window && statNums.length) {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          io2.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    statNums.forEach(function (el) { io2.observe(el); });
  } else {
    statNums.forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
  }

  /* ---------- 5. 项目筛选 ---------- */
  var filterBtns = document.querySelectorAll(".filter-btn");
  var workItems = document.querySelectorAll(".work");
  var noteEl = document.getElementById("works-note");
  var labelMap = { all: "全部", built: "已建成", building: "施工中", competition: "竞赛" };

  function applyFilter(cat) {
    var visible = 0;
    workItems.forEach(function (item) {
      var show = cat === "all" || item.dataset.cat === cat;
      item.classList.toggle("is-hidden", !show);
      if (show) visible++;
    });
    filterBtns.forEach(function (btn) {
      var active = btn.dataset.filter === cat;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
    if (noteEl) {
      noteEl.textContent = visible === 0
        ? "[ 筛选结果 ] 该分类暂无建成项目 —— 我们正加班浇注。"
        : "[ 筛选结果 ] 共 " + visible + " 个项目 / 分类：" + (labelMap[cat] || cat) + "。";
    }
  }

  if (filterBtns.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyFilter(btn.dataset.filter);
      });
    });
  }

  /* ---------- 6. 点击作品卡：切换混凝土块的“浇注批次”（块面色相轮换） ---------- */
  var blockClasses = ["block-gray", "block-black", "block-yellow", "block-orange"];
  workItems.forEach(function (work) {
    work.addEventListener("click", function () {
      var block = work.querySelector(".work-block");
      if (!block) return;
      var current = blockClasses.indexOf(blockClasses.find(function (c) { return block.classList.contains(c); }));
      var next = (current + 1) % blockClasses.length;
      blockClasses.forEach(function (c) { block.classList.remove(c); });
      block.classList.add(blockClasses[next]);
    });
  });

  /* ---------- 7. 联系表单校验（粗糙但守规矩） ---------- */
  var form = document.getElementById("contact-form");
  var statusEl = document.getElementById("form-status");

  if (form && statusEl) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nameInput = form.querySelector('input[name="name"]');
      var emailInput = form.querySelector('input[name="email"]');
      var ok = true;

      [nameInput, emailInput].forEach(function (input) {
        input.classList.remove("is-error");
        if (!input.value.trim()) {
          input.classList.add("is-error");
          ok = false;
        }
      });

      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
      if (emailInput.value.trim() && !emailOk) {
        emailInput.classList.add("is-error");
        ok = false;
        statusEl.textContent = "[ 错误 ] 邮箱格式不对 —— 别糊弄工程队。";
        statusEl.className = "form-status mono";
      }

      if (!ok) {
        if (!statusEl.textContent) statusEl.textContent = "[ 错误 ] 名字和邮箱都要填 —— 混凝土不认识匿名者。";
        statusEl.className = "form-status mono";
        return;
      }

      // 模拟提交
      statusEl.textContent = "[ 发送中 ] 正在浇筑邮件队列……";
      statusEl.className = "form-status mono";
      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      setTimeout(function () {
        form.reset();
        submitBtn.disabled = false;
        statusEl.textContent = "[ 已送达 ] 收到。我们的回复和楼板一样，不会让你等太久。";
        statusEl.className = "form-status mono ok";
      }, 900);
    });
  }
})();
