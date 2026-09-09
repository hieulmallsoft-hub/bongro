import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

export async function createApp(logger: false | undefined = undefined) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
    abortOnError: false,
  });
  app.set('trust proxy', 1);
  app.useBodyParser("json", { limit: "10mb" });
  app.setGlobalPrefix("api");
  app.enableCors({
    credentials: true,
    origin: (
      process.env.FRONTEND_ORIGIN ||
      "http://localhost:5173,http://127.0.0.1:5173"
    )
      .split(",")
      .map((v) => v.trim()),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableShutdownHooks();
  return app;
}
