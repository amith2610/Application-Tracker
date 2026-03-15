# Job Application Tracker

A Huntr-inspired job application tracker with Kanban board, contacts, documents, analytics, and shareable links.

## Features

- **User accounts** — Sign up and log in with email and password; data is isolated per user
- **Import from Gmail (AI)** — Connect Gmail, scan emails with Hugging Face AI (classification + extraction), auto-import job applications
- **Kanban Board** — Drag-and-drop pipeline: Applied → Interviewing → Offer → Rejected
- **Job Applications** — Create, edit, delete applications with company, role, salary, description
- **Activity Timeline** — Track applied, interview, offer, and rejection events per application
- **Contacts** — Manage recruiters and contacts, linked to applications
- **Documents** — Upload resumes and cover letters per job (PDF, DOC, DOCX, TXT)
- **Analytics** — Metrics dashboard with stage distribution, conversion rate, response times
- **Share** — Generate read-only shareable links for board or individual applications

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **Prisma** + SQLite for database
- **@dnd-kit** for Kanban drag-and-drop
- **Recharts** for analytics charts
- **React Hook Form** + **Zod** for form validation

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy the example env file and set variables:

```bash
cp .env.example .env
# Required: DATABASE_URL="file:./dev.db", SESSION_PASSWORD (32+ character secret for session encryption)
# For Gmail import: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, HUGGINGFACE_API_KEY
# Optional: ADMIN_EMAIL + RESEND_API_KEY to receive an email when a new user signs up (so you can add them to Google Cloud test users)
```

3. Run database migrations (if not already applied):

```bash
npx prisma migrate dev
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### First Run

The SQLite database is created at `prisma/dev.db`. Documents are stored in the `uploads/` directory. To clear all applications (e.g. before enabling user accounts), run: `npm run clear-applications`.

### User accounts and Gmail

- Users **sign up** with email and password and **log in** to access the app. Data (jobs, applications, contacts, documents) is **per user**.
- When a **new user signs up**, you can receive an email (set `ADMIN_EMAIL` and `RESEND_API_KEY` in `.env`) so you can add that user’s email to your **Google Cloud OAuth consent screen test users**. That allows them to connect Gmail.
- Add their email at [Google Cloud Console → APIs & Services → OAuth consent screen → Test users](https://console.cloud.google.com/apis/credentials/consent).

### Gmail Import (Optional)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Gmail API
3. Create OAuth 2.0 credentials (Web application), add redirect URI: `http://localhost:3000/api/auth/callback`
4. In **OAuth consent screen**, add each user’s email as a **Test user** (or they’ll get “access blocked” in production/test mode)
5. Get a [Hugging Face API token](https://huggingface.co/settings/tokens) (free)
6. Add to `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `HUGGINGFACE_API_KEY`

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Kanban board (home)
│   ├── jobs/                 # Job list, create, detail
│   ├── contacts/             # Contact management
│   ├── documents/            # All documents
│   ├── analytics/            # Metrics dashboard
│   ├── share/[token]/        # Public share view
│   └── api/                  # API routes
├── components/
│   ├── kanban/               # Kanban board components
│   ├── forms/                # Form components
│   └── ui/                   # Shared UI components
└── lib/
    ├── db.ts                 # Prisma client
    └── utils.ts              # Utilities
```

## Deployment

The app uses SQLite and local file uploads, so it needs a host with **persistent disk**. The same `Dockerfile` is used for both Fly.io and Railway.

### Deploy on Railway

**Prerequisites**

- [Railway](https://railway.app) account
- GitHub repo connected (or deploy via Railway CLI)

**Steps**

1. **New project**: Create a new project in Railway, then **Add service** → **GitHub repo** and select this repo (or use **Empty service** and deploy with `railway up`).

2. **Volume**: In the service, add a **Volume** (e.g. service → Variables → Volumes, or "Add volume"). Set the **mount path** to `/data`.

3. **Env vars**: In the service **Variables**, set:
   - `DATABASE_URL` = `file:/data/dev.db`
   - `DATA_DIR` = `/data`
   - `SESSION_PASSWORD` = (32+ character secret)
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` = production redirect (see below)
   - `NEXT_PUBLIC_APP_URL` = `https://<your-app>.up.railway.app` (or the custom domain you attach)
   - `HUGGINGFACE_API_KEY` = (and optional `ADMIN_EMAIL`, `RESEND_API_KEY`, `FROM_EMAIL`, `HF_RESUME_*`)

4. **Google OAuth**: In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), add **Authorized redirect URI**: `https://<your-app>.up.railway.app/api/auth/callback` (replace with your Railway URL or custom domain).

5. **Deploy**: If connected to GitHub, push to the branch Railway watches; or run `railway up` from the repo root. Railway builds from the Dockerfile and runs the container with the volume mounted at `/data`.

6. **URL**: Use the generated `*.up.railway.app` URL (or attach a custom domain in Railway). Verify signup, login, Gmail connect, and document upload.

**Backups**

Data is on the volume at `/data` (SQLite at `/data/dev.db`, uploads at `/data/uploads`). Use Railway’s volume backup/snapshot if available, or run a one-off job/script that copies `/data` to external storage.

### Deploy on Fly.io

Fly.io’s free tier supports a volume for the database and uploads (same Dockerfile as Railway).

**Prerequisites**

- [Fly.io account](https://fly.io) and [flyctl](https://fly.io/docs/hub/installing/) installed (`brew install flyctl` or see docs).
- Production env vars ready (see below).

**Steps**

1. **Create the app and volume** (from the project root):

   ```bash
   fly launch
   ```
   When prompted, choose an app name (or use the default), do not add a Postgres or Redis DB, and select a region.

2. **Create a volume** for SQLite and uploads:

   ```bash
   fly volumes create app_data --size 1
   ```
   Note the volume name (e.g. `app_data`). In `fly.toml`, uncomment the `[[mounts]]` section and set `source` to that volume name so the volume is mounted at `/data`.

3. **Set secrets** (env vars that must not be in git). Set at least:

   ```bash
   fly secrets set DATABASE_URL="file:/data/dev.db"
   fly secrets set SESSION_PASSWORD="your-32-char-or-longer-secret"
   fly secrets set GOOGLE_CLIENT_ID="..."
   fly secrets set GOOGLE_CLIENT_SECRET="..."
   fly secrets set GOOGLE_REDIRECT_URI="https://YOUR_APP_NAME.fly.dev/api/auth/callback"
   fly secrets set NEXT_PUBLIC_APP_URL="https://YOUR_APP_NAME.fly.dev"
   fly secrets set HUGGINGFACE_API_KEY="..."
   ```
   Optionally: `ADMIN_EMAIL`, `RESEND_API_KEY`, `FROM_EMAIL`, and any `HF_RESUME_*` model vars.

4. **Google OAuth**: In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), add an **Authorized redirect URI**: `https://YOUR_APP_NAME.fly.dev/api/auth/callback`.

5. **Deploy**:

   ```bash
   fly deploy
   ```

6. Open `https://YOUR_APP_NAME.fly.dev` and verify signup, login, and (if configured) Gmail connect and document upload.

**Backups**

Data lives on the Fly volume: SQLite at `/data/dev.db` and uploads at `/data/uploads`. To back up:

- Use `fly ssh console` and copy `/data` out, or
- Use a scheduled job or script that runs inside the app (or a separate one-off machine) to stream the DB and uploads to external storage (e.g. S3). Fly.io does not auto-back up volumes.

## License

MIT
