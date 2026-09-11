import { request } from "./api.js";
import { feesList, bindFees } from "./student-fees.js";
import { monthlyReports, bindMonthlyReports } from "./monthly-reports.js";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const money = (v) => Number(v).toLocaleString("vi-VN") + " đ";
const names = {
  present: "Có mặt",
  late: "Đi muộn",
  excused: "Nghỉ phép",
  absent: "Vắng",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  draft: "Bản nháp",
  submitted: "Chờ duyệt",
};
let selectedAttendanceLessonId = null;
let operationsFlash = null;
const flashMessage = (message, type = "success") => {
  operationsFlash = { message, type };
};
const input = (name, label, type = "text", value = "", required = true) =>
  `<label>${label}<input class="field" name="${name}" type="${type}" value="${esc(value)}" ${required ? "required" : ""}></label>`;
const select = (name, label, items) =>
  `<label>${label}<select class="field" name="${name}" required><option value="">Chọn…</option>${items.map(([id, text]) => `<option value="${esc(id)}">${esc(text)}</option>`).join("")}</select></label>`;
const form = (id, title, fields, button = "Lưu") =>
  `<section class="card" style="padding:20px;margin-bottom:18px"><h3>${title}</h3><form id="${id}" class="form-grid">${fields}<button class="btn">${button}</button><p class="form-message" role="status"></p></form></section>`;
