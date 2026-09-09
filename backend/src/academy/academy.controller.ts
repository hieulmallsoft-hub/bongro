import { Body, Controller, Get, Post } from "@nestjs/common";
import { BackupDto } from "../common/dto";
import { StorageService } from "../storage/postgres-storage.service";
import { validateState } from "../storage/validate-state";

@Controller()
export class AcademyController {
  constructor(private readonly storage: StorageService) {}
  @Get("health") health() {
    return this.storage.health();
  }
  @Get("academy") state() {
    return this.storage.snapshot();
  }
  @Get("dashboard") async dashboard() {
    const state = await this.storage.snapshot();
    const attendance = await this.storage.withTransaction(
      async (c) =>
        (
          await c.query(
            `SELECT a.student_id AS "studentId",a.lesson_id AS "lessonId",a.status,to_char(l.date,'YYYY-MM-DD') AS date,to_char(a.check_in AT TIME ZONE 'Asia/Ho_Chi_Minh','HH24:MI') AS "in",to_char(a.check_out AT TIME ZONE 'Asia/Ho_Chi_Minh','HH24:MI') AS "out" FROM session_attendance a JOIN lessons l ON l.id=a.lesson_id ORDER BY l.date,l.start_time`,
          )
        ).rows,
      false,
    );
    return {
      ...state,
      attendance: attendance.filter((a) =>
        ["present", "late"].includes(a.status),
      ),
      events: [],
    };
  }
  @Get("backup") backup() {
    return this.storage.snapshot();
  }
  @Post("backup/restore") restore(@Body() dto: BackupDto) {
    validateState(dto);
    return this.storage.transaction((state) => {
      Object.assign(state, dto);
      return { success: true };
    });
  }
}
