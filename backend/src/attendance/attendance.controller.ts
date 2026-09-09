import { Body, Controller, Get, Post } from "@nestjs/common";
import { CheckDto } from "../common/dto";
import { AttendanceService } from "./attendance.service";
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}
  @Get() list() {
    return this.attendance.list();
  }
  @Post("check-in") checkIn(@Body() dto: CheckDto) {
    return this.attendance.check(dto.studentId);
  }
  @Post("check-out") checkOut(@Body() dto: CheckDto) {
    return this.attendance.check(dto.studentId, true);
  }
}