const table = (heads, rows) =>
  `<div class="table-wrap"><table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${heads.length}">Chưa có dữ liệu.</td></tr>`}</tbody></table></div>`;

export async function loginScreen(onLogin) {
  const app = document.getElementById("app");
  try {
    const { initialized } = await request("/auth/status");
    app.innerHTML = `<div style="max-width:440px;margin:8vh auto;padding:20px"><h1>🏀 HoopStars</h1>${form("login", initialized ? "Đăng nhập học viện" : "Tạo quản trị viên đầu tiên", input("username", "Tên đăng nhập") + (!initialized ? input("name", "Họ tên") : "") + input("password", "Mật khẩu (tối thiểu 10 ký tự)", "password"), initialized ? "Đăng nhập" : "Tạo tài khoản")}</div>`;
    document.getElementById("login").onsubmit = async (e) => {
      e.preventDefault();
      const button = e.target.querySelector("button");
      button.disabled = true;
      const body = Object.fromEntries(new FormData(e.target));
      try {
        if (!initialized)
          await request("/auth/setup", { method: "POST", body });
        await request("/auth/login", {
          method: "POST",
          body: { username: body.username, password: body.password },
        });
        await onLogin();
      } catch (error) {
        e.target.querySelector(".form-message").textContent = error.message;
      } finally {
        button.disabled = false;
      }
    };
  } catch (error) {
    app.innerHTML = `<div class="empty-state"><p>${esc(error.message)}</p><button class="btn" id="login-retry">Thử lại</button></div>`;
    document.getElementById("login-retry").onclick = () => loginScreen(onLogin);
  }
}

export function operationsNav(user, onBack, onLogout) {
  const bar = document.createElement("div");
  bar.id = "account-actions";
  bar.style.cssText =
    "position:fixed;bottom:12px;right:18px;z-index:80;display:flex;gap:8px";
  bar.innerHTML = `<button class="btn secondary" id="open-ops">Quản lý học viện · ${esc(user.name)}</button><button class="btn secondary" id="logout">Đăng xuất</button>`;
  document.getElementById("account-actions")?.remove();
  document.body.appendChild(bar);
  bar.querySelector("#open-ops").onclick = () => operationsScreen(user, onBack);
  bar.querySelector("#logout").onclick = async () => {
    await request("/auth/logout", { method: "POST" });
    bar.remove();
    onLogout();
  };
}

export async function operationsScreen(
  user,
  onBack,
  tab = "attendance",
  month = today().slice(0, 7),
) {
  const app = document.getElementById("app");
  app.innerHTML = '<div class="empty-state">Đang tải quản lý học viện…</div>';
  try {
    const data = await request("/ops/overview?month=" + month);
    const admin = user.role === "admin";
    const studentOpts = data.students.map((s) => [
      s.id,
      s.name + " · " + s.group,
    ]);
    const lessonOpts = data.lessons.map((l) => [
      l.id,
      l.date + " " + l.start + " · " + l.name,
    ]);
    const studentName = (id) =>
      data.students.find((s) => s.id === id)?.name || id;
    const lessonName = (id) => {
      const l = data.lessons.find((l) => l.id === id);
      return l ? l.date + " " + l.start + " " + l.name : id;
    };
    const defaultLesson =
      data.lessons.find((l) => l.id === selectedAttendanceLessonId) ||
      data.lessons.find((l) => l.date === today()) ||
      data.lessons[0];
    if (defaultLesson) selectedAttendanceLessonId = defaultLesson.id;
    const rosterFor = (lessonId) => {
      const lesson = data.lessons.find((l) => l.id === Number(lessonId));
      if (!lesson) return [];
      const makeupIds = new Set(
        data.leaves
          .filter(
            (l) =>
              l.status === "approved" &&
              l.makeup_lesson_id === Number(lessonId),
          )
          .map((l) => l.student_id),
      );
      return data.students.filter(
        (s) => s.group === lesson.name || makeupIds.has(s.id),
      );
    };
    const rosterTable = (lessonId) => {
      const roster = rosterFor(lessonId);
      const attendance = data.attendance.filter((a) => a.lesson_id === Number(lessonId));
      const count = (status) => attendance.filter((a) => a.status === status && roster.some((s) => s.id === a.student_id)).length;
      const marked = roster.filter((s) => attendance.some((a) => a.student_id === s.id)).length;
      const rows = roster.map((s) => {
        const a = data.attendance.find(
          (a) => a.lesson_id === Number(lessonId) && a.student_id === s.id,
        );
        return [
          esc(s.name + " · " + s.id),
          esc(a ? names[a.status] : "Chưa điểm danh"),
          esc(a?.check_in ? new Date(a.check_in).toLocaleTimeString("vi-VN") : "—"),
          `<div style="display:flex;gap:6px;flex-wrap:wrap">${[
            ["present", "Có mặt"],
            ["late", "Đi muộn"],
            ["excused", "Nghỉ phép"],
            ["absent", "Vắng"],
          ]
            .map(([status, label]) => `<button class="btn secondary ${a?.status === status ? "is-current" : ""}" type="button" data-roster-mark="${status}" data-lesson="${lessonId}" data-student="${esc(s.id)}">${a?.status === status ? "✓ " : ""}${label}</button>`)
            .join("")}</div>`,
        ];
      });
      return `<div class="attendance-summary"><article><span>Sĩ số</span><strong>${roster.length}</strong></article><article><span>Có mặt</span><strong>${count("present")}</strong></article><article><span>Đi muộn</span><strong>${count("late")}</strong></article><article><span>Nghỉ phép</span><strong>${count("excused")}</strong></article><article><span>Vắng</span><strong>${count("absent")}</strong></article><article><span>Chưa điểm danh</span><strong>${Math.max(0, roster.length - marked)}</strong></article></div>${table(["Học sinh", "Trạng thái", "Check-in", "Điểm danh"], rows)}`;
    };
    const tabs = [
      ["password", "Đổi mật khẩu"],
      ["attendance", "Điểm danh buổi"],
      ["reports", "Nhận xét tháng"],
      ...(admin
        ? [
            ["recurring", "Lịch lặp hằng tuần"],
            ["fees", "Học phí"],
            ["guardians", "Phụ huynh"],
            ["leaves", "Nghỉ / học bù"],
            ["users", "Tài khoản HLV"],
            ["backup", "Sao lưu / nhật ký"],
          ]
        : []),
    ];
    let content = "";
    if (tab === "password")
      content = form(
        "change-password",
        "Đổi mật khẩu",
        input("currentPassword", "Mật khẩu hiện tại", "password") +
          input(
            "newPassword",
            "Mật khẩu mới (tối thiểu 10 ký tự)",
            "password",
          ) +
          input("confirmPassword", "Nhập lại mật khẩu mới", "password"),
        "Đổi và đăng nhập lại",
      );
    if (tab === "recurring")
      content = form(
        "recurring",
        "Tạo cùng giờ mỗi tuần (2–52 tuần)",
        input("name", "Tên lớp") +
          input("date", "Ngày học đầu tiên", "date", today()) +
          input("start", "Giờ bắt đầu", "time", "15:00") +
          input("end", "Giờ kết thúc", "time", "16:30") +
          input("court", "Sân tập") +
          input("coach", "Huấn luyện viên") +
          input("weeks", "Số tuần", "number", "4"),
        "Tạo toàn bộ lịch",
      );
    if (tab === "attendance")
      content =
        `<section class="card ops-feature-card">
          <div class="ops-section-head"><div><span class="ops-kicker">LỊCH TẬP HÔM NAY</span><h2>Danh sách học buổi tập</h2><p>Chọn buổi, điểm danh học sinh và lưu ảnh xác nhận của lớp.</p></div><span class="ops-live">● ĐANG HOẠT ĐỘNG</span></div>
          <label class="ops-lesson-picker">Chọn buổi tập<select class="field" id="attendance-lesson-filter">${lessonOpts.map(([id, label]) => `<option value="${id}" ${id === defaultLesson?.id ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label>
          <div id="lesson-roster">${rosterTable(defaultLesson?.id)}</div>
          <div class="ops-photo-panel"><div id="lesson-photo"></div>
          <form id="lesson-photo-form" class="form-grid ops-photo-form">
            <input type="hidden" name="lessonId" value="${defaultLesson?.id || ""}">
            <label>Ảnh check-in của buổi<input class="field" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required></label>
            <button class="btn">📷 Tải ảnh lên</button><p class="form-message" role="status"></p>
          </form></div>
        </section>` +
        form(
          "mark",
          "Điểm danh theo buổi",
          select("lessonId", "Buổi tập", lessonOpts) +
            select("studentId", "Học sinh", studentOpts) +
            select(
              "status",
              "Trạng thái",
              Object.entries(names).filter(([k]) =>
                ["present", "late", "excused", "absent"].includes(k),
              ),
            ) +
            input("note", "Ghi chú", "text", "", false),
        ) +
        table(
          ["Buổi tập", "Học sinh", "Trạng thái", "Vào / Ra", "Thao tác"],
          data.attendance.map((a) => [
            esc(lessonName(a.lesson_id)),
            esc(studentName(a.student_id)),
            esc(names[a.status]),
            esc(
              (a.check_in
                ? new Date(a.check_in).toLocaleString("vi-VN")
                : "—") +
                " / " +
                (a.check_out
                  ? new Date(a.check_out).toLocaleTimeString("vi-VN")
                  : "—"),
            ),
            ["present", "late"].includes(a.status) && !a.check_out
              ? `<button class="btn secondary" data-checkout="${a.lesson_id}" data-student="${esc(a.student_id)}">Check-out</button>`
              : "",
          ]),
        );
    if (tab === "fees")
      content =
        `<div class="ops-metrics">
          <article><span>Tổng giá trị gói</span><strong>${money(data.enrollments.reduce((sum, e) => sum + Number(e.fee), 0))}</strong><small>${data.enrollments.length} gói học</small></article>
          <article><span>Đã thu</span><strong>${money(data.enrollments.reduce((sum, e) => sum + Number(e.paid), 0))}</strong><small>Thanh toán đã ghi nhận</small></article>
          <article><span>Công nợ</span><strong>${money(data.enrollments.reduce((sum, e) => sum + Number(e.fee) - Number(e.paid), 0))}</strong><small>Cần thu còn lại</small></article>
          <article><span>Buổi còn lại</span><strong>${data.enrollments.reduce((sum, e) => sum + Math.max(0, e.sessions - e.used), 0)}</strong><small>Trên tất cả gói</small></article>
        </div>` +
        feesList(data, today()) +
        form(
          "enroll",
          "Đăng ký kỳ học phí cho học sinh",
          select("studentId", "Học sinh", studentOpts) +
            input("title", "Tên gói") +
            select("sessions", "Gói số buổi", [[10, "10 buổi · nghỉ phép tối đa 2"], [20, "20 buổi · nghỉ phép tối đa 4"], [30, "30 buổi · nghỉ phép tối đa 6"]]) +
            input("fee", "Học phí (đồng)", "number") +
            input("starts", "Ngày bắt đầu", "date", today()) +
            input("ends", "Hạn gói", "date") +
            input("due", "Hạn đóng tiền", "date"),
        ) +
        form(
          "payment",
          "Ghi nhận học sinh đã đóng tiền",
          select(
            "enrollmentId",
            "Gói học",
            data.enrollments.map((e) => [
              e.id,
              studentName(e.student_id) +
                " · " +
                e.title +
                " · còn nợ " +
                money(e.fee - e.paid),
            ]),
          ) +
            input("amount", "Số tiền thu", "number") +
            input("note", "Ghi chú", "text", "", false),
        ) +
        table(
          [
            "Học sinh / Gói",
            "Buổi đã học / còn",
            "Học phí / đã thu",
            "Công nợ",
            "Hạn",
          ],
          data.enrollments.map((e) => [
            esc(studentName(e.student_id) + " / " + e.title),
            `<strong>${e.used} / ${Math.max(0, e.sessions - e.used)}</strong><br><small>Gói ${e.sessions} · Đã học ${e.attended} · Nghỉ phép ${e.excused}/${e.excused_allowance} · Không phép ${e.absent}</small>`,
            money(e.fee) + " / " + money(e.paid),
            money(e.fee - e.paid) +
              (e.due < today() && e.fee > e.paid ? " · Quá hạn" : ""),
            esc(e.starts + " → " + e.ends),
          ]),
        );
    if (tab === "guardians")
      content =
        form(
          "guardian",
          "Hồ sơ phụ huynh",
          select("studentId", "Học sinh", studentOpts) +
            input("name", "Tên phụ huynh") +
            input("phone", "Điện thoại", "tel") +
            input("email", "Email", "email", "", false) +
            input("relationship", "Quan hệ", "text", "", false) +
            input("pickup", "Người được phép đón", "text", "", false),
        ) +
        table(
          ["Học sinh", "Phụ huynh", "Liên hệ", "Quan hệ / người đón"],
          data.guardians.map((g) => [
            esc(studentName(g.student_id)),
            esc(g.name),
            esc(g.phone + " / " + g.email),
            esc(g.relationship + " / " + g.authorized_pickup),
          ]),
        );
    if (tab === "leaves")
      content =
        form(
          "leave",
          "Tạo yêu cầu nghỉ phép",
          select("studentId", "Học sinh", studentOpts) +
            select("lessonId", "Buổi xin nghỉ", lessonOpts) +
            input("reason", "Lý do"),
        ) +
        form(
          "resolve",
          "Duyệt nghỉ và xếp học bù",
          select(
            "id",
            "Yêu cầu",
            data.leaves.map((l) => [
              l.id,
              studentName(l.student_id) + " · " + lessonName(l.lesson_id),
            ]),
          ) +
            select("status", "Kết quả", [
              ["approved", "Duyệt nghỉ (không trừ buổi)"],
              ["rejected", "Từ chối"],
            ]) +
            `<label>Buổi học bù (có thể để trống)<select class="field" name="makeupLessonId"><option value="">Chưa xếp</option>${lessonOpts.map(([id, label]) => `<option value="${id}">${esc(label)}</option>`).join("")}</select></label>`,
        ) +
        table(
          ["Học sinh", "Buổi nghỉ / lý do", "Trạng thái", "Học bù"],
          data.leaves.map((l) => [
            esc(studentName(l.student_id)),
            esc(lessonName(l.lesson_id) + " / " + l.reason),
            esc(names[l.status]),
            l.makeup_lesson_id
              ? esc(lessonName(l.makeup_lesson_id))
              : "Chưa xếp",
          ]),
        );
    if (tab === "users")
      content =
        form(
          "user",
          "Tạo tài khoản HLV",
          input("username", "Tên đăng nhập") +
            input("name", "Họ tên") +
            input("password", "Mật khẩu tối thiểu 10 ký tự", "password") +
            input("classes", "Lớp phụ trách, cách nhau bởi dấu phẩy"),
        ) +
        table(
          ["Tài khoản", "Họ tên", "Lớp", "Trạng thái", "Thao tác"],
          data.users.map((u) => [
            esc(u.username),
            esc(u.name),
            esc(u.classes.join(", ")),
            u.active ? "Hoạt động" : "Đã khóa",
            u.role === "coach"
              ? `<button class="btn secondary" data-toggle-user="${u.id}">${u.active ? "Khóa" : "Mở khóa"}</button><button class="btn secondary" data-classes-user="${u.id}">Sửa lớp</button>`
              : "Quản trị",
          ]),
        );
    if (tab === "users")
      content += form(
        "reset-password",
        "Đặt lại mật khẩu HLV",
        select(
          "username",
          "Tài khoản HLV",
          data.users
            .filter((u) => u.role === "coach")
            .map((u) => [u.username, u.name]),
        ) +
          input("newPassword", "Mật khẩu mới (tối thiểu 10 ký tự)", "password"),
        "Đặt lại và hủy phiên đăng nhập",
      );
    if (tab === "reports")
      content =
        `<div style="margin:18px 0"><label>Tháng kiểm tra <input class="field" type="month" id="report-month" value="${month}"></label><p>${data.students.filter((s) => !data.reports.some((r) => r.student_id === s.id)).length} học sinh chưa có nhận xét. ${new Date().getDate() >= 25 ? "Đã đến kỳ hoàn thiện báo cáo cuối tháng." : ""}</p></div>` +
        table(
          ["Học sinh", "Trạng thái", "Duyệt / gửi"],
          data.students.map((s) => {
            const r = data.reports.find((r) => r.student_id === s.id);
            return [
              esc(s.name),
              r ? esc(names[r.status]) : "Chưa nhận xét",
              r
                ? `${r.status === "draft" ? `<button class="btn secondary" data-submit-report="${s.id}">Gửi duyệt</button>` : ""}${admin && r.status === "submitted" ? `<button class="btn" data-approve-report="${s.id}">Duyệt</button>` : ""}${admin && r.status === "approved" ? `<button class="btn secondary" data-delivery="${s.id}">Ghi nhận đã gửi</button>` : ""}`
                : "",
            ];
          }),
        ) +
        monthlyReports(data.students) +
        (admin
          ? table(
              ["Học sinh", "Kênh / người nhận", "Người ghi nhận", "Thời gian"],
              data.deliveries.map((d) => [
                esc(studentName(d.student_id)),
                esc(d.channel + " / " + d.recipient),
                esc(d.actor),
                esc(new Date(d.recorded_at).toLocaleString("vi-VN")),
              ]),
            )
          : "");
    if (tab === "backup")
      content =
        `<section class="card" style="padding:20px"><h3>Sao lưu đầy đủ dữ liệu học viện</h3><p>Bao gồm nhận xét tháng, học phí, phụ huynh và điểm danh theo buổi. Tài khoản, phiên đăng nhập và nhật ký được giữ riêng.</p><button class="btn" id="full-backup">Tải bản sao đầy đủ</button><label class="btn secondary">Khôi phục<input id="full-restore" type="file" accept=".json" hidden></label><p id="backup-message" role="status"></p></section>` +
        table(
          ["Thời gian", "Tài khoản", "Hành động", "Chi tiết"],
          data.audit.map((a) => [
            esc(new Date(a.created_at).toLocaleString("vi-VN")),
            esc(a.actor),
            esc(a.action),
            esc(JSON.stringify(a.detail)),
          ]),
        );
    const pendingFlash = operationsFlash;
    operationsFlash = null;
    app.innerHTML = `<div class="ops-page">${pendingFlash ? `<div class="ops-toast ${pendingFlash.type}" role="status"><span>${pendingFlash.type === "success" ? "✓" : "!"}</span><div><strong>${pendingFlash.type === "success" ? "Đã cập nhật" : "Không thể cập nhật"}</strong><p>${esc(pendingFlash.message)}</p></div><button type="button" aria-label="Đóng">×</button></div>` : ""}<header class="ops-header"><div><span class="ops-kicker">HOOPSTARS CONTROL CENTER</span><h1>Quản lý học viện</h1><p>Xin chào, <strong>${esc(user.name)}</strong> · ${admin ? "Quản trị viên" : "Huấn luyện viên"}</p></div>${admin ? '<button class="btn secondary" id="back-dashboard">← Về tổng quan</button>' : ""}</header><nav class="ops-tabs">${tabs.map(([id, title]) => `<button class="ops-tab ${tab === id ? "active" : ""}" data-ops-tab="${id}">${title}</button>`).join("")}</nav><main class="ops-content">${content}<p id="ops-message" role="status"></p></main></div>`;
    const toast = document.querySelector(".ops-toast");
    if (toast) {
      toast.querySelector("button").onclick = () => toast.remove();
      setTimeout(() => toast.remove(), 4500);
    }
    const reload = () => operationsScreen(user, onBack, tab, month);
    const action = async (path, body, successMessage = "Dữ liệu đã được lưu thành công.") => {
      await request(path, { method: "POST", body });
      flashMessage(successMessage);
      await reload();
    };
    document
      .getElementById("back-dashboard")
      ?.addEventListener("click", onBack);
    document
      .querySelectorAll("[data-ops-tab]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            operationsScreen(user, onBack, b.dataset.opsTab, month)),
      );
    const bind = (id, path, map = (v) => v) => {
      const f = document.getElementById(id);
      if (f)
        f.onsubmit = async (e) => {
          e.preventDefault();
          const b = f.querySelector("button");
          b.disabled = true;
          try {
            await action(path, map(Object.fromEntries(new FormData(f))));
          } catch (error) {
            f.querySelector(".form-message").textContent = error.message;
          } finally {
            b.disabled = false;
          }
        };
    };
    bind("mark", "/ops/attendance");
    bind("reset-password", "/auth/reset-password");
    bind("recurring", "/lessons/recurring", (v) => ({
      ...v,
      weeks: Number(v.weeks),
    }));
    const passwordForm = document.getElementById("change-password");
    if (passwordForm)
      passwordForm.onsubmit = async (e) => {
        e.preventDefault();
        const values = Object.fromEntries(new FormData(passwordForm));
        const button = passwordForm.querySelector("button");
        button.disabled = true;
        try {
          if (values.newPassword !== values.confirmPassword)
            throw new Error("Mật khẩu nhập lại không khớp.");
          await request("/auth/password", {
            method: "POST",
            body: {
              currentPassword: values.currentPassword,
              newPassword: values.newPassword,
            },
          });
          document.getElementById("account-actions")?.remove();
          await loginScreen(onBack);
        } catch (error) {
          passwordForm.querySelector(".form-message").textContent =
            error.message;
        } finally {
          button.disabled = false;
        }
      };
    bind("enroll", "/ops/enrollments");
    bind("payment", "/ops/payments");
    if (tab === "fees") bindFees(data, today());
    bind("guardian", "/ops/guardians");
    bind("leave", "/ops/leaves");
    bind("resolve", "/ops/leaves/resolve");
    bind("user", "/ops/users", (v) => ({
      ...v,
      classes: v.classes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
    const buttons = (selector, fn) =>
      document.querySelectorAll(selector).forEach(
        (b) =>
          (b.onclick = async () => {
            b.disabled = true;
            try {
              await fn(b);
            } catch (error) {
              document.getElementById("ops-message").textContent =
                error.message;
            } finally {
              b.disabled = false;
            }
          }),
      );
    const lessonFilter = document.getElementById("attendance-lesson-filter");
    const photoFor = (lessonId) =>
      data.lessonPhotos.find((p) => p.lesson_id === Number(lessonId));
    const renderPhoto = (lessonId) => {
      const target = document.getElementById("lesson-photo");
      if (!target) return;
      const photo = photoFor(lessonId);
      target.innerHTML = photo
        ? `<p><strong>Ảnh check-in:</strong> ${esc(photo.file_name)} · ${esc(photo.uploaded_by)} · ${new Date(photo.uploaded_at).toLocaleString("vi-VN")}</p><img src="/api/ops/lesson-photo?lessonId=${lessonId}&v=${encodeURIComponent(photo.uploaded_at)}" alt="Ảnh check-in buổi tập" style="display:block;max-width:100%;max-height:480px;border-radius:14px">`
        : "<p>Buổi tập này chưa có ảnh check-in.</p>";
    };
    if (lessonFilter) {
      renderPhoto(lessonFilter.value);
      lessonFilter.onchange = () => {
        selectedAttendanceLessonId = Number(lessonFilter.value);
        document.getElementById("lesson-roster").innerHTML = rosterTable(lessonFilter.value);
        document.querySelector('#lesson-photo-form [name="lessonId"]').value = lessonFilter.value;
        const markLesson = document.querySelector('#mark [name="lessonId"]');
        if (markLesson) markLesson.value = lessonFilter.value;
        renderPhoto(lessonFilter.value);
      };
      document.getElementById("lesson-roster").onclick = async (event) => {
        const button = event.target.closest("[data-roster-mark]");
        if (!button) return;
        button.disabled = true;
        selectedAttendanceLessonId = Number(button.dataset.lesson);
        try {
          await action("/ops/attendance", {
            lessonId: button.dataset.lesson,
            studentId: button.dataset.student,
            status: button.dataset.rosterMark,
          }, `${studentName(button.dataset.student)}: ${names[button.dataset.rosterMark]} · ${lessonName(Number(button.dataset.lesson))} · ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`);
        } catch (error) {
          flashMessage(error.message, "error");
          await reload();
        }
      };
      document.getElementById("lesson-photo-form").onsubmit = async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const file = form.elements.photo.files[0];
        const message = form.querySelector(".form-message");
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) {
          message.textContent = "Ảnh tối đa 4 MB.";
          return;
        }
        const button = form.querySelector("button");
        button.disabled = true;
        try {
          const image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Không đọc được ảnh."));
            reader.readAsDataURL(file);
          });
          await action("/ops/lesson-photo", {
            lessonId: form.elements.lessonId.value,
            fileName: file.name,
            image,
          });
        } catch (error) {
          message.textContent = error.message;
          button.disabled = false;
        }
      };
    }
    buttons("[data-checkout]", (b) =>
      action("/ops/attendance", {
        lessonId: b.dataset.checkout,
        studentId: b.dataset.student,
        action: "checkout",
      }, `${studentName(b.dataset.student)} đã check-out khỏi ${lessonName(Number(b.dataset.checkout))}.`),
    );
    buttons("[data-toggle-user]", (b) => {
      const u = data.users.find((u) => u.id === Number(b.dataset.toggleUser));
      return action("/ops/users/update", {
        id: u.id,
        active: !u.active,
        classes: u.classes,
      });
    });
    buttons("[data-classes-user]", (b) => {
      const u = data.users.find((u) => u.id === Number(b.dataset.classesUser));
      const value = prompt(
        "Các lớp phụ trách, cách nhau bằng dấu phẩy",
        u.classes.join(", "),
      );
      if (value !== null)
        return action("/ops/users/update", {
          id: u.id,
          active: u.active,
          classes: value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        });
    });
    if (tab === "reports") {
      bindMonthlyReports();
      document.getElementById("report-month").onchange = (e) =>
        operationsScreen(user, onBack, tab, e.target.value || month);
      buttons("[data-submit-report]", (b) =>
        action(`/reports/${b.dataset.submitReport}/${month}/submit`, {}),
      );
      buttons("[data-approve-report]", (b) =>
        action("/ops/reports/status", {
          studentId: b.dataset.approveReport,
          month,
          status: "approved",
        }),
      );
      buttons("[data-delivery]", (b) => {
        const recipient = prompt(
          "Đã gửi thủ công tới phụ huynh nào? Nhập email hoặc số điện thoại.",
        );
        if (!recipient) return;
        const channel = prompt("Kênh đã gửi (Zalo, email…):", "Zalo");
        if (channel)
          return action("/ops/reports/sent", {
            studentId: b.dataset.delivery,
            month,
            recipient,
            channel,
          });
      });
    }
    if (tab === "backup") {
      document.getElementById("full-backup").onclick = async () => {
        try {
          const backup = await request("/ops/backup");
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(backup, null, 2)], {
              type: "application/json",
            }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = "hoopstars-full-" + today() + ".json";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
          document.getElementById("backup-message").textContent = error.message;
        }
      };
      document.getElementById("full-restore").onchange = async (e) => {
        try {
          const file = e.target.files[0];
          if (!file) return;
          const body = JSON.parse(await file.text());
          if (
            !confirm(
              "Khôi phục sẽ thay thế dữ liệu học viện. Bạn đã tải bản sao hiện tại và muốn tiếp tục?",
            )
          )
            return;
          await action("/ops/backup/restore", body);
        } catch (error) {
          document.getElementById("backup-message").textContent = error.message;
        }
      };
    }
  } catch (error) {
    app.innerHTML = `<div class="empty-state"><p>${esc(error.message)}</p><button class="btn" id="ops-retry">Thử lại</button></div>`;
    document.getElementById("ops-retry").onclick = () =>
      operationsScreen(user, onBack, tab, month);
  }
}
