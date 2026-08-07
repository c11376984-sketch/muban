/* ============================================================
   霓虹纪元 NEON ERA —— script.js
   交互模块：
   1. 终端打字机（typewriter）
   2. 产品卡 tilt + 辉光跟随（pointermove）
   3. 城市节点图情报读取（含数据计数）
   另含：移动端导航、表单提交反馈
   ============================================================ */

(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------------- 1. 终端打字机 ---------------- */
  const termBody = document.getElementById("term-body");
  const TERMINAL_LINES = [
    "> NEON ERA OS v6.0.4 启动中……",
    "> 连接节点：12 / 12 在线",
    "> 密钥身份：NEXUS_CITIZEN_2088",
    "> 光学引擎：已校准 0.1ms",
    "> 加密信道：HEX #00F0FF",
    "> 正在同步地下网咖信号……",
    "> 欢迎回家，游荡者。"
  ];

  function initTerminal() {
    if (!termBody) return;

    if (reducedMotion) {
      termBody.textContent = TERMINAL_LINES.join("\n");
      return;
    }

    // 只在终端进入视口时开始播放（节流版 IO）
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      typeLines(termBody, TERMINAL_LINES, 0, 0);
    }, { threshold: 0.3 });
    io.observe(termBody);
  }

  function typeLines(el, lines, li, ci) {
    if (li >= lines.length) {
      appendCursor(el);
      return;
    }
    const line = lines[li];
    // 快速行（以 > 开头且含冒号）逐字播放，其余略快
    const delay = line.includes("：") || line.includes(":") ? 26 : 12;

    el.textContent = lines.slice(0, li).join("\n") + (li ? "\n" : "") + line.slice(0, ci);

    if (ci <= line.length) {
      window.setTimeout(() => typeLines(el, lines, li, ci + 1), delay);
    } else {
      window.setTimeout(() => typeLines(el, lines, li + 1, 0), 320);
    }
  }

  function appendCursor(el) {
    const cursor = document.createElement("span");
    cursor.className = "term-cursor";
    cursor.setAttribute("aria-hidden", "true");
    el.appendChild(cursor);
  }

  /* ---------------- 2. 产品卡 tilt + 辉光跟随 ---------------- */
  function initTilt() {
    if (!finePointer || reducedMotion) return;

    document.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;

        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);

        // 以中心为基准的轻微旋转，保持近真实感
        const rotateY = (px - 0.5) * 7;
        const rotateX = (0.5 - py) * 7;
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      });

      const reset = () => {
        card.style.transform = "";
      };
      card.addEventListener("pointerleave", reset);
      card.addEventListener("blur", reset, true);
    });
  }

  /* ---------------- 3. 城市节点图情报读取 ---------------- */
  const NODE_DATA = {
    nexus: {
      name: "NEXUS 枢纽",
      en: "HUB",
      zone: "全城 · 霓虹大道中枢",
      power: 100,
      leader: "核心 AI · N-7",
      attitude: "友善",
      note: "霓虹纪元自建枢纽，承载全部外设的神经同步信号。",
      color: "#00f0ff"
    },
    synd: {
      name: "源核",
      en: "SYNDICATE",
      zone: "新港区 · 霓虹大道",
      power: 98,
      leader: "霓虹主教",
      attitude: "友善",
      note: "与霓虹纪元合作开发神经同步模块，共享三层加密信道。",
      color: "#00f0ff"
    },
    ghost: {
      name: "幻影帮",
      en: "GHOST",
      zone: "旧城区 · 电子巷",
      power: 74,
      leader: "零号",
      attitude: "中立",
      note: "以地下网络带宽换取外设，曾截获 VX-9 原型固件。",
      color: "#ff2bd6"
    },
    vesp: {
      name: "黄蜂会",
      en: "VESP",
      zone: "工业带 · 光缆区",
      power: 61,
      leader: "蜂后",
      attitude: "敌对",
      note: "正在黑市仿制 NX 键盘，警惕其未经校准的劣质光轴。",
      color: "#ffe600"
    },
    violet: {
      name: "紫教团",
      en: "VIOLET",
      zone: "穹顶站 · 上层环",
      power: 87,
      leader: "紫瞳",
      attitude: "中立",
      note: "信仰光学的修士团体，为环绕耳机的空间音效手工调音。",
      color: "#8a2bff"
    }
  };

  function initGridMap() {
    const readout = document.getElementById("node-readout");
    if (!readout) return;

    const hint = readout.querySelector("[data-readout-hint]");
    const dataBox = readout.querySelector("[data-readout-data]");
    const out = {
      name: readout.querySelector("[data-out-name]"),
      en: readout.querySelector("[data-out-en]"),
      zone: readout.querySelector("[data-out-zone]"),
      power: readout.querySelector("[data-out-power]"),
      leader: readout.querySelector("[data-out-leader]"),
      attitude: readout.querySelector("[data-out-attitude]"),
      note: readout.querySelector("[data-out-note]")
    };

    let selected = null;
    let rafId = null;

    const nodes = document.querySelectorAll(".node[data-faction]");
    const reveal = (faction) => {
      const d = NODE_DATA[faction];
      if (!d) return;

      hint.hidden = true;
      dataBox.hidden = false;
      out.name.textContent = d.name;
      out.en.textContent = d.en;
      out.zone.textContent = d.zone;
      out.leader.textContent = d.leader;
      out.attitude.textContent = d.attitude;
      out.attitude.style.color = d.color;
      out.note.textContent = d.note;
      out.power.style.color = d.color;

      // 节点强度计数
      if (rafId) cancelAnimationFrame(rafId);
      const target = d.power;
      const t0 = performance.now();
      const dur = reducedMotion ? 1 : 700;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        out.power.textContent = Math.round(target * eased);
        if (p < 1) rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);

      nodes.forEach((n) => {
        n.classList.toggle("is-selected", n.dataset.faction === faction);
        n.setAttribute("aria-pressed", n.dataset.faction === faction ? "true" : "false");
      });
      selected = faction;
    };

    const clearSelection = () => {
      if (selected) {
        nodes.forEach((n) => n.classList.remove("is-selected"));
        hint.hidden = false;
        dataBox.hidden = true;
        selected = null;
      }
    };

    const activate = (g) => {
      const faction = g.dataset.faction;
      if (faction === selected) {
        clearSelection();
      } else {
        reveal(faction);
      }
    };

    nodes.forEach((g) => {
      g.setAttribute("aria-pressed", "false");
      // pointer 设备
      g.addEventListener("pointerenter", () => { if (finePointer) reveal(g.dataset.faction); });
      g.addEventListener("pointerleave", () => { if (finePointer) clearSelection(); });
      // 键盘 / 触摸：显式激活
      g.addEventListener("click", () => activate(g));
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(g);
        }
      });
    });

    // Escape 清空
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") clearSelection();
    });
  }

  /* ---------------- 移动端导航 ---------------- */
  function initNav() {
    const toggle = document.getElementById("nav-toggle");
    const nav = document.getElementById("primary-nav");
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "关闭导航菜单" : "打开导航菜单");
    };

    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));

    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => setOpen(false))
    );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("open")) setOpen(false);
    });
  }

  /* ---------------- 表单提交反馈 ---------------- */
  function initForm() {
    const form = document.querySelector(".contact-form");
    if (!form) return;
    const status = form.querySelector(".form-status");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector("#name").value.trim();
      const email = form.querySelector("#email").value.trim();
      const message = form.querySelector("#message").value.trim();

      if (!name || !email || !message) {
        status.textContent = ">> 信道不完整，请补齐代号 / 通讯 ID / 讯息。";
        status.className = "form-status err";
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.textContent = ">> 通讯 ID 格式无效，请重新输入。";
        status.className = "form-status err";
        return;
      }
      status.textContent = `>> 讯息已加密发送至 NEXUS-2088，${name}，24 小时内必有回音。`;
      status.className = "form-status ok";
      form.reset();
    });
  }

  /* ---------------- 启动 ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initTerminal();
    initTilt();
    initGridMap();
    initNav();
    initForm();
  });
})();
