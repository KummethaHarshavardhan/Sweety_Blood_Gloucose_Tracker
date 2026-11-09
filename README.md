# Sweety – Blood Glucose Tracker

A full-stack application for recording daily blood glucose readings and reviewing daily and monthly trends.

**Stack:** React + Vite, Node.js + Express, PostgreSQL, Prisma ORM, Docker.

> **Health disclaimer:** Sweety is a personal tracking tool, not a medical device. It does not diagnose conditions or provide treatment advice. Users should discuss glucose readings and care decisions with a qualified healthcare professional.

## Features

- Register, log in, refresh sessions, and log out.
- Password hashing with bcrypt.
- Short-lived JWT access tokens and rotating, hashed refresh tokens in an HttpOnly cookie.
- Record up to four readings per day:
  - Morning (fasting)
  - After breakfast
  - After lunch
  - After dinner
- Validate glucose values (40–600 mg/dL), dates, and duplicate time slots.
- Create, list, view, update, and delete readings.
- User-scoped reading access.
- Daily, month-to-date, and previous-calendar-month reports.
- Highest, lowest, average (one decimal place), count, and daily reading details.
- Dashboard charts and responsive React UI.
- Automated API tests with Vitest and Supertest.
- Docker Compose development environment and database-backed health endpoint.

## Repository structure

```text
Sweety – Blood Glucose Tracker/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── routes/
│   ├── test/
│   ├── Dockerfile
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   └── utils/
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

## Requirements

- Node.js 20 or later (Node 24 is used in Docker).
- npm.
- Docker Desktop with the Linux container engine (recommended), or PostgreSQL 16+ installed locally.
- Git.

## Run with Docker Compose (recommended)

### 1. Create environment files

Copy the root example file:

```powershell
Copy-Item .env.example .env
```

Copy the backend example:

```powershell
Copy-Item backend/.env.example backend/.env
```

Edit the root `.env` and set a strong database password. A hexadecimal password avoids URL-encoding problems in `DATABASE_URL`. For example, generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use that value for `POSTGRES_PASSWORD` in the root `.env`.

In `backend/.env`, replace both JWT secret placeholders with different random values. Generate each separately:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Keep the local `CLIENT_URL=http://localhost:5173` value for local Docker Compose.

### 2. Start the application

Run from the repository root:

```powershell
docker compose up -d --build
```

The backend runs Prisma migrations automatically before starting.

### 3. Check containers

```powershell
docker compose ps
docker compose logs backend --tail 50
```

Expected services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:7005
- Health check: http://localhost:7005/api/health
- PostgreSQL from the host: `localhost:5433`

The database port is bound to `127.0.0.1` for local development only. The backend reaches PostgreSQL over the private Compose network at `db:5432`.

Stop the containers without deleting database data:

```powershell
docker compose down
```

**Do not use `docker compose down -v` unless you intentionally want to delete the PostgreSQL data volume.**

## Run without Docker

### 1. Create PostgreSQL databases

Create `sweety_db` and `sweety_test` in PostgreSQL.

### 2. Configure backend

```powershell
Copy-Item backend/.env.example backend/.env
```

Update `DATABASE_URL` and `TEST_DATABASE_URL` to match your PostgreSQL host, port, username, and password. The example uses port `5433` because that is the host port in the supplied Docker Compose file. If your local PostgreSQL server listens on `5432`, change the port.

### 3. Install, migrate, and start backend

```powershell
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm start
```

Backend: http://localhost:7005

For local schema development only, use `npx prisma migrate dev --name <migration-name>` and commit the generated migration directory.

### 4. Configure and start frontend

In a second terminal:

```powershell
Copy-Item frontend/.env.example frontend/.env
cd frontend
npm ci
npm run dev
```

Frontend: http://localhost:5173

## Environment variables

### Root `.env` (Docker Compose)

| Variable | Purpose |
|---|---|
| `POSTGRES_PASSWORD` | Password for the Compose PostgreSQL database |
| `VITE_API_URL` | API base URL embedded into the frontend build; defaults to `http://localhost:7005` |

### `backend/.env`

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `TEST_DATABASE_URL` | Separate database used only by automated tests |
| `ACCESS_TOKEN_SECRET` | Secret used to sign access tokens |
| `REFRESH_TOKEN_SECRET` | Different secret used to sign refresh tokens |
| `ACCESS_TOKEN_EXPIRES_IN` | Access-token lifetime (default `15m`) |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh-token lifetime (default `7d`) |
| `PORT` | API port (default `7005`) |
| `CLIENT_URL` | Exact frontend origin; multiple origins can be comma-separated |
| `NODE_ENV` | `development`, `test`, or `production` |
| `APP_TIMEZONE` | Time zone used for the no-future-date validation (default `Asia/Kolkata`) |
| `BCRYPT_SALT_ROUNDS` | bcrypt work factor (default `10`; use `12` for production) |

Never commit `.env` files or put secrets in `VITE_` variables. Vite variables are public and included in the browser bundle.

## API reference

All reading and report routes require `Authorization: Bearer <access-token>`.

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Checks API and PostgreSQL connectivity; returns 503 if the database is unavailable |

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register an account |
| POST | `/api/auth/login` | Log in and set the HttpOnly refresh cookie |
| POST | `/api/auth/refresh` | Rotate refresh cookie and issue a new access token |
| POST | `/api/auth/logout` | Revoke refresh token and clear cookie |
| GET | `/api/auth/me` | Return the authenticated user's profile |

