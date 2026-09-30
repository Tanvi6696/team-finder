# College Project Team Finder — Project Rules

## Stack
- Database: MySQL 8
- Backend: Flask REST API with mysql-connector-python and flask-cors
- Frontend: React + Vite + Tailwind CSS v3.4 (pin v3, do not use v4)
- Frontend libraries: framer-motion, recharts, react-router-dom, lucide-react, react-hot-toast

## Database files — DO NOT EDIT
- Never edit `database/database.sql` or `database/queries.sql`.
- Any new schema/data changes go in `database/db_upgrades.sql` only.

## API / SQL conventions
- Use parameterized queries only (prepared statements / placeholders).
- Exception: the SELECT-only SQL Explorer may run raw SELECT queries (still no writes).
- Return JSON errors in this exact shape: `{"error": "..."}`.

## Code style
- Keep code simple and well commented — a student must explain every part in a viva/oral exam.
- Prefer clear names and small functions over clever abstractions.

## After each task
- Tell the user the exact command to run.
- Tell the user how to test that the change works.
