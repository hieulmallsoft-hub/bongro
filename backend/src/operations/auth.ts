import {
  BadRequestException,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Post,
  Body,
  Req,
  Res,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { IsOptional, IsString, MinLength, MaxLength, Matches } from "class-validator";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { StorageService } from "../storage/postgres-storage.service";
const scrypt = promisify(scryptCallback);
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function hashPassword(value: string) {
  const salt = randomBytes(16).toString("hex");
  return (
    salt + ":" + ((await scrypt(value, salt, 64)) as Buffer).toString("hex")
  );
}
async function verify(value: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const key = (await scrypt(value, salt, 64)) as Buffer;
  return timingSafeEqual(key, Buffer.from(hash, "hex"));
}
export interface User {
  id: number;
  username: string;
  name: string;
  role: "admin" | "coach";
  classes: string[];
}
export class LoginDto {
  @IsString() @Matches(/^[a-zA-Z0-9_.-]{3,60}$/) username: string;
  @IsString() @MinLength(10) @MaxLength(128) password: string;
}
class SetupDto extends LoginDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsOptional() @IsString() @MaxLength(200) setupToken?: string;
}
class ChangePasswordDto {
  @IsString() @MaxLength(128) currentPassword: string;
  @IsString() @MinLength(10) @MaxLength(128) newPassword: string;
}
class ResetPasswordDto {
  @IsString() @Matches(/^[a-zA-Z0-9_.-]{3,60}$/) username: string;
  @IsString() @MinLength(10) @MaxLength(128) newPassword: string;
}

