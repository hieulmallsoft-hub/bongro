const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (v) => Number(v).toLocaleString("vi-VN") + " đ";
export function filterEnrollments(enrollments, year = "", month = "") {
  if (!year) return enrollments;
  const start = `${year}-${month || "01"}-01`;
  const end = month
    ? new Date(Number(year), Number(month), 0).toLocaleDateString("en-CA")
    : `${year}-12-31`;
  return enrollments.filter((e) => e.starts <= end && e.ends >= start);
}
export function feeSummary(student, enrollments, today, year = "", month = "") {
  const rows = filterEnrollments(enrollments, year, month).filter(
    (e) => e.student_id === student.id,
  );
  const total = rows.reduce((n, e) => n + Number(e.fee), 0),
    paid = rows.reduce((n, e) => n + Number(e.paid), 0);
  const owed = Math.max(0, total - paid),
    overdue = rows.some((e) => e.due < today && Number(e.fee) > Number(e.paid));
  const status = !rows.length
    ? "Chưa có học phí"
    : !owed
      ? "Đã đóng đủ"
      : paid
        ? "Đóng một phần"
        : "Chưa đóng";
  return { rows, total, paid, owed, overdue, status };
}
export function receiptDocument(student, payment) {
  const paidAt = new Date(payment.paid_at);
  const safeDate = Number.isNaN(paidAt.getTime())
    ? "—"
    : paidAt.toLocaleString("vi-VN");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Bien-nhan-${esc(student.id)}-${esc(payment.id)}</title><style>@page{size:A5;margin:15mm}body{font-family:Arial,sans-serif;color:#17263a;line-height:1.6;max-width:620px;margin:25px auto}.brand{color:#e66f2f}.box{border:1px solid #dfe5ed;border-radius:12px;padding:22px;margin-top:20px}.amount{font-size:26px;font-weight:bold;color:#178a59}.actions{background:#fff2e8;padding:12px;margin-bottom:18px}button{padding:9px 14px}@media print{.actions{display:none}body{margin:0}}</style></head><body><div class="actions"><button onclick="window.print()">In / Lưu PDF</button></div><header><strong class="brand">HOOPSTARS · BASKETBALL ACADEMY</strong><h1>BIÊN NHẬN HỌC PHÍ</h1><p>Mã biên nhận: HP-${esc(payment.id)}</p></header><div class="box"><p><strong>Học sinh:</strong> ${esc(student.name)} (${esc(student.id)})<br><strong>Lớp:</strong> ${esc(student.group)}<br><strong>Kỳ học phí:</strong> ${esc(payment.title)}<br><strong>Thời gian ghi nhận:</strong> ${esc(safeDate)}</p><p>Số tiền đã đóng</p><div class="amount">${money(payment.amount)}</div><p><strong>Ghi chú:</strong> ${esc(payment.note) || "Không có"}</p></div><footer><p>Biên nhận được xuất từ hệ thống HoopStars. Vui lòng liên hệ trung tâm nếu thông tin chưa chính xác.</p></footer></body></html>`;
}
export function feesList(data, today) {
  const years = [...new Set(data.enrollments.flatMap((e) => [e.starts.slice(0, 4), e.ends.slice(0, 4)]))].sort().reverse();
  if (!years.includes(today.slice(0, 4))) years.unshift(today.slice(0, 4));
  return `<section class="card fee-browser"><div class="ops-section-head"><div><span class="ops-kicker">HỒ SƠ TÀI CHÍNH</span><h2>Học phí từng học sinh</h2><p>Bấm vào một học sinh để xem tiền, lớp và toàn bộ số buổi trong gói.</p></div></div><div class="fee-toolbar"><input id="fee-search" class="field" placeholder="Tìm tên hoặc mã học sinh…" aria-label="Tìm học sinh"><select id="fee-class" class="field"><option value="">Tất cả lớp</option>${[...new Set(data.students.map((s) => s.group))].sort().map((g) => `<option>${esc(g)}</option>`).join("")}</select><select id="fee-year" class="field"><option value="">Tất cả năm</option>${years.map((y) => `<option value="${y}" ${y === today.slice(0, 4) ? "selected" : ""}>Năm ${y}</option>`).join("")}</select><select id="fee-month" class="field"><option value="">Cả năm</option>${Array.from({ length: 12 }, (_, i) => `<option value="${String(i + 1).padStart(2, "0")}">Tháng ${i + 1}</option>`).join("")}</select><select id="fee-filter" class="field" aria-label="Trạng thái học phí"><option value="">Tất cả trạng thái</option><option>Đã đóng đủ</option><option>Đóng một phần</option><option>Chưa đóng</option><option>Quá hạn</option><option>Chưa có học phí</option></select></div><div id="fee-list"></div></section><div id="fee-detail-backdrop" class="fee-detail-backdrop" hidden></div><aside id="fee-detail" class="fee-detail-drawer" aria-live="polite" hidden></aside>`;
}
export function bindFees(data, today) {
  const list = document.getElementById("fee-list");
  if (!list) return;
  const search = document.getElementById("fee-search"),
    filter = document.getElementById("fee-filter"),
    classFilter = document.getElementById("fee-class"),
    yearFilter = document.getElementById("fee-year"),
    monthFilter = document.getElementById("fee-month");
  let activeStudent = "";
  const render = () => {
    const rows = data.students
      .map((s) => ({ s, ...feeSummary(s, data.enrollments, today, yearFilter.value, monthFilter.value) }))
      .filter(
        (r) =>
          (r.s.name + " " + r.s.id + " " + r.s.group)
            .toLocaleLowerCase("vi")
            .includes(search.value.toLocaleLowerCase("vi")) &&
          (!classFilter.value || r.s.group === classFilter.value) &&
          (!filter.value ||
            (filter.value === "Quá hạn"
              ? r.overdue
              : r.status === filter.value)),
      );
    list.innerHTML = `<div class="table-wrap"><table class="fee-student-table"><thead><tr><th>Học sinh</th><th>Lớp</th><th>Phải đóng</th><th>Đã đóng</th><th>Còn thiếu</th><th>Trạng thái</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr data-fee-student="${esc(r.s.id)}" tabindex="0"><td><span class="fee-avatar">${esc(r.s.name.split(" ").slice(-1)[0].slice(0, 1))}</span><strong>${esc(r.s.name)}</strong><br><small>${esc(r.s.id)}</small></td><td>${esc(r.s.group)}</td><td>${money(r.total)}</td><td class="fee-paid">${money(r.paid)}</td><td class="fee-owed">${money(r.owed)}</td><td><span class="fee-status ${r.owed ? "pending" : "paid"}">${r.status}${r.overdue ? " · Quá hạn" : ""}</span></td><td><button class="fee-open" aria-label="Xem ${esc(r.s.name)}">→</button></td></tr>`).join("") || '<tr><td colspan="7">Không tìm thấy học sinh trong kỳ này.</td></tr>'}</tbody></table></div>`;
    list
      .querySelectorAll("[data-fee-student]")
      .forEach((row) => {
        row.onclick = () => detail(row.dataset.feeStudent);
        row.onkeydown = (event) => event.key === "Enter" && detail(row.dataset.feeStudent);
      });
    if (activeStudent && rows.some((r) => r.s.id === activeStudent)) detail(activeStudent);
  };
  function detail(id) {
    activeStudent = id;
    const s = data.students.find((s) => s.id === id),
      summary = feeSummary(s, data.enrollments, today, yearFilter.value, monthFilter.value),
      payments = (data.payments || []).filter((p) => p.student_id === id && (!yearFilter.value || p.paid_at.slice(0, 4) === yearFilter.value) && (!monthFilter.value || p.paid_at.slice(5, 7) === monthFilter.value));
    const sessions = summary.rows.reduce((n, e) => n + Number(e.sessions), 0),
      used = summary.rows.reduce((n, e) => n + Number(e.used || 0), 0),
      attended = summary.rows.reduce((n, e) => n + Number(e.attended || 0), 0),
      excused = summary.rows.reduce((n, e) => n + Number(e.excused || 0), 0),
      absent = summary.rows.reduce((n, e) => n + Number(e.absent || 0), 0);
    const detail = document.getElementById("fee-detail");
    detail.hidden = false;
    document.getElementById("fee-detail-backdrop").hidden = false;
    detail.innerHTML = `<button class="fee-close" type="button" aria-label="Đóng">×</button><div class="fee-student-head"><span class="fee-avatar large">${esc(s.name.split(" ").slice(-1)[0].slice(0, 1))}</span><div><span class="ops-kicker">HỒ SƠ HỌC SINH</span><h2>${esc(s.name)}</h2><p>${esc(s.id)} · Lớp ${esc(s.group)}</p></div></div><div class="fee-detail-metrics"><article><span>Phải đóng</span><strong>${money(summary.total)}</strong></article><article><span>Đã đóng</span><strong class="fee-paid">${money(summary.paid)}</strong></article><article><span>Còn thiếu</span><strong class="fee-owed">${money(summary.owed)}</strong></article><article><span>Trạng thái</span><strong>${summary.status}${summary.overdue ? " · Quá hạn" : ""}</strong></article></div><div class="session-summary"><span>Gói <strong>${sessions}</strong> buổi</span><span>Đã học <strong>${attended}</strong></span><span>Nghỉ phép <strong>${excused}</strong></span><span>Không phép <strong>${absent}</strong></span><span>Còn lại <strong>${Math.max(0, sessions - used)}</strong></span></div><h3>Các gói trong kỳ lọc</h3><div class="table-wrap"><table><thead><tr><th>Gói</th><th>Buổi học</th><th>Học phí</th><th>Đã đóng</th><th>Còn thiếu</th><th></th></tr></thead><tbody>${summary.rows.map((e) => `<tr><td><strong>${esc(e.title)}</strong><br><small>${esc(e.starts)} → ${esc(e.ends)}</small></td><td>${e.attended} đã học<br><small>${Math.max(0, e.sessions - e.used)} / ${e.sessions} còn lại</small></td><td>${money(e.fee)}</td><td>${money(e.paid)}</td><td>${money(e.fee - e.paid)}</td><td>${e.fee > e.paid ? `<button class="btn" data-fee-pay="${e.id}">Thu tiền</button>` : "Đã đủ"}</td></tr>`).join("") || '<tr><td colspan="6">Chưa có gói học trong kỳ được chọn.</td></tr>'}</tbody></table></div><h3>Lịch sử đóng tiền</h3><div class="table-wrap"><table><thead><tr><th>Ngày đóng</th><th>Kỳ học phí</th><th>Số tiền</th><th>Biên nhận</th></tr></thead><tbody>${payments.map((p) => `<tr><td>${esc(new Date(p.paid_at).toLocaleString("vi-VN"))}</td><td>${esc(p.title)}<br><small>${esc(p.note)}</small></td><td>${money(p.amount)}</td><td><button class="btn secondary" data-receipt="${p.id}">Xuất PDF</button></td></tr>`).join("") || '<tr><td colspan="4">Chưa có khoản thanh toán trong kỳ lọc.</td></tr>'}</tbody></table></div>`;
    const close = () => { detail.hidden = true; document.getElementById("fee-detail-backdrop").hidden = true; activeStudent = ""; };
    detail.querySelector(".fee-close").onclick = close;
    document.getElementById("fee-detail-backdrop").onclick = close;
    document.querySelector("#enroll [name=studentId]").value = id;
    const paymentSelect = document.querySelector(
      "#payment [name=enrollmentId]",
    );
    paymentSelect.innerHTML =
      '<option value="">Chọn kỳ học phí của ' +
      esc(s.name) +
      "</option>" +
      summary.rows
        .filter((e) => e.fee > e.paid)
        .map(
          (e) =>
            `<option value="${e.id}">${esc(e.title)} · còn thiếu ${money(e.fee - e.paid)}</option>`,
        )
        .join("");
    document.querySelector("#payment [name=amount]").value = "";
    detail.querySelectorAll("[data-fee-pay]").forEach(
      (b) =>
        (b.onclick = () => {
          const e = summary.rows.find((e) => e.id === Number(b.dataset.feePay));
          paymentSelect.value = e.id;
          document.querySelector("#payment [name=amount]").value =
            e.fee - e.paid;
          document
            .getElementById("payment")
            .scrollIntoView({ behavior: "smooth", block: "center" });
        }),
    );
    detail.querySelectorAll("[data-receipt]").forEach(
      (b) =>
        (b.onclick = () => {
          const payment = payments.find(
            (p) => p.id === Number(b.dataset.receipt),
          );
          const popup = window.open("", "_blank");
          if (!popup)
            return alert("Hãy cho phép cửa sổ bật lên để xuất biên nhận.");
          popup.document.open();
          popup.document.write(receiptDocument(s, payment));
          popup.document.close();
        }),
    );
  }
  search.oninput = render;
  filter.onchange = render;
  classFilter.onchange = render;
  yearFilter.onchange = render;
  monthFilter.onchange = render;
  render();
}
