import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { mergeMap } from "rxjs/operators";
import { StorageService } from "../storage/postgres-storage.service";
import { audit } from "./operations.controller";
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly storage: StorageService) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    if (
      !req.user ||
      ["GET", "HEAD", "OPTIONS"].includes(req.method) ||
      req.path.includes("/ops/") ||
      req.path.includes("/auth/")
    )
      return next.handle();
    return next.handle().pipe(
      mergeMap(async (result) => {
        await this.storage.withTransaction(async (c) =>
          audit(c, req.user, req.method + " " + req.path, {
            params: req.params,
          }),
        );
        return result;
      }),
    );
  }
}
