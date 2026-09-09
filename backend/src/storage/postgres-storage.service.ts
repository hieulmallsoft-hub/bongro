import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import { BackupDto } from "../common/dto";
import { lockWrites, migrate } from "./postgres-migrations";
import { readLegacy } from "./legacy-import";
import { postgresConfig } from "./postgres-config";

type Row = Record<string, string | number | null>;

@Injectable()
export class StorageService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  private closed = false;
  private readonly schema = process.env.DATABASE_SCHEMA || "hoopstars";

  constructor() {
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(this.schema))
      throw new Error("DATABASE_SCHEMA không hợp lệ.");
    this.pool = new Pool({
      ...postgresConfig(),
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      options: `-c search_path=${this.schema} -c statement_timeout=30000 -c lock_timeout=10000`,
    });
    this.pool.on("error", () =>
      Logger.error("Kết nối PostgreSQL trong pool bị gián đoạn.", "PostgreSQL"),
    );
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      try {
        await migrate(client, this.schema);
      } finally {
        client.release();
      }
      await this.withTransaction(async (client) => {
        if (
          (
            await client.query(
              "SELECT 1 FROM metadata WHERE key = 'initialized'",
            )
          ).rowCount
        )
          return;
        const before = await this.readState(client);
        if (Object.values(before).some((rows) => rows.length))
          throw new Error(
            "Schema đã có dữ liệu nhưng thiếu metadata; không tự ghi đè.",
          );
        await this.persist(client, before, await readLegacy());
        await client.query(
          "INSERT INTO metadata(key, value) VALUES ('initialized', $1)",
          [new Date().toISOString()],
        );
      });
      Logger.log(`Đã kết nối PostgreSQL · schema ${this.schema}`, "PostgreSQL");
    } catch (error) {
      await this.onModuleDestroy();
      // Avoid logging the connection URL or password.
      const code = (error as { code?: string }).code;
      throw new Error(
        `Không thể khởi tạo PostgreSQL${code ? ` (${code})` : ""}. Kiểm tra DATABASE_URL, quyền tạo schema và dữ liệu nhập cũ.`,
        { cause: undefined },
      );
    }
  }

  async onModuleDestroy() {
    if (!this.closed) {
      this.closed = true;
      await this.pool.end();
    }
  }

  async health() {
    try {
      await this.pool.query("SELECT 1");
      return { status: "ok", database: "PostgreSQL" };
    } catch {
      throw new ServiceUnavailableException("Không kết nối được PostgreSQL.");
    }
  }

  async inspect() {
    const info = (
      await this.pool.query(
        "SELECT current_database() AS database, current_schema() AS schema, version() AS version",
      )
    ).rows[0];
    return {
      engine: "PostgreSQL",
      ...info,
      schemaVersion: (
        await this.pool.query(
          "SELECT value FROM metadata WHERE key = 'schema_version'",
        )
      ).rows[0]?.value,
      counts: Object.fromEntries(
        Object.entries(await this.snapshot()).map(([key, rows]) => [
          key,
          rows.length,
        ]),
      ),
    };
  }

  async snapshot(): Promise<BackupDto> {
    return this.withTransaction((client) => this.readState(client), false);
  }

  async report(studentId: string, month: string) {
    const result = await this.pool.query(
      'SELECT student_id AS "studentId", month, coach, strengths, improvements, goals, status, updated_at AS "updatedAt" FROM monthly_reports WHERE student_id=$1 AND month=$2',
      [studentId, month],
    );
    return result.rows[0] || null;
  }

  async saveReport(
    studentId: string,
    month: string,
    body: {
      coach: string;
      strengths: string;
      improvements: string;
      goals: string;
    },
  ) {
    return this.withTransaction(async (client) => {
      const found = await client.query("SELECT 1 FROM students WHERE id=$1", [
        studentId,
      ]);
      if (!found.rowCount) throw new Error("Học sinh không tồn tại.");
      await client.query(
        `INSERT INTO monthly_reports(student_id,month,coach,strengths,improvements,goals) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(student_id,month) DO UPDATE SET coach=excluded.coach,strengths=excluded.strengths,improvements=excluded.improvements,goals=excluded.goals,status='draft',updated_at=now()`,
        [
          studentId,
          month,
          body.coach,
          body.strengths,
          body.improvements,
          body.goals,
        ],
      );
      return { success: true };
    });
  }

  async transaction<T>(update: (draft: BackupDto) => T): Promise<T> {
    return this.withTransaction(async (client) => {
      const before = await this.readState(client);
      const draft = structuredClone(before);
      const result = update(draft);
      await this.persist(client, before, draft);
      return structuredClone(result);
    });
  }

  async withTransaction<T>(
    action: (client: PoolClient) => Promise<T>,
    write = true,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query(
        write ? "BEGIN" : "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      if (write) await lockWrites(client);
      const result = await action(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async readState(client: PoolClient): Promise<BackupDto> {
    return {
      students: (
        await client.query(
          "SELECT id, name, to_char(dob, 'YYYY-MM-DD') AS dob, class_name AS \"group\", phone FROM students ORDER BY position",
        )
      ).rows,
      lessons: (
        await client.query(
          "SELECT id, name, to_char(date, 'YYYY-MM-DD') AS date, to_char(start_time, 'HH24:MI') AS start, to_char(end_time, 'HH24:MI') AS end, court, coach FROM lessons ORDER BY position",
        )
      ).rows,
      attendance: (
        await client.query(
          "SELECT student_id AS \"studentId\", to_char(date, 'YYYY-MM-DD') AS date, to_char(check_in, 'HH24:MI') AS \"in\", to_char(check_out, 'HH24:MI') AS \"out\" FROM attendance ORDER BY position",
        )
      ).rows,
      events: (
        await client.query("SELECT text, time FROM events ORDER BY position")
      ).rows.map((row) => ({ text: row.text, time: row.time.toISOString() })),
    };
  }

  private async persist(
    client: PoolClient,
    before: BackupDto,
    after: BackupDto,
  ) {
    const students = (s: BackupDto) =>
      s.students.map((r, position) => ({
        id: r.id,
        name: r.name,
        dob: r.dob,
        class_name: r.group,
        phone: r.phone,
        position,
      }));
    const lessons = (s: BackupDto) =>
      s.lessons.map((r, position) => ({
        id: r.id,
        name: r.name,
        date: r.date,
        start_time: r.start,
        end_time: r.end,
        court: r.court,
        coach: r.coach,
        position,
      }));
    const attendance = (s: BackupDto) =>
      s.attendance.map((r, position) => ({
        student_id: r.studentId,
        date: r.date,
        check_in: r.in,
        check_out: r.out,
        position,
      }));
    const events = (s: BackupDto) =>
      s.events.map((r, position) => ({ position, text: r.text, time: r.time }));
    const oldAttendance = attendance(before),
      newAttendance = attendance(after);
    // Remove child rows before students during a backup restore.
    await this.removeMissing(
      client,
      "attendance",
      ["student_id", "date"],
      oldAttendance,
      newAttendance,
    );
    await this.sync(
      client,
      "students",
      ["id"],
      students(before),
      students(after),
    );
    // Remove changed schedules first so swapping valid schedules in a restore
    // does not trigger a conflict against the previous schedule.
    const oldLessons = lessons(before),
      newLessons = lessons(after);
    const unchanged = oldLessons.filter((row) =>
      newLessons.some((next) => JSON.stringify(row) === JSON.stringify(next)),
    );
    await this.removeMissing(client, "lessons", ["id"], oldLessons, unchanged);
    await this.sync(client, "lessons", ["id"], unchanged, newLessons);
    await this.sync(
      client,
      "attendance",
      ["student_id", "date"],
      oldAttendance,
      newAttendance,
    );
    await this.sync(
      client,
      "events",
      ["position"],
      events(before),
      events(after),
    );
  }

  private async removeMissing(
    client: PoolClient,
    table: string,
    keys: string[],
    before: Row[],
    after: Row[],
  ) {
    const key = (row: Row) => JSON.stringify(keys.map((k) => row[k]));
    const nextKeys = new Set(after.map(key));
    for (const row of before)
      if (!nextKeys.has(key(row))) {
        await client.query(
          `DELETE FROM ${table} WHERE ${keys.map((k, i) => k + " = $" + (i + 1)).join(" AND ")}`,
          keys.map((k) => row[k]),
        );
      }
  }
  private async sync(
    client: PoolClient,
    table: string,
    keys: string[],
    before: Row[],
    after: Row[],
  ) {
    await this.removeMissing(client, table, keys, before, after);
    if (!after.length) return;
    const columns = Object.keys(after[0]);
    const updates = columns
      .filter((c) => !keys.includes(c))
      .map((c) => c + " = excluded." + c);
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map((_, i) => "$" + (i + 1)).join(", ")}) ON CONFLICT (${keys.join(", ")}) DO UPDATE SET ${updates.join(", ")}`;
    const previous = new Map(
      before.map((row) => [
        JSON.stringify(keys.map((k) => row[k])),
        JSON.stringify(row),
      ]),
    );
    for (const row of after)
      if (
        previous.get(JSON.stringify(keys.map((k) => row[k]))) !==
        JSON.stringify(row)
      ) {
        await client.query(
          sql,
          columns.map((c) => row[c]),
        );
      }
  }
}
