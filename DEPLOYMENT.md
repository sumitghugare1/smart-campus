# QTalk NextGen Deployment

This project deploys as two services:

- Frontend: Vercel, using `client/`
- Backend: Vercel Serverless Function, using `server/`
- Database: Neon PostgreSQL

## 1. Push the repository

Push the project to GitHub. Do not commit `server/.env`, passwords, or database URLs.

## 2. Deploy the backend on Vercel

1. Open Vercel and choose **Add New > Project**.
2. Import the GitHub repository.
3. Set **Root Directory** to `server`.
4. Vercel detects `server/vercel.json` and uses `server/api/index.js` as the function entrypoint.
5. Add these environment variables to the Vercel backend project:

```text
DATABASE_URL=your Neon PostgreSQL connection string
CLIENT_URL=https://your-frontend.vercel.app
```

Copy the **pooled Node.js connection string** from Neon exactly. It should begin with
`postgresql://` and contain a real `neon.tech` hostname. Do not paste the placeholder
from `.env.example`, do not include surrounding quotes, and create the variable for
Production, Preview, and Development environments.

If your Neon project provides `POSTGRES_URL` instead, the backend accepts that name as
well, but `DATABASE_URL` is preferred.

Generate a long private `JWT_SECRET`; do not reuse the demo value in production.

The backend project uses:

```text
Root directory: server
Function entrypoint: api/index.js
```

After deployment, verify:

```text
https://your-backend.vercel.app/api/health
```

It should return a JSON response with `status: "ok"`.

The backend root also responds at `https://your-backend.vercel.app/` and can be used
as a quick Vercel function check.

## 3. Seed Neon

Run this once from the repository with the same Neon connection string used by the Vercel backend:

PowerShell:

```powershell
$env:DATABASE_URL = "your Neon PostgreSQL connection string"
cd server
npm install
npm run seed
```

The seed command recreates the demo schema/data and creates the demo accounts. Do not run it against a production database containing real data because it deletes existing application data.

## 4. Deploy the frontend on a second Vercel project

1. In Vercel, choose **Add New > Project** again.
2. Import the GitHub repository.
3. Set **Root Directory** to `client`.
4. Use these build settings:

```text
Build command: npm run build
Output directory: dist
Install command: npm install
```

5. Add this environment variable for Production, Preview, and Development:

```text
VITE_API_URL=https://your-backend.vercel.app
```

The value must not end with `/`. Vite embeds `VITE_API_URL` during the build, so redeploy after changing it.

The `client/vercel.json` file provides the SPA fallback to `index.html`.

## 5. Connect CORS

After Vercel gives you the final frontend domain, update the backend Vercel variable:

```text
CLIENT_URL=https://your-final-project.vercel.app
```

For multiple frontend URLs, separate origins with commas:

```text
CLIENT_URL=https://your-project.vercel.app,https://www.example.com
```

Redeploy the backend after changing this value.

## 6. Test the deployed connection

1. Open the Vercel URL.
2. Sign in with a seeded account, for example `rahul@qtalk.edu` / `password123`.
3. Open Campus Drives and verify jobs load.
4. Apply to an eligible drive.
5. Sign in as `trainer@qtalk.edu` and verify assigned batches load.
6. Open browser developer tools and confirm API requests go to the backend Vercel URL, not the frontend Vercel URL.

## File uploads

Uploaded files are stored in Neon PostgreSQL as `BYTEA` values. This avoids Vercel's
read-only filesystem and requires no additional storage provider. The first resource
request applies the nullable `file_data`, `file_name`, and `mime_type` columns to an
existing `batch_resources` table automatically; `schema.sql` contains the same migration
for fresh databases.

This is intended for the free/small deployment footprint: uploads are limited to 25 MB
and consume Neon database storage. For larger files or high download volume, move the
same upload contract to object storage such as Cloudinary, S3, or Cloudflare R2.

## Local development after these changes

Leave `client/.env` absent or set:

```text
VITE_API_URL=
```

Vite will use its existing proxy from `localhost:3000` to `localhost:5000`. For a deployed backend, set `VITE_API_URL` to the backend origin before running `npm run build`.
