const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('🌱 Starting QTalk NextGen database seeding...');

  try {
    // 1. Run Schema
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    
    // Split and execute statements or use db.exec / queries
    if (db.exec) {
      await db.exec(schemaSql);
    } else {
      // In remote pg, split on semicolon
      const statements = schemaSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      for (const statement of statements) {
        await db.query(statement);
      }
    }
    console.log('✅ Schema initialized successfully.');

    // Clean existing data for clean reseed
    await db.query(`
      DELETE FROM interview_experiences;
      DELETE FROM batch_resources;
      DELETE FROM messages;
      DELETE FROM notifications;
      DELETE FROM job_applications;
      DELETE FROM job_skills;
      DELETE FROM job_requirements;
      DELETE FROM mock_scores;
      DELETE FROM attendance;
      DELETE FROM student_skills;
      DELETE FROM skills;
      DELETE FROM batch_trainers;
      DELETE FROM subjects;
      DELETE FROM users;
      DELETE FROM batches;
    `);

    // 2. Insert Batches
    const batch1 = await db.query(
      `INSERT INTO batches (batch_code, course_name, start_date)
       VALUES ($1, $2, $3) RETURNING batch_id`,
      ['BATCH-2026-FS', 'Full Stack Web Development', '2025-08-01']
    );
    const batchId1 = batch1.rows[0].batch_id;

    const batch2 = await db.query(
      `INSERT INTO batches (batch_code, course_name, start_date)
       VALUES ($1, $2, $3) RETURNING batch_id`,
      ['BATCH-2025-DS', 'Data Science & Analytics', '2024-09-01']
    );
    const batchId2 = batch2.rows[0].batch_id;

    // 3. Insert Skills
    const skillNames = ['SQL', 'React', 'Node.js', 'Java', 'Python', 'MongoDB', 'Docker'];
    const skillMap = {};
    for (const name of skillNames) {
      const res = await db.query(`INSERT INTO skills (name) VALUES ($1) RETURNING skill_id`, [name]);
      skillMap[name] = res.rows[0].skill_id;
    }
    console.log('✅ Skills created:', Object.keys(skillMap).join(', '));

    // 3b. Insert Subjects
    const subjectNames = ['SQL & Databases', 'React & Frontend', 'Node.js Backend', 'Data Structures & Algorithms', 'Data Analysis with Python'];
    const subjectMap = {};
    for (const name of subjectNames) {
      const res = await db.query(`INSERT INTO subjects (name) VALUES ($1) RETURNING subject_id`, [name]);
      subjectMap[name] = res.rows[0].subject_id;
    }
    console.log('✅ Subjects created:', Object.keys(subjectMap).join(', '));

    // Common password
    const passwordHash = await bcrypt.hash('password123', 10);

    // 4. Insert Users
    // Admin
    const adminRes = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING user_id`,
      ['Dr. Arvind Rao (Director)', 'admin@qtalk.edu', passwordHash, 'ADMIN']
    );
    const adminId = adminRes.rows[0].user_id;

    // Manager
    const managerRes = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING user_id`,
      ['Neha Kulkarni (Operations Manager)', 'manager@qtalk.edu', passwordHash, 'MANAGER']
    );
    const managerId = managerRes.rows[0].user_id;

    // HR
    const hrRes = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING user_id`,
      ['Pooja Sharma (Placement Lead)', 'hr@qtalk.edu', passwordHash, 'HR']
    );
    const hrId = hrRes.rows[0].user_id;

    // Trainer
    const trainerRes = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, batch_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
      ['Karthik Verma (Tech Lead)', 'trainer@qtalk.edu', passwordHash, 'TRAINER', batchId1]
    );
    const trainerId = trainerRes.rows[0].user_id;

    // Second Trainer (for Batch 2 / Data Science)
    const trainer2Res = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, batch_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
      ['Divya Menon (Data Science Lead)', 'trainer2@qtalk.edu', passwordHash, 'TRAINER', batchId2]
    );
    const trainer2Id = trainer2Res.rows[0].user_id;

    // 4b. Manager assigns trainers to batches (this is what grants trainer access)
    await db.query(
      `INSERT INTO batch_trainers (batch_id, trainer_id, subject_id, assigned_by) VALUES
       ($1, $2, $3, $4), ($1, $2, $5, $4), ($6, $7, $8, $4)`,
      [batchId1, trainerId, subjectMap['SQL & Databases'], managerId, subjectMap['React & Frontend'], batchId2, trainer2Id, subjectMap['Data Analysis with Python']]
    );
    console.log('✅ Trainer-batch assignments created.');

    // Students
    // Student 1: Rahul (Meets all criteria: CGPA 8.6, 2026, 90% attendance, 87% mock, has SQL+React+Node.js)
    const s1Res = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, batch_id, cgpa, passout_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id`,
      ['Rahul Kumar', 'rahul@qtalk.edu', passwordHash, 'STUDENT', batchId1, 8.60, 2026]
    );
    const s1Id = s1Res.rows[0].user_id;

    // Student 2: Priya (Ineligible: Low Attendance 60% < 75%)
    const s2Res = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, batch_id, cgpa, passout_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id`,
      ['Priya Nair', 'priya@qtalk.edu', passwordHash, 'STUDENT', batchId1, 7.80, 2026]
    );
    const s2Id = s2Res.rows[0].user_id;

    // Student 3: Amit (Ineligible: Missing SQL skill)
    const s3Res = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, batch_id, cgpa, passout_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id`,
      ['Amit Patel', 'amit@qtalk.edu', passwordHash, 'STUDENT', batchId1, 7.50, 2026]
    );
    const s3Id = s3Res.rows[0].user_id;

    // Student 4: Sneha (Ineligible: 2025 passout & 6.20 CGPA)
    const s4Res = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, batch_id, cgpa, passout_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id`,
      ['Sneha Reddy', 'sneha@qtalk.edu', passwordHash, 'STUDENT', batchId2, 6.20, 2025]
    );
    const s4Id = s4Res.rows[0].user_id;

    console.log('✅ Users created (Admin, HR, Trainer, 4 Students).');

    // 5. Assign Skills to Students
    // Rahul: SQL, React, Node.js
    await db.query(`INSERT INTO student_skills (student_id, skill_id) VALUES ($1, $2), ($1, $3), ($1, $4)`,
      [s1Id, skillMap['SQL'], skillMap['React'], skillMap['Node.js']]);
    // Priya: SQL, React
    await db.query(`INSERT INTO student_skills (student_id, skill_id) VALUES ($1, $2), ($1, $3)`,
      [s2Id, skillMap['SQL'], skillMap['React']]);
    // Amit: Java, Python (Missing SQL!)
    await db.query(`INSERT INTO student_skills (student_id, skill_id) VALUES ($1, $2), ($1, $3)`,
      [s3Id, skillMap['Java'], skillMap['Python']]);
    // Sneha: SQL, Python
    await db.query(`INSERT INTO student_skills (student_id, skill_id) VALUES ($1, $2), ($1, $3)`,
      [s4Id, skillMap['SQL'], skillMap['Python']]);

    // 6. Insert Attendance records (10 sessions)
    const dates = [
      '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05',
      '2026-03-08', '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12'
    ];

    // Rahul: 9 present out of 10 -> 90%
    for (let i = 0; i < dates.length; i++) {
      const present = i !== 4; // absent on 5th
      await db.query(`INSERT INTO attendance (student_id, batch_id, session_date, present) VALUES ($1, $2, $3, $4)`, [s1Id, batchId1, dates[i], present]);
    }

    // Priya: 6 present out of 10 -> 60% (Below 75% threshold!)
    for (let i = 0; i < dates.length; i++) {
      const present = i < 6;
      await db.query(`INSERT INTO attendance (student_id, batch_id, session_date, present) VALUES ($1, $2, $3, $4)`, [s2Id, batchId1, dates[i], present]);
    }

    // Amit: 8 present out of 10 -> 80%
    for (let i = 0; i < dates.length; i++) {
      const present = i < 8;
      await db.query(`INSERT INTO attendance (student_id, batch_id, session_date, present) VALUES ($1, $2, $3, $4)`, [s3Id, batchId1, dates[i], present]);
    }

    // Sneha: 9 present out of 10 -> 90%
    for (let i = 0; i < dates.length; i++) {
      const present = i !== 2;
      await db.query(`INSERT INTO attendance (student_id, batch_id, session_date, present) VALUES ($1, $2, $3, $4)`, [s4Id, batchId2, dates[i], present]);
    }

    // 7. Insert Mock Exam Scores
    // Rahul: SQL 85/100, React 90/100 -> Avg 87.5%
    await db.query(`INSERT INTO mock_scores (student_id, trainer_id, subject, score, max_score, conducted_on) VALUES ($1, $2, $3, $4, 100, '2026-03-10')`, [s1Id, trainerId, 'SQL Advanced', 85]);
    await db.query(`INSERT INTO mock_scores (student_id, trainer_id, subject, score, max_score, conducted_on) VALUES ($1, $2, $3, $4, 100, '2026-03-12')`, [s1Id, trainerId, 'React & System Design', 90]);

    // Priya: SQL 80/100, React 85/100 -> Avg 82.5%
    await db.query(`INSERT INTO mock_scores (student_id, trainer_id, subject, score, max_score, conducted_on) VALUES ($1, $2, $3, $4, 100, '2026-03-10')`, [s2Id, trainerId, 'SQL Advanced', 80]);
    await db.query(`INSERT INTO mock_scores (student_id, trainer_id, subject, score, max_score, conducted_on) VALUES ($1, $2, $3, $4, 100, '2026-03-12')`, [s2Id, trainerId, 'React & System Design', 85]);

    // Amit: Java 75/100 -> Avg 75%
    await db.query(`INSERT INTO mock_scores (student_id, trainer_id, subject, score, max_score, conducted_on) VALUES ($1, $2, $3, $4, 100, '2026-03-10')`, [s3Id, trainerId, 'Core Java', 75]);

    // Sneha: Python 65/100 -> Avg 65%
    await db.query(`INSERT INTO mock_scores (student_id, trainer_id, subject, score, max_score, conducted_on) VALUES ($1, $2, $3, $4, 100, '2026-03-10')`, [s4Id, trainerId, 'Data Analysis', 65]);

    // 8. Insert Sample Job Requirements
    const job1 = await db.query(
      `INSERT INTO job_requirements 
       (company_name, job_profile, description, package_lpa, min_cgpa, eligible_passout_year, min_attendance, min_mock_score, deadline, hr_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING job_id`,
      [
        'TCS Digital',
        'System Engineer - Enterprise Data & Cloud',
        'Looking for dynamic developers with strong relational SQL foundation and modern web development capabilities.',
        7.5,
        7.00,
        2026,
        75,
        70,
        '2026-10-15',
        hrId
      ]
    );
    const j1Id = job1.rows[0].job_id;
    // Job 1 requires SQL and React
    await db.query(`INSERT INTO job_skills (job_id, skill_id) VALUES ($1, $2), ($1, $3)`, [j1Id, skillMap['SQL'], skillMap['React']]);

    const job2 = await db.query(
      `INSERT INTO job_requirements 
       (company_name, job_profile, description, package_lpa, min_cgpa, eligible_passout_year, min_attendance, min_mock_score, deadline, hr_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING job_id`,
      [
        'Infosys Specialist Programmer',
        'Full Stack Cloud Architect',
        'Join the advanced solutions group focusing on high-scale distributed applications and microservices.',
        9.5,
        8.00,
        2026,
        80,
        75,
        '2026-10-20',
        hrId
      ]
    );
    const j2Id = job2.rows[0].job_id;
    // Job 2 requires SQL, React, Node.js
    await db.query(`INSERT INTO job_skills (job_id, skill_id) VALUES ($1, $2), ($1, $3), ($1, $4)`,
      [j2Id, skillMap['SQL'], skillMap['React'], skillMap['Node.js']]);

    // 9. Targeted Notifications for Job 1 (Rahul is eligible, gets notification!)
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, job_id, is_read)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        s1Id,
        'NEW_JOB',
        'New Drive: TCS Digital (7.5 LPA)',
        'You match all 5 eligibility criteria for System Engineer at TCS Digital. Apply before Oct 15!',
        j1Id,
        false
      ]
    );

    // 10. Sample Application for Rahul on Job 1
    await db.query(
      `INSERT INTO job_applications (job_id, student_id, status)
       VALUES ($1, $2, 'SHORTLISTED')`,
      [j1Id, s1Id]
    );

    // 11. Resources uploaded by Trainer
    await db.query(
      `INSERT INTO batch_resources (batch_id, trainer_id, title, file_url, category)
       VALUES ($1, $2, $3, $4, $5)`,
      [batchId1, trainerId, 'SQL Comprehensive Query Optimization Guide', 'uploads/sample_sql_guide.pdf', 'Database & SQL']
    );
    await db.query(
      `INSERT INTO batch_resources (batch_id, trainer_id, title, file_url, category)
       VALUES ($1, $2, $3, $4, $5)`,
      [batchId1, trainerId, 'React 19 State Management & System Design Patterns', 'uploads/sample_react_guide.pdf', 'Frontend']
    );

    // 12. Interview Experiences
    await db.query(
      `INSERT INTO interview_experiences (student_id, company_name, job_role, round_type, questions_text, difficulty_rating)
       VALUES 
       ($1, 'TCS Digital', 'System Engineer', 'Technical Round 1', 
        '1. Explain B-Tree indexing and query execution plan in PostgreSQL.\n2. Write a SQL query using window functions (DENSE_RANK) to find 2nd highest salary per department.\n3. Difference between optimistic and pessimistic locking.', 4),
       ($1, 'Amazon', 'SDE 1', 'Coding & DSA', 
        '1. LRU Cache implementation using doubly linked list and hashmap.\n2. Find median in a running data stream.\n3. Edge case handling in concurrent transactions.', 5)`,
      [s1Id]
    );

    // 13. Messages (Batch Group Chat & Direct Message)
    await db.query(
      `INSERT INTO messages (sender_id, batch_id, body)
       VALUES 
       ($1, $2, 'Welcome batch! The TCS Digital drive is open for all eligible students. Review the SQL optimization guide in resources.'),
       ($3, $2, 'Thank you Sir! Checked my eligibility and submitted my application.')`,
      [trainerId, batchId1, s1Id]
    );

    await db.query(
      `INSERT INTO messages (sender_id, receiver_id, body)
       VALUES 
       ($1, $2, 'Hi Rahul, your mock score in React was great (90/100). Focus on distributed caching before the upcoming rounds.'),
       ($2, $1, 'Understood Sir, I am preparing Redis cache eviction strategies today.')`,
      [trainerId, s1Id]
    );

    console.log('🎉 Seeding completed successfully!');
    console.log('\n--- ACCOUNTS READY (password123) ---');
    console.log('1. Manager: manager@qtalk.edu');
    console.log('2. HR:      hr@qtalk.edu');
    console.log('3. Trainer: trainer@qtalk.edu (Full Stack batch)');
    console.log('4. Trainer: trainer2@qtalk.edu (Data Science batch)');
    console.log('5. Student: rahul@qtalk.edu, priya@qtalk.edu, amit@qtalk.edu, sneha@qtalk.edu');
    console.log('6. Admin:   admin@qtalk.edu');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0));
}

module.exports = seed;
