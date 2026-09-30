# College Project Team Finder — Flask Backend

## Setup

1. Make sure MySQL is running and the database is loaded:

```bat
cd database
set MYSQL_PWD=12345
reset.bat
```

2. Create a virtualenv and install dependencies:

```bat
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

3. Copy env file and set your root password:

```bat
copy .env.example .env
```

Edit `.env` — set `DB_PASSWORD` to your MySQL root password.
`RO_USER` / `RO_PASSWORD` must match the explorer user from `db_upgrades.sql`.

4. Run the API:

```bat
flask --app app run --debug --port 5000
```

Or:

```bat
python app.py
```

API base URL: `http://127.0.0.1:5000/api`

## Quick test

```bat
curl http://127.0.0.1:5000/api/health
curl http://127.0.0.1:5000/api/students
curl "http://127.0.0.1:5000/api/projects?student_id=1"
curl http://127.0.0.1:5000/api/sql-queries
```

## Endpoints (summary)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/login` | `{email, password}` → Bearer token (demo: password = `password_hash`) |
| GET | `/api/me/dashboard` | login required — personal dashboard + `executed` SQL log |
| GET | `/api/students` | filters: skill, department, availability, search |
| GET | `/api/students/<id>` | includes skills |
| GET | `/api/projects?student_id=` | match %, required / matched / missing skills |
| GET | `/api/projects/<id>?student_id=` | + team members |
| POST | `/api/join-requests` | body: project_id, sender_id, message |
| GET | `/api/join-requests?student_id=&type=` | received \| sent |
| POST | `/api/join-requests/<id>/accept` | CALL accept_join_request |
| POST | `/api/join-requests/<id>/reject` | CALL reject_join_request |
| GET | `/api/stats` | dashboard aggregates |
| GET | `/api/connections` | nodes + edges |
| GET | `/api/departments` | lookup |
| GET | `/api/skills` | lookup |
| GET | `/api/sql-queries` | parsed from `database/queries.sql` |
| POST | `/api/sql-run` | SELECT-only as `explorer_ro` |
| POST | `/api/projects/<id>/dream-team?size=N` | greedy picks |
| GET | `/api/projects/<id>/recruit-suggestions` | uncovered skills + fits |

Write endpoints also return an `executed` array for the "Under the Hood" UI panel.
