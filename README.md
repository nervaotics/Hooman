# Hooman

Windows desktop HRM for small LAN deployments: **Electron + React (Vite) + MySQL**, with optional **ZKTeco** attendance pulls.

## Prerequisites

- Node.js 20+ recommended  
- MySQL 8+ (for example XAMPP on your central server)  
- Database `hooman_hrm` created empty, or let migrations assume existing server user can create schema

## Quick start

1. Copy `.env.example` to `.env` and set `JWT_SECRET` (and DB defaults for local dev).
2. Ensure MySQL is reachable from this PC using the values you put in `.env`.
3. Install dependencies (includes Electron binary download):

```bash
npm install
```

If Electron fails with *"failed to install correctly"*, run:

```bash
npm run electron:install
```

4. Run in development (**use the Hooman desktop window — not the browser tab**):

```bash
npm run dev
```

4. On first launch:
   - Complete **Database** setup (stored in `electron-store`, overrides `.env` on this machine).
   - Create the **first super admin** when prompted.
   - Sign in from the login screen.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite on `:5173` + Electron |
| `npm run build` | Production Vite build (`dist/`) |
| `npm run dist` / `npm run dist:win` | Build renderer + Windows NSIS installer |
| `npm run migrate` | Run Knex migrations using `.env` only (CLI helper) |

## Defaults you chose

- **App ID:** `com.hooman.desktop`  
- **Default DB name:** `hooman_hrm`  
- **Org timezone:** `Asia/Karachi` (store UTC in MySQL; format in UI later)  
- **First ZKTeco device:** Ground Floor Block-22 @ `192.168.0.21:4370`  

## Auto-updates

`electron-builder.yml` uses a **generic** publish URL placeholder. After you create a GitHub repo and release pipeline, point `publish` to your update feed (or GitHub Releases via `electron-updater`).

## Troubleshooting

- **Electron window never opens:** Vite must listen on `127.0.0.1` (not only `localhost`). The dev script uses `vite --host 127.0.0.1`. After `npm run dev`, you should see both `[vite]` and `[electron]` lines in the terminal.
- **Browser shows `testDbConnection` undefined:** Close the browser tab; use the **Hooman desktop window** only.
- **`electron-builder` / `npm run dist` times out:** Retry on a stable connection, or run `npm run build` to verify the UI only.

## Security notes

- Never commit real `.env` secrets.  
- Rotate `JWT_SECRET` before production use.  
- Central MySQL should be LAN-firewalled; Hooman stores connection details per workstation.
