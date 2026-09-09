export const operationsSchema = `
CREATE TABLE users(id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','coach')), classes TEXT[] NOT NULL DEFAULT '{}', active BOOLEAN NOT NULL DEFAULT true);
CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL);
CREATE TABLE session_attendance(student_id TEXT NOT NULL REFERENCES students(id), lesson_id INTEGER NOT NULL REFERENCES lessons(id), status TEXT NOT NULL CHECK(status IN ('present','late','excused','absent')), check_in TIMESTAMPTZ, check_out TIMESTAMPTZ, note TEXT NOT NULL DEFAULT '', PRIMARY KEY(student_id,lesson_id));
CREATE TABLE guardians(student_id TEXT PRIMARY KEY REFERENCES students(id), name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', relationship TEXT NOT NULL DEFAULT '', authorized_pickup TEXT NOT NULL DEFAULT '');
CREATE TABLE enrollments(id SERIAL PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id), title TEXT NOT NULL, sessions INTEGER NOT NULL CHECK(sessions>0), fee INTEGER NOT NULL CHECK(fee>=0), starts DATE NOT NULL, ends DATE NOT NULL, due DATE NOT NULL, CHECK(ends>=starts));
CREATE TABLE payments(id SERIAL PRIMARY KEY, enrollment_id INTEGER NOT NULL REFERENCES enrollments(id), amount INTEGER NOT NULL CHECK(amount>0), paid_at TIMESTAMPTZ NOT NULL DEFAULT now(), note TEXT NOT NULL DEFAULT '');
CREATE TABLE leave_requests(id SERIAL PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id), lesson_id INTEGER NOT NULL REFERENCES lessons(id), reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), makeup_lesson_id INTEGER REFERENCES lessons(id), UNIQUE(student_id,lesson_id));
CREATE UNIQUE INDEX unique_makeup_student ON leave_requests(student_id,makeup_lesson_id) WHERE makeup_lesson_id IS NOT NULL;
ALTER TABLE monthly_reports ADD COLUMN status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved'));
CREATE TABLE report_deliveries(id SERIAL PRIMARY KEY, student_id TEXT NOT NULL, month TEXT NOT NULL, channel TEXT NOT NULL, recipient TEXT NOT NULL, actor TEXT NOT NULL, recorded_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE audit_log(id BIGSERIAL PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, detail JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
`;