@Injectable()
export class AuthService {
  private attempts = new Map<string, { count: number; until: number }>();
  constructor(private readonly storage: StorageService) {}
  async ready() {
    return this.storage.withTransaction(
      async (c) => (await c.query("SELECT 1 FROM users LIMIT 1")).rowCount! > 0,
      false,
    );
  }
  async setup(dto: SetupDto) {
    const requiredToken = process.env.SETUP_TOKEN;
    if (requiredToken && dto.setupToken !== requiredToken)
      throw new ForbiddenException("Mã thiết lập quản trị không đúng.");
    const hash = await hashPassword(dto.password);
    return this.storage.withTransaction(async (c) => {
      if ((await c.query("SELECT 1 FROM users LIMIT 1")).rowCount)
        throw new ForbiddenException("Đã có tài khoản quản trị.");
      await c.query(
        "INSERT INTO users(username,name,password_hash,role) VALUES($1,$2,$3,'admin')",
        [dto.username, dto.name, hash],
      );
      return { success: true };
    });
  }
  async login(dto: LoginDto, ip: string) {
    const key = ip;
    const now = Date.now();
    for (const [k, v] of this.attempts)
      if (v.until < now) this.attempts.delete(k);
    const attempt = this.attempts.get(key);
    if (attempt && attempt.count >= 10)
      throw new UnauthorizedException("Thử lại sau 15 phút.");
    const row = await this.storage.withTransaction(
      async (c) =>
        (
          await c.query(
            "SELECT * FROM users WHERE username=$1 AND active=true",
            [dto.username],
          )
        ).rows[0],
      false,
    );
    if (!row || !(await verify(dto.password, row.password_hash))) {
      this.attempts.set(key, {
        count: (attempt?.count || 0) + 1,
        until: attempt?.until || now + 900000,
      });
      throw new UnauthorizedException(
        "Tên đăng nhập hoặc mật khẩu không đúng.",
      );
    }
    this.attempts.delete(key);
    const token = randomBytes(32).toString("hex");
    await this.storage.withTransaction(async (c) => {
      await c.query("DELETE FROM sessions WHERE expires_at<now()");
      await c.query(
        "INSERT INTO sessions VALUES($1,$2,now()+interval '12 hours')",
        [digest(token), row.id],
      );
    });
    return token;
  }
  async user(token: string) {
    return this.storage.withTransaction(
      async (c) =>
        (
          await c.query(
            "SELECT u.id,u.username,u.name,u.role,u.classes FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true",
            [digest(token)],
          )
        ).rows[0] as User | undefined,
      false,
    );
  }
  async logout(token: string) {
    await this.storage.withTransaction(async (c) => {
      await c.query("DELETE FROM sessions WHERE token_hash=$1", [
        digest(token),
      ]);
    });
  }
  async changePassword(user: User, body: ChangePasswordDto) {
    const hash = await hashPassword(body.newPassword);
    return this.storage.withTransaction(async (c) => {
      const row = (
        await c.query("SELECT password_hash FROM users WHERE id=$1", [user.id])
      ).rows[0];
      if (!row || !(await verify(body.currentPassword, row.password_hash)))
        throw new UnauthorizedException("Mật khẩu hiện tại không đúng.");
      await c.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
        hash,
        user.id,
      ]);
      await c.query("DELETE FROM sessions WHERE user_id=$1", [user.id]);
      await c.query(
        "INSERT INTO audit_log(actor,action,detail) VALUES($1,'change_password','{}')",
        [user.username],
      );
      return { success: true };
    });
  }
  async resetPassword(user: User, body: ResetPasswordDto) {
    if (user.role !== "admin")
      throw new ForbiddenException("Chỉ quản trị được đặt lại mật khẩu HLV.");
    const hash = await hashPassword(body.newPassword);
    return this.storage.withTransaction(async (c) => {
      const result = await c.query(
        "UPDATE users SET password_hash=$1 WHERE username=$2 AND role='coach' RETURNING id",
        [hash, body.username],
      );
      if (!result.rowCount)
        throw new BadRequestException("Không tìm thấy tài khoản HLV.");
      await c.query("DELETE FROM sessions WHERE user_id=$1", [
        result.rows[0].id,
      ]);
      await c.query(
        "INSERT INTO audit_log(actor,action,detail) VALUES($1,'reset_coach_password',$2)",
        [user.username, JSON.stringify({ username: body.username })],
      );
      return { success: true };
    });
  }
}
const tokenFrom = (req: any) =>
  String(req.headers.cookie || "")
    .split(";")
    .map((s: string) => s.trim())
    .find((s: string) => s.startsWith("hoopstars_session="))
    ?.slice(18) || "";
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const path = req.path.replace(/^\/api/, "");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin
    ) {
      const allowed = (
        process.env.FRONTEND_ORIGIN ||
        "http://localhost:5173,http://127.0.0.1:5173"
      )
        .split(",")
        .map((s) => s.trim());
      if (!allowed.includes(req.headers.origin))
        throw new ForbiddenException("Nguồn yêu cầu không hợp lệ.");
    }
    if (
      ["/health", "/auth/status", "/auth/login", "/auth/setup"].includes(path)
    )
      return true;
    const user = await this.auth.user(tokenFrom(req));
    if (!user) throw new UnauthorizedException("Vui lòng đăng nhập.");
    req.user = user;
    if (
      user.role === "coach" &&
      !(
        /^\/auth\//.test(path) ||
        /^\/ops\/(overview|attendance|lesson-photo)$/.test(path) ||
        /^\/reports\//.test(path)
      )
    )
      throw new ForbiddenException("Chức năng dành cho quản trị viên.");
    return true;
  }
}
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Get("status") async status() {
    const initialized = await this.auth.ready();
    return { initialized, requiresSetupToken: !initialized && Boolean(process.env.SETUP_TOKEN) };
  }
  @Post("setup") setup(@Body() body: SetupDto) {
    return this.auth.setup(body);
  }
  @Post("login") async login(
    @Body() body: LoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const token = await this.auth.login(body, req.ip);
    res.cookie("hoopstars_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 43200000,
      path: "/",
    });
    return { success: true };
  }
  @Get("me") me(@Req() req: any) {
    return req.user;
  }
  @Post("password") async change(
    @Req() req: any,
    @Body() body: ChangePasswordDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const result = await this.auth.changePassword(req.user, body);
    res.clearCookie("hoopstars_session", { path: "/" });
    return result;
  }
  @Post("reset-password") reset(
    @Req() req: any,
    @Body() body: ResetPasswordDto,
  ) {
    return this.auth.resetPassword(req.user, body);
  }
  @Post("logout") async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    await this.auth.logout(tokenFrom(req));
    res.clearCookie("hoopstars_session", { path: "/" });
    return { success: true };
  }
}
