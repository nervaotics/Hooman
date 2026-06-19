# Hooman

Windows desktop HRM: **Electron + React (Vite) + Supabase Postgres**, with **ZKTeco** attendance on the Server PC.

## Architecture

| Role | Responsibility |
|------|----------------|
| **Server PC** | Polls ZKTeco devices on the LAN, queues punches in a local SQLite outbox, syncs to Supabase |
| **Client PC** | Reads/writes HRM data via Supabase — no XAMPP, no LAN database |

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (Postgres + optional Realtime)
- Database password from Supabase → Settings → Database

## Quick start

1. Copy `.env.example` to `.env` and set `JWT_SECRET`.
2. Install dependencies:

```bash
npm install
```

If Electron fails with *"failed to install correctly"*:

```bash
npm run electron:install
```

3. Run in development (**use the Hooman desktop window — not the browser tab**):

```bash
npm run dev
```

4. On first launch:
   - Choose **Server** or **Client** role.
   - Connect to **Supabase** (project URL + database password).
   - Create the **first super admin** when prompted.
   - Sign in.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite on `:5173` + Electron |
| `npm run build` | Production Vite build (`dist/`) |
| `npm run dist` / `npm run dist:win` | Build renderer + Windows NSIS installer |
| `node scripts/migrate-mysql-to-supabase.cjs` | One-time MySQL → Supabase data migration |

## Defaults

- **App ID:** `com.hooman.desktop`
- **Org timezone:** `Asia/Karachi`
- **First ZKTeco device:** Ground Floor Block-22 @ `192.168.0.21:4370`

## Server PC (attendance edge)

The Server PC polls biometric devices every few minutes. Punches are written to a local SQLite outbox first, then uploaded to Supabase when online.

**After reboot:** Hooman auto-starts with Windows (enabled by default on Server setup), runs in the system tray, and keeps polling even when the main window is closed. Open **Settings → Overview** to change startup behavior.

Enable Realtime on `attendance_logs` in Supabase for live UI updates on all workstations.

## Migrating from MySQL / XAMPP

For offices upgrading from the legacy LAN MySQL setup:

1. Create a Supabase project and run the SQL in `supabase/migrations/` (or let Hooman apply schema on first connect).
2. Export existing data:

```bash
set MYSQL_HOST=192.168.0.107
set MYSQL_PASS=your-mysql-password
set SUPABASE_PROJECT_REF=your-project-ref
set SUPABASE_DB_PASSWORD=your-supabase-db-password
node scripts/migrate-mysql-to-supabase.cjs
```

3. Configure each Hooman install with Supabase credentials (Server role on the attendance PC only).

## Auto-updates

Packaged builds use `electron-updater` against GitHub Releases. See release scripts in `package.json` (`npm run release:patch`, etc.).

## Troubleshooting

- **Electron window never opens:** Vite must listen on `127.0.0.1`. After `npm run dev`, you should see both `[vite]` and `[electron]` in the terminal.
- **Browser shows undefined IPC methods:** Close the browser tab; use the **Hooman desktop window** only.
- **Attendance not live:** Add Supabase anon or service role key during setup and enable Realtime replication for `attendance_logs`.

## Security notes

- Never commit real `.env` secrets.
- Rotate `JWT_SECRET` before production use.
- Service role key belongs on the Server PC only (Electron main process).
- Supabase **database password and API keys** are stored in `%APPDATA%\\Hooman\\hooman-config.json` using **Windows DPAPI** (via Electron `safeStorage`). They are not plain text and cannot be edited in Notepad to change credentials. If the file is tampered with, Hooman prompts to re-enter Supabase settings.
- Secrets are never sent to the React UI — only “password is set” flags and the project URL.
