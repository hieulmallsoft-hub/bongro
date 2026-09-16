require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../dist/setup");
const { dateKey } = require("../dist/common/time");
const { testDatabase } = require("./postgres-helper.cjs");
test("operations: auth, scoped coaches, fees, leave, reports and complete backup", async (t) => {
  const db = await testDatabase();
  let app;
  try {
    app = await createApp(false);
    await app.listen(0, "127.0.0.1");
    const base = (await app.getUrl()) + "/api";
    let cookie = "";
    async function call(path, method = "GET", body, code = 200, auth = cookie) {
      const r = await fetch(base + path, {
        method,
        headers: { "Content-Type": "application/json", Cookie: auth },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const result = await r.json();
      assert.equal(r.status, code, JSON.stringify(result));
      return result;
    }
    async function login(username, password) {
      const r = await fetch(base + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      assert.equal(r.status, 201);
      return r.headers.get("set-cookie").split(";")[0];
    }
    await call("/ops/overview", "GET", undefined, 401);
    await call(
      "/auth/setup",
      "POST",
      { username: "admin", password: "AdminPassword123", name: "Quản trị" },
      201,
    );
    cookie = await login("admin", "AdminPassword123");
    await call(
      "/auth/setup",
      "POST",
      { username: "admin2", password: "AdminPassword123", name: "Khác" },
      403,
    );
    await call(
      "/ops/users",
      "POST",
      {
        username: "coach",
        password: "CoachPassword123",
        name: "HLV Test",
        classes: ["U12 Cơ bản"],
      },
      201,
    );
    const coach = await login("coach", "CoachPassword123");
    await t.test(
      "coach scope and admin-only routes enforced on server",
      async () => {
        await call("/students", "GET", undefined, 403, coach);
        await call("/students/HS004", "DELETE", undefined, 403, coach);
        await call("/students/HS004/unassign", "POST", {}, 403, coach);
        await call(
          "/ops/payments",
          "POST",
          { enrollmentId: 1, amount: 1 },
          403,
          coach,
        );
        await call(
          "/ops/expenses",
          "POST",
          { category: "court", title: "Tiền sân", amount: 100000, expenseDate: dateKey() },
          403,
          coach,
        );
        const scoped = await call(
          "/ops/overview",
          "GET",
          undefined,
          200,
          coach,
        );
        assert.ok(scoped.students.every((s) => s.group === "U12 Cơ bản"));
        assert.equal(scoped.users.length, 0);
        await call(
          "/reports/HS001/" + dateKey().slice(0, 7),
          "GET",
          undefined,
          403,
          coach,
        );
      },
    );
    await t.test("per-session attendance, fees and guardian data", async () => {
      const profile = await call(
        "/students/profile",
        "POST",
        {
          id: "HS004",
          name: "Phạm Tuấn Anh",
          dob: "2014-09-18",
          group: "U12 Cơ bản",
          phone: "0934567890",
          guardianName: "Phụ huynh hồ sơ",
          guardianPhone: "0901234567",
          guardianEmail: "profile@example.com",
          relationship: "Mẹ",
          authorizedPickup: "Nguyễn Văn A",
        },
        201,
      );
      assert.equal(profile.group, "U12 Cơ bản");
      await call(
        "/students/profile",
        "POST",
        {
          name: "Không có lớp",
          dob: "2014-09-18",
          group: "Lớp chưa tồn tại",
          phone: "0934567890",
        },
        400,
      );
      await call(
        "/ops/attendance",
        "POST",
        { studentId: "HS001", lessonId: 1, status: "present" },
        400,
        coach,
      );
      await call(
        "/ops/lesson-photo",
        "POST",
        {
          lessonId: 1,
          fileName: "check-in.png",
          image:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        },
        201,
        coach,
      );
      await call(
        "/ops/attendance",
        "POST",
        { studentId: "HS004", lessonId: 1, status: "late" },
        201,
        coach,
      );
      await call(
        "/ops/attendance",
        "POST",
        { studentId: "HS004", lessonId: 1, status: "absent" },
        403,
        coach,
      );
      await call(
        "/ops/attendance",
        "POST",
        { studentId: "HS004", lessonId: 1, action: "checkout" },
        201,
        coach,
      );
      await call(
        "/ops/attendance",
        "POST",
        { studentId: "HS004", lessonId: 1, action: "checkout" },
        400,
        coach,
      );
      await call(
        "/ops/enrollments",
        "POST",
        {
          studentId: "HS004",
          title: "Gói sai tiền",
          sessions: 10,
          fee: 100000,
          initialPaid: 200000,
          starts: dateKey(),
          ends: dateKey(),
          due: dateKey(),
        },
        400,
      );
      await call(
        "/ops/enrollments",
        "POST",
        {
          studentId: "HS004",
          title: "Gói 10 buổi",
          sessions: 10,
          fee: 1200000,
          starts: dateKey(),
          ends: dateKey(),
          due: dateKey(),
        },
        201,
      );
      let overview = await call("/ops/overview");
      const enrollment = overview.enrollments[0];
      assert.equal(enrollment.used, 1);
      assert.equal(enrollment.attended, 1);
      assert.equal(enrollment.excused, 0);
      assert.equal(enrollment.absent, 0);
      assert.equal(enrollment.excused_allowance, 2);
      assert.equal(overview.lessonPhotos[0].file_name, "check-in.png");
      await call(
        "/ops/payments",
        "POST",
        { enrollmentId: enrollment.id, amount: 500000 },
        201,
      );
      await call(
        "/ops/payments",
        "POST",
        { enrollmentId: enrollment.id, amount: 800000 },
        400,
      );
      await call(
        "/ops/guardians",
        "POST",
        {
          studentId: "HS004",
          name: "Phụ huynh",
          phone: "0901234567",
          email: "parent@example.com",
          pickup: "Ông Nguyễn",
        },
        201,
      );
      overview = await call("/ops/overview");
      assert.equal(overview.enrollments[0].paid, 500000);
      assert.equal(overview.guardians.find((g) => g.student_id === "HS004").name, "Phụ huynh");
      await call(
        "/ops/enrollments/update",
        "POST",
        {
          id: enrollment.id,
          title: "Gói 10 buổi nâng cao",
          sessions: 10,
          fee: 1400000,
          starts: dateKey(),
          ends: dateKey(),
          due: dateKey(),
        },
        201,
      );
      await call(
        "/ops/enrollments/update",
        "POST",
        {
          id: enrollment.id,
          title: "Không hợp lệ",
          sessions: 10,
          fee: 400000,
          starts: dateKey(),
          ends: dateKey(),
          due: dateKey(),
        },
        400,
      );
      await call(
        "/ops/enrollments/update",
        "POST",
        {
          id: enrollment.id,
          title: "Sai loại gói",
          sessions: 15,
          fee: 1400000,
          starts: dateKey(),
          ends: dateKey(),
          due: dateKey(),
        },
        400,
      );
      overview = await call("/ops/overview");
      assert.equal(overview.enrollments[0].title, "Gói 10 buổi nâng cao");
      assert.equal(overview.enrollments[0].fee, 1400000);
      await call(
        "/ops/enrollments/status",
        "POST",
        { id: enrollment.id, status: "frozen" },
        201,
      );
      await call(
        "/ops/payments/void",
        "POST",
        { id: overview.payments[0].id, reason: "Nhập nhầm giao dịch" },
        201,
      );
      overview = await call("/ops/overview");
      assert.equal(overview.enrollments[0].status, "frozen");
      assert.equal(overview.enrollments[0].paid, 0);
      assert.ok(overview.payments[0].voided_at);
    });
    await t.test(
      "approved leave preserves sessions and assigns makeup",
      async () => {
        await call(
          "/ops/leaves",
          "POST",
          { studentId: "HS006", lessonId: 1, reason: "Xin nghỉ" },
          201,
        );
        const overview = await call("/ops/overview");
        await call(
          "/ops/leaves/resolve",
          "POST",
          { id: overview.leaves[0].id, status: "approved", makeupLessonId: 2 },
          201,
        );
        await call(
          "/ops/attendance",
          "POST",
          { studentId: "HS006", lessonId: 2, status: "present" },
          201,
        );
        const after = await call("/ops/overview");
        assert.equal(
          after.attendance.find(
            (a) => a.student_id === "HS006" && a.lesson_id === 1,
          ).status,
          "excused",
        );
      },
    );
    await t.test(
      "report approval, manual delivery and edit returns to draft",
      async () => {
        const month = dateKey().slice(0, 7);
        const path = "/reports/HS004/" + month;
        const body = {
          coach: "ignored",
          strengths: "Tiến bộ",
          improvements: "Ném rổ",
          goals: "Đều đặn",
        };
        await call(path, "PUT", body, 200, coach);
        assert.equal(
          (await call(path, "GET", undefined, 200, coach)).report.coach,
          "HLV Test",
        );
        await call(path + "/submit", "POST", {}, 201, coach);
        await call(
          "/ops/reports/status",
          "POST",
          { studentId: "HS004", month, status: "approved" },
          403,
          coach,
        );
        await call(
          "/ops/reports/status",
          "POST",
          { studentId: "HS004", month, status: "approved" },
          201,
        );
        await call(
          "/ops/reports/sent",
          "POST",
          {
            studentId: "HS004",
            month,
            channel: "Zalo",
            recipient: "Phụ huynh",
          },
          201,
        );
        await call(path, "PUT", body, 200, coach);
        assert.equal((await call(path)).report.status, "draft");
      },
    );
    await t.test("monthly expenses and voiding preserve the accounting trail", async () => {
      await call(
        "/ops/expenses",
        "POST",
        {
          category: "court",
          title: "Thuê sân tháng",
          amount: 3000000,
          expenseDate: dateKey(),
          note: "Sân 1 và sân 2",
        },
        201,
      );
      let overview = await call("/ops/overview?month=" + dateKey().slice(0, 7));
      assert.equal(overview.expenses[0].amount, 3000000);
      assert.equal(overview.expenses[0].category, "court");
      await call(
        "/ops/expenses/void",
        "POST",
        { id: overview.expenses[0].id, reason: "Nhập nhầm tháng" },
        201,
      );
      overview = await call("/ops/overview?month=" + dateKey().slice(0, 7));
      assert.ok(overview.expenses[0].voided_at);
      await call(
        "/ops/expenses/void",
        "POST",
        { id: overview.expenses[0].id, reason: "Hủy lần hai" },
        400,
      );
    });
    await t.test(
      "full backup restores report and fees, invalid payload rolls back",
      async () => {
        const backup = await call("/ops/backup");
        assert.equal(backup.data.monthly_reports.length, 1);
        assert.equal(backup.data.payments.length, 1);
        assert.equal(backup.data.expenses.length, 1);
        await call("/ops/backup/restore", "POST", backup, 201);
        const invalid = structuredClone(backup);
        invalid.data.students[0].unexpected = 1;
        await call("/ops/backup/restore", "POST", invalid, 400);
        const after = await call("/ops/backup");
        assert.deepEqual(after.data, backup.data);
      },
    );
    await t.test(
      "recurring lessons are weekly and conflicts roll back entire series",
      async () => {
        const baseLesson = {
          name: "Lớp lặp",
          date: dateKey(),
          start: "05:00",
          end: "06:00",
          court: "Sân lặp",
          coach: "HLV lặp",
          weeks: 3,
        };
        const created = await call(
          "/lessons/recurring",
          "POST",
          baseLesson,
          201,
        );
        assert.equal(created.length, 3);
        assert.equal(
          (Date.parse(created[1].date) - Date.parse(created[0].date)) /
            86400000,
          7,
        );
        const before = await call("/lessons");
        await call(
          "/lessons/recurring",
          "POST",
          { ...baseLesson, weeks: 0 },
          400,
        );
        await call("/lessons/recurring", "POST", baseLesson, 409);
        assert.equal((await call("/lessons")).length, before.length);
        await call("/lessons/recurring", "POST", baseLesson, 403, coach);
      },
    );
    await t.test("dashboard uses session attendance only", async () => {
      const dashboard = await call("/dashboard");
      assert.ok(dashboard.attendance.length > 0);
      assert.ok(
        dashboard.attendance.every(
          (a) => a.lessonId && ["present", "late"].includes(a.status),
        ),
      );
    });
    await t.test("unassigning a student preserves the profile and history", async () => {
      await call("/students/HS004/unassign", "POST", {}, 201);
      const overview = await call("/ops/overview");
      assert.equal(overview.students.find((s) => s.id === "HS004").group, "Chưa xếp lớp");
      assert.ok(overview.guardians.some((g) => g.student_id === "HS004"));
      assert.ok(overview.enrollments.some((e) => e.student_id === "HS004"));
      assert.ok(overview.attendance.some((a) => a.student_id === "HS004"));
      await call("/students/HS004/unassign", "POST", {}, 400);
    });
    await t.test(
      "password reset and change revoke old sessions and enforce permissions",
      async () => {
        await call(
          "/auth/reset-password",
          "POST",
          { username: "admin", newPassword: "ChangedPassword123" },
          403,
          coach,
        );
        await call(
          "/auth/password",
          "POST",
          {
            currentPassword: "IncorrectPassword123",
            newPassword: "ChangedPassword123",
          },
          401,
          coach,
        );
        await call(
          "/auth/reset-password",
          "POST",
          { username: "coach", newPassword: "NewCoachPassword123" },
          201,
        );
        await call("/auth/me", "GET", undefined, 401, coach);
        const renewed = await login("coach", "NewCoachPassword123");
        await call(
          "/auth/password",
          "POST",
          {
            currentPassword: "NewCoachPassword123",
            newPassword: "FinalCoachPassword123",
          },
          201,
          renewed,
        );
        await call("/auth/me", "GET", undefined, 401, renewed);
        assert.ok(await login("coach", "FinalCoachPassword123"));
      },
    );
    await t.test("logout invalidates server session", async () => {
      await call("/auth/logout", "POST", {}, 201);
      await call("/ops/overview", "GET", undefined, 401);
    });
  } finally {
    await app?.close();
    await db.close();
  }
});
