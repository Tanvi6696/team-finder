"""
auth.py — JWT login helpers (simple + commented for viva).

Flow:
  1. Client POSTs email/password to /api/auth/login
  2. Server checks hash with werkzeug, builds a JWT containing student_id
  3. Client sends: Authorization: Bearer <token>
  4. @login_required reads the token and sets flask.g.student_id
"""

import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import request, jsonify, g
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Secret used to sign JWTs — never hardcode in source; load from .env
JWT_SECRET = os.getenv("JWT_SECRET", "dev-jwt-secret-change-me")
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
JWT_ALG = "HS256"


def create_token(student_id):
    """Build a JWT that expires after JWT_EXPIRY_HOURS (default 24)."""
    now = datetime.now(timezone.utc)
    payload = {
        "student_id": int(student_id),
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    # PyJWT returns a string in recent versions
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def verify_token(token):
    """
    Decode JWT and return student_id, or None if invalid/expired.
    """
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return int(data["student_id"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        return None


def login_required(view_fn):
    """
    Decorator for protected routes.
    Expects: Authorization: Bearer <jwt>
    On success: g.student_id is set from the token (never trust query/body ids).
    """

    @wraps(view_fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Login required"}), 401

        token = header[7:].strip()
        student_id = verify_token(token)
        if not student_id:
            return jsonify({"error": "Invalid or expired token"}), 401

        g.student_id = student_id
        return view_fn(*args, **kwargs)

    return wrapper


# Columns we are allowed to return to the client (never password_hash)
STUDENT_SAFE_FIELDS = (
    "student_id",
    "first_name",
    "last_name",
    "email",
    "department_id",
    "department_name",
    "department_code",
    "year_of_study",
    "college",
    "bio",
    "github_portfolio",
    "experience_level",
    "availability_status",
    "account_status",
    "created_at",
)


def student_public_dict(row):
    """Strip password_hash (and anything else sensitive) from a student row."""
    if not row:
        return None
    return {k: row[k] for k in STUDENT_SAFE_FIELDS if k in row}
