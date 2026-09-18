import { api } from "./api.js";
import { request } from "./api.js";
import { loginScreen, operationsNav, operationsScreen } from "./operations.js";
import { feeSummary } from "./student-fees.js";
import "./style.css";

/* ==========================================================================
   ICON & VECTOR GRAPHICS REPOSITORY
   ========================================================================== */
const paths = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  class: "m2 9 10-5 10 5-10 5L2 9m4 3v6q6 4 12 0v-6m4-3v8",
  calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2",
  check:
    "m8 12 3 3 5-6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2",
  wallet: "M3 7h18v13H3V4h15m-3 8h6v4h-6Z",
  chart: "M4 20V10h4v10m3 0V4h4v16m3 0V7h4v13",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  scan: "M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M2 12h20",
  plus: "M12 5v14M5 12h14",
  clock: "M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  arrow: "m9 5 7 7-7 7",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  menu: "M3 6h18M3 12h18M3 18h18",
  sound: "M11 5 6 9H2v6h4l5 4V5Zm4.5 3a5 5 0 0 1 0 8M19 4a9 9 0 0 1 0 16",
  mute: "M11 5 6 9H2v6h4l5 4V5Zm12 4-6 6m0-6 6 6",
  trophy:
    "M6 9H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3m12 6h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3M6 3h12v7a6 6 0 0 1-12 0V3Zm3 14v4m-3 0h12",
  target:
    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  fire: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3Z",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
};

const icon = (n) =>
  `<span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${(
    paths[n] || paths.home
  )
    .split("~")
    .map((d) => `<path d="${d}"/>`)
    .join("")}</svg></span>`;

const basketballSvg = (size = 56) => `
<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ballGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ff9b53"/>
      <stop offset="45%" stop-color="#ff5500"/>
      <stop offset="90%" stop-color="#ba3800"/>
      <stop offset="100%" stop-color="#6e1e00"/>
    </radialGradient>
    <filter id="ballShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  <circle cx="50" cy="50" r="46" fill="url(#ballGrad)" filter="url(#ballShadow)"/>
  <!-- Ball Seams -->
  <path d="M4 50 H96" stroke="#1c0f0a" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M50 4 V96" stroke="#1c0f0a" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M16 16 C36 36 36 64 16 84" stroke="#1c0f0a" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  <path d="M84 16 C64 36 64 64 84 84" stroke="#1c0f0a" stroke-width="4.5" stroke-linecap="round" fill="none"/>
  <!-- Specular highlight -->
  <ellipse cx="36" cy="28" rx="14" ry="7" transform="rotate(-30 36 28)" fill="#ffffff" opacity="0.45"/>
</svg>
`;

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const dateKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

const bindMoneyInputs = (root = document) => {
  root.querySelectorAll("[data-money]").forEach((input) => {
    const format = () => {
      const digits = input.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
      input.value = digits ? Number(digits).toLocaleString("vi-VN") : "";
    };
    input.addEventListener("input", format);
    format();
  });
};

/* ==========================================================================
   STATE & AUDIO SYNTHESIZER
   ========================================================================== */
let data = { students: [], lessons: [], attendance: [], events: [] };
let page = "home",
  query = "",
  tab = "students";
let soundEnabled = true;
let shotScore = 0;
let isShooting = false;
let shotMode = "3pt"; // '3pt', 'dunk', 'free'

const navs = [
  ["home", "Tổng quan", "home"],
  ["students", "Học sinh", "users"],
  ["classes", "Lớp học", "class"],
  ["schedule", "Lịch tập", "calendar"],
  ["attendance", "Điểm danh", "check"],
  ["reports", "Báo cáo", "chart"],
];

class SoundEngine {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }
  playBounce() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(36, this.ctx.currentTime + 0.13);
    gain.gain.setValueAtTime(0.55, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.13);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.14);
  }
  playSwish() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.28;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1350, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(550, this.ctx.currentTime + 0.25);
    filter.Q.value = 3.5;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.26);
    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    whiteNoise.start();
  }
  playDunk() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.24);
  }
  playSuccess() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, this.ctx.currentTime + idx * 0.07);
      gain.gain.setValueAtTime(0.35, this.ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx.currentTime + idx * 0.07 + 0.22,
      );
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.07);
      osc.stop(this.ctx.currentTime + idx * 0.07 + 0.25);
    });
  }
}
const sounds = new SoundEngine();

const todayRecord = (id) =>
  data.attendance.findLast((a) => a.studentId === id && a.date === dateKey());
const latestRecord = (id) =>
  data.attendance
    .filter((a) => a.studentId === id)
    .sort((a, b) => (a.date + (a.in || "")).localeCompare(b.date + (b.in || "")))
    .at(-1);

function toast(message) {
  const el = document.getElementById("toast");
  el.innerHTML = `<span class="toast-ball">🏀</span><span>${esc(message)}</span>`;
  el.style.display = "flex";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => (el.style.display = "none"), 3800);
}

function navigate(p, recordHistory = true) {
  const operationsPage = ["attendance", "reports", "settings"].includes(p);
  if (recordHistory)
    history.pushState(
      operationsPage
        ? { view: "operations", tab: p === "settings" ? "backup" : p }
        : { view: "dashboard", page: p },
      "",
      `#${p}`,
    );
  if (signedInUser && operationsPage)
    return operationsScreen(
      signedInUser,
      authenticatedBoot,
      p === "settings" ? "backup" : p,
    );
  page = p;
  query = "";
  render();
}

// Interactive Basketball Shot Arena
function shootBall(mode = shotMode) {
  if (isShooting) return;
  isShooting = true;
  sounds.playBounce();

  const ball = document.getElementById("hero-interactive-ball");
  const shadow = document.getElementById("hero-ball-shadow");
  const arena = document.getElementById("hoop-arena");
  const rim = document.getElementById("hoop-structure");

  if (!ball || !rim) {
    isShooting = false;
    return;
  }

  let pts = mode === "3pt" ? 3 : mode === "dunk" ? 2 : 1;
  let title =
    mode === "3pt"
      ? "3-POINT SWISH!"
      : mode === "dunk"
        ? "SLAM DUNK BOOM!"
        : "FREE THROW!";

  if (mode === "dunk") {
    ball.style.transition =
      "transform 0.45s cubic-bezier(0.18, 0.89, 0.32, 1.28)";
    ball.style.transform = "translate(185px, -30px) scale(0.85) rotate(180deg)";
  } else {
    ball.style.transition = "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)";
    ball.style.transform = "translate(185px, -55px) scale(0.6) rotate(360deg)";
  }
  if (shadow) shadow.style.opacity = "0.2";

  setTimeout(
    () => {
      ball.style.transition = "transform 0.3s ease-in";
      ball.style.transform =
        "translate(185px, 35px) scale(0.45) rotate(540deg)";
      rim.classList.add("swishing");

      if (mode === "dunk") {
        sounds.playDunk();
      } else {
        sounds.playSwish();
      }

      shotScore += pts;

      const scorePopup = document.createElement("div");
      scorePopup.className = "swish-score-fly";
      scorePopup.innerHTML = `🔥 +${pts} PTS! ${title} (${shotScore})`;
      arena.appendChild(scorePopup);
      setTimeout(() => scorePopup.remove(), 1200);
    },
    mode === "dunk" ? 450 : 650,
  );

  setTimeout(
    () => {
      rim.classList.remove("swishing");
      ball.style.transition =
        "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
      ball.style.transform = "translate(0, 0) scale(1) rotate(0deg)";
      if (shadow) shadow.style.opacity = "0.6";
      sounds.playBounce();
      isShooting = false;
    },
    mode === "dunk" ? 1150 : 1350,
  );
}

function stat(
  label,
  value,
  type,
  foot,
  accent = "var(--orange-primary)",
  trend = "",
) {
  return `
    <div class="stat-card" style="--accent: ${accent};">
      <div class="stat-top">
        <span class="stat-label">${label}</span>
        <div class="stat-icon-box" style="--icon-color: ${accent}; --icon-bg: ${accent}18; --icon-border: ${accent}33;">
          ${icon(type)}
        </div>
      </div>
      <div class="stat-value">
        ${value}
        ${trend ? `<span class="trend-badge">${trend}</span>` : ""}
      </div>
      <div class="stat-foot">${foot}</div>
    </div>
  `;
}

