"""
seed_passwords.py

After database.sql inserts students with placeholder password_hash values
like 'hash_ananya', this script replaces ALL of them with a real Werkzeug
hash of the shared demo password: demo123

Run automatically from database/reset.bat and reset.sh.
"""

import os
import sys

from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
import mysql.connector

# Load backend/.env (same folder as this file)
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DEMO_PASSWORD = "demo123"


def main():
    host = os.getenv("DB_HOST", "localhost")
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    database = os.getenv("DB_NAME", "college_team_finder")

    # Hash once, reuse for every student (demo convenience)
    hashed = generate_password_hash(DEMO_PASSWORD)

    print(f"Connecting to {database} @ {host} ...")
    conn = mysql.connector.connect(
        host=host,
        user=user,
        password=password,
        database=database,
    )
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE students SET password_hash = %s",
            (hashed,),
        )
        conn.commit()
        print(f"Updated {cursor.rowcount} student password_hash value(s) to hash of '{DEMO_PASSWORD}'.")
        cursor.close()
    except Exception as err:
        conn.rollback()
        print(f"ERROR: {err}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
