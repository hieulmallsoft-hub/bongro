import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { StorageModule } from "./storage.module";
import { StorageService } from "./postgres-storage.service";

async function main() {
  const context = await NestFactory.createApplicationContext(StorageModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    console.log(
      JSON.stringify(await context.get(StorageService).inspect(), null, 2),
    );
  } finally {
    await context.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
