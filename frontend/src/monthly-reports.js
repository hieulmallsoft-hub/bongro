import { request } from "./api.js";
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const monthNow = () =>
  new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })
    .slice(0, 7);

export function monthlyReports(students) {
  return `<section class="card" style="padding:24px;margin-bottom:24px"><h2>Báo cáo tiến bộ hàng tháng</h2><p>HLV viết nhận xét cho từng học sinh, lưu lại theo tháng và xuất PDF gửi phụ huynh.</p>
  <form id="monthly-select" style="display:flex;gap:12px;flex-wrap:wrap;margin:18px 0">
  <label>Tháng <input class="field" type="month" name="month" value="${monthNow()}" required></label>
  <label>Học sinh <select class="field" name="studentId" required><option value="">Chọn học sinh</option>${students.map((s) => `<option value="${escape(s.id)}">${escape(s.name)} · ${escape(s.id)}</option>`).join("")}</select></label>
  <button class="btn">Mở báo cáo</button></form><div id="monthly-editor" aria-live="polite"></div></section>`;
}

export function bindMonthlyReports() {
  const select = document.getElementById("monthly-select");
  if (!select) return;
  const editor = document.getElementById("monthly-editor");
  let dirty = false;
  select.onsubmit = async (event) => {
    event.preventDefault();
    if (
      dirty &&
      !window.confirm("Nhận xét chưa lưu. Bạn muốn mở báo cáo khác?")
    )
      return;
    const values = Object.fromEntries(new FormData(select));
    const path = `/reports/${encodeURIComponent(values.studentId)}/${values.month}`;
    select.querySelector("button").disabled = true;
    editor.innerHTML = "<p>Đang tải báo cáo…</p>";
    try {
      const record = await request(path);
      const report = record.report || {};
      const stats = record.attendanceSummary || { present: record.attendance.length, late: 0, excused: 0, absent: 0 };
      dirty = false;
      editor.innerHTML = `<h3>${escape(record.student.name)} · Tháng ${escape(record.month)}</h3>
      <p>Lớp hiện tại: ${escape(record.student.group)} · <strong>${stats.present + stats.late} buổi đã tham gia</strong> trong tháng.</p>
      <div class="session-summary"><span>Có mặt <strong>${stats.present}</strong></span><span>Đi muộn <strong>${stats.late}</strong></span><span>Nghỉ phép <strong>${stats.excused}</strong></span><span>Không phép <strong>${stats.absent}</strong></span></div>
      <form id="monthly-form" class="form-grid">
      <label>Huấn luyện viên phụ trách<input class="field" name="coach" maxlength="80" value="${escape(report.coach)}" required></label>
      ${[
        ["strengths", "Điểm mạnh và tiến bộ"],
        ["improvements", "Nội dung cần cải thiện"],
        ["goals", "Mục tiêu tháng tới và lời nhắn phụ huynh"],
      ]
        .map(
          ([key, label]) =>
            `<label>${label}<textarea class="field" name="${key}" rows="4" maxlength="4000">${escape(report[key])}</textarea></label>`,
        )
        .join("")}
      <div style="display:flex;gap:12px"><button class="btn" type="submit">Lưu nhận xét</button><button class="btn secondary" id="monthly-pdf" type="button">Xuất PDF / In</button></div>
      <p id="monthly-status" role="status">${report.updatedAt ? "Đã lưu: " + escape(new Date(report.updatedAt).toLocaleString("vi-VN")) : "Chưa có nhận xét tháng này."}</p></form>`;
      const form = document.getElementById("monthly-form");
      const status = document.getElementById("monthly-status");
      form.oninput = () => {
        dirty = true;
        status.textContent = "Có thay đổi chưa lưu.";
      };
      const save = async () => {
        const body = Object.fromEntries(new FormData(form));
        body.coach = body.coach.trim();
        if (!body.coach) throw new Error("Vui lòng nhập tên huấn luyện viên.");
        await request(path, { method: "PUT", body });
        dirty = false;
        status.textContent = "Đã lưu nhận xét vào PostgreSQL.";
        return body;
      };
      form.onsubmit = async (e) => {
        e.preventDefault();
        const button = form.querySelector("[type=submit]");
        button.disabled = true;
        try {
          await save();
        } catch (error) {
          status.textContent = error.message;
        } finally {
          button.disabled = false;
        }
      };
      document.getElementById("monthly-pdf").onclick = async () => {
        if (!form.reportValidity()) return;
        const popup = window.open("", "_blank");
        if (!popup) {
          status.textContent = "Hãy cho phép cửa sổ bật lên để xuất PDF.";
          return;
        }
        popup.document.body.textContent = "Đang lưu và chuẩn bị báo cáo…";
        try {
          const body =
            dirty || !record.report
              ? await save()
              : Object.fromEntries(new FormData(form));
          const current = await request(path);
          popup.document.open();
          popup.document.write(printDocument(current, current.report || body));
          popup.document.close();
          status.textContent =
            "Đã mở bản in. Chọn “Lưu dưới dạng PDF”, sau đó gửi tệp cho phụ huynh.";
        } catch (error) {
          popup.close();
          status.textContent = error.message;
        }
      };
    } catch (error) {
      editor.textContent = error.message;
    } finally {
      select.querySelector("button").disabled = false;
    }
  };
}

