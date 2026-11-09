# Sweety - Blood Glucose Tracker (Frontend)

React + Vite single-page app for the Sweety backend. It covers registration, login, a dashboard, reading management (add, edit, delete), daily, month-to-date and previous-month reports, and a profile page.

## Tech stack

- React 18 with Vite, JavaScript and JSX only (no TypeScript)
- React Router DOM 6 for routing, with protected and public routes
- Axios with `withCredentials` for the HttpOnly refresh cookie
- Context API for authentication (`AuthContext`, `useAuth`)
- Recharts for charts, Lucide React for icons
- Plain CSS3, no Tailwind, responsive down to phone widths

## Project structure

```
frontend/
├── public/logo.svg
├── src/
│   ├── components/   Navbar, Sidebar, AppLayout, AuthLayout, ProtectedRoute, PublicRoute,
│   │                 Loading, EmptyState, StatCard, ReportChart, ReadingTable, ReadingForm, Modal
│   ├── pages/        Login, Register, Dashboard, Readings, Reports, Profile
│   ├── services/     api.js (Axios instance, token refresh), authAPI.js, readingAPI.js, reportAPI.js
│   ├── context/      AuthContext.jsx
│   ├── hooks/        useAuth.js
│   ├── utils/        constants.js, dateUtils.js, chartData.js, validators.js
│   ├── styles/       global.css, auth.css, dashboard.css, readings.css, reports.css
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

## Requirements

- Node.js 20 or newer (the backend requires the same)
- The Sweety backend running on `http://localhost:7005`

## Setup

1. Copy the environment file:

   ```powershell
   cd frontend
   copy .env.example .env
   ```

   `.env` contains:

   ```
   VITE_API_URL=http://localhost:7005
   ```

2. Install dependencies:

   ```powershell
   npm install
   ```

## Running the app

Start the backend first (see the backend README), then:

```powershell
cd frontend
npm run dev
```

Open **http://localhost:5173**. The dev server is pinned to port 5173 because the backend's `CLIENT_URL` must match it. Without that match, CORS and the refresh cookie will fail.

Production build and preview:

```powershell
npm run build
npm run preview
```

## Demo login

Run `npm run seed` in the backend first to create this account:

- Email: `demo@sweety.com`
- Password: `Sweety@123`

## Authentication flow

1. Login stores the access token in memory only. It is never written to localStorage or sessionStorage.
2. The refresh token is an HttpOnly cookie set by the backend. JavaScript cannot read it.
3. On page load, `AuthContext` calls `POST /api/auth/refresh`. If the cookie is valid, the user is signed in without re-entering a password.
4. When any request fails with `401` and code `TOKEN_EXPIRED`, `TOKEN_INVALID` or `AUTH_REQUIRED`, `api.js` refreshes the token once and retries the original request.
5. Simultaneous expired requests share one refresh call. The backend rotates refresh tokens, so parallel refreshes would otherwise look like token reuse.
6. If the refresh fails, the local session is cleared and the user is redirected to `/login`.
7. Logout calls `POST /api/auth/logout`, which revokes the refresh token, and then clears local state.

## Pages and API mapping

| Page | Route | Endpoints used |
|---|---|---|
| Login | `/login` | `POST /api/auth/login` |
| Register | `/register` | `POST /api/auth/register` (then redirects to login) |
| Dashboard | `/dashboard` | `GET /api/reports/daily`, `GET /api/readings` (7-day trend), create, update, delete |
| Readings | `/readings` | `GET /api/readings?from&to`, create, update, delete |
| Reports | `/reports` | `GET /api/reports/daily`, `GET /api/reports/month-to-date`, `GET /api/reports/monthly`, `GET /api/readings?from&to` for trend charts |
| Profile | `/profile` | `GET /api/auth/me`, `POST /api/auth/logout` |

Session restore uses `POST /api/auth/refresh` on load.

## Response handling

The frontend reads the backend's standard envelope:

- Success: `{ success: true, message?, data }`
- Error: `{ success: false, message, code?, errors? }`

Error messages from the backend are shown exactly as returned, for example "You already have an After lunch reading for this date." or "Date cannot be in the future."

The reading form also checks duplicates and the four-per-day limit on the same day before saving, so the user sees the problem immediately. The backend re-checks everything and remains the final authority.

## Dates and time zones

"Today" uses the browser's local date. The backend uses `APP_TIMEZONE` (default `Asia/Kolkata`). If you are in a different time zone, set `APP_TIMEZONE` in the backend `.env` to match yours.

## Medical note

The app stores and summarises values that you enter. It does not diagnose or recommend treatment. Discuss results with your doctor.

## Troubleshooting

- **"Cannot reach the server"**: the backend is not running, or `VITE_API_URL` is wrong. Restart `npm run dev` after changing `.env`, because Vite reads it at startup.
- **Login works but the page keeps returning to login after a refresh**: check that the frontend runs on `http://localhost:5173` and that the backend `CLIENT_URL` is `http://localhost:5173`. Cookies are rejected when the origins differ.
- **CORS errors in the browser console**: same cause as above. Also confirm the backend started without errors.
- **Port 5173 already in use**: stop the other process. Vite will not switch ports, because the backend expects 5173.
