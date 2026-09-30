#!/usr/bin/env bash
# Reset College Project Team Finder database
# Runs database.sql, db_upgrades.sql, then seed_passwords.py
# Tip: export MYSQL_PWD to skip the password prompt (non-interactive).

set -e
cd "$(dirname "$0")"

if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql not found. Add MySQL bin to PATH."
  exit 1
fi

echo "Running database.sql ..."
if [[ -n "${MYSQL_PWD:-}" ]]; then
  mysql -u root < database.sql
else
  # -p prompts on the TTY; SOURCE avoids stdin/password clash
  mysql -u root -p -e "SOURCE $(pwd)/database.sql"
fi

echo "Running db_upgrades.sql ..."
if [[ -n "${MYSQL_PWD:-}" ]]; then
  mysql -u root < db_upgrades.sql
else
  mysql -u root -p -e "SOURCE $(pwd)/db_upgrades.sql"
fi

echo "Seeding real password hashes (demo123) ..."
BACKEND_DIR="$(cd ../backend && pwd)"
if [[ -x "$BACKEND_DIR/venv/bin/python" ]]; then
  "$BACKEND_DIR/venv/bin/python" "$BACKEND_DIR/seed_passwords.py"
elif [[ -x "$BACKEND_DIR/venv/Scripts/python.exe" ]]; then
  "$BACKEND_DIR/venv/Scripts/python.exe" "$BACKEND_DIR/seed_passwords.py"
else
  python "$BACKEND_DIR/seed_passwords.py"
fi

echo "Database reset complete."
