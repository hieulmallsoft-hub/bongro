import { Body, Controller, Get, Param, Post, Put } from "@nestjs/common";
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
}
