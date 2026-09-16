import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { StorageService } from "../storage/postgres-storage.service";
import { StudentDto, StudentProfileDto } from "../common/dto";
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
  saveProfile(dto: StudentProfileDto, user: { username: string }) {
    validateStudent(dto);
    const guardianName = dto.guardianName?.trim() || "";
    const guardianPhone = dto.guardianPhone?.trim() || "";
    const guardianEmail = dto.guardianEmail?.trim() || "";
    if ((guardianName && !guardianPhone) || (!guardianName && guardianPhone))
      throw new BadRequestException("Cần nhập đủ tên và số điện thoại phụ huynh.");
    if (guardianPhone && !/^[+0-9 .()-]{9,20}$/.test(guardianPhone))
      throw new BadRequestException("Số điện thoại phụ huynh không hợp lệ.");
    if (guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail))
      throw new BadRequestException("Email phụ huynh không hợp lệ.");
    return this.storage.withTransaction(async (c) => {
      const classExists = await c.query(
        "SELECT 1 FROM lessons WHERE name=$1 UNION SELECT 1 FROM students WHERE class_name=$1 LIMIT 1",
        [dto.group],
      );
      if (!classExists.rowCount)
        throw new BadRequestException("Lớp chưa tồn tại. Hãy tạo lịch tập cho lớp trước.");
      let id = dto.id;
      let before = null;
      if (id) {
        before = (await c.query("SELECT * FROM students WHERE id=$1", [id])).rows[0];
        if (!before) throw new NotFoundException("Không tìm thấy học sinh.");
        await c.query(
          "UPDATE students SET name=$1,dob=$2,class_name=$3,phone=$4 WHERE id=$5",
          [dto.name, dto.dob, dto.group, dto.phone, id],
        );
      } else {
        const next = Number((await c.query(
          "SELECT COALESCE(max(substring(id from 3)::int),0)+1 AS next FROM students WHERE id ~ '^HS[0-9]+$'",
        )).rows[0].next);
        id = `HS${String(next).padStart(3, "0")}`;
        const position = Number((await c.query("SELECT COALESCE(max(position),-1)+1 AS next FROM students")).rows[0].next);
        await c.query(
          "INSERT INTO students(id,name,dob,class_name,phone,position) VALUES($1,$2,$3,$4,$5,$6)",
          [id, dto.name, dto.dob, dto.group, dto.phone, position],
        );
      }
      if (guardianName) {
        await c.query(
          `INSERT INTO guardians(student_id,name,phone,email,relationship,authorized_pickup)
           VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(student_id) DO UPDATE SET
           name=excluded.name,phone=excluded.phone,email=excluded.email,
           relationship=excluded.relationship,authorized_pickup=excluded.authorized_pickup`,
          [id, guardianName, guardianPhone, guardianEmail, dto.relationship || "", dto.authorizedPickup || ""],
        );
      } else {
        await c.query("DELETE FROM guardians WHERE student_id=$1", [id]);
      }
      await c.query(
        "INSERT INTO audit_log(actor,action,detail) VALUES($1,$2,$3)",
        [user.username, before ? "update_student_profile" : "create_student_profile", JSON.stringify({ id, before, className: dto.group })],
      );
      return { id, name: dto.name, dob: dto.dob, group: dto.group, phone: dto.phone };
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