Login, refresh, and logout require the exact trusted `Origin` configured in `CLIENT_URL`.

### Readings

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/readings` | Add a reading |
| GET | `/api/readings?from=YYYY-MM-DD&to=YYYY-MM-DD` | List readings; date filters are optional |
| GET | `/api/readings/:id` | Get one reading owned by the signed-in user |
| PUT | `/api/readings/:id` | Update a reading owned by the signed-in user |
| DELETE | `/api/readings/:id` | Delete a reading owned by the signed-in user |

Reading request body:

```json
{
  "readingDate": "2026-11-09",
  "timeSlot": "MORNING",
  "glucoseValue": 105
}
```

Valid `timeSlot` values: `MORNING`, `AFTER_BREAKFAST`, `AFTER_LUNCH`, `AFTER_DINNER`.

### Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/daily?date=YYYY-MM-DD` | Daily summary and readings |
| GET | `/api/reports/month-to-date?date=YYYY-MM-DD` | First day of selected month through selected date |
| GET | `/api/reports/monthly?date=YYYY-MM-DD` | Complete calendar month before selected month |

When `date` is omitted, the API uses the configured application time zone.

## Automated tests

Tests use Vitest and Supertest and require a **separate** PostgreSQL database configured through `TEST_DATABASE_URL`. The test configuration deliberately refuses to fall back to `DATABASE_URL`.

Create the test database, then apply migrations to it. In PowerShell, from the `backend` directory:

```powershell
$env:DATABASE_URL = (Get-Content .env | Where-Object { $_ -match '^TEST_DATABASE_URL=' } | ForEach-Object { ($_ -split '=', 2)[1].Trim('"') })
npx prisma migrate deploy
Remove-Item Env:DATABASE_URL
npm test
```

If your database URL contains special characters, set `$env:DATABASE_URL` manually to the test connection string instead of parsing the file.

Tests clear the tables in the configured test database. **Never set `TEST_DATABASE_URL` to your production database.**

## Demo data

A demo seed script is available:

```powershell
cd backend
npm run seed
```

It creates a demo account (`demo@sweety.com`) and sample readings for the last 30 days. The seed script refuses to run when `NODE_ENV=production`. Use it only with a local or disposable development database. The demo password is `Sweety@123`; change or remove the demo account before sharing a non-production deployment.

## Deploy to cloud

A straightforward split deployment is:

- **PostgreSQL:** Neon or another managed PostgreSQL provider.
- **Backend:** Render Web Service (Node runtime).
- **Frontend:** Vercel (Vite static site).

### 1. Create production PostgreSQL

Create a new managed PostgreSQL database. Copy its connection string into the backend service as `DATABASE_URL`. Use the provider's required TLS options (for example, `sslmode=require`) and keep the connection string private.

### 2. Deploy backend to Render

Create a Web Service from the GitHub repository and set its **Root Directory** to `backend`.

- Build command: `npm ci --include=dev && npx prisma generate`
- Start command: `npx prisma migrate deploy && npm start`
- Health check path: `/api/health`

Configure these environment variables in Render:

```text
NODE_ENV=production
DATABASE_URL=<managed PostgreSQL connection string>
ACCESS_TOKEN_SECRET=<unique random secret, at least 32 characters>
REFRESH_TOKEN_SECRET=<a different unique random secret, at least 32 characters>
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CLIENT_URL=https://<your-frontend-domain>
APP_TIMEZONE=Asia/Kolkata
BCRYPT_SALT_ROUNDS=12
```

Do not set `TEST_DATABASE_URL` on the production service. Never run the demo seed against production.

### 3. Deploy frontend to Vercel

Import the same repository into Vercel and set the **Root Directory** to `frontend`.

- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://<your-render-backend-domain>`

The included `vercel.json` rewrites client-side routes to `index.html`. After changing `VITE_API_URL`, trigger a new frontend deployment because Vite embeds it at build time.

### 4. Verify production

1. Open `https://<your-frontend-domain>/`.
2. Register a new account and log in.
3. Add, edit, and delete a reading.
4. Check daily, month-to-date, and previous-month reports.
5. Open `https://<your-render-backend-domain>/api/health` and confirm the database reports `connected`.
6. Confirm refresh works after reloading the frontend.

**Cookie note:** Production refresh cookies use `HttpOnly`, `Secure`, and `SameSite=None` so the frontend and API can be on different origins. The API allows only the exact origin(s) listed in `CLIENT_URL`; refresh and logout reject missing or untrusted Origin headers. Some browsers or privacy settings restrict third-party cookies. For the most reliable cookie behavior, host the frontend and API on the same site (for example, `app.example.com` and `api.example.com`) or use a deployment arrangement that serves the API under the frontend site's domain.

## Security and operational notes

- Keep all secrets in the hosting provider's environment-variable settings.
- Do not commit `.env` files, database dumps, or real patient data.
- Use HTTPS in production.
- Back up the managed database and test restoring backups.
- Use a separate test database; automated tests delete test rows.
- The application stores personal health-related data. Share demo accounts only with synthetic sample data and restrict access to real patient records.

## Author

**Kummetha Harshavardhan**

- GitHub: [KummethaHarshavardhan](https://github.com/KummethaHarshavardhan)
- Repository: [Blood Glucose Tracker](https://github.com/KummethaHarshavardhan/Blood_Glucose_Tracker)

## License

Developed as part of a full-stack developer assignment.

**Sweety – Track Every Reading, Every Day.**
