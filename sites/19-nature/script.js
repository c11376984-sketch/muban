/* ============================================================
   青野 GREEN FIELD · 有机生态农场
   交互：叶片飘落 · 滚动生长 · 四季高亮 · CSA 计价 · 预约表单
   ============================================================ */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. 顶部导航：滚动加背景 ---------- */
  var header = document.getElementById("siteHeader");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 2. 移动端导航抽屉 ---------- */
  var navToggle = document.getElementById("navToggle");
  var navMenu = document.getElementById("navMenu");
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      var open = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.querySelector(".visually-hidden").textContent = open ? "关闭菜单" : "打开菜单";
    });

    navMenu.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && navMenu.classList.contains("is-open")) {
        closeMenu();
        if (navToggle) navToggle.focus();
      }
    });

    function closeMenu() {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.querySelector(".visually-hidden").textContent = "打开菜单";
    }
  }

  /* ---------- 3. Hero 叶片飘落 ---------- */
  var leafLayer = document.getElementById("leafLayer");
  if (leafLayer && !prefersReducedMotion) {
    var LEAF_COUNT = window.innerWidth < 640 ? 10 : 16;
    var LEAF_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1c5 6 5 14 0 22-5-8-5-16 0-22Z" fill="currentColor"/></svg>';

    for (var i = 0; i < LEAF_COUNT; i++) {
      (function () {
        var leaf = document.createElement("span");
        leaf.className = "leaf";
        leaf.style.left = Math.random() * 100 + "%";
        leaf.style.color = i % 3 === 0 ? "#7a9450" : i % 3 === 1 ? "#8fae6b" : "#5f8a4a";
        leaf.innerHTML = LEAF_SVG;
        leafLayer.appendChild(leaf);

        var size = 14 + Math.random() * 14;
        var duration = 9 + Math.random() * 9;
        var swayDur = 2.6 + Math.random() * 2;
        leaf.style.width = size + "px";
        leaf.style.height = size + "px";
        leaf.style.animationDuration = swayDur + "s";

        leaf.animate(
          [
            { transform: "translateY(-60px) translateX(0)", opacity: 0 },
            { transform: "translateY(30vh) translateX(30px)", opacity: 1, offset: 0.08 },
            { transform: "translateY(70vh) translateX(-26px)", opacity: 0.92 },
            { transform: "translateY(105vh) translateX(14px)", opacity: 0 }
          ],
          { duration: duration * 1000, easing: "linear", delay: Math.random() * 8 * 1000, iterations: Infinity }
        );
      })();
    }
  }

  /* ---------- 4. 滚动渐入 + 植物生长触发 ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  var revealOptions = { threshold: 0.15, rootMargin: "0px 0px -40px 0px" };

  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, revealOptions);

    revealEls.forEach(function (el) { revealObserver.observe(el); });

    var seasonObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          seasonObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll(".season-card").forEach(function (card) {
      seasonObserver.observe(card);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    document.querySelectorAll(".season-card").forEach(function (card) { card.classList.add("is-visible"); });
  }

  /* ---------- 5. 当前季节高亮 + 页脚物候 ---------- */
  var now = new Date();
  var month = now.getMonth() + 1; // 1–12

  var seasonKey =
    month >= 3 && month <= 5 ? "spring" :
    month >= 6 && month <= 8 ? "summer" :
    month >= 9 && month <= 11 ? "autumn" : "winter";

  var seasonCard = document.querySelector('.season-card[data-season="' + seasonKey + '"]');
  if (seasonCard) seasonCard.classList.add("is-now");

  var FOOTER_LINES = {
    spring: ["三月，桃枝正鼓着花苞", "春分将至，雨水渐丰，田埂上冒出了第一茬野荠菜。"],
    summer: ["七月，玉米正鼓着穗", "小暑已过，清晨五点半，菜农已给瓜果浇完了头道水。"],
    autumn: ["九月，稻田正泛着金黄", "白露之后，昼夜渐凉，南瓜与红薯都到了最甜的时候。"],
    winter: ["十二月，土地盖上麦秆被", "大雪将至，菜窖里码着萝卜与白菜，炉火正暖。"]
  };
  var line = FOOTER_LINES[seasonKey] || FOOTER_LINES.summer;

  var seasonLine = document.getElementById("seasonLine");
  var solarLine = document.getElementById("solarLine");
  if (seasonLine) seasonLine.textContent = line[0];
  if (solarLine) solarLine.textContent = line[1];

  /* ---------- 6. CSA 计价器 ---------- */
  var planCards = document.querySelectorAll(".plan-card[data-plan]");
  var deliveryOpts = document.querySelectorAll(".delivery-opt input");
  var payTotal = document.getElementById("payTotal");
  var csaHint = document.getElementById("csaHint");
  var csaApply = document.getElementById("csaApply");

  var state = { plan: null, fee: 0 };

  function currentPlan() {
    return document.querySelector(".plan-card.is-active[data-plan]");
  }

  function updatePay() {
    var plan = currentPlan();
    if (!plan) return;
    state.plan = plan;
    var base = parseInt(plan.dataset.price, 10) || 0;
    var total = base + state.fee;

    if (payTotal) payTotal.textContent = "¥" + total;
    if (csaHint) {
      var checked = document.querySelector('.delivery-opt input:checked');
      var delivery = checked ? checked.value : "自提";
      var note = delivery === "配送到家" ? "（含 ¥20 配送费）" : "（农场自提 · 无配送费）";
      csaHint.textContent = "已选择：" + plan.dataset.name + " · " + delivery + " · ¥" + total + note;
    }
  }

  if (planCards.length) {
    planCards.forEach(function (card) {
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-pressed", card.classList.contains("is-active") ? "true" : "false");

      function selectPlan() {
        planCards.forEach(function (c) {
          c.classList.remove("is-active");
          c.setAttribute("aria-pressed", "false");
        });
        card.classList.add("is-active");
        card.setAttribute("aria-pressed", "true");
        updatePay();
      }

      card.addEventListener("click", selectPlan);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectPlan();
        }
      });
    });
  }

  deliveryOpts.forEach(function (radio) {
    radio.addEventListener("change", function () {
      state.fee = parseInt(radio.dataset.fee, 10) || 0;
      deliveryOpts.forEach(function (r) {
        r.closest(".delivery-opt").classList.toggle("is-active", r.checked);
      });
      updatePay();
    });
  });

  if (csaApply) {
    csaApply.addEventListener("click", function () {
      if (!state.plan) state.plan = currentPlan();
      if (!state.plan) return;
      var total = (parseInt(state.plan.dataset.price, 10) || 0) + state.fee;
      var btn = csaApply;
      var original = btn.textContent;
      btn.textContent = "已为您预留名额，稍后联系";
      btn.disabled = true;
      if (csaHint) {
        var checked = document.querySelector('.delivery-opt input:checked');
        csaHint.textContent = "申请成功！" + state.plan.dataset.name + "（" + (checked ? checked.value : "自提") + "）共 ¥" + total + "，管家将与您确认。";
      }
      setTimeout(function () {
        btn.textContent = original;
        btn.disabled = false;
      }, 3200);
    });
  }
  updatePay();

  /* ---------- 7. 参观预约表单 ---------- */
  var visitForm = document.getElementById("visitForm");
  if (visitForm) {
    var success = document.getElementById("formSuccess");
    var fields = {};

    ["name", "phone", "date"].forEach(function (key) {
      var input = visitForm.elements[key];
      if (input) fields[key] = input;
    });

    function setError(input, msg) {
      if (!input) return;
      input.setAttribute("aria-invalid", "true");
      var err = input.closest(".field").querySelector(".field-error");
      if (!err) {
        err = document.createElement("span");
        err.className = "field-error";
        input.closest(".field").appendChild(err);
      }
      err.textContent = msg;
    }

    function clearError(input) {
      if (!input) return;
      input.removeAttribute("aria-invalid");
      var err = input.closest(".field").querySelector(".field-error");
      if (err) err.remove();
    }

    function validate() {
      var ok = true;
      var name = fields.name && fields.name.value.trim();
      var phone = fields.phone && fields.phone.value.trim();
      var date = fields.date && fields.date.value;

      if (!name) {
        setError(fields.name, "请告诉我们怎么称呼您"); ok = false;
      } else clearError(fields.name);

      if (!phone) {
        setError(fields.phone, "请留下联系电话"); ok = false;
      } else if (!/^1\d{10}$|^0\d{2,3}-?\d{7,8}$/.test(phone.replace(/[\s-]/g, ""))) {
        setError(fields.phone, "电话格式似乎不对，请检查"); ok = false;
      } else clearError(fields.phone);

      if (!date) {
        setError(fields.date, "请选择预约日期"); ok = false;
      } else {
        var chosen = new Date(date + "T00:00:00");
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        if (chosen < today) {
          setError(fields.date, "请选择今天或之后的日期"); ok = false;
        } else clearError(fields.date);
      }
      return ok;
    }

    ["name", "phone", "date"].forEach(function (key) {
      var input = fields[key];
      if (input) input.addEventListener("input", function () { clearError(input); });
    });

    visitForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;

      var guests = visitForm.elements.guests ? visitForm.elements.guests.value : "2";
      var who = fields.name ? fields.name.value.trim() : "";
      success.hidden = false;
      success.textContent = "收到啦！" + who + "，青野欢迎您来。" +
        "已为您记下 " + fields.date.value + "（" + guests + " 位）的预约，管家会在 24 小时内致电确认。";

      visitForm.reset();
      if (success.scrollIntoView) {
        success.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });
      }
    });
  }
})();
