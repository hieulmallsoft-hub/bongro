# HoopStars Academy

Web quản lý học sinh trung tâm bóng rổ, giao diện tiếng Việt. Frontend và backend là hai ứng dụng trong npm workspaces.

## Quy trình quản lý mới (schema v3)

Dashboard dùng `/api/dashboard` lấy điểm danh theo buổi: số học sinh hôm nay tính theo mã học sinh duy nhất, biểu đồ đếm lượt tham gia buổi. Điểm danh ngày cũ vẫn được giữ để tra cứu/sao lưu, không cộng vào thống kê mới.

Trong **Quản lý học viện → Lịch lặp hằng tuần**, chọn ngày đầu, giờ, sân, HLV và 2–52 tuần. Hệ thống tạo cùng thứ/giờ mỗi tuần. Nếu bất kỳ buổi nào trùng lịch, toàn bộ chuỗi không được lưu.

Mọi tài khoản có mục **Đổi mật khẩu**, cần mật khẩu hiện tại và nhập lại mật khẩu mới. Quản trị có form **Đặt lại mật khẩu HLV** trong mục tài khoản. Đổi/đặt lại mật khẩu hủy toàn bộ phiên của tài khoản đó; người dùng đăng nhập lại. Chưa có khôi phục qua email.

Sau khi khởi động lại, lần đầu mở web sẽ có màn hình tạo tài khoản quản trị (mật khẩu tối thiểu 10 ký tự). Không có tài khoản/mật khẩu mặc định. Các lần sau đăng nhập; mật khẩu lưu dạng scrypt có salt, phiên đăng nhập cookie HttpOnly, hết hạn sau 12 giờ. Khi chạy HTTPS đặt `COOKIE_SECURE=true`. Chỉ khởi tạo quản trị trên máy đang quản lý, trước khi mở truy cập từ bên ngoài.

Nút **Quản lý học viện** ở góc dưới mở các chức năng mới. HLV được đưa thẳng vào màn hình này; quyền được kiểm tra trên API, không chỉ ẩn nút ở giao diện.

- **Tài khoản HLV:** quản trị tạo tài khoản, phân lớp theo đúng tên lớp, đổi lớp phụ trách, khóa/mở khóa. Đổi quyền hoặc khóa sẽ hủy phiên đăng nhập HLV đó. HLV chỉ xem học sinh/lịch của lớp phụ trách, điểm danh và nhận xét; không xem công nợ, toàn bộ phụ huynh hoặc sao lưu.
- **Điểm danh buổi:** chọn buổi tập + học sinh, đánh dấu có mặt/đi muộn/nghỉ phép/vắng, check-out và ghi chú. Quản trị sửa được trạng thái; HLV cần nhờ quản trị sửa trạng thái đã ghi. Dữ liệu ngày cũ được giữ riêng, không tự đoán gán buổi. Báo cáo tháng và gói học chỉ đếm điểm danh theo buổi mới.
- **Học phí:** đăng ký gói theo số buổi, ngày bắt đầu/kết thúc, học phí và hạn thu; ghi nhận thu từng lần và công nợ. Gói của cùng học sinh không chồng thời hạn. Có mặt/đi muộn trừ buổi; nghỉ phép/vắng không trừ. Số buổi còn lại được tính lại từ điểm danh, không thu tiền tự động. Buổi ngoài hạn gói không tính vào gói; chưa tự gia hạn khi bảo lưu.
- **Tra cứu học phí theo học sinh:** danh sách hiển thị tổng phải đóng, đã đóng, còn thiếu và trạng thái của từng em; có tìm kiếm và lọc quá hạn. Chọn **Xem / thu tiền** để xem các kỳ, lịch sử từng lần đóng và xuất biên nhận PDF cho lần thu đó.
- **Phụ huynh:** tên, điện thoại, email, quan hệ và người được phép đón. Chọn học sinh rồi lưu để cập nhật hồ sơ liên hệ.
- **Nghỉ/học bù:** quản trị tạo yêu cầu, duyệt/từ chối; duyệt sẽ ghi nghỉ phép và không trừ buổi. Có thể xếp buổi học bù, kiểm tra trùng lịch; học sinh được điểm danh tại lớp học bù dù khác lớp chính. Không sửa lịch học bù đã điểm danh.
- **Báo cáo tháng:** danh sách chưa nhận xét/chờ duyệt; hiển thị nhắc cuối tháng từ ngày 25 trong trang báo cáo. HLV gửi duyệt, quản trị duyệt; sửa nội dung đưa báo cáo về nháp. PDF chưa duyệt được ghi rõ là bản nháp. Gửi PDF bằng Zalo/email thủ công, sau đó quản trị ghi kênh và người nhận vào lịch sử; hệ thống không tự gửi tin nhắn/email hay xác nhận phụ huynh đã đọc.
- **Sao lưu/nhật ký:** bản sao đầy đủ v3 bao gồm nhận xét, học phí, phụ huynh, nghỉ phép, lịch sử gửi và điểm danh mới. Khôi phục có xác nhận và transaction, lỗi rollback. Tài khoản/phiên đăng nhập và nhật ký không nằm trong bản xuất này và giữ nguyên khi khôi phục. Để sao lưu cả tài khoản và nhật ký dùng pg_dump. Nhật ký hiển thị 100 thao tác gần nhất, gồm tài khoản và thao tác; điểm danh lưu trạng thái trước chỉnh sửa.

