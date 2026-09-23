# QTalk NextGen - Environment Setup & Key Acquisition Guide

This guide explains how to get and configure every environment variable in your `.env` file.

---

## 1. Quick Overview of `.env` Variables

Create a file named `.env` inside `server/` (or copy from `.env.example`):

```bash
cp server/.env.example server/.env
```

| Variable | Required? | Description | Default / Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | Port for Express backend server | `5000` |
| `JWT_SECRET` | Recommended | Random secret string for signing JWT tokens | `qtalk_super_secret_jwt_key_2026_demo` |
| `DATABASE_URL` | Optional* | Neon cloud PostgreSQL connection URI | `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `CLIENT_URL` | Optional | Frontend URL permitted by CORS | `http://localhost:5173` |

> [!TIP]
> **Zero-Friction Fallback:** If `DATABASE_URL` is omitted or empty, QTalk NextGen automatically uses the built-in **PGlite (Embedded PostgreSQL 16 WASM engine)** stored in `server/data`. You do not need to install Postgres or Docker to run and demo the app locally right away!

---

## 2. Steps to Get a Free PostgreSQL Database on Neon

Neon provides free, serverless PostgreSQL with database branching (ideal for demo backups).

### Step 1: Sign up on Neon
1. Go to **[https://neon.tech](https://neon.tech)** in your browser.
2. Click **"Sign Up"** (you can sign up with your GitHub or Google account in 10 seconds).

### Step 2: Create a New Project
1. In the Neon Console, click **"Create Project"**.
2. Give your project a name: e.g., `qtalk-nextgen`.
3. Select the region closest to you (e.g., `AWS - Asia Pacific (Singapore)` or `AWS - US East`).
4. Keep the default Postgres version (PostgreSQL 16).
5. Click **"Create Project"**.

### Step 3: Copy Your Connection String (`DATABASE_URL`)
1. Once the project is created, the dashboard will display your **Connection Details**.
2. Make sure the dropdown is set to **`Node.js`** or **`psql`** with connection pooling enabled.
3. Check the checkbox for **"Pooled connection"** (or Direct connection; both work).
4. Click the **Copy** button. The string will look like this:
   ```text
   postgresql://neondb_owner:npg_AbCdEf123456@ep-cool-snowflake-a1b2c3d4.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Paste this full string as your `DATABASE_URL` in `server/.env`:
   ```env
   DATABASE_URL=postgresql://neondb_owner:npg_AbCdEf123456@ep-cool-snowflake-a1b2c3d4.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Step 4: Seed the Neon Database
Whenever you connect to Neon for the first time, run:
```bash
cd server
npm run seed
```
This automatically runs `schema.sql` (creating all 13 tables and the `student_stats` view) and seeds all demo batches, skills, mock test records, jobs, and test accounts.

---

## 3. How to Generate a Secure `JWT_SECRET`

You can use any random string, or generate a cryptographically secure 256-bit key using Node.js:

1. Open PowerShell / Terminal and run:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Copy the generated 64-character string and paste it into `.env`:
   ```env
   JWT_SECRET=4f8b2d7e1a3c6f9a0b5e8d2c4f7a1e3b6d9c2a5f8e1b4d7a0c3e6f9b2d5a8c1e
   ```

---

## 4. Testing Your Configuration

To test that your backend connects to your database and all endpoints work:

```bash
cd server
node test-api.js
```
You should see:
`✨ ALL API TESTS PASSED SUCCESSFULLY! ✨`
