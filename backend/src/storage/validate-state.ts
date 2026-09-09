import { BadRequestException } from "@nestjs/common";
import { BackupDto, LessonDto, StudentDto } from "../common/dto";
import { dateKey, validDate } from "../common/time";

export function validateStudent(s: StudentDto) {
  if (!validDate(s.dob) || s.dob > dateKey())
    throw new BadRequestException("Ngày sinh không hợp lệ.");
}
export function validateLesson(l: LessonDto) {
  if (!validDate(l.date) || l.start >= l.end)
    throw new BadRequestException(
      "Ngày học hoặc giờ bắt đầu/kết thúc không hợp lệ.",
    );
}
export function overlaps(a: LessonDto, b: LessonDto) {
  return (
    a.date === b.date &&
    (a.court === b.court || a.coach === b.coach || a.name === b.name) &&
    a.start < b.end &&
    a.end > b.start
  );
}
export function validateState(state: BackupDto) {
  state.students.forEach(validateStudent);
  state.lessons.forEach(validateLesson);
  const ids = new Set(state.students.map((s) => s.id));
  if (
    ids.size !== state.students.length ||
    new Set(state.lessons.map((l) => l.id)).size !== state.lessons.length
  )
    throw new BadRequestException("Bản sao chứa mã bị trùng.");
  const attendanceKeys = new Set<string>();
  for (const a of state.attendance) {
    const key = `${a.studentId}/${a.date}`;
    if (
      !ids.has(a.studentId) ||
      !validDate(a.date) ||
      a.date > dateKey() ||
      (a.out !== null && a.out < a.in) ||
      attendanceKeys.has(key)
    )
      throw new BadRequestException(
        "Lịch sử điểm danh không hợp lệ hoặc bị trùng.",
      );
    attendanceKeys.add(key);
  }
  for (let i = 0; i < state.lessons.length; i++) {
    if (state.lessons.slice(i + 1).some((l) => overlaps(l, state.lessons[i])))
      throw new BadRequestException("Bản sao có lịch tập bị trùng.");
  }
}
