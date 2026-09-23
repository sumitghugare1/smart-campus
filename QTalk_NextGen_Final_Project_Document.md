# QTalk NextGen
### Smart Campus Communication and Placement Platform

**Project type:** Full-stack group project (SQL batch)
**Team:** [Member 1], [Member 2], [Member 3]
**Batch / Branch:** [Batch code], [Branch name]
**Trainer:** [Trainer name]

---

## 1. Executive Summary

QTalk NextGen extends an institute communication app into a structured communication and placement platform. Conventional campus chat apps keep everything in unstructured message threads: job requirements, study material, interview questions, and status updates all get buried. QTalk NextGen turns that chat traffic into relational data, so a database can do the work that people currently do by hand.

**Core idea:** when HR posts a job, the system checks every student against the job's criteria using SQL, notifies only the eligible students, tracks applications on a pipeline board, and shows each student their status automatically.

---

## 2. Problem Statement

| # | Problem in the current system | Effect |
|---|---|---|
| 1 | Job requirements are posted as raw chat text | Students must read long threads to check eligibility; many miss drives or apply when ineligible |
| 2 | Notifications go to everyone | Students ignore alerts, and HR cannot tell who saw a post |
| 3 | Students repeatedly message HR for status | HR inboxes are cluttered, and status is unclear |
| 4 | Interview questions live in personal chats | Seniors' knowledge is lost every batch |
| 5 | PDFs and code are shared in chat feeds | Old material is hard to find |

---

## 3. Existing Solutions and Our Difference

| Existing option | What it does well | Gap |
|---|---|---|
| WhatsApp groups | Fast, familiar | No roles, no structure, no eligibility, no tracking |
| Current QTalk (class app) | Batch communication with trainers and staff | Communication only; requirements are still free text |
| Job portals (for example Naukri Campus) | Large job listings | Built for the open market, not tied to an institute's own attendance, mock scores, or batch data |
| Spreadsheets | Flexible | Manual, error-prone, no notifications |

*(Competitor descriptions are based on general knowledge; confirm current features before presenting.)*

**Our difference:** structured job cards with an automatic eligibility engine, targeted notifications, a status pipeline, and a searchable interview and resource library, all driven by the institute's own student data.

---

## 4. Proposed Solution and Features

### 4.1 User roles
- **Student:** profile, job feed with eligibility, apply, track status, chat, resources, interview bank, notifications.
- **Trainer:** batch chat, direct messages, upload resources, mark attendance, enter mock scores, view batch readiness.
- **HR:** create structured job cards, view eligible students, manage the Kanban pipeline.
- **Manager:** create batches and subjects, manage Trainer/HR accounts, assign Trainers to batches, and place students into batches.
- **Admin / Counselor:** analytics across batches.

### 4.2 Core modules
1. **Authentication and roles:** JWT login, role-protected routes.
2. **Structured job requirement cards:** HR sets minimum CGPA, passout year, required skills, minimum attendance %, and minimum mock score.
3. **Eligibility engine:** each student sees **Eligible** or **Ineligible with the exact reason** (for example, "attendance 68%, required 75%").
4. **Targeted notifications:** only eligible students are notified. Read and unread status is tracked.
5. **Placement pipeline:** APPLIED -> SHORTLISTED -> MOCK_PENDING -> SELECTED / REJECTED. One HR update refreshes the student's dashboard.
6. **Chat:** batch group chat and trainer-student direct messages.
7. **Resource hub:** trainers upload PDFs tagged by module; students filter by module.
8. **Interview intelligence repository:** experiences tagged by company, role, round type, and difficulty; searchable.
9. **Trainer readiness view:** attendance and mock average per student with an at-risk flag.
10. **Admin analytics:** placements per batch, application funnel, average attendance, and most-asked interview rounds.

### 4.3 Core workflow
```
HR creates job card
      |
Eligibility SQL runs against all students
      |
Eligible students get a notification (others see the reason they are ineligible)
      |
Student applies (server re-checks eligibility)
      |
HR moves the candidate along the Kanban pipeline
      |
Student dashboard and notifications update
```