Chưa có đặt lại mật khẩu qua email, thanh toán online, thông báo ngoài ứng dụng hoặc kiểm soát sĩ số sân. Trước khi vận hành thật cần kiểm thử thao tác với người dùng, cấu hình HTTPS và sao lưu PostgreSQL định kỳ.

## Cấu trúc

```text
frontend/
  src/app.js            Giao diện, form, dashboard
  src/api.js            HTTP client gọi NestJS
  src/style.css         Giao diện responsive
  vite.config.js        Dev server và proxy /api
  test/                 Kiểm thử HTTP client
backend/
  src/main.ts           Khởi động NestJS
  src/students/         Module học sinh: controller + service
  src/lessons/          Module lịch tập: controller + service
  src/attendance/       Module điểm danh: controller + service
  src/academy/          Tổng quan, sao lưu và khôi phục
  src/common/           DTO validation và thời gian Việt Nam
  src/storage/          Kết nối PostgreSQL, migration và giao dịch SQL
  .env                  DATABASE_URL và cấu hình backend
  data/                 Nguồn SQLite/JSON cũ, giữ nguyên sau khi nhập
  test/                 Kiểm thử tích hợp API
```

Frontend sử dụng JavaScript và Vite, giữ giao diện hiện có. Backend sử dụng NestJS 11 và TypeScript với module, controller, service và `ValidationPipe`. Tham khảo [cấu trúc NestJS](https://docs.nestjs.com/first-steps) và [validation](https://docs.nestjs.com/techniques/validation).

## Chạy dự án

Yêu cầu Node.js 24+, npm và **PostgreSQL**. Backend chỉ sử dụng PostgreSQL; SQLite chỉ được đọc để nhập dữ liệu phiên bản cũ.

Trước khi chạy, tạo database `hoopstars` trên PostgreSQL (qua pgAdmin hoặc `CREATE DATABASE hoopstars;`) và điền vào `backend/.env`:

```dotenv
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/hoopstars
DATABASE_SCHEMA=hoopstars
```

Thay user, mật khẩu, host, port theo PostgreSQL của bạn; URL-encode ký tự đặc biệt trong mật khẩu. Không commit `.env`. Tài khoản cần quyền kết nối database, tạo schema/bảng trong database này. Tại thư mục gốc:

Cũng hỗ trợ `DB_TYPE=postgres`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` khi `DATABASE_URL` trống. Với cách `DB_*`, mật khẩu giữ nguyên, không cần URL-encode. `DATABASE_URL` được ưu tiên nếu có giá trị. Lưu cấu hình vào **backend/.env**, không chỉ sửa `.env.example`.

```powershell
npm.cmd install
npm.cmd run db:status -w backend
npm.cmd start
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001/api
- Kiểm tra backend: http://localhost:3001/api/health

Trong pgAdmin: Databases → hoopstars → Schemas → hoopstars → Tables. Bấm Refresh sau lần migration đầu. Health API trả `{"status":"ok","database":"PostgreSQL"}` khi kết nối được.

Nếu chưa cài PostgreSQL, có thể dùng Docker: cấu hình các biến `POSTGRES_*` trong `backend/.env` rồi chạy `docker compose --env-file backend/.env up -d`. Cổng trong `DATABASE_URL` phải khớp `POSTGRES_PORT`. Không chạy Docker cùng cổng với PostgreSQL đã cài trên máy. Dữ liệu Docker được giữ trong named volume.

Trên Windows dùng `npm.cmd` nếu PowerShell chặn `npm.ps1`. Trên macOS/Linux dùng `npm`.

Chạy riêng trong hai terminal:

```powershell
npm.cmd run dev -w backend
```

```powershell
npm.cmd run dev -w frontend
```

Hoặc `npm.cmd run dev` tại thư mục gốc để chạy cả hai với theo dõi thay đổi. Vite chuyển các yêu cầu `/api` tới backend ở cổng 3001. Nếu backend chưa sẵn sàng khi mở trang, bấm **Thử lại**.

## Chức năng

- Thêm, sửa, tìm kiếm học sinh; ngày sinh, lớp học, điện thoại phụ huynh.
- Xem các lớp và lịch tập; thêm buổi tập theo ngày, giờ, sân và huấn luyện viên.
- Backend từ chối lịch trùng sân, lớp hoặc huấn luyện viên; cho phép hai buổi liền kề.
- Check-in/check-out theo mã học sinh, ghi giờ trên máy chủ theo múi giờ `Asia/Ho_Chi_Minh`. Mỗi học sinh có một bản ghi điểm danh mỗi ngày, chưa tách theo từng buổi tập.
- Chống check-in lặp kể cả khi nhiều yêu cầu đến đồng thời; phải check-in trước khi check-out.
- Dashboard và báo cáo tính từ dữ liệu API; xuất CSV, tải/khôi phục bản sao JSON.
- Làm mới dữ liệu sau thao tác và khi quay lại cửa sổ trình duyệt; chưa cập nhật trực tiếp qua WebSocket.

Lần khởi tạo schema đầu nhập dữ liệu cũ nếu có; nếu không có thì tạo sáu học sinh mẫu (`HS001`–`HS006`) và ba buổi tập. Những lần chạy sau sử dụng PostgreSQL, không tự tạo lại lịch mẫu.

## API

### Báo cáo tháng cho phụ huynh

Trong **Báo cáo**, chọn tháng và học sinh → **Mở báo cáo**. HLV nhập tên, điểm mạnh, nội dung cần cải thiện và mục tiêu tháng tới, rồi lưu nhận xét. Mỗi học sinh/tháng có một bản nhận xét, sửa sẽ cập nhật bản đó. Dữ liệu lưu tại PostgreSQL `hoopstars.monthly_reports` (migration v2).

Nút **Xuất PDF / In** lưu nội dung thay đổi trước, mở bản A4 và cho phép chọn **Lưu dưới dạng PDF**. Chuyên cần tính các buổi có mặt/đi muộn. Người xuất cần kiểm tra trạng thái đã duyệt trước khi gửi phụ huynh.

API: `GET /api/reports/:studentId/:month` và `PUT` cùng đường dẫn, tháng dạng `YYYY-MM`. Body gồm `coach`, `strengths`, `improvements`, `goals`; tên HLV thực tế lấy từ tài khoản đăng nhập. Dùng `/api/ops/backup` và `/api/ops/backup/restore` cho bản sao đầy đủ v3. API backup cũ chỉ dành tương thích dữ liệu lõi phiên bản trước.

| Method     | Đường dẫn                   | Chức năng                               |
| ---------- | --------------------------- | --------------------------------------- |
| GET        | `/api/health`               | Trạng thái API                          |
| GET        | `/api/academy`              | Dữ liệu tổng quan cho frontend          |
| GET / POST | `/api/students`             | Danh sách / thêm học sinh               |
| PUT        | `/api/students/:id`         | Cập nhật đầy đủ thông tin học sinh      |
| GET / POST | `/api/lessons`              | Danh sách / thêm buổi tập               |
| GET        | `/api/attendance`           | Lịch sử điểm danh                       |
| POST       | `/api/attendance/check-in`  | Body: `{"studentId":"HS001"}`           |
| POST       | `/api/attendance/check-out` | Body: `{"studentId":"HS001"}`           |
| GET        | `/api/backup`               | Tải dữ liệu JSON                        |
| POST       | `/api/backup/restore`       | Kiểm tra và thay thế dữ liệu từ bản sao |

Tạo học sinh:

```json
{
  "name": "Nguyễn Minh An",
  "dob": "2013-05-12",
  "group": "U12 Cơ bản",
  "phone": "0901234567"
}
```

Tạo buổi tập với `name`, `date` (`YYYY-MM-DD`), `start` và `end` (`HH:mm`), `court`, `coach`. Ngày học phải từ hôm nay trở đi.

API trả `400` cho dữ liệu sai, `404` khi không có học sinh, `409` khi điểm danh hoặc lịch bị trùng. Giờ điểm danh không nhận từ frontend. Bản sao được kiểm tra kiểu dữ liệu, mã trùng, tham chiếu học sinh và lịch trùng trước khi ghi.

## Cấu hình và dữ liệu

Tham khảo `backend/.env.example` để cấu hình `DATABASE_URL`, `DATABASE_SCHEMA`, cổng, host và CORS. Sao chép `frontend/.env.example` thành `frontend/.env` để đổi `VITE_API_URL` khi frontend gọi trực tiếp một backend khác. Khi đổi cổng backend, đặt `API_PROXY_TARGET` cho Vite tương ứng.

Dữ liệu được lưu trong PostgreSQL qua driver `pg`, connection pool tối đa 10 kết nối. Schema mặc định `hoopstars` có các bảng `students`, `lessons`, `attendance`, `events`, `metadata`, dùng kiểu DATE, TIME và TIMESTAMPTZ. Schema có phiên bản và tự migration khi backend khởi động. Không có fallback sang SQLite khi cấu hình hoặc kết nối lỗi.

Database có khóa ngoại từ điểm danh tới học sinh, khóa duy nhất theo học sinh/ngày, chỉ mục theo ngày và ràng buộc giờ vào/ra. Các thao tác ghi sử dụng SQL có tham số và transaction trên cùng một connection; lỗi rollback toàn bộ. API lấy PostgreSQL advisory lock trước khi đọc/kiểm tra/ghi, chống cấp trùng mã và trùng lịch giữa các instance backend. Kiểm tra trùng lịch chạy tại service trong transaction, không phải trigger SQL. Snapshot sử dụng REPEATABLE READ để các bảng nhất quán. Tham khảo [node-postgres transactions](https://node-postgres.com/features/transactions) và [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html).

API hiện vẫn tải tập dữ liệu để xử lý nghiệp vụ và tuần tự hóa các thao tác ghi trong schema; cần tối ưu truy vấn/phân trang khi số bản ghi hoặc lưu lượng tăng cao. Không sửa trực tiếp dữ liệu qua công cụ SQL trong lúc đang dùng ứng dụng nếu muốn giữ các quy tắc nghiệp vụ của service.

### Nhập dữ liệu hiện có

Trước lần chuyển đổi đầu, dừng backend phiên bản SQLite để không phát sinh dữ liệu mới trong lúc nhập. Khi schema PostgreSQL mới chưa có marker khởi tạo, backend ưu tiên đọc `LEGACY_SQLITE_FILE`, sau đó mới đến `LEGACY_DATA_FILE` nếu không có SQLite. Dữ liệu được kiểm tra và nhập trong một transaction, nguồn cũ giữ nguyên. Nếu nguồn lỗi, backend dừng thay vì tạo dữ liệu mẫu thay thế. Đặt `IMPORT_LEGACY=false` để tạo dữ liệu mẫu thay cho nhập nguồn cũ.

Chỉ nhập **một lần**; những lần sau chỉ dùng PostgreSQL. Schema đã khôi phục về trống cũng không tự nhập lại. Đường dẫn nguồn tương đối tính từ `backend`. Driver `node:sqlite` chỉ được nạp khi đọc nguồn SQLite và có thể hiện ExperimentalWarning trên Node 24; ứng dụng không dùng driver này để lưu dữ liệu mới.

Khởi tạo/kiểm tra database mà không chiếm cổng web:

```powershell
npm.cmd run db:status -w backend
```

Lệnh báo `engine: PostgreSQL`, tên database/schema, phiên bản PostgreSQL và số bản ghi. Lệnh không in mật khẩu hoặc URL kết nối. Nếu chưa có `DATABASE_URL`, cấu hình sai mật khẩu hoặc PostgreSQL chưa chạy, lệnh trả lỗi rõ ràng.

Trong **Cài đặt**, tải bản sao JSON để sao lưu. Chức năng khôi phục cũng nhận bản sao hợp lệ xuất từ phiên bản frontend cũ. Khôi phục thay thế dữ liệu chung sau khi xác nhận trên form. Dữ liệu localStorage cũ không tự động ghi đè dữ liệu máy chủ.

Backend mặc định chỉ lắng nghe trên localhost. Các API nghiệp vụ yêu cầu đăng nhập, riêng health và khởi tạo/đăng nhập được truy cập công khai. Hướng dẫn phân quyền và vận hành ở mục quy trình mới phía trên.

## Build và kiểm thử

```powershell
npm.cmd run build
npm.cmd test
```

Backend biên dịch vào `backend/dist`, frontend vào `frontend/dist`. Kiểm thử tích hợp yêu cầu PostgreSQL thật, dùng `TEST_DATABASE_URL` (ưu tiên) hoặc `DATABASE_URL` từ `backend/.env`, tự tạo và xóa schema ngẫu nhiên `hoopstars_test_*`; không xóa schema ứng dụng. Nên cấu hình database kiểm thử riêng. Các trường hợp gồm validation, thêm/sửa học sinh, check-in đồng thời, check-out, trùng lịch, khôi phục, restart, nhập dữ liệu một lần, hai kết nối ghi đồng thời, khóa ngoại và rollback. Frontend có kiểm thử HTTP client và xử lý lỗi.

Có thể chạy PostgreSQL tạm để kiểm thử bằng `npm.cmd run test:local -w backend`. Lệnh dùng các binary PostgreSQL 18 mặc định trên Windows; đặt `POSTGRES_BIN` nếu ở vị trí khác. PostgreSQL tạm dùng cổng và thư mục riêng, tự dừng và xóa sau kiểm thử, không cần mật khẩu dịch vụ PostgreSQL đang cài.

Để phục vụ bản build frontend, dùng máy chủ static và reverse proxy `/api` tới backend, hoặc đặt `VITE_API_URL` trước khi build và cấu hình CORS. `npm start` hiện phục vụ frontend bằng Vite để phát triển/dùng thử; không phải cấu hình triển khai production.

## Triển khai lên server bằng Docker

Bản production gồm ba container: Nginx phục vụ frontend và chuyển `/api` vào NestJS, backend NestJS, PostgreSQL 18. PostgreSQL chỉ có mạng nội bộ Docker và không công khai cổng 5432. Dữ liệu nằm trong volume `postgres_data`.

Yêu cầu server Linux có Docker Engine, Docker Compose plugin, tối thiểu khoảng 1 GB RAM trống và cổng ứng dụng được firewall cho phép. Trên server:

```bash
git clone <DIA_CHI_REPOSITORY> hoopstars
cd hoopstars
cp .env.production.example .env.production
```

Sửa `.env.production`:

```dotenv
POSTGRES_USER=hoopstars
POSTGRES_PASSWORD=mat_khau_ngau_nhien_dai
POSTGRES_DB=hoopstars
DATABASE_SCHEMA=hoopstars
APP_ORIGIN=http://IP_SERVER:8080
APP_PORT=8080
COOKIE_SECURE=false
SETUP_TOKEN=mot-ma-thiet-lap-rieng-dai-va-kho-doan
```

Khởi động:

```bash
docker compose --env-file .env.production -f compose.prod.yaml up -d --build
docker compose --env-file .env.production -f compose.prod.yaml ps
docker compose --env-file .env.production -f compose.prod.yaml logs --tail=100 backend
```

Mở `http://IP_SERVER:8080`, tạo quản trị viên đầu tiên và đăng nhập. Nếu dùng domain có HTTPS qua reverse proxy, đặt `APP_ORIGIN=https://domain-cua-ban`, `COOKIE_SECURE=true`, và chỉ cho reverse proxy truy cập `APP_PORT`. `APP_ORIGIN` phải giống chính xác địa chỉ trên trình duyệt; nhiều địa chỉ được phân cách bằng dấu phẩy.

`SETUP_TOKEN` chỉ dùng khi tạo quản trị viên đầu tiên. Nhập đúng mã này trên màn hình thiết lập; sau khi đã có admin, mã không còn được dùng cho đăng nhập.

Không đưa `backend/.env` của máy phát triển hoặc `.env.production` lên Git. Mật khẩu PostgreSQL production nên khác mật khẩu máy cá nhân. Sau khi PostgreSQL đã tạo volume lần đầu, đổi `POSTGRES_PASSWORD` trong tệp không tự đổi mật khẩu bên trong database.

### Chuyển dữ liệu đang dùng lên server

Trong máy hiện tại, đăng nhập quản trị → **Quản lý học viện → Sao lưu / nhật ký → Tải bản sao đầy đủ**. Trên server mới, tạo quản trị viên → cùng mục → **Khôi phục**, chọn tệp JSON. Bản sao đầy đủ chuyển học sinh, lịch, điểm danh, học phí, phụ huynh, nghỉ/học bù và báo cáo; tài khoản và nhật ký server mới được giữ riêng.

### Sao lưu PostgreSQL trên server

Tạo bản sao SQL trước khi cập nhật hoặc định kỳ:

```bash
mkdir -p backups
docker compose --env-file .env.production -f compose.prod.yaml exec -T postgres \
  pg_dump -U hoopstars -d hoopstars -Fc > backups/hoopstars-$(date +%F-%H%M).dump
```

Đổi user/database trong lệnh nếu `.env.production` dùng tên khác. Tệp dump chứa dữ liệu nhạy cảm; lưu ở nơi riêng có kiểm soát truy cập. Kiểm tra tệp không rỗng sau khi sao lưu.

Khôi phục SQL là thao tác thay thế dữ liệu; dừng backend, sao lưu trạng thái hiện tại rồi mới thực hiện. Với việc chuyển dữ liệu thông thường, ưu tiên chức năng bản sao đầy đủ trong giao diện vì có kiểm tra định dạng và rollback.

### Cập nhật phiên bản

```bash
git pull
docker compose --env-file .env.production -f compose.prod.yaml up -d --build
docker compose --env-file .env.production -f compose.prod.yaml ps
```

Backend tự chạy migration PostgreSQL khi khởi động. Xem lỗi bằng `docker compose --env-file .env.production -f compose.prod.yaml logs -f backend`. Không chạy `docker compose down -v` vì tùy chọn `-v` xóa volume database.