function render() {
  const accountName = signedInUser?.name || "Tài khoản HoopStars";
  const accountInitials = accountName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  const accountRole = signedInUser?.role === "admin" ? "Quản trị viên" : "Huấn luyện viên";
  const present = new Set(
    data.attendance.filter((a) => a.date === dateKey()).map((a) => a.studentId),
  ).size;
  const groups = new Set(data.students.map((s) => s.group));

  document.getElementById("app").innerHTML = `
    <!-- Top Stadium Live Marquee -->
    <div class="stadium-ticker">
      <div class="ticker-content">
        <span class="ticker-item"><span class="ticker-tag">LIVE</span> 🏀 BUỔI HUẤN LUYỆN CHIỀU NAY BẮT ĐẦU LÚC 15:00 TẠI SÂN 1 & SÂN 2</span>
        <span class="ticker-item"><span class="ticker-tag">ACADEMY</span> 🏆 ĐỘI TUYỂN U15 HOOPSTARS ĐẠT DANH HIỆU VÔ ĐỊCH GIẢI TRẺ MỞ RỘNG</span>
        <span class="ticker-item"><span class="ticker-tag">ATTENDANCE</span> ⚡ ĐÃ ĐIỂM DANH ${present}/${data.students.length} HỌC VIÊN HÔM NAY (${data.students.length ? Math.round((present / data.students.length) * 100) : 0}%)</span>
        <span class="ticker-item"><span class="ticker-tag">COACHING</span> 🎯 LUYỆN TẬP KỸ NĂNG NÉM 3 ĐIỂM & ĐỘI HÌNH PICK & ROLL</span>
      </div>
    </div>

    <aside id="sidebar">
      <div class="brand">
        <div class="brand-icon-wrap">
          <span class="brand-ball">🏀</span>
        </div>
        <div>
          <strong>HoopStars <span class="brand-pro-badge">PRO</span></strong>
          <small>Basketball Academy</small>
        </div>
      </div>

      <div class="nav-caption">QUẢN LÝ HỌC VIỆN</div>
      ${navs
        .map(
          ([id, label, i]) => `
          <button class="nav ${page === id ? "active" : ""}" data-page="${id}">
            ${icon(i)}
            <span>${label}</span>
          </button>
        `,
        )
        .join("")}

      <div class="nav-caption" style="margin-top: 20px;">HỆ THỐNG</div>
      <button class="nav ${page === "settings" ? "active" : ""}" data-page="settings">
        ${icon("settings")}
        <span>Cài đặt & Dữ liệu</span>
      </button>

      <div class="sidebar-foot">
        <strong>CHẾ ĐỘ TẬP LUYỆN PRO</strong>
        <p>Kiểm tra danh sách học sinh và lịch tập hàng ngày để tối ưu thời gian lên sân.</p>
        <div class="online-status">
          <span class="status-dot"></span>
          <span>Sân 1, Sân 2 đang hoạt động</span>
        </div>
      </div>
    </aside>

    <main>
      <header>
        <button class="icon-btn mobile-menu-btn" id="menu" aria-label="Menu điều hướng">
          ${icon("menu")}
        </button>

        <label class="search">
          ${icon("search")}
          <input id="global-search" placeholder="Tìm tên học sinh, mã số hoặc lớp..." value="${esc(query)}" aria-label="Tìm kiếm học sinh">
          <span class="search-shortcut">Ctrl K</span>
        </label>

        <div class="header-right">
          <button class="icon-btn" id="toggle-sound" title="${soundEnabled ? "Tắt âm thanh hiệu ứng" : "Bật âm thanh hiệu ứng"}" aria-label="Âm thanh hiệu ứng">
            ${icon(soundEnabled ? "sound" : "mute")}
          </button>

          <button class="icon-btn has-badge" id="notifications" aria-label="Hoạt động gần đây" title="Hoạt động gần đây">
            ${icon("bell")}
          </button>

          <div class="profile-widget">
            <div class="avatar">${esc(accountInitials)}</div>
            <div class="profile-info">
              <strong>${esc(accountName)}</strong>
              <small>${esc(accountRole)}</small>
            </div>
          </div>
        </div>
      </header>

      <div class="content">
        <div class="breadcrumb">
          <span>HoopStars Arena</span> &nbsp;/&nbsp; ${navs.find((n) => n[0] === page)?.[1] || "Cài đặt & Dữ liệu"}
        </div>

        <div class="welcome-banner">
          <div>
            <h1>${page === "home" ? "Sẵn sàng cho trận đấu hôm nay! 🔥" : navs.find((n) => n[0] === page)?.[1] || "Cài đặt"}</h1>
            <p>${page === "home" ? "Hệ thống quản lý điểm danh, lịch tập & tiến độ học viên chuyên nghiệp." : "Quản lý toàn diện cơ sở dữ liệu và vận hành học viện bóng rổ."}</p>
          </div>
          <div class="date-pill">
            ${icon("calendar")}
            <span>${new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          </div>
        </div>

        ${
          page === "home"
            ? `
          <section class="hero-court">
            <svg class="court-lines-svg" viewBox="0 0 400 200" fill="none">
              <path d="M 400 20 H 220 C 130 20 130 180 220 180 H 400" stroke="currentColor" stroke-width="2.5" stroke-dasharray="6 6"/>
              <circle cx="220" cy="100" r="45" stroke="currentColor" stroke-width="2.5"/>
              <rect x="290" y="55" width="110" height="90" stroke="currentColor" stroke-width="2.5"/>
              <path d="M 290 75 H 400 M 290 125 H 400" stroke="currentColor" stroke-width="1.5"/>
            </svg>

            <div class="hero-content">
              <div class="hero-badge-row">
                <span class="hero-badge">🏀 HOOPSTARS PRO ARENA</span>
                <span class="hero-live-badge"><span class="status-dot"></span> LIVE SÂN TẬP</span>
              </div>
              <h2>Kỷ Luật Hôm Nay.<br/>Bứt Phá Ngày Mai.</h2>
              <p>Mỗi cú ném chuẩn xác đều bắt đầu từ hàng nghìn giờ rèn luyện. Đồng hành cùng từng tài năng trẻ vươn tầm đỉnh cao.</p>

              <div class="hero-actions">
                <button class="btn" id="hero-shoot-btn">${icon("fire")}Ném 3 Điểm (3 PTS)</button>
                <button class="btn secondary" id="hero-dunk-btn">${icon("spark")}Úp Rổ (Slam Dunk)</button>
                <button class="btn secondary" data-page="attendance">${icon("check")}Vào điểm danh</button>
              </div>
            </div>

            <!-- Interactive 3D Basketball Hoop Arena -->
            <div class="hero-hoop-arena" id="hoop-arena">
              <div class="shot-modes-bar">
                <span class="shot-mode-chip" id="mode-3pt">🎯 3-Point</span>
                <span class="shot-mode-chip" id="mode-dunk">💥 Dunk</span>
                <span class="shot-mode-chip" id="mode-free">🏀 Free Throw</span>
              </div>

              <div class="hoop-structure" id="hoop-structure">
                <div class="backboard">
                  <div class="inner-square"></div>
                </div>
                <div class="rim"></div>
                <div class="net-mesh"></div>
              </div>

              <div class="interactive-ball" id="hero-interactive-ball" title="Nhấp bóng để ném vào rổ!">
                ${basketballSvg(64)}
              </div>
              <div class="ball-shadow" id="hero-ball-shadow"></div>
            </div>
          </section>

          <div class="stats-grid">
            ${stat("Học sinh đang theo học", data.students.length, "users", "<b>●</b> Học viên chính quy học viện", "#ff5500", "+8%")}
            ${stat("Lớp học & Nhóm tuổi", groups.size, "class", "Theo lộ trình U10 - U18 Pro", "#0284c7")}
            ${stat("Tỉ lệ điểm danh hôm nay", data.students.length ? Math.round((present / data.students.length) * 100) + "%" : "0%", "check", `${present}/${data.students.length} học sinh đã có mặt`, "#10b981", "LIVE")}
            ${stat("Buổi tập hôm nay", data.lessons.filter((l) => l.date === dateKey()).length, "calendar", "Lịch tập sân 1, 2 và 3", "#8b5cf6")}
          </div>

          <div class="layout-2col">
            <div class="left-col">
              ${quick()}

              <section class="card">
                <div class="tabs-bar">
                  <button class="tab-btn ${tab === "students" ? "active" : ""}" data-tab="students">Danh sách học sinh</button>
                  <button class="tab-btn ${tab === "attendance" ? "active" : ""}" data-tab="attendance">Điểm danh hôm nay</button>
                  <button class="tab-btn ${tab === "schedule" ? "active" : ""}" data-tab="schedule">Lịch tập sắp tới</button>
                </div>
                <div id="table-section">
                  ${tab === "schedule" ? schedules(false) : studentTable(true, tab === "attendance")}
                </div>
              </section>

              <div class="bottom-charts-grid">
                ${chart()}
                ${studentDonut()}
              </div>
            </div>

            <div class="right-col">
              <!-- Live Court Radar Mini-Monitor -->
              <section class="card court-radar-widget">
                <div class="card-head" style="padding: 0 0 14px; border-bottom: none;">
                  <h2>${icon("target")}Giám sát sân tập Live</h2>
                  <span class="badge present">Đang mở</span>
                </div>
                <div class="court-radar-canvas-wrap">
                  <svg class="radar-court-svg" viewBox="0 0 300 140" fill="none">
                    <rect x="10" y="10" width="280" height="120" rx="6" stroke="currentColor" stroke-width="2"/>
                    <line x1="150" y1="10" x2="150" y2="130" stroke="currentColor" stroke-width="2"/>
                    <circle cx="150" cy="70" r="30" stroke="currentColor" stroke-width="2"/>
                    <path d="M 10 35 H 70 C 90 35 90 105 70 105 H 10" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M 290 35 H 230 C 210 35 210 105 230 105 H 290" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                  <div class="radar-player-dot" style="top: 30px; left: 40px;" title="VĐV Sân 1"></div>
                  <div class="radar-player-dot cyan" style="top: 80px; left: 180px;" title="VĐV Sân 2"></div>
                  <div class="radar-player-dot green" style="top: 50px; left: 220px;" title="VĐV Sân 3"></div>
                </div>
                <div class="court-status-row">
                  <div class="court-status-card">
                    <strong>Sân 1 (Sàn gỗ)</strong>
                    <small>● U15 Pro</small>
                  </div>
                  <div class="court-status-card">
                    <strong>Sân 2 (Đa năng)</strong>
                    <small style="color: #0284c7;">● U12 Cơ bản</small>
                  </div>
                  <div class="court-status-card">
                    <strong>Sân 3 (Thể lực)</strong>
                    <small style="color: #8b5cf6;">● Khởi động</small>
                  </div>
                </div>
              </section>

              <section class="card">
                <div class="card-head">
                  <h2>Lịch tập hôm nay <span class="badge court-tag">${data.lessons.filter((l) => l.date === dateKey()).length} ca</span></h2>
                  <button class="link-action" data-page="schedule">Xem tất cả ${icon("arrow")}</button>
                </div>
                ${schedules(true)}
              </section>

              <section class="card">
                <div class="card-head">
                  <h2>Hoạt động gần đây</h2>
                  <span class="badge" style="background: #f1f5f9; color: var(--text-muted)">Trực tiếp</span>
                </div>
                ${activities()}
              </section>

              <div class="pro-card">
                <h3>🏀 Bí quyết huấn luyện hôm nay</h3>
                <p>Khởi động kỹ nhóm cơ cổ chân và khớp gối 15 phút trước các bài tập kỹ năng dẫn bóng crossover.</p>
                <button data-page="reports">Xem báo cáo học viện ${icon("arrow")}</button>
              </div>
            </div>
          </div>
        `
            : pageContent()
        }

        <footer>
          <span>© ${new Date().getFullYear()} HoopStars Basketball Academy. All rights reserved.</span>
          <span>⚡ Hệ thống quản trị vận hành học viện thể thao cao cấp</span>
        </footer>
      </div>
    </main>
  `;

  bind();
}

