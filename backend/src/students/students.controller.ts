import { Body, Controller, Delete, Get, Param, Post, Put, Req } from "@nestjs/common";
import { StudentDto, StudentProfileDto } from "../common/dto";
import { StudentsService } from "./students.service";

@Controller("students")
export class StudentsController {
  constructor(private readonly students: StudentsService) {}
  @Get() list() {
    return this.students.list();
  }
  @Post() create(@Body() dto: StudentDto) {
    return this.students.create(dto);
  }
  @Post("profile") saveProfile(@Body() dto: StudentProfileDto, @Req() req: any) {
    return this.students.saveProfile(dto, req.user);
  }
  @Put(":id") update(@Param("id") id: string, @Body() dto: StudentDto) {
    return this.students.update(id, dto);
  }
  @Post(":id/unassign") unassign(@Param("id") id: string, @Req() req: any) {
    return this.students.unassign(id, req.user);
  }
  @Post(":id/assign") assign(
    @Param("id") id: string,
    @Body() body: { className?: string },
    @Req() req: any,
  ) {
    return this.students.assign(id, body.className, req.user);
  }
  @Delete(":id") remove(@Param("id") id: string, @Req() req: any) {
    return this.students.remove(id, req.user);
  }
}
