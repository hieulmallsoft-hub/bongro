import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { BackupDto } from "../common/dto";
import { validateState } from "./validate-state";
import { seed } from "./seed";

export async function readLegacy(): Promise<BackupDto> {
  const root = resolve(__dirname, "../..");
  const sqlite = resolve(
    root,
    process.env.LEGACY_SQLITE_FILE || "data/academy.sqlite",
  );
  const json = resolve(
    root,
    process.env.LEGACY_DATA_FILE || "data/academy.json",
  );
  let initial: unknown;
  if (process.env.IMPORT_LEGACY === "false") {
    initial = seed();
  } else if (existsSync(sqlite)) {
    // SQLite is only read during this one-time migration, never used by the API.
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(sqlite, { readOnly: true });
    try {
      db.exec("BEGIN");
      initial = {
        students: db
          .prepare(
            'SELECT id, name, dob, class_name AS "group", phone FROM students ORDER BY position',
          )
          .all(),
        lessons: db
          .prepare(
            "SELECT id, name, date, start_time AS start, end_time AS end, court, coach FROM lessons ORDER BY position",
          )
          .all(),
        attendance: db
          .prepare(
            'SELECT student_id AS studentId, date, check_in AS "in", check_out AS "out" FROM attendance ORDER BY position',
          )
          .all(),
        events: db
          .prepare("SELECT text, time FROM events ORDER BY position")
          .all(),
      };
      db.exec("COMMIT");
    } finally {
      db.close();
    }
  } else if (existsSync(json)) {
    initial = JSON.parse(readFileSync(json, "utf8"));
  } else {
    initial = seed();
  }
  const checked = plainToInstance(BackupDto, initial);
  if (
    validateSync(checked, { whitelist: true, forbidNonWhitelisted: true })
      .length
  ) {
    throw new Error("Dữ liệu cũ không hợp lệ. Chưa nhập vào PostgreSQL.");
  }
  validateState(checked);
  return checked;
}
