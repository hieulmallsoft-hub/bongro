require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { createApp } = require("../dist/setup");
const { dateKey } = require("../dist/common/time");
const { testDatabase } = require("./postgres-helper.cjs");

test("Nest API: validation, students, scheduling, attendance, backup and persistence", async (t) => {
  const database = await testDatabase();
  const dir = mkdtempSync(join(tmpdir(), "hoopstars-api-test-"));
  const previousFile = process.env.DATA_FILE;
  const previousDatabase = process.env.DATABASE_FILE;
  const previousLegacy = process.env.LEGACY_DATA_FILE;
  process.env.DATA_FILE = join(dir, "academy.json");
  process.env.LEGACY_DATA_FILE = join(dir, "academy.json");
  process.env.DATABASE_FILE = join(dir, "academy.sqlite");
  let app;
  let base;
  let cookie = "";
  async function start() {
    app = await createApp(false);
    await app.listen(0, "127.0.0.1");
    base = `${await app.getUrl()}/api`;
    const status = await (await fetch(base + "/auth/status")).json();
    if (!status.initialized)
      await fetch(base + "/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "testadmin",
          name: "Admin Test",
          password: "TestPassword123!",
        }),
      });
    const login = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "testadmin",
        password: "TestPassword123!",
      }),
    });
    cookie = login.headers.get("set-cookie").split(";")[0];
  }
  async function request(path, method = "GET", body, expected = 200) {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    assert.equal(response.status, expected, JSON.stringify(result));
    return result;
  }
  try {
    await start();
    const student = {
      name: "  Học sinh kiểm thử  ",
      dob: "2013-05-12",
      group: "U14 Test",
      phone: "0901234567",
    };
    let created;
    await t.test("health and seeded state", async () => {
      assert.deepEqual(await request("/health"), {
        status: "ok",
        database: "PostgreSQL",
      });
      const state = await request("/academy");
      assert.equal(state.students.length, 6);
      assert.equal(state.attendance.length, 0);
    });
    await t.test(
      "rejects invalid input and unknown fields without mutating data",
      async () => {
        await request(
          "/students",
          "POST",
          { ...student, dob: "2013-02-30" },
          400,
        );
        await request("/students", "POST", { ...student, name: "  " }, 400);
        await request("/students", "POST", { ...student, role: "admin" }, 400);
        assert.equal((await request("/students")).length, 6);
      },
    );
    await t.test("create and update students", async () => {
      created = await request("/students", "POST", student, 201);
      assert.equal(created.id, "HS007");
      assert.equal(created.name, student.name.trim());
      const updated = await request(`/students/${created.id}`, "PUT", {
        ...student,
        name: "Tên đã sửa",
      });
      assert.equal(updated.name, "Tên đã sửa");
      await request("/students/HS999", "PUT", student, 404);
    });
    await t.test(
      "server enforces attendance lifecycle and concurrent duplicates",
      async () => {
        await request(
          "/attendance/check-out",
          "POST",
          { studentId: created.id },
          409,
        );
        await request(
          "/attendance/check-in",
          "POST",
          { studentId: "HS999" },
          404,
        );
        await request(
          "/attendance/check-in",
          "POST",
          { studentId: created.id, in: "00:00" },
          400,
        );
        const responses = await Promise.all(
          [1, 2].map(() =>
            fetch(base + "/attendance/check-in", {
              method: "POST",
              headers: { "Content-Type": "application/json", Cookie: cookie },
              body: JSON.stringify({ studentId: created.id }),
            }),
          ),
        );
        assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
        const record = await request(
          "/attendance/check-out",
          "POST",
          { studentId: created.id },
          201,
        );
        assert.equal(record.date, dateKey());
        assert.match(record.in, /^\d{2}:\d{2}$/);
        assert.match(record.out, /^\d{2}:\d{2}$/);
        await request(
          "/attendance/check-out",
          "POST",
          { studentId: created.id },
          409,
        );
        assert.equal((await request("/attendance")).length, 1);
      },
    );
    await t.test(
      "schedule conflicts are checked for court, class and coach",
      async () => {
        const lesson = {
          name: "Lớp kiểm thử",
          date: dateKey(),
          start: "09:00",
          end: "10:00",
          court: "Sân 3",
          coach: "HLV kiểm thử",
        };
        await request("/lessons", "POST", { ...lesson, end: "08:00" }, 400);
        await request("/lessons", "POST", { ...lesson, start: "25:00" }, 400);
        await request("/lessons", "POST", lesson, 201);
        for (const patch of [
          { name: "Khác", coach: "Khác" },
          { court: "Khác", coach: "Khác" },
          { name: "Khác", court: "Khác" },
        ]) {
          await request(
            "/lessons",
            "POST",
            { ...lesson, ...patch, start: "09:30" },
            409,
          );
        }
        await request(
          "/lessons",
          "POST",
          { ...lesson, start: "10:00", end: "11:00" },
          201,
        );
      },
    );
    await t.test(
      "restore validates nested objects and references, preserving state on failure",
      async () => {
        const backup = await request("/backup");
        await request(
          "/backup/restore",
          "POST",
          { ...backup, students: [{ ...backup.students[0], name: "" }] },
          400,
        );
        await request(
          "/backup/restore",
          "POST",
          {
            ...backup,
            attendance: [{ ...backup.attendance[0], studentId: "HS999" }],
          },
          400,
        );
        await request(
          "/backup/restore",
          "POST",
          {
            ...backup,
            attendance: [...backup.attendance, ...backup.attendance],
          },
          400,
        );
        assert.deepEqual(await request("/backup"), backup);
        await request("/backup/restore", "POST", backup, 201);
      },
    );
    await t.test("monthly reports persist per student and month", async () => {
      const month = dateKey().slice(0, 7);
      const body = {
        coach: "HLV Minh",
        strengths: "Dẫn bóng tốt hơn",
        improvements: "Tập ném rổ",
        goals: "Luyện tập đều đặn",
      };
      const path = `/reports/HS001/${month}`;
      assert.equal((await request(path)).report, null);
      await request(path, "PUT", body);
      assert.equal((await request(path)).report.strengths, body.strengths);
      await request("/reports/HS001/2026-13", "PUT", body, 400);
      await request("/reports/HS999/2026-01", "PUT", body, 404);
      await request(path, "PUT", { ...body, coach: "" }, 400);
      await app.close();
      await start();
      assert.equal((await request(path)).report.goals, body.goals);
    });
    await t.test("records survive a backend restart", async () => {
      const before = await request("/academy");
      await app.close();
      await start();
      assert.deepEqual(await request("/academy"), before);
    });
  } finally {
    if (app) await app.close();
    if (previousFile === undefined) delete process.env.DATA_FILE;
    else process.env.DATA_FILE = previousFile;
    if (previousDatabase === undefined) delete process.env.DATABASE_FILE;
    else process.env.DATABASE_FILE = previousDatabase;
    if (previousLegacy === undefined) delete process.env.LEGACY_DATA_FILE;
    else process.env.LEGACY_DATA_FILE = previousLegacy;
    // Only the unique directory created by this test is removed.
    rmSync(dir, { recursive: true, force: true });
    await database.close();
  }
});
