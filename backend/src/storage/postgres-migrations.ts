import { PoolClient } from "pg";
import { operationsSchema } from "./operations-schema";

const schemaV1 = `
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80),
  dob DATE NOT NULL,
  class_name TEXT NOT NULL CHECK(length(trim(class_name)) BETWEEN 1 AND 60),
  phone TEXT NOT NULL,
  position INTEGER NOT NULL
);
CREATE TABLE lessons (
  id INTEGER PRIMARY KEY CHECK(id > 0),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  court TEXT NOT NULL,
  coach TEXT NOT NULL,
  position INTEGER NOT NULL,
  CHECK(start_time < end_time)
);
CREATE INDEX idx_lessons_date ON lessons(date);
CREATE TABLE attendance (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  check_in TIME NOT NULL,
  check_out TIME,
  position INTEGER NOT NULL,
  PRIMARY KEY(student_id, date),
  CHECK(check_out IS NULL OR check_out >= check_in)
);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE TABLE events (
  position INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  time TIMESTAMPTZ NOT NULL
);
`;

export async function lockWrites(client: PoolClient) {
  // All API writers acquire the same transaction-scoped lock before reading.
  await client.query(
    "SELECT pg_advisory_xact_lock(724341, hashtext(current_schema()))",
  );
}

export async function migrate(client: PoolClient, schema: string) {
  await client.query("BEGIN");
  try {
    // schema is validated against a strict identifier regex before reaching here.
    await client.query("SELECT pg_advisory_xact_lock(724341, hashtext($1))", [
      schema,
    ]);
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await client.query(
      "CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
    );
    const version = Number(
      (
        await client.query(
          "SELECT value FROM metadata WHERE key = 'schema_version'",
        )
      ).rows[0]?.value || 0,
    );
    if (version > 5)
      throw new Error("Database schema is newer than this application.");
    if (version === 0) {
      await client.query(schemaV1);
      await client.query(
        "INSERT INTO metadata(key, value) VALUES ('schema_version', '1')",
      );
    }
    if (version < 2) {
      await client.query(`CREATE TABLE monthly_reports (
        student_id TEXT NOT NULL,
        month TEXT NOT NULL CHECK(month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
        coach TEXT NOT NULL,
        strengths TEXT NOT NULL,
        improvements TEXT NOT NULL,
        goals TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY(student_id, month)
      )`);
      await client.query(
        "UPDATE metadata SET value = '2' WHERE key = 'schema_version'",
      );
    }
    if (version < 3) {
      await client.query(operationsSchema);
      await client.query(
        "UPDATE metadata SET value='3' WHERE key='schema_version'",
      );
    }
    if (version < 4) {
      await client.query(`CREATE TABLE lesson_photos (
        lesson_id INTEGER PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
        image_data BYTEA NOT NULL,
        mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
        file_name TEXT NOT NULL,
        uploaded_by INTEGER NOT NULL REFERENCES users(id),
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
      await client.query(
        "UPDATE metadata SET value='4' WHERE key='schema_version'",
      );
    }
    if (version < 5) {
      await client.query(`ALTER TABLE enrollments ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active','completed','frozen','cancelled'))`);
      await client.query(`ALTER TABLE payments ADD COLUMN voided_at TIMESTAMPTZ,
        ADD COLUMN void_reason TEXT,
        ADD COLUMN voided_by INTEGER REFERENCES users(id)`);
      await client.query("UPDATE metadata SET value='5' WHERE key='schema_version'");
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
