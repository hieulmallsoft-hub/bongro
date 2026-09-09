import { Module } from "@nestjs/common";
import { StorageModule } from "./storage/storage.module";
import { StudentsModule } from "./students/students.module";
import { LessonsModule } from "./lessons/lessons.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { AcademyModule } from "./academy/academy.module";
import { OperationsModule } from "./operations/operations.module";

@Module({
  imports: [
    StorageModule,
    StudentsModule,
    LessonsModule,
    AttendanceModule,
    AcademyModule,
    OperationsModule,
  ],
})
export class AppModule {}