---

## 5. System Architecture and Technology

| Layer | Technology |
|---|---|
| Frontend | React (Vite), CSS |
| Backend | Node.js, Express (REST APIs) |
| Database | PostgreSQL hosted on Neon |
| Authentication | JWT, bcrypt password hashing, role-based middleware |
| File upload | multer (stored in `/uploads`) |
| Live updates | Client polling every 5 seconds |

**Why PostgreSQL on Neon:** managed Postgres shared by the whole team with no local setup, and database branching gives a safe backup copy before the demo.

**Security measures:** hashed passwords, JWT sessions, role checks on every route, parameterized queries only, and server-side re-verification of eligibility at apply time.

**Project structure**
```
qtalk-nextgen/
  server/  index.js, db.js, schema.sql, seed.sql, middleware/auth.js, routes/*
  client/  src/pages, src/components, src/api.js
```

**Database connection (Neon)**
```js
const { Pool } = require('pg');
require('dotenv').config();
module.exports = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```

---

## 6. Database Design

### 6.1 Entities
batches, users, skills, student_skills, attendance, mock_scores, job_requirements, job_skills, job_applications, notifications, messages, batch_resources, interview_experiences, plus the view `student_stats`.

### 6.2 Schema
```sql
CREATE TABLE batches (
  batch_id SERIAL PRIMARY KEY,
  batch_code VARCHAR(50) UNIQUE NOT NULL,
  course_name VARCHAR(100) NOT NULL,
  start_date DATE
);

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT','TRAINER','HR','ADMIN')),
  batch_id INT REFERENCES batches(batch_id),
  cgpa NUMERIC(3,2),
  passout_year INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skills (
  skill_id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE student_skills (
  student_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  skill_id INT REFERENCES skills(skill_id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, skill_id)
);

CREATE TABLE attendance (
  attendance_id SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  present BOOLEAN NOT NULL,
  UNIQUE (student_id, session_date)
);

CREATE TABLE mock_scores (
  mock_id SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  trainer_id INT REFERENCES users(user_id),
  subject VARCHAR(50) NOT NULL,
  score INT NOT NULL,
  max_score INT NOT NULL DEFAULT 100,
  conducted_on DATE DEFAULT CURRENT_DATE
);

CREATE TABLE job_requirements (
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

CREATE TABLE job_skills (
  job_id INT REFERENCES job_requirements(job_id) ON DELETE CASCADE,
  skill_id INT REFERENCES skills(skill_id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE job_applications (
  application_id SERIAL PRIMARY KEY,
  job_id INT REFERENCES job_requirements(job_id) ON DELETE CASCADE,
  student_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'APPLIED'
    CHECK (status IN ('APPLIED','SHORTLISTED','MOCK_PENDING','SELECTED','REJECTED')),
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (job_id, student_id)
);

CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(150) NOT NULL,
  body TEXT,
  job_id INT REFERENCES job_requirements(job_id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  message_id SERIAL PRIMARY KEY,
  sender_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  batch_id INT REFERENCES batches(batch_id),
  receiver_id INT REFERENCES users(user_id),
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK ((batch_id IS NOT NULL) <> (receiver_id IS NOT NULL))
);

CREATE TABLE batch_resources (
  resource_id SERIAL PRIMARY KEY,
  batch_id INT REFERENCES batches(batch_id) ON DELETE CASCADE,
  trainer_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  file_url TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interview_experiences (
  experience_id SERIAL PRIMARY KEY,
  student_id INT REFERENCES users(user_id) ON DELETE CASCADE,
  company_name VARCHAR(100) NOT NULL,
  job_role VARCHAR(100),
  round_type VARCHAR(50) NOT NULL,
  questions_text TEXT NOT NULL,
  difficulty_rating INT CHECK (difficulty_rating BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE VIEW student_stats AS
SELECT u.user_id,
  COALESCE((SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.present) / COUNT(*), 1)
            FROM attendance a WHERE a.student_id = u.user_id), 0) AS attendance_pct,
  COALESCE((SELECT ROUND(AVG(100.0 * m.score / m.max_score), 1)
            FROM mock_scores m WHERE m.student_id = u.user_id), 0) AS avg_mock_pct
FROM users u WHERE u.role = 'STUDENT';

CREATE INDEX idx_messages_batch ON messages(batch_id, created_at);
CREATE INDEX idx_notif_user ON notifications(user_id, is_read);
CREATE INDEX idx_apps_job ON job_applications(job_id, status);
```