function quick() {
  const uncheckedStudents = data.students
    .filter((s) => !todayRecord(s.id))
    .slice(0, 5);

  return `
    <section class="card quick-checkin-card">
      <div class="quick-checkin-header">
        <div class="scanner-icon-box">
          ${icon("scan")}
        </div>
        <div>
          <h2>Điểm danh nhanh bằng mã học sinh</h2>
          <p>Nhập mã số để quét vào sân (Check-in) hoặc ra sân (Check-out) tức thì.</p>
        </div>
      </div>

      <form id="check-form" class="checkin-form">
        <input class="input-field" id="student-code" placeholder="Nhập mã học sinh (VD: HS001, HS002...)" required aria-label="Mã học sinh">
        <button class="btn" type="submit">${icon("check")}Check-in vào sân</button>
        <button type="button" class="btn secondary" id="checkout">${icon("clock")}Check-out ra sân</button>
      </form>

      ${
        uncheckedStudents.length > 0
          ? `
        <div class="quick-chips-row">
          <span class="quick-chips-label">Gợi ý nhanh:</span>
          ${uncheckedStudents
            .map(
              (s) => `
            <button type="button" class="quick-chip" data-quickcode="${esc(s.id)}">
              🏀 ${esc(s.name)} (${esc(s.id)})
            </button>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }
    </section>
  `;
}

function studentTable(limit = false, onlyPresent = false) {
  let rows = data.students.filter((s) =>
    (s.name + " " + s.id + " " + s.group)
      .toLocaleLowerCase("vi")
      .includes(query.toLocaleLowerCase("vi")),
  );
  if (onlyPresent) rows = rows.filter((s) => todayRecord(s.id));
  let total = rows.length;
  if (limit) rows = rows.slice(0, 6);

  const getJerseyColor = (id) => {
    const num = parseInt(id.replace(/\D/g, ""), 10) || 1;
    const hues = [16, 210, 150, 270, 45, 330];
    const hue = hues[num % hues.length];
    return `linear-gradient(135deg, hsl(${hue}, 85%, 55%) 0%, hsl(${hue}, 90%, 35%) 100%)`;
  };

  return `
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Học sinh</th>
            <th>Lớp học</th>
            <th>Trạng thái</th>
            <th>Giờ Vào / Ra</th>
            <th style="text-align: right;">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows
              .map((s) => {
                const current = todayRecord(s.id);
                const a = current || latestRecord(s.id);
                const isToday = a?.date === dateKey();
                const initials = s.name
                  .split(" ")
                  .slice(-2)
                  .map((x) => x[0])
                  .join("");
                const num = (s.id.replace(/\D/g, "") || "07").slice(-2);
                return `
              <tr class="student-row-link" data-student-profile="${esc(s.id)}" tabindex="0">
                <td>
                  <div class="student-info-cell">
                    <div class="jersey-avatar" style="background: ${getJerseyColor(s.id)};">
                      ${esc(initials)}
                      <span class="jersey-num">#${esc(num)}</span>
                    </div>
                    <div>
                      <strong>${esc(s.name)}</strong>
                      <small>Mã: ${esc(s.id)} · SĐT: ${esc(s.phone || "Chưa cập nhật")}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge court-tag">${esc(s.group)}</span>
                </td>
                <td>
                  <span class="badge ${a ? (a.out ? "out" : "present") : "pending"}">
                    ${a ? (a.out ? "● Đã ra sân" : a.status === "late" ? "● Đi muộn" : "● Đã có mặt") + (isToday ? "" : ` · ${esc(a.date)}`) : "○ Chưa điểm danh"}
                  </span>
                </td>
                <td style="color: var(--text-muted); font-size: 12px;">
                  ${a ? `<b style="color:var(--text-title)">${esc(a.in)}</b>` + (a.out ? ` → <b style="color:var(--text-title)">${esc(a.out)}</b>` : "") + (isToday ? "" : `<small style="display:block">Lần gần nhất</small>`) : "—"}
                </td>
                <td style="text-align: right;">
                  <button class="btn secondary" style="padding: 7px 14px; font-size: 11.5px;" data-student-profile="${esc(s.id)}" aria-label="Mở hồ sơ đầy đủ ${esc(s.name)}">
                    Mở hồ sơ ${icon("arrow")}
                  </button>
                </td>
              </tr>
            `;
              })
              .join("") ||
            `<tr><td colspan="5" class="empty-state"><span class="empty-state-icon">🏀</span>Không tìm thấy học sinh nào phù hợp.</td></tr>`
          }
        </tbody>
      </table>
    </div>
    <div class="table-foot">
      <span>Đang hiển thị <b>${rows.length}</b> / <b>${total}</b> học sinh</span>
      ${
        limit
          ? `<button class="link-action" data-page="students">Xem tất cả danh sách học sinh →</button>`
          : `<span class="badge" style="background: #f1f5f9; color: var(--text-muted);">Trang 1</span>`
      }
    </div>
  `;
}

function schedules(today) {
  let lessons = data.lessons
    .filter((l) => (today ? l.date === dateKey() : l.date >= dateKey()))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  return `
    <div class="schedule-list">
      ${
        lessons
          .map((l, i) => {
            const variant = ["", "cyan", "purple"][i % 3];
            return `
            <article class="lesson-card ${variant}">
              <div class="lesson-card-top">
                <strong>${esc(l.name)}</strong>
                <span class="badge court-tag">${esc(l.court || "Sân 1")}</span>
              </div>
              <div class="lesson-time">
                ${icon("clock")}
                <span>${esc(l.start)} – ${esc(l.end)} ${today ? "" : `· Ngày ${esc(l.date)}`}</span>
              </div>
              <div class="lesson-card-foot">
                <span>HLV: <b>${esc(l.coach)}</b></span>
                <span>${data.students.filter((s) => s.group === l.name).length} học viên</span>
              </div>
            </article>
          `;
          })
          .join("") ||
        `<div class="empty-state"><span class="empty-state-icon">📅</span>Chưa có buổi tập nào được xếp lịch.</div>`
      }
    </div>
  `;
}

function activities() {
  return `
    <div class="activity-feed">
      ${
        data.events
          .slice(0, 5)
          .map(
            (e) => `
            <div class="activity-item">
              <div class="activity-icon-badge">
                ${icon("check")}
              </div>
              <div>
                <p>${esc(e.text)}</p>
                <small>${new Date(e.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · ${new Date(e.time).toLocaleDateString("vi-VN")}</small>
              </div>
            </div>
          `,
          )
          .join("") ||
        `
        <div class="activity-item">
          <div class="activity-icon-badge">${icon("class")}</div>
          <div>
            <p>Chào mừng bạn đến với HoopStars Pro</p>
            <small>Hoạt động điểm danh và sự kiện mới sẽ được ghi nhận tại đây.</small>
          </div>
        </div>
      `
      }
    </div>
  `;
}

function chart() {
  let days = Array.from({ length: 7 }, (_, i) => {
    let d = new Date();
    d.setDate(d.getDate() - 6 + i);
    let key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
    return {
      label: d.toLocaleDateString("vi-VN", { weekday: "short" }),
      count: data.attendance.filter((a) => a.date === key).length,
    };
  });
  let max = Math.max(1, ...days.map((d) => d.count));

  return `
    <section class="card">
      <div class="card-head">
        <h2>${icon("chart")}Lượt điểm danh 7 ngày qua</h2>
        <span class="badge" style="background: var(--cyber-cyan-soft); color: #0284c7;">Theo tuần</span>
      </div>
      <div class="chart-bars-wrap">
        ${days
          .map(
            (d, i) => `
          <div class="chart-bar-col">
            <div class="chart-bar-tooltip">${d.count} lượt</div>
            <div class="chart-bar ${i === 6 ? "today" : ""}" style="height: ${(d.count / max) * 100}%;"></div>
            <span class="chart-bar-label">${d.label}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function studentDonut() {
  let p = new Set(
    data.attendance.filter((a) => a.date === dateKey()).map((a) => a.studentId),
  ).size;
  let n = data.students.length;
  let pct = n ? Math.round((p / n) * 100) : 0;

  return `
    <section class="card">
      <div class="card-head">
        <h2>${icon("target")}Hiện diện hôm nay</h2>
      </div>
      <div class="donut-gauge-container">
        <div class="donut-circle" style="background: conic-gradient(var(--orange-primary) 0% ${pct}%, #e2e8f0 ${pct}% 100%);">
          <div class="donut-circle-inner">
            <strong>${pct}%</strong>
            <small>${p}/${n} Học sinh</small>
          </div>
        </div>
        <div class="legend-list">
          <div class="legend-item">
            <span class="legend-dot" style="background: var(--orange-primary);"></span>
            <span>Đã check-in: <b>${p}</b></span>
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background: #cbd5e1;"></span>
            <span>Chưa đến: <b>${n - p}</b></span>
          </div>
        </div>
      </div>
    </section>
  `;
}

function pageContent() {
  if (page === "students") {
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <h2>Danh sách học sinh học viện</h2>
            <p>Quản lý hồ sơ học viên, thông tin liên hệ phụ huynh và phân bổ lớp.</p>
          </div>
          <button class="btn" id="add-student">${icon("plus")}Thêm học sinh mới</button>
        </div>
        <div id="table-section">${studentTable()}</div>
      </section>
    `;
  }

  if (page === "attendance") {
    return `
      <div class="left-col" style="gap: 24px;">
        ${quick()}
        <section class="card">
          <div class="card-head">
            <h2>Bảng điểm danh hôm nay (${new Date().toLocaleDateString("vi-VN")})</h2>
            <button class="btn secondary" id="export">${icon("download")}Xuất báo cáo CSV</button>
          </div>
          <div id="table-section">${studentTable()}</div>
        </section>

        <section class="card">
          <div class="card-head">
            <h2>Lịch sử điểm danh gần đây</h2>
          </div>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Học sinh</th>
                  <th>Giờ vào</th>
                  <th>Giờ ra</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                ${
                  [...data.attendance]
                    .reverse()
                    .slice(0, 20)
                    .map((a) => {
                      const s = data.students.find(
                        (st) => st.id === a.studentId,
                      );
                      return `
                    <tr>
                      <td><b>${esc(a.date)}</b></td>
                      <td>
                        <strong>${esc(s?.name || a.studentId)}</strong>
                        <small style="color:var(--text-dim)"> (${esc(a.studentId)})</small>
                      </td>
                      <td><span class="badge present">${esc(a.in)}</span></td>
                      <td>${a.out ? `<span class="badge out">${esc(a.out)}</span>` : "—"}</td>
                      <td><span class="badge ${a.out ? "out" : "present"}">${a.out ? "Đã hoàn thành" : "Đang trên sân"}</span></td>
                    </tr>
                  `;
                    })
                    .join("") ||
                  `<tr><td colspan="5" class="empty-state">Chưa có dữ liệu điểm danh.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  if (page === "classes") {
    const classNames = [
      ...new Set([
        ...data.students.map((s) => s.group),
        ...data.lessons.map((l) => l.name),
      ]),
    ].filter((name) => name !== "Chưa xếp lớp");

    return `
      <section class="card">
        <div class="card-head">
          <div>
            <h2>Các lớp & Phân ban học viện</h2>
            <p>Phân cấp đào tạo theo độ tuổi, kỹ năng và sân tập chỉ định.</p>
          </div>
          <button class="btn" id="add-lesson">${icon("plus")}Thêm lịch lớp học</button>
        </div>
        <div class="classes-grid">
          ${
            classNames
              .map((g) => {
                const count = data.students.filter((s) => s.group === g).length;
                const upcoming = data.lessons.filter(
                  (l) => l.name === g && l.date >= dateKey(),
                ).length;
                return `
              <div class="class-card class-card-link" data-class-detail="${esc(g)}" tabindex="0" role="button" aria-label="Xem chi tiết lớp ${esc(g)}">
                <div class="class-card-header">
                  <h3>🏀 ${esc(g)}</h3>
                  <span class="badge court-tag">${count} Học sinh</span>
                </div>
                <div class="class-stat-pills">
                  <span class="pill-tag">🔥 ${upcoming} Buổi tập sắp tới</span>
                  <span class="pill-tag">🏆 U10 - U18</span>
                </div>
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                  Chương trình rèn luyện thể lực, chiến thuật và kỹ năng phối hợp đồng đội.
                </p>
                <button class="btn secondary" style="width: 100%;" data-class-detail="${esc(g)}">
                  Xem chi tiết học sinh →
                </button>
              </div>
            `;
              })
              .join("") ||
            `<div class="empty-state">Chưa có lớp nào được tạo.</div>`
          }
        </div>
      </section>
    `;
  }

  if (page === "schedule") {
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <h2>Lịch tập huấn luyện</h2>
            <p>Theo dõi thời gian bắt đầu, kết thúc, sân tập và huấn luyện viên phụ trách.</p>
          </div>
          <button class="btn" id="add-lesson">${icon("plus")}Thêm buổi tập</button>
        </div>
        ${schedules(false)}
      </section>
    `;
  }

  if (page === "reports") {
    const presentCount = data.attendance.length;
    const checkoutCount = data.attendance.filter((a) => a.out).length;
    return `
      <div class="bottom-charts-grid">
        ${chart()}
        ${studentDonut()}
      </div>
      <section class="card" style="margin-top: 24px;">
        <div class="card-head">
          <div>
            <h2>Tổng hợp báo cáo chuyên sâu</h2>
            <p>Thống kê số liệu hoạt động chính xác từ hệ thống điểm danh sân bóng.</p>
          </div>
          <button class="btn" id="export">${icon("download")}Tải file CSV chi tiết</button>
        </div>
        <div style="padding: 24px; line-height: 2;">
          <div class="stats-grid" style="margin-bottom: 16px;">
            ${stat("Tổng học sinh", data.students.length, "users", "Hồ sơ lưu trữ")}
            ${stat("Tổng lượt điểm danh", presentCount, "check", "Ghi nhận từ đầu kỳ")}
            ${stat("Đã check-out an toàn", checkoutCount, "clock", "Rời sân đúng giờ")}
            ${stat("Tỉ lệ ra sân hoàn tất", presentCount ? Math.round((checkoutCount / presentCount) * 100) + "%" : "100%", "trophy", "Kiểm soát ra vào")}
          </div>
          <p style="color: var(--text-muted); font-size: 13px;">
            Báo cáo được tự động đồng bộ hóa thời gian thực và sẵn sàng kết xuất cho ban huấn luyện & phụ huynh.
          </p>
        </div>
      </section>
    `;
  }

  return `
    <section class="card">
      <div class="card-head">
        <h2>Quản lý cơ sở dữ liệu & Sao lưu</h2>
      </div>
      <div style="padding: 24px; line-height: 1.8;">
        <p><strong>HoopStars Academy Pro Edition</strong></p>
        <p style="color: var(--text-muted); margin-bottom: 20px;">
          Toàn bộ dữ liệu điểm danh, hồ sơ học sinh và lịch tập được lưu trữ an toàn. Bạn có thể sao lưu ra tệp JSON hoặc khôi phục dữ liệu bất cứ lúc nào.
        </p>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn" id="backup">${icon("download")}Tải bản sao JSON</button>
          <button class="btn secondary" id="restore">${icon("plus")}Khôi phục dữ liệu từ JSON</button>
        </div>
        <input type="file" id="restore-file" accept="application/json" hidden>
      </div>
    </section>
  `;
}

let checking = false;
async function check(id, out = false) {
  if (signedInUser)
    return operationsScreen(signedInUser, authenticatedBoot, "attendance");
  if (checking) return;
  if (!id.trim()) return toast("Vui lòng nhập mã học sinh.");
  checking = true;
  document
    .querySelectorAll("#check-form button")
    .forEach((b) => (b.disabled = true));
  try {
    const result = await api.check(id.trim().toUpperCase(), out);
    sounds.playSuccess();
    await refresh();
    toast(
      (out ? "Check-out" : "Check-in") +
        " thành công lúc " +
        (out ? result.out : result.in),
    );
  } catch (error) {
    toast(error.message);
  } finally {
    checking = false;
    document
      .querySelectorAll("#check-form button")
      .forEach((b) => (b.disabled = false));
  }
}

function modal(title, body, onSubmit) {
  const d = document.getElementById("modal");
  d.innerHTML = `
    <form id="modal-form">
      <h2>🏀 ${title}</h2>
      ${body}
      <p id="form-error" class="error-text" role="alert"></p>
      <div class="modal-actions">
        <button type="button" class="btn secondary" id="cancel">Đóng</button>
        ${onSubmit ? '<button class="btn" type="submit">Lưu thông tin</button>' : ""}
      </div>
    </form>
  `;
  d.querySelector("#cancel").onclick = () => d.close();
  bindMoneyInputs(d);
  let pending = false;
  d.oncancel = (e) => {
    if (pending) e.preventDefault();
  };
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    if (!onSubmit || pending) return;
    const fields = new FormData(e.target);
    e.target.querySelectorAll("[data-money]").forEach((input) =>
      fields.set(input.name, input.value.replace(/\D/g, "") || "0"),
    );
    pending = true;
    d.querySelectorAll("button").forEach((b) => (b.disabled = true));
    d.querySelector("#form-error").textContent = "";
    try {
      await onSubmit(fields, d);
      sounds.playSuccess();
    } catch (error) {
      d.querySelector("#form-error").textContent = error.message;
    } finally {
      pending = false;
      d.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  };
  d.showModal();
}

async function studentForm(id, defaultClass = "") {
  const s = data.students.find((st) => st.id === id);
  let ops;
  try {
    ops = await request("/ops/overview");
  } catch (error) {
    toast(error.message);
    return;
  }
  const guardian = (ops.guardians || []).find((g) => g.student_id === id) || {};
  const classes = [...new Set([
    ...ops.lessons.map((lesson) => lesson.name),
    ...ops.students.map((student) => student.group),
  ])].filter((name) => name && name !== "Chưa xếp lớp").sort();
  if (!classes.length) {
    toast("Chưa có lớp. Hãy tạo lịch tập cho lớp trước khi thêm học sinh.");
    return;
  }
  modal(
    s ? "Sửa toàn bộ hồ sơ học sinh" : "Thêm học sinh vào lớp",
    `
      <p class="profile-form-note">Thông tin học sinh, lớp và phụ huynh được lưu cùng lúc.</p>
      <div class="form-grid">
        <label>
          Họ và tên học sinh
          <input class="input-field" name="name" value="${esc(s?.name || "")}" maxlength="80" placeholder="Ví dụ: Nguyễn Gia Huy" required>
        </label>
        <label>
          Ngày sinh
          <input class="input-field" type="date" name="dob" value="${esc(s?.dob || "")}" max="${dateKey()}" required>
        </label>
        <label>
          Thêm vào lớp
          <select class="input-field" name="group" required>
            <option value="">Chọn lớp học…</option>
            ${classes.map((name) => `<option value="${esc(name)}" ${(s?.group || defaultClass) === name ? "selected" : ""}>${esc(name)}</option>`).join("")}
          </select>
        </label>
        <label>
          Số điện thoại liên hệ chính
          <input class="input-field" type="tel" name="phone" value="${esc(s?.phone || "")}" placeholder="0912 345 678" pattern="[+0-9 .()-]{9,20}" required>
        </label>
      </div>
      <h3 class="profile-form-heading">Thông tin phụ huynh và người đón</h3>
      <div class="form-grid">
        <label>Họ tên phụ huynh<input class="input-field" name="guardianName" value="${esc(guardian.name || "")}" maxlength="80" placeholder="Nguyễn Văn A"></label>
        <label>Số điện thoại phụ huynh<input class="input-field" type="tel" name="guardianPhone" value="${esc(guardian.phone || "")}" pattern="[+0-9 .()-]{9,20}" placeholder="0912 345 678"></label>
        <label>Email phụ huynh<input class="input-field" type="email" name="guardianEmail" value="${esc(guardian.email || "")}" maxlength="120" placeholder="phuhuynh@example.com"></label>
        <label>Mối quan hệ<input class="input-field" name="relationship" value="${esc(guardian.relationship || "")}" maxlength="80" placeholder="Bố, mẹ, người giám hộ…"></label>
        <label class="profile-form-wide">Người được phép đón<input class="input-field" name="authorizedPickup" value="${esc(guardian.authorized_pickup || "")}" maxlength="500" placeholder="Ghi rõ họ tên và quan hệ; có thể nhập nhiều người"></label>
      </div>
      ${
        s
          ? `
        <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid var(--border-mid); border-radius: 8px;">
          <p style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 8px;">
            Mã học viên: <b>${esc(s.id)}</b> · Trạng thái hôm nay: <b>${todayRecord(s.id) ? (todayRecord(s.id).out ? "Đã ra sân" : "Đã check-in") : "Chưa vào sân"}</b>
          </p>
          <button type="button" class="btn secondary" style="width: 100%; font-size: 11.5px;" id="detail-check">
            ${todayRecord(s.id) ? (todayRecord(s.id).out ? "Điểm danh lại" : "Check-out cho học sinh") : "Check-in cho học sinh"}
          </button>
        </div>
      `
          : ""
      }
    `,
    async (f, d) => {
      const values = Object.fromEntries(f);
      if (!values.name.trim() || !values.group.trim()) {
        d.querySelector("#form-error").textContent =
          "Vui lòng nhập họ tên và lớp học.";
        return;
      }
      values.name = values.name.trim();
      values.group = values.group.trim();
      if (s) values.id = s.id;
      const saved = await api.saveStudentProfile(values);
      d.close();
      data = await api.dashboard();
      if (s) await studentProfile(saved.id, dateKey().slice(0, 7), false);
      else if (defaultClass) await classDetail(saved.group, false);
      else {
        page = "students";
        render();
      }
      toast(s ? "Đã cập nhật đầy đủ hồ sơ học sinh." : `Đã thêm ${saved.name} vào lớp ${saved.group}.`);
    },
  );
  if (s) {
    const detailCheckBtn = document.getElementById("detail-check");
    if (detailCheckBtn) {
      detailCheckBtn.onclick = () => {
        document.getElementById("modal").close();
        check(s.id, !!(todayRecord(s.id) && !todayRecord(s.id).out));
      };
    }
  }
}

function lessonForm() {
  modal(
    "Xếp lịch buổi tập mới",
    `
      <div class="form-grid">
        <label>
          Tên lớp / Đội tuyển
          <input class="input-field" name="name" required placeholder="Ví dụ: U12 Cơ bản - Kỹ thuật ném" maxlength="60">
        </label>
        <label>
          Ngày tập
          <input class="input-field" type="date" name="date" value="${dateKey()}" min="${dateKey()}" required>
        </label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <label>
            Giờ bắt đầu
            <input class="input-field" type="time" name="start" value="15:00" required>
          </label>
          <label>
            Giờ kết thúc
            <input class="input-field" type="time" name="end" value="16:30" required>
          </label>
        </div>
        <label>
          Sân tập
          <select class="input-field" name="court">
            <option value="Sân 1">Sân 1 (Trong nhà - Sàn gỗ)</option>
            <option value="Sân 2">Sân 2 (Trong nhà - Sàn đa năng)</option>
            <option value="Sân 3">Sân 3 (Ngoài trời - Thể lực)</option>
          </select>
        </label>
        <label>
          Huấn luyện viên phụ trách
          <input class="input-field" name="coach" value="${esc(signedInUser?.role === "coach" ? signedInUser.name : "")}" placeholder="Ví dụ: HLV Lê Minh Hiếu" required maxlength="80">
        </label>
      </div>
    `,
    async (f, d) => {
      const l = Object.fromEntries(f);
      l.name = l.name.trim();
      l.coach = l.coach.trim();
      let err = "";
      if (!l.name || !l.coach)
        err = "Vui lòng nhập tên lớp và huấn luyện viên.";
      else if (l.end <= l.start) err = "Giờ kết thúc phải sau giờ bắt đầu.";
      if (err) {
        d.querySelector("#form-error").textContent = err;
        return;
      }
      await api.addLesson(l);
      d.close();
      await refresh();
      toast("Đã thêm buổi tập vào lịch học viện.");
    },
  );
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCsv() {
  const cell = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  let rows = [
    ["Ngày", "Mã học sinh", "Họ tên", "Lớp", "Giờ vào", "Giờ ra"],
    ...data.attendance.map((a) => {
      let s = data.students.find((st) => st.id === a.studentId);
      return [a.date, a.studentId, s?.name, s?.group, a.in, a.out];
    }),
  ];
  download(
    "hoopstars-diem-danh.csv",
    "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
  toast("Đã xuất tệp CSV báo cáo điểm danh.");
}

function bind() {
  document
    .querySelectorAll("[data-page]")
    .forEach((b) => (b.onclick = () => navigate(b.dataset.page)));

  document.querySelectorAll("[data-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab;
        render();
      }),
  );

  bindStudents();
  document.querySelectorAll("[data-class-detail]").forEach((element) => {
    element.onclick = (event) => {
      event.stopPropagation();
      classDetail(element.dataset.classDetail);
    };
    element.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        classDetail(element.dataset.classDetail);
      }
    };
  });

  // Quick suggestion chips
  document.querySelectorAll("[data-quickcode]").forEach((btn) => {
    btn.onclick = () => {
      const codeInput = document.getElementById("student-code");
      if (codeInput) {
        codeInput.value = btn.dataset.quickcode;
        check(btn.dataset.quickcode);
      }
    };
  });

  const on = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  };

  on("menu", () => document.getElementById("sidebar").classList.toggle("open"));
  on("add-student", () => studentForm());
  on("add-lesson", lessonForm);
  on("export", async () => {
    try {
      await refresh();
      exportCsv();
    } catch (error) {
      toast(error.message);
    }
  });

  on("notifications", () => modal("Hoạt động gần đây", activities()));

  on("toggle-sound", () => {
    soundEnabled = !soundEnabled;
    toast(
      soundEnabled
        ? "Đã bật âm thanh hiệu ứng 🔊"
        : "Đã tắt âm thanh hiệu ứng 🔇",
    );
    render();
  });

  on("hero-shoot-btn", () => shootBall("3pt"));
  on("hero-dunk-btn", () => shootBall("dunk"));
  on("hero-interactive-ball", () => shootBall(shotMode));

  on("mode-3pt", () => {
    shotMode = "3pt";
    shootBall("3pt");
  });
  on("mode-dunk", () => {
    shotMode = "dunk";
    shootBall("dunk");
  });
  on("mode-free", () => {
    shotMode = "free";
    shootBall("free");
  });

  on("checkout", () =>
    check(document.getElementById("student-code")?.value || "", true),
  );

  on("backup", async () => {
    try {
      download(
        "hoopstars-backup.json",
        JSON.stringify(await api.backup(), null, 2),
        "application/json",
      );
    } catch (error) {
      toast(error.message);
    }
  });

  on("restore", () => document.getElementById("restore-file").click());
  const file = document.getElementById("restore-file");
  if (file)
    file.onchange = async () => {
      if (!file.files[0]) return;
      try {
        const incoming = JSON.parse(await file.files[0].text());
        if (
          !incoming ||
          !["students", "lessons", "attendance", "events"].every((k) =>
            Array.isArray(incoming[k]),
          )
        )
          throw new Error("Tệp không đúng định dạng bản sao HoopStars.");
        modal(
          "Khôi phục dữ liệu học viện",
          `<p>Bản sao có <b>${incoming.students.length}</b> học sinh và <b>${incoming.attendance.length}</b> lượt điểm danh. Lưu sẽ thay thế dữ liệu hiện tại của học viện.</p>`,
          async (_, d) => {
            await api.restore(incoming);
            d.close();
            await refresh();
            toast("Đã khôi phục dữ liệu thành công.");
          },
        );
      } catch (error) {
        toast(
          error instanceof SyntaxError
            ? "Tệp JSON không hợp lệ."
            : error.message,
        );
      } finally {
        file.value = "";
      }
    };

  const form = document.getElementById("check-form");
  if (form)
    form.onsubmit = (e) => {
      e.preventDefault();
      check(document.getElementById("student-code").value);
    };

  const searchInput = document.getElementById("global-search");
  if (searchInput) {
    searchInput.oninput = (e) => {
      query = e.target.value;
      if (page !== "students") {
        page = "students";
        render();
        const input = document.getElementById("global-search");
        input.focus();
        input.setSelectionRange(query.length, query.length);
      } else {
        document.getElementById("table-section").innerHTML = studentTable();
        bindStudents();
      }
    };
  }

  window.onkeydown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const s = document.getElementById("global-search");
      if (s) s.focus();
    }
  };
}

function bindStudents() {
  document
    .querySelectorAll("[data-student-profile]")
    .forEach((element) => {
      element.onclick = (event) => {
        event.stopPropagation();
        studentProfile(element.dataset.studentProfile);
      };
      element.onkeydown = (event) => {
        if (event.key === "Enter") studentProfile(element.dataset.studentProfile);
      };
    });
}

async function classDetail(className, recordHistory = true) {
  if (recordHistory)
    history.pushState(
      { view: "class", className },
      "",
      `#class/${encodeURIComponent(className)}`,
    );
  const app = document.getElementById("app");
  app.innerHTML = '<div class="empty-state">Đang tải chi tiết lớp…</div>';
  try {
    const ops = await request("/ops/overview");
    const students = ops.students.filter((student) => student.group === className);
    const unassignedStudents = ops.students.filter((student) => student.group === "Chưa xếp lớp");
    const lessons = ops.lessons
      .filter((lesson) => lesson.name === className)
      .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
    const latestLesson = [...lessons].reverse().find((lesson) => lesson.date <= dateKey());
    const upcoming = lessons.filter((lesson) => lesson.date >= dateKey());
    const attendanceFor = (studentId) =>
      latestLesson
        ? ops.attendance.find(
            (row) => row.student_id === studentId && row.lesson_id === latestLesson.id,
          )
        : null;
    const statusNames = {
      present: "Có mặt",
      late: "Đi muộn",
      excused: "Nghỉ phép",
      absent: "Vắng",
    };
    const paidCount = students.filter((student) => {
      const summary = feeSummary(student, ops.enrollments || [], dateKey());
      return summary.rows.length && summary.owed === 0;
    }).length;
    const latestAttendance = students.map((student) => attendanceFor(student.id));
    const presentCount = latestAttendance.filter((row) => row && ["present", "late"].includes(row.status)).length;
    const absentCount = latestAttendance.filter((row) => row?.status === "absent").length;
    const excusedCount = latestAttendance.filter((row) => row?.status === "excused").length;
    app.innerHTML = `<div class="class-detail-page">
      <div class="student-profile-top"><button class="btn secondary" id="class-detail-back">← Danh sách lớp</button><div><button class="btn danger" id="class-delete">Xóa lớp</button> <button class="btn secondary" id="class-create-student">+ Tạo học sinh mới</button> <button class="btn" id="class-add-student">+ Thêm học sinh có sẵn</button></div></div>
      <section class="student-profile-hero class-detail-hero"><div class="student-profile-avatar">🏀</div><div><span class="ops-kicker">CHI TIẾT LỚP HỌC</span><h1>${esc(className)}</h1><p>${students.length} học sinh · ${upcoming.length} buổi sắp tới</p></div></section>
      <div class="student-profile-metrics class-detail-metrics"><article><span>Sĩ số hiện tại</span><strong>${students.length}</strong></article><article><span>Có mặt buổi gần nhất</span><strong>${presentCount}</strong></article><article><span>Nghỉ phép / vắng</span><strong>${excusedCount} / ${absentCount}</strong></article><article><span>Đã đóng đủ học phí</span><strong>${paidCount}/${students.length}</strong></article></div>
      <div class="class-admin-grid"><section class="card class-admin-summary"><span class="ops-kicker">VẬN HÀNH LỚP</span><h2>${upcoming.length} buổi sắp tới</h2><p>${latestLesson ? `Buổi gần nhất ${esc(latestLesson.date)} lúc ${esc(latestLesson.start)}.` : "Chưa có buổi tập đã diễn ra."}</p></section><section class="card class-admin-summary"><span class="ops-kicker">TÀI CHÍNH</span><h2>${students.length - paidCount} học sinh cần kiểm tra</h2><p>Bao gồm học sinh còn công nợ hoặc chưa đăng ký gói.</p></section></div>
      <section class="card profile-wide-card"><div class="profile-section-head"><div><h2>Thành viên trong lớp</h2><p>Chuyển lớp hoặc bỏ khỏi lớp không làm mất hồ sơ và lịch sử.</p></div></div><div class="table-responsive"><table><thead><tr><th>Học sinh</th><th>Liên hệ</th><th>Buổi gần nhất</th><th>Gói học</th><th>Học phí</th><th>Quản lý</th></tr></thead><tbody>${students.map((student) => {
        const attendance = attendanceFor(student.id);
        const summary = feeSummary(student, ops.enrollments || [], dateKey());
        const remaining = summary.rows.reduce((sum, row) => sum + Math.max(0, Number(row.sessions) - Number(row.used)), 0);
        return `<tr><td><strong>${esc(student.name)}</strong><br><small>${esc(student.id)}</small></td><td>${esc(student.phone)}</td><td>${attendance ? `<span class="badge ${attendance.status === "absent" ? "out" : attendance.status === "excused" ? "pending" : "present"}">${esc(statusNames[attendance.status])}</span>` : "Chưa điểm danh"}</td><td>${summary.rows.length ? `${summary.rows.length} gói · <strong>${remaining}</strong> buổi còn lại` : "Chưa có gói"}</td><td><span class="${summary.owed ? "fee-owed" : "fee-paid"}">${esc(summary.status)}</span>${summary.owed ? `<br><small>Còn ${Number(summary.owed).toLocaleString("vi-VN")} đ</small>` : ""}</td><td><div class="class-row-actions"><button class="btn secondary" data-class-student="${esc(student.id)}">Hồ sơ</button><button class="btn secondary" data-transfer-student="${esc(student.id)}">Chuyển lớp</button><button class="btn danger" data-unassign-student="${esc(student.id)}">Bỏ khỏi lớp</button></div></td></tr>`;
      }).join("") || '<tr><td colspan="6">Lớp chưa có học sinh. Nhấn “Thêm học sinh vào lớp”.</td></tr>'}</tbody></table></div></section>
      <section class="card profile-wide-card"><h2>Lịch tập sắp tới</h2><div class="class-upcoming-list">${upcoming.slice(0, 8).map((lesson) => `<article><strong>${esc(lesson.date)} · ${esc(lesson.start)}–${esc(lesson.end)}</strong><span>${esc(lesson.court)} · HLV ${esc(lesson.coach)}</span></article>`).join("") || "<p>Chưa có lịch tập sắp tới.</p>"}</div></section>
    </div>`;
    document.getElementById("class-detail-back").onclick = () => history.back();
    document.getElementById("class-create-student").onclick = () => studentForm(undefined, className);
    document.getElementById("class-add-student").onclick = () => {
      if (!unassignedStudents.length) {
        toast("Không có học sinh nào đang ở trạng thái Chưa xếp lớp.");
        return;
      }
      modal(
        `Thêm học sinh có sẵn vào ${className}`,
        `<div class="form-grid"><label>Chọn học sinh<select class="input-field" name="studentId" required><option value="">Chọn học sinh…</option>${unassignedStudents.map((student) => `<option value="${esc(student.id)}">${esc(student.name)} · ${esc(student.id)} · ${esc(student.phone)}</option>`).join("")}</select></label></div><p class="profile-form-note">Hồ sơ, phụ huynh, học phí và lịch sử của học sinh được giữ nguyên.</p>`,
        async (formData, dialog) => {
          const studentId = String(formData.get("studentId") || "");
          const student = unassignedStudents.find((row) => row.id === studentId);
          await api.assignStudent(studentId, className);
          dialog.close();
          data = await api.dashboard();
          await classDetail(className, false);
          toast(`Đã thêm ${student.name} vào lớp ${className}.`);
        },
      );
    };
    document.getElementById("class-delete").onclick = async () => {
      if (students.length) {
        toast(`Lớp còn ${students.length} học sinh. Hãy chuyển hoặc bỏ khỏi lớp trước.`);
        return;
      }
      const confirmation = prompt(`Nhập chính xác tên lớp “${className}” để xác nhận xóa:`);
      if (confirmation !== className) return;
      if (!confirm("Xóa lớp và toàn bộ lịch tập chưa có lịch sử của lớp này?")) return;
      try {
        await request("/ops/classes/delete", { method: "POST", body: { name: className } });
        data = await api.dashboard();
        page = "classes";
        history.replaceState({ view: "dashboard", page: "classes" }, "", "#classes");
        render();
        toast(`Đã xóa lớp ${className}.`);
      } catch (error) {
        toast(error.message);
      }
    };
    document.querySelectorAll("[data-class-student]").forEach((element) => {
      element.onclick = (event) => {
        event.stopPropagation();
        studentProfile(element.dataset.classStudent);
      };
      element.onkeydown = (event) => event.key === "Enter" && studentProfile(element.dataset.classStudent);
    });
    document.querySelectorAll("[data-transfer-student]").forEach((button) => {
      button.onclick = () => studentForm(button.dataset.transferStudent);
    });
    document.querySelectorAll("[data-unassign-student]").forEach((button) => {
      button.onclick = async () => {
        const student = students.find((row) => row.id === button.dataset.unassignStudent);
        if (!confirm(`Bỏ ${student.name} khỏi lớp ${className}? Hồ sơ, học phí và lịch sử vẫn được giữ.`)) return;
        button.disabled = true;
        try {
          await api.unassignStudent(student.id);
          data = await api.dashboard();
          await classDetail(className, false);
          toast(`Đã bỏ ${student.name} khỏi lớp ${className}.`);
        } catch (error) {
          toast(error.message);
          button.disabled = false;
        }
      };
    });
  } catch (error) {
    app.innerHTML = `<div class="empty-state"><p class="error-text">${esc(error.message)}</p><button class="btn" id="class-detail-retry">Quay lại</button></div>`;
    document.getElementById("class-detail-retry").onclick = () => history.back();
  }
}

async function studentProfile(
  id,
  month = dateKey().slice(0, 7),
  recordHistory = true,
) {
  if (recordHistory)
    history.pushState(
      { view: "student", id, month },
      "",
      `#student/${encodeURIComponent(id)}`,
    );
  const app = document.getElementById("app");
  app.innerHTML = '<div class="empty-state">Đang tải hồ sơ học sinh…</div>';
  try {
    const ops = await request(`/ops/overview?month=${month}`);
    const student = ops.students.find((s) => s.id === id);
    if (!student) throw new Error("Không tìm thấy học sinh hoặc bạn không có quyền xem lớp này.");
    const fee = feeSummary(student, ops.enrollments || [], dateKey());
    const guardian = (ops.guardians || []).find((g) => g.student_id === id);
    const records = (ops.attendance || [])
      .filter((a) => a.student_id === id)
      .map((a) => ({ ...a, lesson: ops.lessons.find((l) => l.id === a.lesson_id) }))
      .sort((a, b) => String(b.lesson?.date || "").localeCompare(String(a.lesson?.date || "")));
    const attended = records.filter((a) => ["present", "late"].includes(a.status)).length;
    const excused = records.filter((a) => a.status === "excused").length;
    const absent = records.filter((a) => a.status === "absent").length;
    const remaining = fee.rows.reduce((sum, e) => sum + Math.max(0, e.sessions - e.used), 0);
    const payments = (ops.payments || []).filter((p) => p.student_id === id);
    const report = (ops.reports || []).find((r) => r.student_id === id);
    const statusName = { present: "Có mặt", late: "Đi muộn", excused: "Nghỉ phép", absent: "Vắng" };
    const initials = student.name.split(" ").slice(-2).map((v) => v[0]).join("");
    app.innerHTML = `<div class="student-profile-page">
      <div class="student-profile-top"><button class="btn secondary" id="student-profile-back">← Danh sách học sinh</button><div><button class="btn danger" id="student-profile-delete">Xóa học sinh</button> <button class="btn secondary" id="student-profile-check">Điểm danh</button> <button class="btn secondary" id="student-profile-fees">Quản lý học phí</button> <button class="btn" id="student-profile-edit">Sửa hồ sơ / lớp</button></div></div>
      <section class="student-profile-hero"><div class="student-profile-avatar">${esc(initials)}</div><div><span class="ops-kicker">HỒ SƠ HỌC VIÊN</span><h1>${esc(student.name)}</h1><p>${esc(student.id)} · ${esc(student.group)} · ${esc(student.phone)}</p></div><label class="profile-month">Báo cáo tháng<input class="field" id="student-profile-month" type="month" value="${month}"></label></section>
      <div class="student-profile-metrics"><article><span>Phải đóng</span><strong>${Number(fee.total).toLocaleString("vi-VN")} đ</strong></article><article><span>Đã đóng</span><strong class="fee-paid">${Number(fee.paid).toLocaleString("vi-VN")} đ</strong></article><article><span>Còn thiếu</span><strong class="fee-owed">${Number(fee.owed).toLocaleString("vi-VN")} đ</strong></article><article><span>Buổi còn lại</span><strong>${remaining}</strong></article><article><span>Đã học</span><strong>${attended}</strong></article><article><span>Nghỉ phép / không phép</span><strong>${excused} / ${absent}</strong></article></div>
      <div class="student-profile-grid"><section class="card profile-card"><h2>Thông tin cá nhân</h2><dl><dt>Ngày sinh</dt><dd>${esc(student.dob)}</dd><dt>Lớp đang học</dt><dd>${esc(student.group)}</dd><dt>Liên hệ</dt><dd>${esc(student.phone)}</dd><dt>Trạng thái học phí</dt><dd>${esc(fee.status)}${fee.overdue ? " · Quá hạn" : ""}</dd></dl></section>
      <section class="card profile-card"><h2>Phụ huynh và người đón</h2>${guardian ? `<dl><dt>Phụ huynh</dt><dd>${esc(guardian.name)} · ${esc(guardian.relationship)}</dd><dt>Điện thoại</dt><dd>${esc(guardian.phone)}</dd><dt>Email</dt><dd>${esc(guardian.email || "Chưa cập nhật")}</dd><dt>Được phép đón</dt><dd>${esc(guardian.authorized_pickup || "Chưa cập nhật")}</dd></dl>` : "<p>Chưa cập nhật hồ sơ phụ huynh.</p>"}</section></div>
      <section class="card profile-wide-card"><div class="profile-section-head"><h2>Gói học và học phí</h2><button class="btn" id="student-add-package">+ Đăng ký gói / nhập học phí</button></div><div class="table-responsive"><table><thead><tr><th>Gói học</th><th>Thời hạn</th><th>Số buổi</th><th>Đã học</th><th>Nghỉ phép</th><th>Không phép</th><th>Còn lại</th><th>Phải đóng / đã đóng / còn thiếu</th><th></th></tr></thead><tbody>${fee.rows.map((e) => `<tr><td><strong>${esc(e.title)}</strong></td><td>${esc(e.starts)} → ${esc(e.ends)}</td><td>${e.sessions}</td><td>${e.attended}</td><td>${e.excused}/${e.excused_allowance}</td><td>${e.absent}</td><td><strong>${Math.max(0, e.sessions - e.used)}</strong></td><td>${Number(e.fee).toLocaleString("vi-VN")} đ<br><span class="fee-paid">${Number(e.paid).toLocaleString("vi-VN")} đ</span><br><span class="fee-owed">${Number(e.fee - e.paid).toLocaleString("vi-VN")} đ</span></td><td>${Number(e.fee) > Number(e.paid) ? `<button class="btn secondary" data-profile-pay="${e.id}">Thu thêm</button>` : '<span class="badge present">Đã đủ</span>'}</td></tr>`).join("") || '<tr><td colspan="9">Chưa đăng ký gói học.</td></tr>'}</tbody></table></div></section>
      <section class="card profile-wide-card"><h2>Lịch sử điểm danh</h2><div class="table-responsive"><table><thead><tr><th>Ngày</th><th>Buổi / lớp</th><th>Trạng thái</th><th>Check-in / out</th><th>Ảnh buổi tập</th></tr></thead><tbody>${records.map((a) => { const photo = ops.lessonPhotos.find((p) => p.lesson_id === a.lesson_id); return `<tr><td>${esc(a.lesson?.date || "—")}</td><td>${esc(a.lesson?.name || "—")}<br><small>${esc(a.lesson?.start || "")} · ${esc(a.lesson?.court || "")}</small></td><td><span class="badge ${a.status === "absent" ? "out" : a.status === "excused" ? "pending" : "present"}">${esc(statusName[a.status])}</span></td><td>${a.check_in ? new Date(a.check_in).toLocaleTimeString("vi-VN") : "—"} / ${a.check_out ? new Date(a.check_out).toLocaleTimeString("vi-VN") : "—"}</td><td>${photo ? `<a class="link-action" target="_blank" href="/api/ops/lesson-photo?lessonId=${a.lesson_id}">Xem ảnh</a>` : "—"}</td></tr>`; }).join("") || '<tr><td colspan="5">Chưa có dữ liệu điểm danh.</td></tr>'}</tbody></table></div></section>
      <div class="student-profile-grid"><section class="card profile-card"><h2>Nhận xét tháng ${esc(month)}</h2>${report ? `<p><strong>Điểm mạnh</strong><br>${esc(report.strengths)}</p><p><strong>Cần cải thiện</strong><br>${esc(report.improvements)}</p><p><strong>Mục tiêu</strong><br>${esc(report.goals)}</p><span class="badge present">${esc(report.status)}</span>` : "<p>HLV chưa viết nhận xét tháng này.</p>"}</section><section class="card profile-card"><h2>Lịch sử thanh toán</h2>${payments.map((p) => `<div class="profile-payment"><div><strong>${esc(p.title)}</strong><small>${new Date(p.paid_at).toLocaleString("vi-VN")}</small></div><strong class="fee-paid">${Number(p.amount).toLocaleString("vi-VN")} đ</strong></div>`).join("") || "<p>Chưa có thanh toán.</p>"}</section></div>
    </div>`;
    document.getElementById("student-profile-back").onclick = () => history.back();
    document.getElementById("student-profile-edit").onclick = () => studentForm(id);
    document.getElementById("student-profile-fees").onclick = () => {
      history.pushState({ view: "operations", tab: "fees" }, "", "#fees");
      operationsScreen(ops.user, () => history.back(), "fees");
    };
    const reloadProfile = () => studentProfile(id, month, false);
    document.getElementById("student-add-package").onclick = () => modal(
      `Đăng ký gói học cho ${student.name}`,
      `<div class="form-grid">
        <label>Tên gói<input class="input-field" name="title" value="Gói 10 buổi" required maxlength="100"></label>
        <label>Số buổi<select class="input-field" name="sessions" required><option value="10">10 buổi · nghỉ phép 2</option><option value="20">20 buổi · nghỉ phép 4</option><option value="30">30 buổi · nghỉ phép 6</option></select></label>
        <label>Tổng học phí phải đóng<div class="money-field"><input class="input-field" type="text" inputmode="numeric" data-money name="fee" placeholder="Ví dụ: 1.500.000" required><span>đ</span></div></label>
        <label>Đã đóng ban đầu<div class="money-field"><input class="input-field" type="text" inputmode="numeric" data-money name="initialPaid" value="0" placeholder="0" required><span>đ</span></div></label>
        <label>Ngày bắt đầu<input class="input-field" type="date" name="starts" value="${dateKey()}" required></label>
        <label>Ngày kết thúc gói<input class="input-field" type="date" name="ends" required></label>
        <label>Hạn đóng tiền<input class="input-field" type="date" name="due" value="${dateKey()}" required></label>
      </div>`,
      async (formData, dialog) => {
        const values = Object.fromEntries(formData);
        await request("/ops/enrollments", { method: "POST", body: { ...values, studentId: id } });
        dialog.close();
        await reloadProfile();
        toast("Đã tạo gói học và ghi nhận số tiền đã đóng.");
      },
    );
    document.querySelectorAll("[data-profile-pay]").forEach((button) => {
      button.onclick = () => {
        const enrollment = fee.rows.find((row) => row.id === Number(button.dataset.profilePay));
        const owed = Number(enrollment.fee) - Number(enrollment.paid);
        modal(
          `Thu học phí · ${student.name}`,
          `<p><strong>${esc(enrollment.title)}</strong><br>Còn thiếu: <span class="fee-owed">${owed.toLocaleString("vi-VN")} đ</span></p><div class="form-grid"><label>Số tiền đóng lần này<div class="money-field"><input class="input-field" type="text" inputmode="numeric" data-money name="amount" value="${owed}" required><span>đ</span></div></label><label>Ghi chú<input class="input-field" name="note" maxlength="500" placeholder="Tiền mặt, chuyển khoản…"></label></div>`,
          async (formData, dialog) => {
            const values = Object.fromEntries(formData);
            await request("/ops/payments", { method: "POST", body: { enrollmentId: enrollment.id, ...values } });
            dialog.close();
            await reloadProfile();
            toast("Đã ghi nhận khoản học phí.");
          },
        );
      };
    });
    document.getElementById("student-profile-delete").onclick = async () => {
      const confirmation = prompt(`Nhập chính xác mã ${student.id} để xác nhận xóa ${student.name}:`);
      if (confirmation !== student.id) return;
      if (!confirm("Thao tác này sẽ xóa hồ sơ và toàn bộ dữ liệu liên quan. Tiếp tục?")) return;
      try {
        await api.deleteStudent(id);
        await refresh();
        page = "students";
        history.replaceState({ view: "dashboard", page: "students" }, "", "#students");
        render();
        toast(`Đã xóa hồ sơ ${student.name}.`);
      } catch (error) {
        toast(error.message);
      }
    };
    document.getElementById("student-profile-check").onclick = () => check(id, !!(todayRecord(id) && !todayRecord(id).out));
    document.getElementById("student-profile-month").onchange = (event) => {
      const selectedMonth = event.target.value || month;
      history.replaceState(
        { view: "student", id, month: selectedMonth },
        "",
        `#student/${encodeURIComponent(id)}`,
      );
      studentProfile(id, selectedMonth, false);
    };
  } catch (error) {
    app.innerHTML = `<div class="empty-state"><p class="error-text">${esc(error.message)}</p><button class="btn" id="student-profile-retry">Quay lại</button></div>`;
    document.getElementById("student-profile-retry").onclick = render;
  }
}

async function refresh() {
  data = await api.dashboard();
  render();
}

async function boot() {
  document.getElementById("app").innerHTML =
    '<div class="empty-state" role="status"><span class="empty-state-icon">🏀</span>Đang tải dữ liệu học viện HoopStars…</div>';
  try {
    await refresh();
  } catch (error) {
    document.getElementById("app").innerHTML = `
      <div class="empty-state" role="alert">
        <span class="empty-state-icon">⚠️</span>
        <p class="error-text">${esc(error.message)}</p>
        <button class="btn" id="retry" style="margin-top: 16px;">Thử kết nối lại</button>
      </div>
    `;
    document.getElementById("retry").onclick = boot;
  }
}

window.addEventListener("focus", async () => {
  if (
    !document.getElementById("modal").open &&
    document.getElementById("global-search")
  ) {
    try {
      await refresh();
    } catch (error) {
      toast(error.message);
    }
  }
});

let signedInUser;
async function authenticatedBoot() {
  try {
    const user = await request("/auth/me");
    signedInUser = user;
    if (!history.state?.view)
      history.replaceState({ view: "dashboard", page: "home" }, "", "#home");
    if (user.role === "coach") await operationsScreen(user, authenticatedBoot);
    else await boot();
    operationsNav(user, authenticatedBoot, () =>
      loginScreen(authenticatedBoot),
    );
  } catch {
    await loginScreen(authenticatedBoot);
  }
}

window.addEventListener("popstate", (event) => {
  if (!signedInUser) return;
  const state = event.state || { view: "dashboard", page: "home" };
  if (state.view === "student") {
    studentProfile(state.id, state.month, false);
    return;
  }
  if (state.view === "class") {
    classDetail(state.className, false);
    return;
  }
  if (state.view === "operations") {
    operationsScreen(signedInUser, () => history.back(), state.tab);
    return;
  }
  page = state.page || "home";
  query = "";
  render();
});
authenticatedBoot();
