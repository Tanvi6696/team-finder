# College Project Team Finder

A student project team finder with a Flask REST API, MySQL database, and React interface. Students can create projects, find teammates by skill match, manage their profile and skills, and track team requests.

## Requirements

- Python 3.10 or newer
- Node.js and npm
- MySQL 8

## Configure the database

Create the database and load the SQL files in this order:

1. `database/database.sql`
2. `database/db_upgrades.sql`

For example, from PowerShell in the project directory:

```powershell
mysql -u root -p < database/database.sql
mysql -u root -p college_team_finder < database/db_upgrades.sql
```

## Configure and run the backend

```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` with your local MySQL password and a private JWT secret. Then start the API:

```powershell
python -m flask --app app run --debug --port 5000
```

The API base URL is `http://localhost:5000/api`.

## Run the frontend

Open a second PowerShell terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local address printed by Vite, usually `http://localhost:5173`.

## Main pages

| Route | Description |
| --- | --- |
| `/login` | Sign in or create an account with the three-step registration wizard |
| `/home` | Personal dashboard, requests, projects, matches, and skill gaps |
| `/discover` | Browse and create projects |
| `/inbox` | Review received project requests |
| `/teammates` | Find students and potential teammates |
| `/network` | Explore the team connection graph |
| `/insights` | Campus-wide charts |
| `/sql` | Read-only SQL Explorer |
| `/profile` | Edit profile, manage skills, and change password |

Writes that support the Under the Hood panel return an `executed` array containing SQL and parameters. Profile and skill APIs take the student ID from the login token.

## Quick API check

With the backend running:

```powershell
curl.exe http://localhost:5000/api/health
```

Sign up through `/login` or sign in with an existing database account to try the protected pages.