### 6.3 Key query: eligibility engine
```sql
SELECT u.user_id, u.full_name,
  (u.cgpa >= j.min_cgpa)                     AS cgpa_ok,
  (u.passout_year = j.eligible_passout_year) AS year_ok,
  (s.attendance_pct >= j.min_attendance)     AS attendance_ok,
  (s.avg_mock_pct  >= j.min_mock_score)      AS mock_ok,
  NOT EXISTS (
    SELECT 1 FROM job_skills js
    WHERE js.job_id = j.job_id
      AND js.skill_id NOT IN (SELECT ss.skill_id FROM student_skills ss
                              WHERE ss.student_id = u.user_id)
  )                                          AS skills_ok
FROM users u
JOIN student_stats s ON s.user_id = u.user_id
CROSS JOIN job_requirements j
WHERE j.job_id = $1 AND u.role = 'STUDENT';
```
A student is eligible only when all five flags are true. Each false flag becomes the reason shown to the student.

### 6.4 Analytics queries (admin dashboard)
```sql
-- Placements per batch
SELECT b.batch_code,
       COUNT(DISTINCT s.user_id) AS students,
       COUNT(DISTINCT a.student_id) FILTER (WHERE a.status = 'SELECTED') AS placed
FROM batches b
JOIN users s ON s.batch_id = b.batch_id AND s.role = 'STUDENT'
LEFT JOIN job_applications a ON a.student_id = s.user_id
GROUP BY b.batch_code;

-- Application funnel
SELECT status, COUNT(*) FROM job_applications GROUP BY status;

-- Average attendance per batch
SELECT b.batch_code, ROUND(AVG(st.attendance_pct), 1) AS avg_attendance
FROM student_stats st
JOIN users u ON u.user_id = st.user_id
JOIN batches b ON b.batch_id = u.batch_id
GROUP BY b.batch_code;

-- Who has not opened a job notification yet (HR read tracking)
SELECT u.full_name
FROM notifications n JOIN users u ON u.user_id = n.user_id
WHERE n.job_id = $1 AND n.is_read = FALSE;
```

---

