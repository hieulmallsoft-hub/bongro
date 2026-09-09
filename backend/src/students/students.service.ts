import { Injectable, NotFoundException } from "@nestjs/common";
import { StorageService } from "../storage/postgres-storage.service";
import { StudentDto } from "../common/dto";
import { validateStudent } from "../storage/validate-state";

@Injectable()
export class StudentsService {
  constructor(private readonly storage: StorageService) {}
  async list() {
    return (await this.storage.snapshot()).students;
  }
  create(dto: StudentDto) {
    validateStudent(dto);
    return this.storage.transaction((state) => {
      const next =
        Math.max(0, ...state.students.map((s) => Number(s.id.slice(2)))) + 1;
      const student = { ...dto, id: `HS${String(next).padStart(3, "0")}` };
      state.students.push(student);
      return student;
    });
  }
  update(id: string, dto: StudentDto) {
    validateStudent(dto);
    return this.storage.transaction((state) => {
      const student = state.students.find((s) => s.id === id);
      if (!student) throw new NotFoundException("Không tìm thấy học sinh.");
      Object.assign(student, dto);
      return student;
    });
  }
}
