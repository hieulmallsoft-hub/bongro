import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { StorageService } from "../storage/postgres-storage.service";
import { LessonDto } from "../common/dto";
import { dateKey } from "../common/time";
import { overlaps, validateLesson } from "../storage/validate-state";
import { RecurringDto } from "./recurring.dto";

@Injectable()
export class LessonsService {
  constructor(private readonly storage: StorageService) {}
  async list() {
    return (await this.storage.snapshot()).lessons;
  }
  create(dto: LessonDto) {
    validateLesson(dto);
    if (dto.date < dateKey())
      throw new BadRequestException("Ngày học phải từ hôm nay trở đi.");
    return this.storage.transaction((state) => {
      if (state.lessons.some((l) => overlaps(l, dto)))
        throw new ConflictException(
          "Lịch bị trùng sân, lớp hoặc huấn luyện viên.",
        );
      const lesson = {
        ...dto,
        id: Math.max(0, ...state.lessons.map((l) => l.id)) + 1,
      };
      state.lessons.push(lesson);
      return lesson;
    });
  }
  recurring(dto: RecurringDto) {
    validateLesson(dto);
    if (dto.date < dateKey())
      throw new BadRequestException("Ngày bắt đầu phải từ hôm nay.");
    const { weeks, ...base } = dto;
    return this.storage.transaction((state) => {
      let id = Math.max(0, ...state.lessons.map((l) => l.id));
      const added = [];
      for (let i = 0; i < weeks; i++) {
        const date = new Date(base.date + "T00:00:00Z");
        date.setUTCDate(date.getUTCDate() + i * 7);
        const lesson = {
          ...base,
          date: date.toISOString().slice(0, 10),
          id: ++id,
        };
        if (state.lessons.some((l) => overlaps(l, lesson)))
          throw new ConflictException(
            `Trùng sân, lớp hoặc HLV vào ${lesson.date}. Chưa tạo buổi nào trong chuỗi.`,
          );
        state.lessons.push(lesson);
        added.push(lesson);
      }
      return added;
    });
  }
}
