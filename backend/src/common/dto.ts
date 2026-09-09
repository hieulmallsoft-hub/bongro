import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

const Trim = () =>
  Transform(({ value }) => (typeof value === "string" ? value.trim() : value));

export class StudentDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(80) name: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) dob: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(60) group: string;
  @Trim() @Matches(/^[+0-9 .()-]{9,20}$/) phone: string;
}
export class StudentRecordDto extends StudentDto {
  @Matches(/^HS\d{3,10}$/) id: string;
}
export class LessonDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(60) name: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) start: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) end: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(60) court: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(80) coach: string;
}
export class LessonRecordDto extends LessonDto {
  @IsInt() @Min(1) id: number;
}
export class CheckDto {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @Matches(/^HS\d{3,10}$/)
  studentId: string;
}
export class AttendanceRecordDto extends CheckDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) in: string;
  @ValidateIf((o) => o.out !== null) @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) out:
    string | null;
}
export class EventDto {
  @IsString() @IsNotEmpty() @MaxLength(200) text: string;
  @IsISO8601() time: string;
}
export class BackupDto {
  @IsArray()
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => StudentRecordDto)
  students: StudentRecordDto[];
  @IsArray()
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => LessonRecordDto)
  lessons: LessonRecordDto[];
  @IsArray()
  @ArrayMaxSize(100000)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  attendance: AttendanceRecordDto[];
  @IsArray()
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => EventDto)
  events: EventDto[];
}
