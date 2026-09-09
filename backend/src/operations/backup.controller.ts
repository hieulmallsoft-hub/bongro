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
      return { version: 3, exportedAt: new Date().toISOString(), data };
    }, false);
  }
  @Post("restore") restore(@Body() body: any, @Req() req: any) {
    if (
      body?.version !== 3 ||
      !body.data ||
      Object.keys(body.data).length !== tables.length ||
      !tables.every(
        (t) => Array.isArray(body.data[t]) && body.data[t].length <= 100000,
      )
    )
      throw new BadRequestException("Bản sao đầy đủ phiên bản 3 không hợp lệ.");
    return this.storage.withTransaction(async (c) => {
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
