# Team Finder — Frontend

React + Vite + Tailwind CSS **v3.4** UI for the College Project Team Finder DBMS project.

## Run

```bat
cd backend
venv\Scripts\activate
python app.py

cd ..\frontend
npm install
npm run dev
```

- App: http://localhost:5173/login
- After login you land on **/home**
- Demo login: `ananya@example.com` / `hash_ananya`

## Reset demo data

To wipe and reload the MySQL seed (tables, sample rows, triggers, procedures, views):

```bat
cd database
set MYSQL_PWD=YOUR_ROOT_PASSWORD
reset.bat
```

Or run `database.sql` then `db_upgrades.sql` with `mysql -u root -p`.

After a reset, refresh the browser. Join-request / accept demos start from a clean slate.

## Pages

| Route | Purpose |
|-------|---------|
| `/login` | Demo auth → Bearer token |
| `/home` | Personal Home (`GET /api/me/dashboard`) |
| `/discover` | Project cards, match %, join requests |
| `/inbox` | Accept / reject join requests |
| `/teammates` | Skill filters + student radar drawer |
| `/network` | Force graph of `team_connections` |
| `/insights` | Campus Insights (global Recharts) |
| `/sql` | SQL Explorer |

**Under the Hood** (bottom bar) logs `executed[]` from write APIs — green commit / red rollback.
