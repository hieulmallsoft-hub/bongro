const { Pool } = require("pg");
const { randomBytes } = require("node:crypto");
const { postgresConfig } = require("../dist/storage/postgres-config");

async function testDatabase() {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  const config = url ? { connectionString: url } : postgresConfig();
  const schema = "hoopstars_test_" + randomBytes(8).toString("hex");
  const old = {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_SCHEMA: process.env.DATABASE_SCHEMA,
    IMPORT_LEGACY: process.env.IMPORT_LEGACY,
    LEGACY_SQLITE_FILE: process.env.LEGACY_SQLITE_FILE,
    LEGACY_DATA_FILE: process.env.LEGACY_DATA_FILE,
  };
  const pool = new Pool({
    ...config,
    connectionTimeoutMillis: 5000,
    options: `-c search_path=${schema}`,
  });
  await pool.query("SELECT 1");
  if (url) process.env.DATABASE_URL = url;
  process.env.DATABASE_SCHEMA = schema;
  process.env.IMPORT_LEGACY = "false";
  return {
    pool,
    async close() {
      try {
        // Only the random schema owned by this test is removed, never public/hoopstars.
        if (!/^hoopstars_test_[a-f0-9]{16}$/.test(schema))
          throw new Error("Unsafe test schema");
        await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      } finally {
        await pool.end();
        for (const [key, value] of Object.entries(old)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }
    },
  };
}
module.exports = { testDatabase };
