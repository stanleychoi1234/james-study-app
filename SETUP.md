# James Study App — Setup & Migration Guide

## Quick Start (Moving to a New PC)

### 1. Clone the repo
```bash
git clone https://github.com/stanleychoi1234/james-study-app.git
cd james-study-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Generate Prisma client
```bash
npx prisma generate
```

### 4. Create the `.env` file
The `.env` file is **NOT committed to git** (it's in `.gitignore`). You must recreate it in the project root.

Create `study-app/.env` with these contents:

```env
DATABASE_URL="file:./dev.db"
TURSO_DATABASE_URL="<copy from existing .env or Netlify dashboard>"
TURSO_AUTH_TOKEN="<copy from existing .env or Netlify dashboard>"
JWT_SECRET="<copy from existing .env or Netlify dashboard>"
SMTP_HOST="smtp.agentmail.to"
SMTP_PORT="465"
SMTP_USER="<copy from existing .env or Netlify dashboard>"
SMTP_PASS="<copy from existing .env or Netlify dashboard>"
EMAIL_FROM="<same as SMTP_USER>"
GOOGLE_CLIENT_ID="<from Google Cloud Console>"
GOOGLE_CLIENT_SECRET="<from Google Cloud Console>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **IMPORTANT:** Copy the actual secret values from the `.env` file on your current PC, or from the Netlify dashboard (Site settings > Environment variables). Do NOT commit secrets to git.
>
> **For production (Netlify):** These are already set in the Netlify dashboard. The production `NEXT_PUBLIC_APP_URL` is `https://jamesstudy.netlify.app`.

### 5. Run the dev server
```bash
npm run dev
```
Opens at http://localhost:3000

### 6. Run tests
```bash
# Start dev server first, then in another terminal:
npx vitest run
```

---

## Environment Variables Reference

| Variable | Purpose | Where Set |
|----------|---------|-----------|
| `DATABASE_URL` | Local SQLite fallback | `.env` only |
| `TURSO_DATABASE_URL` | Turso cloud database URL | `.env` + Netlify |
| `TURSO_AUTH_TOKEN` | Turso auth token (read-write) | `.env` + Netlify |
| `JWT_SECRET` | JWT signing secret for auth cookies | `.env` + Netlify |
| `SMTP_HOST` | Email server host | `.env` + Netlify |
| `SMTP_PORT` | Email server port | `.env` + Netlify |
| `SMTP_USER` | Email account username | `.env` + Netlify |
| `SMTP_PASS` | Email account password | `.env` + Netlify |
| `EMAIL_FROM` | Sender email address | `.env` + Netlify |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (Calendar sync) | `.env` + Netlify |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `.env` + Netlify |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID (Outlook sync) | `.env` + Netlify (not yet set up) |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth client secret | `.env` + Netlify (not yet set up) |
| `NEXT_PUBLIC_APP_URL` | App base URL for OAuth redirects | `.env` (localhost) + Netlify (production URL) |

---

## Key File Locations

| File/Folder | Purpose |
|-------------|---------|
| `.env` | Environment variables (NOT in git) |
| `prisma/schema.prisma` | Database schema |
| `src/proxy.ts` | Auth middleware (protects all routes except public paths) |
| `src/lib/calendar.ts` | Google/Outlook OAuth + Calendar sync logic |
| `src/lib/music-player.ts` | MP3 music player with crossfade looping |
| `src/lib/auth.ts` | JWT auth utilities |
| `public/music/` | MP3 files for Pomodoro & Meditate pages |
| `netlify.toml` | Netlify build config |
| `.claude/launch.json` | Claude Code dev server config |

---

## Infrastructure

| Service | Details |
|---------|---------|
| **Hosting** | Netlify (auto-deploys on push to `master`) |
| **Database** | Turso (LibSQL cloud) — shared between dev and prod |
| **Email** | AgentMail SMTP |
| **GitHub** | `stanleychoi1234/james-study-app` |
| **Live URL** | https://jamesstudy.netlify.app |
| **Test user** | See `.env` for credentials |

---

## Google Calendar OAuth Setup

Already configured. If you need to manage it:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Project has Google Calendar API enabled
3. OAuth 2.0 credentials are under APIs & Services > Credentials
4. Authorized redirect URIs:
   - `http://localhost:3000/api/calendar/google/callback` (dev)
   - `https://jamesstudy.netlify.app/api/calendar/google/callback` (prod)

## Microsoft Outlook Calendar OAuth Setup

**Not yet configured.** When ready:
1. Go to [Azure Portal > App registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Register new app with "Accounts in any org + personal Microsoft accounts"
3. Add Web redirect URI: `http://localhost:3000/api/calendar/outlook/callback`
4. Add API permission: `Calendars.ReadWrite` (Microsoft Graph)
5. Create client secret under Certificates & secrets
6. Add `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` to `.env` and Netlify

---

## Netlify CLI

If you need to manage Netlify env vars or deploy manually:
```bash
npx netlify login          # One-time auth
npx netlify env:list       # View all env vars
npx netlify env:set KEY VALUE  # Set an env var
npx netlify deploy --prod  # Manual deploy (avoid unless necessary — burns credits)
```

---

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Prisma 7** with `@prisma/adapter-libsql` (Turso)
- **Tailwind CSS**
- **JWT** httpOnly cookie auth
- **Vitest** for testing
- **googleapis** + `@azure/msal-node` for calendar sync
