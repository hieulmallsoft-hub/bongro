import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Req,
  ForbiddenException,
  Post,
} from "@nestjs/common";
import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";
import { StorageService } from "../storage/postgres-storage.service";

class ReportParams {
  @Matches(/^HS\d{3,10}$/) studentId: string;
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month: string;
}
class ReportBody {
  @IsString() @IsNotEmpty() @MaxLength(80) coach: string;
  @IsString() @MaxLength(4000) strengths: string;
  @IsString() @MaxLength(4000) improvements: string;
  @IsString() @MaxLength(4000) goals: string;
}
@Controller("reports")
export class ReportsController {
  constructor(private readonly storage: StorageService) {}
  @Get(":studentId/:month")
  async get(@Param() params: ReportParams, @Req() req: any) {
    const state = await this.storage.snapshot();
    const student = state.students.find((s) => s.id === params.studentId);
    if (!student) throw new NotFoundException("Không tìm thấy học sinh.");
    if (req.user.role === "coach" && !req.user.classes.includes(student.group))
      throw new ForbiddenException();
    const attendance = await this.storage.withTransaction(
      async (c) =>
        (
          await c.query(
            "SELECT a.* FROM session_attendance a JOIN lessons l ON l.id=a.lesson_id WHERE a.student_id=$1 AND to_char(l.date,'YYYY-MM')=$2 AND a.status IN ('present','late')",
            [params.studentId, params.month],
          )
        ).rows,
      false,
    );
    return {
      student,
      month: params.month,
      attendance,
      report: await this.storage.report(params.studentId, params.month),
    };
  }
  @Put(":studentId/:month")
  async save(
    @Param() params: ReportParams,
    @Body() body: ReportBody,
    @Req() req: any,
  ) {
    const state = await this.storage.snapshot();
    if (!state.students.some((s) => s.id === params.studentId))
      throw new NotFoundException("Không tìm thấy học sinh.");
    if (
      req.user.role === "coach" &&
      !req.user.classes.includes(
        state.students.find((s) => s.id === params.studentId)!.group,
      )
    )
      throw new ForbiddenException();
    body.coach = req.user.name;
    return this.storage.saveReport(params.studentId, params.month, body);
  }
  @Post(":studentId/:month/submit") async submit(
    @Param() p: ReportParams,
    @Req() req: any,
  ) {
    await this.get(p, req);
    return this.storage.withTransaction(async (c) => {
      const result = await c.query(
        "UPDATE monthly_reports SET status='submitted' WHERE student_id=$1 AND month=$2 AND status='draft'",
        [p.studentId, p.month],
      );
      if (!result.rowCount) throw new NotFoundException("Chưa có bản nháp.");
      return { success: true };
    });
  }
}
