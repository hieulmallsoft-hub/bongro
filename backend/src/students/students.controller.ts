import { Body, Controller, Delete, Get, Param, Post, Put, Req } from "@nestjs/common";
import { StudentDto } from "../common/dto";
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
  @Put(":id") update(@Param("id") id: string, @Body() dto: StudentDto) {
    return this.students.update(id, dto);
  }
  @Delete(":id") remove(@Param("id") id: string, @Req() req: any) {
    return this.students.remove(id, req.user);
  }
}