## 7. API Summary

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Manager | `GET/POST /api/manager/batches`, `GET/POST /api/manager/subjects`, `GET/POST /api/manager/staff`, `POST/DELETE /api/manager/batch-trainers`, `GET/POST /api/manager/students`, `PATCH /api/manager/students/:id/batch` |
| Jobs | `POST /api/jobs` (HR), `GET /api/jobs` (student, with eligibility), `GET /api/jobs/:id/eligible` (HR) |
| Applications | `POST /api/jobs/:id/apply`, `GET /api/jobs/:id/applications`, `PATCH /api/applications/:id/status`, `GET /api/my/applications` |
| Notifications | `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `GET /api/jobs/:id/read-stats` |
| Chat | `GET /api/messages`, `POST /api/messages` |
| Resources | `POST /api/resources`, `GET /api/resources?category=` |
| Interviews | `POST /api/interviews`, `GET /api/interviews?company=&round=&difficulty=` |
| Trainer | `POST /api/attendance`, `POST /api/mocks`, `GET /api/batches/:id/readiness` |
| Analytics | `GET /api/analytics/*` |

---

## 8. Revenue Model

The product is built for institutes that run placement programs. Amounts below are illustrative assumptions for the pitch, not market-tested figures.

| Stream | Who pays | How |
|---|---|---|
| Branch subscription | Institute branch | Monthly fee scaled by student count |
| Recruiter access (later phase) | Companies | Fee for searching verified candidate profiles (trainer-signed scores, attendance) |
| Head-office analytics (later phase) | Multi-branch owners | Consolidated dashboard across branches |

**Why an institute pays:** placement numbers drive admissions. The platform saves HR and trainers hours of manual filtering, prevents missed drives, and produces measurable placement data.

---

## 9. Implementation Plan (3 Days)

| Day | Focus | Done when |
|---|---|---|
| **Day 1** | Neon setup, schema and seed data, auth with roles, job creation, eligibility query, notification fan-out, base frontend layout | HR creates a job and only eligible seeded students receive notifications |
| **Day 2** | Student job feed with reasons, apply flow, Kanban pipeline, status notifications, chat, resource hub | The full core loop runs in the browser |
| **Day 3** | Interview bank, trainer readiness, admin charts, feature freeze, bug fixes, clean reseed, rehearsal | The demo script runs error-free twice in a row |

**Team split:** Backend and database, frontend core, and supporting modules (chat, resources, interviews, analytics). The backend owner publishes the API list first so the others can build against it.

**Cut order if time is short:** analytics, then readiness page, then interview bank. The core loop, chat, and resource hub are never cut.

---

## 10. Demo Script (about 5 minutes)

1. State the problem: requirements buried in chat, no idea who saw what.
2. Log in as **HR**, create a job (min CGPA 7.0, 2026 passout, skill SQL, attendance 75%).
3. Show the eligible list and the SQL behind it.
4. Log in as an **eligible student**: notification arrives, the job shows "Eligible".
5. Log in as an **ineligible student**: no notification, the job shows the exact reason.
6. Student applies. HR moves the candidate on the Kanban board.
7. Student dashboard shows the new status.
8. Trainer uploads a PDF, student filters by module; show the interview bank search.
9. Admin dashboard: SQL-driven charts.
10. Close: "Every decision you saw was a SQL query, not manual filtering."

---

## 11. Expected Questions and Answers

**Is there a competitor?**
Yes: WhatsApp groups, the existing QTalk, and job portals. WhatsApp has no roles or tracking, QTalk handles communication only, and portals do not use the institute's own attendance and mock data. We add automatic eligibility, targeted alerts, and a status pipeline.

**What is different in yours?**
We convert unstructured chat posts into structured data, so the database does the filtering instead of people.

**Why should an institute use it?**
It saves placement-team time, stops students missing drives, and gives management measurable placement data.

**How will you earn revenue?**
Per-branch subscription now; recruiter access and multi-branch analytics later.

**Why SQL and a relational database?**
Eligibility, funnel analytics, and read tracking are joins, aggregates, and filters over related tables. That is exactly what a relational database is built for.

**Is it real-time?**
Dashboards refresh by polling every few seconds. A production version would use WebSockets.

**How is student data protected?**
Hashed passwords, JWT authentication, role checks on every route, parameterized queries, and eligibility re-verified on the server.

**Isn't this just copying QTalk?**
We keep its communication base and extend it. The eligibility engine, targeted notifications, and pipeline are new.

**What are the limitations?**
Polling instead of WebSockets, data quality depends on trainers entering attendance and marks, and it is tested on seeded data rather than a live institute. These are known and listed in future scope.

---

## 12. Future Scope
- WebSocket-based live updates and mobile push notifications
- Automatic readiness score feeding eligibility
- Doubt queue with response-time escalation
- Resume version tracking per application
- Recruiter portal with verified candidate profiles
- Multi-branch head-office analytics

---

## 13. Conclusion
QTalk NextGen keeps the communication strengths of a campus app and adds structure where it is missing. By storing requirements, student performance, and application status as relational data, it replaces manual filtering with SQL, gives students clarity, and gives institutes measurable placement outcomes.

---

## Pre-Presentation Checklist
- [ ] Neon database freshly seeded; create a `demo-backup` branch afterwards
- [ ] Open the app a minute before presenting to wake the database
- [ ] Demo accounts listed on one sheet (admin, HR, trainer, 3 students of varied eligibility)
- [ ] Demo script rehearsed twice with no errors
- [ ] Every teammate can explain the eligibility query plus one other module
- [ ] Screen recording of the full flow as a backup
- [ ] Team names, batch, and trainer filled in on the title page
