require("reflect-metadata");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { StorageService } = require("../dist/storage/postgres-storage.service");
const { seed } = require("../dist/storage/seed");
const { dateKey } = require("../dist/common/time");
const { testDatabase } = require("./postgres-helper.cjs");

test("PostgreSQL: import, constraints, concurrent connections and rollback", async (t) => {
  const database = await testDatabase();
  const dir = mkdtempSync(join(tmpdir(), "hoopstars-pg-test-"));
  process.env.IMPORT_LEGACY = "true";
  process.env.LEGACY_SQLITE_FILE = join(dir, "missing.sqlite");
  process.env.LEGACY_DATA_FILE = join(dir, "legacy.json");
  const initial = seed();
  initial.students[0].name = "Dữ liệu trước khi chuyển PostgreSQL";
  const original = JSON.stringify(initial);
  writeFileSync(process.env.LEGACY_DATA_FILE, original);
  let storage, second;
  try {
    storage = new StorageService();
    await storage.onModuleInit();
    await t.test("imports JSON once and keeps its source intact", async () => {
      assert.deepEqual(await storage.snapshot(), initial);
      assert.equal(
        readFileSync(process.env.LEGACY_DATA_FILE, "utf8"),
        original,
      );
      assert.equal((await storage.inspect()).engine, "PostgreSQL");
    });
    await t.test(
      "two connections serialize writes and keep both changes",
      async () => {
        second = new StorageService();
        await second.onModuleInit();
        await Promise.all([
          storage.transaction((state) => {
            state.students[0].name = "Kết nối 1";
          }),
          second.transaction((state) => {
            state.students[1].name = "Kết nối 2";
          }),
        ]);
        const snapshot = await storage.snapshot();
        assert.equal(snapshot.students[0].name, "Kết nối 1");
        assert.equal(snapshot.students[1].name, "Kết nối 2");
      },
    );
    await t.test(
      "foreign key violation rolls back earlier changes",
      async () => {
        const before = await storage.snapshot();
        await assert.rejects(
          storage.transaction((state) => {
            state.students[0].name = "Không được lưu";
            state.attendance.push({
              studentId: "HS999",
              date: dateKey(),
              in: "10:00",
              out: null,
            });
          }),
          (error) => error.code === "23503",
        );
        assert.deepEqual(await storage.snapshot(), before);
      },
    );
    await t.test(
      "unique attendance and checkout time are enforced by PostgreSQL",
      async () => {
        await storage.transaction((state) => {
          state.attendance.push({
            studentId: "HS001",
            date: dateKey(),
            in: "10:00",
            out: null,
          });
        });
        await assert.rejects(
          database.pool.query(
            "INSERT INTO attendance VALUES ($1,$2,$3,$4,$5)",
            ["HS001", dateKey(), "10:00", null, 1],
          ),
          (error) => error.code === "23505",
        );
        await assert.rejects(
          database.pool.query("UPDATE attendance SET check_out = $1", [
            "09:00",
          ]),
          (error) => error.code === "23514",
        );
      },
    );
    await t.test(
      "restart ignores changed legacy files and preserves an empty restore",
      async () => {
        writeFileSync(process.env.LEGACY_DATA_FILE, "{invalid");
        const before = await storage.snapshot();
        await storage.onModuleDestroy();
        storage = new StorageService();
        await storage.onModuleInit();
        assert.deepEqual(await storage.snapshot(), before);
        await storage.transaction((state) =>
          Object.assign(state, {
            students: [],
            lessons: [],
            attendance: [],
            events: [],
          }),
        );
        await storage.onModuleDestroy();
        storage = new StorageService();
        await storage.onModuleInit();
        assert.equal((await storage.snapshot()).students.length, 0);
      },
    );
  } finally {
    await second?.onModuleDestroy();
    await storage?.onModuleDestroy();
    await database.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
