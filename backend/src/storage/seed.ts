import { BackupDto } from "../common/dto";
import { dateKey } from "../common/time";

export const seed = (): BackupDto => ({
  students: [
    ["HS001", "Trần Gia Bảo", "2012-03-12", "U14 Cơ bản", "0901234567"],
    ["HS002", "Nguyễn Minh Khang", "2013-07-20", "U12 Nâng cao", "0912345678"],
    ["HS003", "Lê Hoàng Nam", "2011-01-05", "U16 Chuyên sâu", "0923456789"],
    ["HS004", "Phạm Tuấn Anh", "2014-09-18", "U12 Cơ bản", "0934567890"],
    ["HS005", "Vũ Đức Long", "2012-11-27", "U14 Nâng cao", "0945678901"],
    ["HS006", "Đặng Minh Anh", "2013-04-10", "U12 Cơ bản", "0956789012"],
  ].map(([id, name, dob, group, phone]) => ({ id, name, dob, group, phone })),
  lessons: [
    {
      id: 1,
      name: "U12 Cơ bản",
      date: dateKey(),
      start: "15:00",
      end: "16:30",
      court: "Sân 1",
      coach: "Trần Quốc Huy",
    },
    {
      id: 2,
      name: "U14 Nâng cao",
      date: dateKey(),
      start: "17:00",
      end: "18:30",
      court: "Sân 2",
      coach: "Lê Minh Tuấn",
    },
    {
      id: 3,
      name: "U16 Chuyên sâu",
      date: dateKey(),
      start: "18:30",
      end: "20:00",
      court: "Sân 1",
      coach: "Nguyễn Hoàng Sơn",
    },
  ],
  attendance: [],
  events: [],
});
