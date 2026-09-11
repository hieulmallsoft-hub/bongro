import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
} from "@nestjs/common";
import { StorageService } from "../storage/postgres-storage.service";
import { audit } from "./operations.controller";
const tables = [
  "students",
  "lessons",
  "attendance",
  "events",
  "monthly_reports",
  "guardians",
  "enrollments",
  "payments",
  "session_attendance",
  "leave_requests",
  "report_deliveries",
];
@Controller("ops/backup")
export class BackupController {
  constructor(private readonly storage: StorageService) {}
  @Get() download() {
    return this.storage.withTransaction(async (c) => {
      const data: Record<string, unknown> = {};
      for (const table of tables)
        data[table] = (
          await c.query(`SELECT to_jsonb(t) AS row FROM ${table} t`)
        ).rows.map((r) => r.row);
      data.lesson_photos = (
        await c.query(`SELECT p.lesson_id,encode(p.image_data,'base64') AS image_base64,
          p.mime_type,p.file_name,p.uploaded_at,u.username AS uploaded_by
          FROM lesson_photos p JOIN users u ON u.id=p.uploaded_by`)
      ).rows;
      return { version: 4, exportedAt: new Date().toISOString(), data };
    }, false);
  }
  @Post("restore") restore(@Body() body: any, @Req() req: any) {
    if (
      body?.version !== 4 ||
      !body.data ||
      Object.keys(body.data).length !== tables.length + 1 ||
      !tables.every(
        (t) => Array.isArray(body.data[t]) && body.data[t].length <= 100000,
      ) || !Array.isArray(body.data.lesson_photos) || body.data.lesson_photos.length > 10000
    )
      throw new BadRequestException("Bản sao đầy đủ phiên bản 3 không hợp lệ.");
    return this.storage.withTransaction(async (c) => {
      await c.query("DELETE FROM lesson_photos");
      for (const table of [...tables].reverse())
        await c.query(`DELETE FROM ${table}`);
      for (const table of tables) {
        const columns = (
          await c.query(
            "SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1",
            [table],
          )
        ).rows.map((r) => r.column_name);
        for (const row of body.data[table]) {
          if (
            !row ||
            typeof row !== "object" ||
            Object.keys(row).length !== columns.length ||
            !columns.every((k) => Object.hasOwn(row, k))
          )
            throw new BadRequestException("Cột dữ liệu bản sao không hợp lệ.");
        }
        await c.query(
          `INSERT INTO ${table} SELECT * FROM jsonb_populate_recordset(NULL::${table},$1::jsonb)`,
          [JSON.stringify(body.data[table])],
        );
      }
      for (const photo of body.data.lesson_photos) {
        if (!photo || typeof photo !== "object" || typeof photo.image_base64 !== "string")
          throw new BadRequestException("Ảnh trong bản sao không hợp lệ.");
        const uploader = (
          await c.query("SELECT id FROM users WHERE username=$1", [photo.uploaded_by])
        ).rows[0];
        if (!uploader) throw new BadRequestException("Không tìm thấy tài khoản đã tải ảnh.");
        await c.query(
          `INSERT INTO lesson_photos(lesson_id,image_data,mime_type,file_name,uploaded_by,uploaded_at)
           VALUES($1,decode($2,'base64'),$3,$4,$5,$6)`,
          [photo.lesson_id, photo.image_base64, photo.mime_type, photo.file_name, uploader.id, photo.uploaded_at],
        );
      }
      for (const table of [
        "enrollments",
        "payments",
        "leave_requests",
        "report_deliveries",
      ])
        await c.query(
          `SELECT setval(pg_get_serial_sequence('${table}','id'),GREATEST(COALESCE((SELECT MAX(id) FROM ${table}),0),1),EXISTS(SELECT 1 FROM ${table}))`,
        );
      const duplicate = await c.query(
        "SELECT 1 FROM lessons a JOIN lessons b ON a.id<b.id AND a.date=b.date AND (a.name=b.name OR a.court=b.court OR a.coach=b.coach) AND a.start_time<b.end_time AND a.end_time>b.start_time LIMIT 1",
      );
      if (duplicate.rowCount)
        throw new BadRequestException("Bản sao có lịch trùng.");
      await audit(c, req.user, "restore_full_backup", {
        exportedAt: body.exportedAt,
      });
      return { success: true };
    });
  }
}
