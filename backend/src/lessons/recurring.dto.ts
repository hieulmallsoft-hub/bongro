import { IsInt, Min, Max } from "class-validator";
import { LessonDto } from "../common/dto";
export class RecurringDto extends LessonDto {
  @IsInt() @Min(2) @Max(52) weeks: number;
}
