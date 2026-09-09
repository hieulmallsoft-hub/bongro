const { test } = require("node:test");
const assert = require("node:assert/strict");
const { postgresConfig } = require("../dist/storage/postgres-config");

test("DB_* configuration supports a blank URL and preserves password characters", () => {
  const config = postgresConfig({
    DATABASE_URL: " ",
    DB_TYPE: "postgres",
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_USERNAME: "postgres",
    DB_PASSWORD: "a@b:# %",
    DB_DATABASE: "bongro",
  });
  assert.deepEqual(config, {
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "a@b:# %",
    database: "bongro",
  });
});
test("URL takes priority and incomplete discrete configuration fails clearly", () => {
  assert.deepEqual(
    postgresConfig({ DATABASE_URL: "postgresql://localhost/example" }),
    { connectionString: "postgresql://localhost/example" },
  );
  assert.throws(() => postgresConfig({ DB_HOST: "localhost" }), /DB_DATABASE/);
  assert.throws(
    () =>
      postgresConfig({
        DB_HOST: "localhost",
        DB_USERNAME: "postgres",
        DB_DATABASE: "bongro",
        DB_PORT: "wrong",
      }),
    /DB_PORT/,
  );
});
