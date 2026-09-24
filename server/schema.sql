-- QTalk NextGen Relational Schema

CREATE TABLE IF NOT EXISTS batches (
  batch_id SERIAL PRIMARY KEY,
  batch_code VARCHAR(50) UNIQUE NOT NULL,
  course_name VARCHAR(100) NOT NULL,
  start_date DATE
);

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT','TRAINER','HR','ADMIN','MANAGER')),
  batch_id INT REFERENCES batches(batch_id),
  cgpa NUMERIC(3,2),
  passout_year INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Widen the role CHECK for databases created before the MANAGER role existed.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('STUDENT','TRAINER','HR','ADMIN','MANAGER'));

-- Subjects/modules taught within batches (managed by MANAGER)
CREATE TABLE IF NOT EXISTS subjects (
  subject_id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- Which trainer is assigned to which batch (optionally for a specific subject).
-- Trainers only get access to batches they appear in here.
CREATE TABLE IF NOT EXISTS batch_trainers (
  assignment_id SERIAL PRIMARY KEY,
  batch_id INT NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
  trainer_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  subject_id INT REFERENCES subjects(subject_id) ON DELETE SET NULL,
  assigned_by INT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (batch_id, trainer_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_trainers_trainer ON batch_trainers(trainer_id);
CREATE INDEX IF NOT EXISTS idx_batch_trainers_batch ON batch_trainers(batch_id);

CREATE TABLE IF NOT EXISTS skills (
  skill_id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS student_skills (
  student_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  skill_id INT REFERENCES skills(skill_id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, skill_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  attendance_id SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  batch_id INT REFERENCES batches(batch_id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  present BOOLEAN NOT NULL,
  UNIQUE (student_id, session_date)
);

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS batch_id INT REFERENCES batches(batch_id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS mock_scores (
  mock_id SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  trainer_id INT REFERENCES users(user_id),
  subject VARCHAR(50) NOT NULL,
  score INT NOT NULL,
  max_score INT NOT NULL DEFAULT 100,
  conducted_on DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS job_requirements (
  job_id SERIAL PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL,
  job_profile VARCHAR(100) NOT NULL,
  description TEXT,
  package_lpa NUMERIC(4,1),
  min_cgpa NUMERIC(3,2) DEFAULT 0,
  eligible_passout_year INT,
  min_attendance INT DEFAULT 0,
  min_mock_score INT DEFAULT 0,
  deadline DATE,
  hr_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_skills (
  job_id INT REFERENCES job_requirements(job_id) ON DELETE CASCADE,
  skill_id INT REFERENCES skills(skill_id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE IF NOT EXISTS job_applications (
  application_id SERIAL PRIMARY KEY,
  job_id INT REFERENCES job_requirements(job_id) ON DELETE CASCADE,
  student_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'APPLIED'
    CHECK (status IN ('APPLIED','SHORTLISTED','MOCK_PENDING','SELECTED','REJECTED')),
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (job_id, student_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT,
  job_id INT REFERENCES job_requirements(job_id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  message_id SERIAL PRIMARY KEY,
  sender_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  batch_id INT REFERENCES batches(batch_id),
  receiver_id INT REFERENCES users(user_id),
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK ((batch_id IS NOT NULL) <> (receiver_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS batch_resources (
  resource_id SERIAL PRIMARY KEY,
  batch_id INT REFERENCES batches(batch_id) ON DELETE CASCADE,
  trainer_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  file_url TEXT NOT NULL,
  file_data BYTEA,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE batch_resources ADD COLUMN IF NOT EXISTS file_data BYTEA;
ALTER TABLE batch_resources ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE batch_resources ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

CREATE TABLE IF NOT EXISTS interview_experiences (
  experience_id SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  company_name VARCHAR(100) NOT NULL,
  job_role VARCHAR(100),
  round_type VARCHAR(50) NOT NULL,
  questions_text TEXT NOT NULL,
  difficulty_rating INT CHECK (difficulty_rating BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP VIEW IF EXISTS student_stats;
CREATE VIEW student_stats AS
SELECT u.user_id,
  COALESCE((SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.present) / NULLIF(COUNT(*), 0), 1)
            FROM attendance a WHERE a.student_id = u.user_id), 0) AS attendance_pct,
  COALESCE((SELECT ROUND(AVG(100.0 * m.score / NULLIF(m.max_score, 0)), 1)
            FROM mock_scores m WHERE m.student_id = u.user_id), 0) AS avg_mock_pct
FROM users u WHERE u.role = 'STUDENT';

CREATE INDEX IF NOT EXISTS idx_attendance_batch ON attendance(batch_id, session_date);
CREATE INDEX IF NOT EXISTS idx_messages_batch ON messages(batch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_apps_job ON job_applications(job_id, status);
