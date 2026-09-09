import { Body, Controller, Get, Post } from "@nestjs/common";
import { LessonDto } from "../common/dto";
import { LessonsService } from "./lessons.service";
import { RecurringDto } from "./recurring.dto";
@Controller("lessons")
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}
  @Get() list() {
    return this.lessons.list();
  }
  @Post() create(@Body() dto: LessonDto) {
    return this.lessons.create(dto);
  }
  @Post("recurring") recurring(@Body() dto: RecurringDto) {
    return this.lessons.recurring(dto);
  }
}
