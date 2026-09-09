import { PoolConfig } from "pg";

export function postgresConfig(
  env: NodeJS.ProcessEnv = process.env,
): PoolConfig {
  if (env.DATABASE_URL?.trim())
    return { connectionString: env.DATABASE_URL.trim() };
  if (
    env.DB_TYPE &&
    env.DB_TYPE !== "postgres" &&
    env.DB_TYPE !== "postgresql"
  ) {
    throw new Error("DB_TYPE phải là postgres.");
  }
  if (
    !env.DB_HOST?.trim() ||
    !env.DB_USERNAME?.trim() ||
    !env.DB_DATABASE?.trim()
  ) {
    throw new Error(
      "Cấu hình DATABASE_URL hoặc DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE trong backend/.env.",
    );
  }
  const port = Number(env.DB_PORT || 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("DB_PORT không hợp lệ.");
  return {
    host: env.DB_HOST.trim(),
    port,
    user: env.DB_USERNAME.trim(),
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE.trim(),
  };
}
