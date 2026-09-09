const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (v) => Number(v).toLocaleString("vi-VN") + " đ";
export function feeSummary(student, enrollments, today) {
  const rows = enrollments.filter((e) => e.student_id === student.id);
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
  return `<section class="card" style="padding:20px;margin-bottom:20px"><h2>Học phí từng học sinh</h2><p>Tổng học phí đã đăng ký của từng em, gồm cả khoản còn thiếu từ kỳ trước.</p><div style="display:flex;gap:12px;margin:18px 0;flex-wrap:wrap"><input id="fee-search" class="field" placeholder="Tìm tên, mã học sinh, lớp…" aria-label="Tìm học sinh"><select id="fee-filter" class="field" aria-label="Trạng thái học phí"><option value="">Tất cả</option><option>Đã đóng đủ</option><option>Đóng một phần</option><option>Chưa đóng</option><option>Quá hạn</option><option>Chưa có học phí</option></select></div><div id="fee-list"></div></section><section id="fee-detail" class="card" style="padding:20px;margin-bottom:20px"><p>Chọn học sinh để xem từng kỳ học phí và lịch sử đóng tiền.</p></section>`;
}
export function bindFees(data, today) {
  const list = document.getElementById("fee-list");
  if (!list) return;
  const search = document.getElementById("fee-search"),
    filter = document.getElementById("fee-filter");
  const render = () => {
    const rows = data.students
      .map((s) => ({ s, ...feeSummary(s, data.enrollments, today) }))
      .filter(
        (r) =>
          (r.s.name + " " + r.s.id + " " + r.s.group)
            .toLocaleLowerCase("vi")
            .includes(search.value.toLocaleLowerCase("vi")) &&
          (!filter.value ||
            (filter.value === "Quá hạn"
              ? r.overdue
              : r.status === filter.value)),
      );
    list.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Học sinh</th><th>Lớp</th><th>Phải đóng</th><th>Đã đóng</th><th>Còn thiếu</th><th>Trạng thái</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.s.name)}<br><small>${esc(r.s.id)}</small></td><td>${esc(r.s.group)}</td><td>${money(r.total)}</td><td>${money(r.paid)}</td><td>${money(r.owed)}</td><td>${r.status}${r.overdue ? " · Quá hạn" : ""}</td><td><button class="btn secondary" data-fee-student="${esc(r.s.id)}">Xem / thu tiền</button></td></tr>`).join("") || '<tr><td colspan="7">Không tìm thấy học sinh.</td></tr>'}</tbody></table></div>`;
    list
      .querySelectorAll("[data-fee-student]")
      .forEach((b) => (b.onclick = () => detail(b.dataset.feeStudent)));
  };
  function detail(id) {
    const s = data.students.find((s) => s.id === id),
      summary = feeSummary(s, data.enrollments, today),
      payments = (data.payments || []).filter((p) => p.student_id === id);
    const detail = document.getElementById("fee-detail");
    detail.innerHTML = `<h3>${esc(s.name)} · ${esc(s.id)}</h3><p><strong>${summary.status}</strong> · Đã đóng ${money(summary.paid)} · Còn thiếu ${money(summary.owed)}</p><h4>Các kỳ học phí</h4><div class="table-wrap"><table><thead><tr><th>Kỳ / gói</th><th>Thời gian</th><th>Hạn đóng</th><th>Học phí</th><th>Đã đóng</th><th>Còn thiếu</th><th></th></tr></thead><tbody>${summary.rows.map((e) => `<tr><td>${esc(e.title)}</td><td>${esc(e.starts)} → ${esc(e.ends)}</td><td>${esc(e.due)}</td><td>${money(e.fee)}</td><td>${money(e.paid)}</td><td>${money(e.fee - e.paid)}</td><td>${e.fee > e.paid ? `<button class="btn" data-fee-pay="${e.id}">Ghi nhận đóng tiền</button>` : "Đã đóng đủ"}</td></tr>`).join("") || '<tr><td colspan="7">Chưa đăng ký học phí. Chọn kỳ học và mức phí cho học sinh ở form bên dưới.</td></tr>'}</tbody></table></div><h4>Lịch sử đóng tiền</h4><div class="table-wrap"><table><thead><tr><th>Ngày đóng</th><th>Kỳ học phí</th><th>Số tiền</th><th>Ghi chú</th><th>Biên nhận</th></tr></thead><tbody>${payments.map((p) => `<tr><td>${esc(new Date(p.paid_at).toLocaleString("vi-VN"))}</td><td>${esc(p.title)}</td><td>${money(p.amount)}</td><td>${esc(p.note)}</td><td><button class="btn secondary" data-receipt="${p.id}">Xuất PDF</button></td></tr>`).join("") || '<tr><td colspan="5">Chưa ghi nhận lần đóng tiền nào.</td></tr>'}</tbody></table></div>`;
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
    detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  search.oninput = render;
  filter.onchange = render;
  render();
}
