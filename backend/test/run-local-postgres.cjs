// Runs integration tests against a disposable, real PostgreSQL server.
// It never connects to or modifies the installed PostgreSQL service.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { randomBytes } = require("node:crypto");
const { spawnSync } = require("node:child_process");

async function main() {
  const bin = process.env.POSTGRES_BIN || "C:/Program Files/PostgreSQL/18/bin";
  const ext = process.platform === "win32" ? ".exe" : "";
  if (!fs.existsSync(path.join(bin, "initdb" + ext)))
    throw new Error("Set POSTGRES_BIN to the PostgreSQL bin directory.");
  const tempRoot = path.resolve(os.tmpdir());
  const temp = fs.mkdtempSync(path.join(tempRoot, "hoopstars-pg-"));
  const data = path.join(temp, "data");
  const passwordFile = path.join(temp, "password");
  const password = randomBytes(24).toString("hex");
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  let started = false;
  const run = (exe, args, options = {}) => {
    const result = spawnSync(exe, args, {
      windowsHide: true,
      encoding: "utf8",
      timeout: 120000,
      ...options,
    });
    if (result.status !== 0)
      throw new Error(
        result.error?.message ||
          result.stderr ||
          result.stdout ||
          "PostgreSQL command failed",
      );
    return result;
  };
  try {
    fs.writeFileSync(passwordFile, password, { mode: 0o600 });
    run(path.join(bin, "initdb" + ext), [
      "-D",
      data,
      "-U",
      "hoopstars_test",
      "-A",
      "scram-sha-256",
      "--pwfile",
      passwordFile,
      "--encoding=UTF8",
      "--no-locale",
    ]);
    run(path.join(bin, "pg_ctl" + ext), [
      "-D",
      data,
      "-l",
      path.join(temp, "server.log"),
      "-o",
      `-h 127.0.0.1 -p ${port}`,
      "-w",
      "start",
    ]);
    started = true;
    const tests = fs
      .readdirSync(__dirname)
      .filter((file) => file.endsWith(".test.cjs"))
      .map((file) => path.join(__dirname, file));
    const result = spawnSync(process.execPath, ["--test", ...tests], {
      windowsHide: true,
      stdio: "inherit",
      env: {
        ...process.env,
        TEST_DATABASE_URL: `postgresql://hoopstars_test:${password}@127.0.0.1:${port}/postgres`,
      },
    });
    process.exitCode = result.status ?? 1;
  } finally {
    if (started)
      run(path.join(bin, "pg_ctl" + ext), [
        "-D",
        data,
        "-m",
        "fast",
        "-w",
        "stop",
      ]);
    if (
      path.dirname(path.resolve(temp)) !== tempRoot ||
      !path.basename(temp).startsWith("hoopstars-pg-")
    )
      throw new Error("Unsafe temporary path");
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
