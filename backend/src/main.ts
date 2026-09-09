import "reflect-metadata";
import { createApp } from "./setup";

async function bootstrap() {
  const app = await createApp();
  await app.listen(
    Number(process.env.PORT || 3001),
    process.env.HOST || "127.0.0.1",
  );
  console.log(`HoopStars API listening on ${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 3001}`);
}
bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
