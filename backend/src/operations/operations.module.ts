import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AuditInterceptor } from "./audit.interceptor";
import { AuthService, AuthGuard, AuthController } from "./auth";
import { OperationsController } from "./operations.controller";
import { BackupController } from "./backup.controller";
@Module({
  controllers: [AuthController, OperationsController, BackupController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class OperationsModule {}