export function printDocument(record, report) {
  const stats = record.attendanceSummary || { present: record.attendance.length, late: 0, excused: 0, absent: 0 };
  const section = (title, value) =>
    `<section><h2>${title}</h2><p>${escape(value) || "Chưa có nhận xét."}</p></section>`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Bao-cao-${escape(record.student.id)}-${escape(record.month)}</title>
  <style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#17263a;line-height:1.65;max-width:780px;margin:30px auto;padding:15px}header{border-bottom:3px solid #f47c35;padding-bottom:15px}h1{font-size:23px}h2{font-size:16px;color:#b95723}p{white-space:pre-wrap;overflow-wrap:anywhere}section{margin-top:25px}h2{break-after:avoid}footer{margin-top:35px;border-top:1px solid #ddd;padding-top:15px;font-size:12px}.actions{padding:15px;background:#fff2e8}button{padding:10px;cursor:pointer}@media print{body{margin:0;padding:0}.actions{display:none}}</style></head><body>
  <div class="actions"><button onclick="window.print()">In / Lưu dưới dạng PDF</button> Chọn đích “Lưu dưới dạng PDF” trong hộp thoại in.</div>
  <header><strong>HOOPSTARS · BASKETBALL ACADEMY</strong><h1>BÁO CÁO TIẾN BỘ THÁNG ${escape(record.month)}</h1><p>Kính gửi phụ huynh học sinh ${escape(record.student.name)}</p></header>
  <p><strong>Trạng thái:</strong> ${record.report?.status === "approved" ? "Đã được duyệt" : "Bản nháp / chưa duyệt – chưa gửi phụ huynh"}<br><strong>Học sinh:</strong> ${escape(record.student.name)} (${escape(record.student.id)})<br><strong>Lớp hiện tại:</strong> ${escape(record.student.group)}<br><strong>Huấn luyện viên:</strong> ${escape(report.coach)}<br><strong>Chuyên cần:</strong> Có mặt ${stats.present}, đi muộn ${stats.late}, nghỉ phép ${stats.excused}, nghỉ không phép ${stats.absent}</p>
  ${section("1. Điểm mạnh và tiến bộ", report.strengths)}${section("2. Nội dung cần cải thiện", report.improvements)}${section("3. Mục tiêu tháng tới và lời nhắn phụ huynh", report.goals)}
  <footer>Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}<br>Huấn luyện viên: ${escape(report.coach)}<p>Cảm ơn quý phụ huynh đã đồng hành cùng học viện!</p></footer></body></html>`;
}
