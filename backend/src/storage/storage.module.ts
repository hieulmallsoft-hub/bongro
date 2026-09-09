import { Global, Module } from "@nestjs/common";
import { StorageService } from "./postgres-storage.service";

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
