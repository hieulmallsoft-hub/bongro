import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { StorageService } from "../storage/postgres-storage.service";
import { User, hashPassword } from "./auth";
import { dateKey, validDate } from "../common/time";
import { PoolClient } from "pg";
const text = (v: unknown, max = 200) => {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    throw new BadRequestException("Thông tin văn bản không hợp lệ.");
  return v.trim();
};
const number = (v: unknown, min = 1) => {
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < min || n > 2000000000)
    throw new BadRequestException("Số không hợp lệ.");
  return n;
};
const date = (v: unknown) => {
  const d = text(v, 10);
  if (!validDate(d)) throw new BadRequestException("Ngày không hợp lệ.");
  return d;
};
const admin = (u: User) => {
  if (u.role !== "admin") throw new ForbiddenException("Chỉ quản trị viên.");
};
export async function audit(
  c: PoolClient,
  u: User,
  action: string,
  detail: unknown,
) {
  await c.query("INSERT INTO audit_log(actor,action,detail) VALUES($1,$2,$3)", [
    u.username,
    action,
    JSON.stringify(detail),
  ]);
}

@Controller("ops")
export class OperationsController {
  constructor(private readonly storage: StorageService) {}
  @Get("overview") async overview(
    @Req() req: any,
    @Query("month") requested?: string,
  ) {
    const u: User = req.user;
    const month = requested || dateKey().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new BadRequestException("Tháng không hợp lệ.");
    const state = await this.storage.snapshot();
    const students = state.students.filter(
      (s) => u.role === "admin" || u.classes.includes(s.group),
    );
    const ids = students.map((s) => s.id);
    return this.storage.withTransaction(
      async (c) => ({
        user: u,
        month,
        students,
        lessons: state.lessons.filter(
          (l) => u.role === "admin" || u.classes.includes(l.name),
        ),
        attendance: (
          await c.query(
            "SELECT student_id,lesson_id,status,check_in,check_out,note FROM session_attendance WHERE student_id=ANY($1::text[])",
            [ids],
          )
        ).rows,
        lessonPhotos: (
          await c.query(
            `SELECT p.lesson_id,p.file_name,p.mime_type,p.uploaded_at,u.name AS uploaded_by
             FROM lesson_photos p JOIN users u ON u.id=p.uploaded_by
             JOIN lessons l ON l.id=p.lesson_id
             WHERE $1='admin' OR l.name=ANY($2::text[])`,
            [u.role, u.classes],
          )
        ).rows,
        reports: (
          await c.query(
            "SELECT * FROM monthly_reports WHERE month=$1 AND student_id=ANY($2::text[])",
            [month, ids],
          )
        ).rows,
        payments:
          u.role === "admin"
            ? (
                await c.query(
                   "SELECT p.id,p.enrollment_id,p.amount,p.paid_at,p.note,p.voided_at,p.void_reason,e.student_id,e.title FROM payments p JOIN enrollments e ON e.id=p.enrollment_id ORDER BY p.paid_at DESC,p.id DESC",
                )
              ).rows
            : [],
        expenses:
          u.role === "admin"
            ? (
                await c.query(
                  `SELECT e.*,u.name AS created_by_name FROM expenses e JOIN users u ON u.id=e.created_by
                   WHERE to_char(e.expense_date,'YYYY-MM')=$1 ORDER BY e.expense_date DESC,e.id DESC`,
                  [month],
                )
              ).rows
            : [],
        guardians:
          u.role === "admin"
            ? (await c.query("SELECT * FROM guardians")).rows
            : [],
        enrollments:
          u.role === "admin"
            ? (
                await c.query(`SELECT e.*,to_char(starts,'YYYY-MM-DD') AS starts,to_char(ends,'YYYY-MM-DD') AS ends,to_char(due,'YYYY-MM-DD') AS due,
        COALESCE((SELECT sum(amount) FROM payments p WHERE p.enrollment_id=e.id AND p.voided_at IS NULL),0)::int AS paid,
        stats.attended,stats.excused,stats.absent,
        CASE WHEN e.sessions=10 THEN 2 WHEN e.sessions=20 THEN 4 WHEN e.sessions=30 THEN 6 ELSE 0 END AS excused_allowance,
        (stats.attended + stats.absent + GREATEST(0,stats.excused-(CASE WHEN e.sessions=10 THEN 2 WHEN e.sessions=20 THEN 4 WHEN e.sessions=30 THEN 6 ELSE 0 END)))::int AS used
        FROM enrollments e
        CROSS JOIN LATERAL (SELECT
          count(*) FILTER (WHERE a.status IN ('present','late'))::int AS attended,
          count(*) FILTER (WHERE a.status='excused')::int AS excused,
          count(*) FILTER (WHERE a.status='absent')::int AS absent
          FROM session_attendance a JOIN lessons l ON l.id=a.lesson_id
          WHERE a.student_id=e.student_id AND l.date BETWEEN e.starts AND e.ends) stats
        ORDER BY e.id DESC`)
              ).rows
            : [],
        leaves: (
          await c.query(
            "SELECT * FROM leave_requests WHERE student_id=ANY($1::text[]) ORDER BY id DESC",
            [ids],
          )
        ).rows,
        users:
          u.role === "admin"
            ? (
                await c.query(
                  "SELECT id,username,name,role,classes,active FROM users ORDER BY id",
                )
              ).rows
            : [],
        deliveries:
          u.role === "admin"
            ? (
                await c.query(
                  "SELECT * FROM report_deliveries WHERE month=$1 ORDER BY recorded_at DESC",
                  [month],
                )
              ).rows
            : [],
        audit:
          u.role === "admin"
            ? (
                await c.query(
                  "SELECT * FROM audit_log ORDER BY id DESC LIMIT 100",
                )
              ).rows
            : [],
      }),
      false,
    );
  }
  @Get("lesson-photo") async lessonPhoto(
    @Req() req: any,
    @Query("lessonId") rawLessonId: string,
    @Res() res: any,
  ) {
    const lessonId = number(rawLessonId);
    const row = await this.storage.withTransaction(async (c) => (
      await c.query(
        `SELECT p.image_data,p.mime_type,l.name FROM lesson_photos p
         JOIN lessons l ON l.id=p.lesson_id WHERE p.lesson_id=$1`,
        [lessonId],
      )
    ).rows[0], false);
    if (!row) throw new NotFoundException("Chưa có ảnh buổi tập.");
    if (req.user.role === "coach" && !req.user.classes.includes(row.name))
      throw new ForbiddenException();
    res.set({ "Content-Type": row.mime_type, "Cache-Control": "private, max-age=300" });
    res.send(row.image_data);
  }
  @Post("lesson-photo") async saveLessonPhoto(@Req() req: any, @Body() b: any) {
    const lessonId = number(b.lessonId);
    const match = typeof b.image === "string" && b.image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw new BadRequestException("Ảnh phải là JPEG, PNG hoặc WebP.");
    const image = Buffer.from(match[2], "base64");
    if (!image.length || image.length > 4 * 1024 * 1024)
      throw new BadRequestException("Ảnh tối đa 4 MB.");
    const fileName = typeof b.fileName === "string" ? b.fileName.slice(0, 160) : "anh-buoi-tap";
    return this.storage.withTransaction(async (c) => {
      const lesson = (await c.query("SELECT name FROM lessons WHERE id=$1", [lessonId])).rows[0];
      if (!lesson) throw new NotFoundException("Không tìm thấy buổi tập.");
      if (req.user.role === "coach" && !req.user.classes.includes(lesson.name))
        throw new ForbiddenException();
      await c.query(
        `INSERT INTO lesson_photos(lesson_id,image_data,mime_type,file_name,uploaded_by)
         VALUES($1,$2,$3,$4,$5) ON CONFLICT(lesson_id) DO UPDATE SET
         image_data=excluded.image_data,mime_type=excluded.mime_type,file_name=excluded.file_name,
         uploaded_by=excluded.uploaded_by,uploaded_at=now()`,
        [lessonId, image, match[1], fileName, req.user.id],
      );
      await audit(c, req.user, "lesson_photo", { lessonId, fileName, bytes: image.length });
      return { success: true };
    });
  }
  @Post("classes/delete") deleteClass(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const name = text(b.name, 60);
    return this.storage.withTransaction(async (c) => {
      const lessons = await c.query("SELECT id FROM lessons WHERE name=$1", [name]);
      if (!lessons.rowCount)
        throw new NotFoundException("Không tìm thấy lớp học.");
      const studentCount = Number((await c.query(
        "SELECT count(*)::int AS count FROM students WHERE class_name=$1",
        [name],
      )).rows[0].count);
      if (studentCount > 0)
        throw new BadRequestException(`Lớp còn ${studentCount} học sinh. Hãy chuyển hoặc bỏ học sinh khỏi lớp trước.`);
      const historyCount = Number((await c.query(
        `SELECT
          (SELECT count(*) FROM session_attendance a JOIN lessons l ON l.id=a.lesson_id WHERE l.name=$1) +
          (SELECT count(*) FROM leave_requests r WHERE
            r.lesson_id IN (SELECT id FROM lessons WHERE name=$1) OR
            r.makeup_lesson_id IN (SELECT id FROM lessons WHERE name=$1)) AS count`,
        [name],
      )).rows[0].count);
      if (historyCount > 0)
        throw new BadRequestException("Lớp đã có lịch sử điểm danh hoặc nghỉ phép nên không thể xóa. Hãy giữ lớp để bảo toàn báo cáo.");
      const deleted = await c.query("DELETE FROM lessons WHERE name=$1 RETURNING id", [name]);
      await audit(c, req.user, "delete_class", { name, deletedLessons: deleted.rowCount });
      return { success: true, deletedLessons: deleted.rowCount };
    });
  }
  @Post("users") async user(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const username = text(b.username, 60);
    if (!/^[a-zA-Z0-9_.-]{3,60}$/.test(username))
      throw new BadRequestException("Tên đăng nhập không hợp lệ.");
    const password = text(b.password, 128);
    if (password.length < 10)
      throw new BadRequestException("Mật khẩu tối thiểu 10 ký tự.");
    const name = text(b.name, 80);
    if (
      !Array.isArray(b.classes) ||
      !b.classes.every((s: unknown) => typeof s === "string" && s.length <= 60)
    )
      throw new BadRequestException("Danh sách lớp không hợp lệ.");
    const hash = await hashPassword(password);
    return this.storage.withTransaction(async (c) => {
      if (
        (await c.query("SELECT 1 FROM users WHERE username=$1", [username]))
          .rowCount
      )
        throw new BadRequestException("Tên đăng nhập đã tồn tại.");
      await c.query(
        "INSERT INTO users(username,name,password_hash,role,classes) VALUES($1,$2,$3,'coach',$4)",
        [username, name, hash, b.classes],
      );
      await audit(c, req.user, "create_coach", {
        username,
        classes: b.classes,
      });
      return { success: true };
    });
  }
  @Post("users/update") async updateUser(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const id = number(b.id);
    if (id === req.user.id)
      throw new BadRequestException("Không khóa tài khoản đang sử dụng.");
    if (
      typeof b.active !== "boolean" ||
      !Array.isArray(b.classes) ||
      !b.classes.every((s: unknown) => typeof s === "string" && s.length <= 60)
    )
      throw new BadRequestException("Thông tin quyền không hợp lệ.");
    return this.storage.withTransaction(async (c) => {
      const result = await c.query(
        "UPDATE users SET active=$1,classes=$2 WHERE id=$3 AND role='coach'",
        [b.active, b.classes, id],
      );
      if (!result.rowCount) throw new NotFoundException();
      await c.query("DELETE FROM sessions WHERE user_id=$1", [id]);
      await audit(c, req.user, "update_coach", {
        id,
        active: b.active,
        classes: b.classes,
      });
      return { success: true };
    });
  }
  @Post("attendance") async attendance(@Req() req: any, @Body() b: any) {
    const studentId = text(b.studentId, 20),
      lessonId = number(b.lessonId);
    const allowed = ["present", "late", "excused", "absent"];
    if (!allowed.includes(b.status) && b.action !== "checkout")
      throw new BadRequestException("Trạng thái không hợp lệ.");
    const note = typeof b.note === "string" ? b.note.slice(0, 1000) : "";
    return this.storage.withTransaction(async (c) => {
      const lesson = (
        await c.query(
          "SELECT *,to_char(date,'YYYY-MM-DD') AS day FROM lessons WHERE id=$1",
          [lessonId],
        )
      ).rows[0];
      const student = (
        await c.query("SELECT * FROM students WHERE id=$1", [studentId])
      ).rows[0];
      if (!lesson || !student) throw new NotFoundException();
      if (req.user.role === "coach" && !req.user.classes.includes(lesson.name))
        throw new ForbiddenException();
      const makeup = (
        await c.query(
          "SELECT 1 FROM leave_requests WHERE student_id=$1 AND makeup_lesson_id=$2 AND status='approved'",
          [studentId, lessonId],
        )
      ).rowCount;
      if (student.class_name !== lesson.name && !makeup)
        throw new BadRequestException(
          "Học sinh không thuộc lớp hoặc lịch học bù.",
        );
      if (lesson.day > dateKey() && b.status !== "excused")
        throw new BadRequestException("Chưa đến ngày học.");
      const old = (
        await c.query(
          "SELECT * FROM session_attendance WHERE student_id=$1 AND lesson_id=$2",
          [studentId, lessonId],
        )
      ).rows[0];
      if (b.action === "checkout") {
        if (!old || !["present", "late"].includes(old.status) || old.check_out)
          throw new BadRequestException("Chưa vào học hoặc đã check-out.");
        await c.query(
          "UPDATE session_attendance SET check_out=now() WHERE student_id=$1 AND lesson_id=$2",
          [studentId, lessonId],
        );
      } else {
        if (old && req.user.role === "coach" && old.status !== b.status)
          throw new ForbiddenException("Nhờ quản trị sửa điểm danh đã ghi.");
        await c.query(
          `INSERT INTO session_attendance(student_id,lesson_id,status,check_in,note) VALUES($1,$2,$3,CASE WHEN $3 IN ('present','late') THEN now() ELSE NULL END,$4)
        ON CONFLICT(student_id,lesson_id) DO UPDATE SET status=excluded.status,note=excluded.note,check_in=CASE WHEN excluded.status IN ('present','late') THEN COALESCE(session_attendance.check_in,now()) ELSE NULL END,check_out=CASE WHEN excluded.status IN ('present','late') THEN session_attendance.check_out ELSE NULL END`,
          [studentId, lessonId, b.status, note],
        );
      }
      await audit(c, req.user, "session_attendance", {
        studentId,
        lessonId,
        status: b.status,
        action: b.action || "mark",
        before: old || null,
      });
      return { success: true };
    });
  }
  @Post("guardians") guardian(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const studentId = text(b.studentId, 20),
      name = text(b.name, 80),
      phone = text(b.phone, 30);
    const email = typeof b.email === "string" ? b.email.trim() : "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new BadRequestException("Email không hợp lệ.");
    return this.storage.withTransaction(async (c) => {
      await c.query(
        `INSERT INTO guardians VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(student_id) DO UPDATE SET name=excluded.name,phone=excluded.phone,email=excluded.email,relationship=excluded.relationship,authorized_pickup=excluded.authorized_pickup`,
        [
          studentId,
          name,
          phone,
          email,
          String(b.relationship || "").slice(0, 80),
          String(b.pickup || "").slice(0, 500),
        ],
      );
      await audit(c, req.user, "update_guardian", { studentId });
      return { success: true };
    });
  }
  @Post("enrollments") enrollment(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const studentId = text(b.studentId, 20),
      title = text(b.title, 100),
      sessions = number(b.sessions),
      fee = number(b.fee, 0),
      starts = date(b.starts),
      ends = date(b.ends),
      due = date(b.due),
      initialPaid = b.initialPaid === undefined || b.initialPaid === "" ? 0 : number(b.initialPaid, 0);
    if (![10, 20, 30].includes(sessions))
      throw new BadRequestException("Chỉ hỗ trợ gói 10, 20 hoặc 30 buổi.");
    if (initialPaid > fee)
      throw new BadRequestException("Số tiền đã đóng không được vượt quá học phí.");
    if (ends < starts)
      throw new BadRequestException("Ngày kết thúc trước ngày bắt đầu.");
    return this.storage.withTransaction(async (c) => {
      if (
        (
          await c.query(
            "SELECT 1 FROM enrollments WHERE student_id=$1 AND starts<=$3::date AND ends>=$2::date",
            [studentId, starts, ends],
          )
        ).rowCount
      )
        throw new BadRequestException("Gói học bị chồng thời hạn.");
      const enrollment = await c.query(
        "INSERT INTO enrollments(student_id,title,sessions,fee,starts,ends,due) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
        [studentId, title, sessions, fee, starts, ends, due],
      );
      if (initialPaid > 0)
        await c.query(
          "INSERT INTO payments(enrollment_id,amount,note) VALUES($1,$2,$3)",
          [enrollment.rows[0].id, initialPaid, "Thanh toán khi đăng ký gói"],
        );
      await audit(c, req.user, "create_enrollment", { studentId, title, fee, initialPaid });
      return { success: true, id: enrollment.rows[0].id };
    });
  }
  @Post("enrollments/update") updateEnrollment(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const id = number(b.id),
      title = text(b.title, 100),
      sessions = number(b.sessions),
      fee = number(b.fee, 0),
      starts = date(b.starts),
      ends = date(b.ends),
      due = date(b.due);
    if (![10, 20, 30].includes(sessions))
      throw new BadRequestException("Chỉ hỗ trợ gói 10, 20 hoặc 30 buổi.");
    if (ends < starts)
      throw new BadRequestException("Ngày kết thúc trước ngày bắt đầu.");
    return this.storage.withTransaction(async (c) => {
      const current = (
        await c.query(
          `SELECT e.*,
           COALESCE((SELECT sum(amount) FROM payments WHERE enrollment_id=e.id AND voided_at IS NULL),0)::int AS paid,
           (SELECT count(*) FILTER (WHERE a.status IN ('present','late')) FROM session_attendance a JOIN lessons l ON l.id=a.lesson_id
            WHERE a.student_id=e.student_id AND l.date BETWEEN e.starts AND e.ends)::int AS attended,
           (SELECT count(*) FILTER (WHERE a.status='absent') FROM session_attendance a JOIN lessons l ON l.id=a.lesson_id
            WHERE a.student_id=e.student_id AND l.date BETWEEN e.starts AND e.ends)::int AS absent,
           (SELECT count(*) FILTER (WHERE a.status='excused') FROM session_attendance a JOIN lessons l ON l.id=a.lesson_id
            WHERE a.student_id=e.student_id AND l.date BETWEEN e.starts AND e.ends)::int AS excused
           FROM enrollments e WHERE e.id=$1`,
          [id],
        )
      ).rows[0];
      if (!current) throw new NotFoundException("Không tìm thấy gói học.");
      if (fee < Number(current.paid))
        throw new BadRequestException("Học phí mới không được thấp hơn số tiền đã thu.");
      const allowance = sessions === 10 ? 2 : sessions === 20 ? 4 : 6;
      const used = Number(current.attended) + Number(current.absent) +
        Math.max(0, Number(current.excused) - allowance);
      if (sessions < used)
        throw new BadRequestException("Số buổi mới không được thấp hơn số buổi đã sử dụng.");
      const overlap = await c.query(
        `SELECT 1 FROM enrollments WHERE student_id=$1 AND id<>$2 AND status<>'cancelled'
         AND starts<=$4::date AND ends>=$3::date`,
        [current.student_id, id, starts, ends],
      );
      if (overlap.rowCount)
        throw new BadRequestException("Gói học bị chồng thời hạn với một gói khác.");
      await c.query(
        `UPDATE enrollments SET title=$1,sessions=$2,fee=$3,starts=$4,ends=$5,due=$6 WHERE id=$7`,
        [title, sessions, fee, starts, ends, due, id],
      );
      await audit(c, req.user, "update_enrollment", {
        id,
        before: current,
        after: { title, sessions, fee, starts, ends, due },
      });
      return { success: true };
    });
  }
  @Post("payments") payment(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const id = number(b.enrollmentId),
      amount = number(b.amount);
    return this.storage.withTransaction(async (c) => {
      const row = (
        await c.query(
          "SELECT fee-COALESCE((SELECT sum(amount) FROM payments WHERE enrollment_id=e.id AND voided_at IS NULL),0) AS owed FROM enrollments e WHERE id=$1 AND status<>'cancelled'",
          [id],
        )
      ).rows[0];
      if (!row || amount > Number(row.owed))
        throw new BadRequestException(
          "Số thu vượt công nợ hoặc không có gói học.",
        );
      await c.query(
        "INSERT INTO payments(enrollment_id,amount,note) VALUES($1,$2,$3)",
        [id, amount, String(b.note || "").slice(0, 500)],
      );
      await audit(c, req.user, "payment", { id, amount });
      return { success: true };
    });
  }
  @Post("payments/void") voidPayment(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const id = number(b.id), reason = text(b.reason, 500);
    return this.storage.withTransaction(async (c) => {
      const result = await c.query(
        "UPDATE payments SET voided_at=now(),void_reason=$1,voided_by=$2 WHERE id=$3 AND voided_at IS NULL",
        [reason, req.user.id, id],
      );
      if (!result.rowCount) throw new BadRequestException("Giao dịch không tồn tại hoặc đã được hủy.");
      await audit(c, req.user, "void_payment", { id, reason });
      return { success: true };
    });
  }
  @Post("expenses") expense(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const allowed = ["court", "coach", "equipment", "utilities", "marketing", "other"];
    if (!allowed.includes(b.category))
      throw new BadRequestException("Nhóm chi phí không hợp lệ.");
    const title = text(b.title, 120), amount = number(b.amount), expenseDate = date(b.expenseDate);
    const note = typeof b.note === "string" ? b.note.trim().slice(0, 500) : "";
    return this.storage.withTransaction(async (c) => {
      const result = await c.query(
        "INSERT INTO expenses(category,title,amount,expense_date,note,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
        [b.category, title, amount, expenseDate, note, req.user.id],
      );
      await audit(c, req.user, "create_expense", { id: result.rows[0].id, category: b.category, title, amount, expenseDate });
      return { success: true, id: result.rows[0].id };
    });
  }
  @Post("expenses/void") voidExpense(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const id = number(b.id), reason = text(b.reason, 500);
    return this.storage.withTransaction(async (c) => {
      const result = await c.query(
        "UPDATE expenses SET voided_at=now(),void_reason=$1,voided_by=$2 WHERE id=$3 AND voided_at IS NULL",
        [reason, req.user.id, id],
      );
      if (!result.rowCount)
        throw new BadRequestException("Khoản chi không tồn tại hoặc đã được hủy.");
      await audit(c, req.user, "void_expense", { id, reason });
      return { success: true };
    });
  }
  @Post("enrollments/status") enrollmentStatus(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const id = number(b.id);
    if (!["active", "completed", "frozen", "cancelled"].includes(b.status))
      throw new BadRequestException("Trạng thái gói không hợp lệ.");
    return this.storage.withTransaction(async (c) => {
      const result = await c.query("UPDATE enrollments SET status=$1 WHERE id=$2", [b.status, id]);
      if (!result.rowCount) throw new NotFoundException("Không tìm thấy gói học.");
      await audit(c, req.user, "enrollment_status", { id, status: b.status });
      return { success: true };
    });
  }
  @Post("leaves") leave(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const studentId = text(b.studentId, 20),
      lessonId = number(b.lessonId),
      reason = text(b.reason, 1000);
    return this.storage.withTransaction(async (c) => {
      const match = await c.query(
        "SELECT 1 FROM students s JOIN lessons l ON l.name=s.class_name WHERE s.id=$1 AND l.id=$2",
        [studentId, lessonId],
      );
      if (!match.rowCount)
        throw new BadRequestException("Học sinh không thuộc lớp.");
      if (
        (
          await c.query(
            "SELECT 1 FROM leave_requests WHERE student_id=$1 AND lesson_id=$2",
            [studentId, lessonId],
          )
        ).rowCount
      )
        throw new BadRequestException("Đã có yêu cầu nghỉ buổi này.");
      await c.query(
        "INSERT INTO leave_requests(student_id,lesson_id,reason) VALUES($1,$2,$3)",
        [studentId, lessonId, reason],
      );
      await audit(c, req.user, "request_leave", { studentId, lessonId });
      return { success: true };
    });
  }
  @Post("leaves/resolve") resolveLeave(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const id = number(b.id);
    if (!["approved", "rejected"].includes(b.status))
      throw new BadRequestException();
    const makeup = b.makeupLessonId ? number(b.makeupLessonId) : null;
    return this.storage.withTransaction(async (c) => {
      const leave = (
        await c.query("SELECT * FROM leave_requests WHERE id=$1", [id])
      ).rows[0];
      if (!leave) throw new NotFoundException();
      if (
        leave.makeup_lesson_id &&
        (
          await c.query(
            "SELECT 1 FROM session_attendance WHERE student_id=$1 AND lesson_id=$2",
            [leave.student_id, leave.makeup_lesson_id],
          )
        ).rowCount
      ) {
        throw new BadRequestException(
          "Buổi học bù đã điểm danh; không thay đổi yêu cầu này.",
        );
      }
      const marked = (
        await c.query(
          "SELECT status FROM session_attendance WHERE student_id=$1 AND lesson_id=$2",
          [leave.student_id, leave.lesson_id],
        )
      ).rows[0];
      if (marked && ["present", "late"].includes(marked.status))
        throw new BadRequestException(
          "Buổi học đã có mặt, không thể duyệt nghỉ.",
        );
      if (makeup) {
        const target = (
          await c.query(
            "SELECT *,to_char(date,'YYYY-MM-DD') AS day FROM lessons WHERE id=$1",
            [makeup],
          )
        ).rows[0];
        if (!target || target.day < dateKey() || makeup === leave.lesson_id)
          throw new BadRequestException("Buổi học bù không hợp lệ.");
        const conflict = await c.query(
          `SELECT 1 FROM lessons l JOIN students s ON s.class_name=l.name WHERE s.id=$1 AND l.id<>$2 AND l.date=$3 AND l.start_time<$5 AND l.end_time>$4`,
          [
            leave.student_id,
            makeup,
            target.day,
            target.start_time,
            target.end_time,
          ],
        );
        if (conflict.rowCount)
          throw new BadRequestException("Học bù trùng lịch học hiện tại.");
        const other = await c.query(
          `SELECT 1 FROM leave_requests r JOIN lessons l ON l.id=r.makeup_lesson_id WHERE r.id<>$1 AND r.student_id=$2 AND r.status='approved' AND l.date=$3 AND l.start_time<$5 AND l.end_time>$4`,
          [
            id,
            leave.student_id,
            target.day,
            target.start_time,
            target.end_time,
          ],
        );
        if (other.rowCount)
          throw new BadRequestException("Trùng lịch học bù khác.");
      }
      await c.query(
        "UPDATE leave_requests SET status=$1,makeup_lesson_id=$2 WHERE id=$3",
        [b.status, b.status === "approved" ? makeup : null, id],
      );
      if (b.status === "approved")
        await c.query(
          "INSERT INTO session_attendance(student_id,lesson_id,status,note) VALUES($1,$2,'excused',$3) ON CONFLICT(student_id,lesson_id) DO UPDATE SET status='excused',check_in=NULL,check_out=NULL,note=excluded.note",
          [leave.student_id, leave.lesson_id, leave.reason],
        );
      else if (leave.status === "approved")
        await c.query(
          "DELETE FROM session_attendance WHERE student_id=$1 AND lesson_id=$2 AND status='excused'",
          [leave.student_id, leave.lesson_id],
        );
      await audit(c, req.user, "resolve_leave", {
        id,
        status: b.status,
        makeup,
      });
      return { success: true };
    });
  }
  @Post("reports/status") reportStatus(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const studentId = text(b.studentId, 20),
      month = text(b.month, 7);
    if (!["submitted", "approved", "draft"].includes(b.status))
      throw new BadRequestException();
    return this.storage.withTransaction(async (c) => {
      const result = await c.query(
        "UPDATE monthly_reports SET status=$1 WHERE student_id=$2 AND month=$3",
        [b.status, studentId, month],
      );
      if (!result.rowCount) throw new NotFoundException();
      await audit(c, req.user, "report_status", {
        studentId,
        month,
        status: b.status,
      });
      return { success: true };
    });
  }
  @Post("reports/sent") sent(@Req() req: any, @Body() b: any) {
    admin(req.user);
    const studentId = text(b.studentId, 20),
      month = text(b.month, 7),
      channel = text(b.channel, 30),
      recipient = text(b.recipient, 200);
    return this.storage.withTransaction(async (c) => {
      if (
        !(
          await c.query(
            "SELECT 1 FROM monthly_reports WHERE student_id=$1 AND month=$2 AND status='approved'",
            [studentId, month],
          )
        ).rowCount
      )
        throw new BadRequestException("Chỉ ghi nhận gửi báo cáo đã duyệt.");
      await c.query(
        "INSERT INTO report_deliveries(student_id,month,channel,recipient,actor) VALUES($1,$2,$3,$4,$5)",
        [studentId, month, channel, recipient, req.user.username],
      );
      await audit(c, req.user, "record_manual_delivery", {
        studentId,
        month,
        channel,
      });
      return { success: true };
    });
  }
}
