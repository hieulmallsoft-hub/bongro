import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { StorageService } from "../storage/postgres-storage.service";
import { dateKey, timeKey } from "../common/time";

@Injectable()
export class AttendanceService {
  constructor(private readonly storage: StorageService) {}
  async list() {
    return (await this.storage.snapshot()).attendance;
  }
  check(studentId: string, out = false) {
    return this.storage.transaction((state) => {
      const student = state.students.find((s) => s.id === studentId);
      if (!student) throw new NotFoundException("Không tìm thấy mã học sinh.");
      const date = dateKey(),
        time = timeKey();
      let record = state.attendance.find(
        (a) => a.studentId === studentId && a.date === date,
      );
      if (out) {
        if (!record)
          throw new ConflictException("Học sinh chưa check-in hôm nay.");
        if (record.out)
          throw new ConflictException("Học sinh đã check-out hôm nay.");
        record.out = time;
      } else {
        if (record)
          throw new ConflictException("Học sinh đã check-in hôm nay.");
        record = { studentId, date, in: time, out: null };
        state.attendance.push(record);
      }
      state.events.unshift({
        text: student.name + (out ? " đã check-out" : " đã check-in"),
        time: new Date().toISOString(),
      });
      state.events = state.events.slice(0, 1000);
      return record;
    });
  }
}
