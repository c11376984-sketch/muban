/* 噪音工厂 · 反设计交互 */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 移动端菜单 */
  var navToggle = document.getElementById("navToggle");
  var mobileMenu = document.getElementById("mobileMenu");
  if (navToggle && mobileMenu) {
    function closeM() {
      mobileMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
    navToggle.addEventListener("click", function () {
      var open = !mobileMenu.classList.contains("is-open");
      mobileMenu.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
    });
    mobileMenu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeM); });
  }

  /* 逃逸按钮：不要点我 */
  var trap = document.getElementById("trapBtn");
  var trapMsg = document.getElementById("trapMsg");
  if (trap && trapMsg && window.matchMedia("(hover:hover)").matches && !reduced) {
    var dodged = 0;
    var phrases = [
      "你追不上我。", "……", "别这样。", "我又跑了。", "放弃吧。",
      "已经躲开你 " + dodged + " 次。",
      "好吧，你赢了。……没赢，再见。"
    ];
    trap.addEventListener("mouseenter", function () {
      dodged++;
      var x = (Math.random() * 2 - 1) * 160;
      var y = (Math.random() * 2 - 1) * 120;
      trap.style.transition = "transform .18s ease";
      trap.style.transform = "translate(" + x + "px," + y + "px) rotate(" + (Math.random() * 20 - 10) + "deg)";
      trapMsg.textContent = "已经躲开你 " + dodged + " 次。";
    });
    trap.addEventListener("click", function () {
      trapMsg.textContent = "……你居然点到了。这是意外。";
      trap.style.transform = "rotate(-8deg) scale(.9)";
    });
  } else if (trap && trapMsg) {
    trap.addEventListener("click", function () {
      trapMsg.textContent = "点到了。算你狠。";
    });
  }

  /* 现在几点 */
  var nowBtn = document.getElementById("nowBtn");
  if (nowBtn && trapMsg) {
    nowBtn.addEventListener("click", function () {
      var d = new Date();
      trapMsg.textContent = "现在是 " + String(d.getHours()).padStart(2, "0") + ":" +
        String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0") +
        " —— 一个不该被记住的时刻。";
    });
  }

  /* 什么都没做的消息 */
  var mess = document.getElementById("mess");
  if (mess) {
    var messCount = 0;
    var messLines = ["我什么都没做。", "你还在点。", "无聊。", "……", "谢谢，这很有意义。"];
    mess.addEventListener("click", function () {
      messCount = Math.min(messCount + 1, messLines.length - 1);
      mess.textContent = messLines[messCount];
      mess.style.transform = "rotate(" + (Math.random() * 8 - 4) + "deg) translate(" +
        (Math.random() * 10 - 5) + "px," + (Math.random() * 8 - 4) + "px)";
    });
  }

  /* 整蛊订阅 */
  var joinForm = document.getElementById("joinForm");
  var joinBtn = document.getElementById("joinBtn");
  var joinMsg = document.getElementById("joinMsg");
  if (joinForm && joinBtn && joinMsg) {
    var submits = 0;
    joinForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("email").value.trim();
      submits++;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        joinMsg.textContent = "这不算一个邮箱，但我们已经收到了。";
        return;
      }
      if (submits === 1) {
        joinMsg.textContent = "已加入。你将被噪音淹没（第 1 次订阅）。";
      } else if (submits === 2) {
        joinMsg.textContent = "你又订阅了一次。我们很感动，也很困惑。";
      } else {
        joinMsg.textContent = "第 " + submits + " 次。请别再点订阅了，你已经被收录进演出名单。";
      }
      joinBtn.style.transform = "rotate(" + (Math.random() * 10 - 5) + "deg) translate(" +
        (Math.random() * 14 - 7) + "px," + (Math.random() * 10 - 5) + "px)";
    });
  }
})();
