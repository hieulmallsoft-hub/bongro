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
  remove(id: string, user: { username: string; role: string }) {
    if (!/^HS\d{3,10}$/.test(id))
      throw new NotFoundException("Không tìm thấy học sinh.");
    return this.storage.withTransaction(async (c) => {
      if (user.role !== "admin")
        throw new NotFoundException("Không tìm thấy học sinh.");
      const student = (await c.query("SELECT name FROM students WHERE id=$1", [id])).rows[0];
      if (!student) throw new NotFoundException("Không tìm thấy học sinh.");
      await c.query("DELETE FROM report_deliveries WHERE student_id=$1", [id]);
      await c.query("DELETE FROM monthly_reports WHERE student_id=$1", [id]);
      await c.query("DELETE FROM payments WHERE enrollment_id IN (SELECT id FROM enrollments WHERE student_id=$1)", [id]);
      await c.query("DELETE FROM enrollments WHERE student_id=$1", [id]);
      await c.query("DELETE FROM leave_requests WHERE student_id=$1", [id]);
      await c.query("DELETE FROM session_attendance WHERE student_id=$1", [id]);
      await c.query("DELETE FROM guardians WHERE student_id=$1", [id]);
      await c.query("DELETE FROM attendance WHERE student_id=$1", [id]);
      await c.query("DELETE FROM students WHERE id=$1", [id]);
      await c.query(
        "INSERT INTO audit_log(actor,action,detail) VALUES($1,'delete_student',$2)",
        [user.username, JSON.stringify({ id, name: student.name })],
      );
      return { success: true };
    });
  }
}
