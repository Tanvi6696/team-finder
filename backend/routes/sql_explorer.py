"""
SQL Explorer endpoints:
  GET  /api/sql-queries  — parse database/queries.sql
  POST /api/sql-run      — run one SELECT as explorer_ro
"""

import os
import re
import time
from flask import Blueprint, jsonify, request

from auth import login_required
from db import get_readonly_connection, make_json_safe

sql_bp = Blueprint("sql_explorer", __name__)

# Path to queries.sql (repo root / database / queries.sql)
QUERIES_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "database", "queries.sql")
)

# Keywords that mean the statement is NOT a plain SELECT
FORBIDDEN_KEYWORDS = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REPLACE|"
    r"CALL|EXECUTE|LOAD|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b",
    re.IGNORECASE,
)


def _is_modifies(sql_text):
    """
    Classify query type.
    MODIFIES = UPDATE / CREATE VIEW / DELETE (including ones that were commented out)
    SELECT   = everything else that starts with SELECT
    """
    # Strip leading SQL comments for classification of the active statement
    lines = []
    for line in sql_text.splitlines():
        stripped = line.strip()
        # Keep uncommented content; for all-comment blocks (QUERY 6) detect DELETE inside
        lines.append(stripped)

    joined = "\n".join(lines)
    upper = joined.upper()

    # Commented-out DELETE still counts as MODIFIES (we uncomment for the client)
    if re.search(r"--\s*DELETE\b", upper) or re.search(r"^\s*DELETE\b", upper, re.M):
        return True
    if re.search(r"\bUPDATE\b", upper):
        return True
    if re.search(r"\bCREATE\b", upper):
        return True
    return False


def _uncomment_sql(sql_text):
    """
    For QUERY 6 style blocks: turn '-- DELETE ...' into 'DELETE ...'.
    Leaves normal SQL (and section comments) alone when there is live SQL.
    """
    lines = sql_text.splitlines()
    has_live = any(
        ln.strip() and not ln.strip().startswith("--")
        for ln in lines
    )
    if has_live:
        return sql_text.strip()

    # Entire block is comments — uncomment SQL-looking lines
    out = []
    for ln in lines:
        m = re.match(r"^(\s*)--\s?(.*)$", ln)
        if m:
            out.append(m.group(1) + m.group(2))
        else:
            out.append(ln)
    return "\n".join(out).strip()


def parse_queries_file():
    """
    Parse database/queries.sql into a list of
    {number, section, sql, type}.

    Each block starts with '-- QUERY n'.
    section = nearest preceding descriptive header between '-- ====' banners.
    """
    if not os.path.isfile(QUERIES_PATH):
        return []

    with open(QUERIES_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()

    current_section = ""
    queries = []
    i = 0
    while i < len(lines):
        line = lines[i].rstrip("\n")
        stripped = line.strip()

        # Section banners: a line of dashes, then a title line, then dashes
        if re.match(r"^--\s*=+$", stripped):
            # Peek at next non-empty line for the section title
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            if j < len(lines):
                title_line = lines[j].strip()
                if title_line.startswith("--") and not re.match(r"^--\s*=+$", title_line):
                    # Skip the file-level title that is not a concept group if needed
                    title = title_line.lstrip("- ").strip()
                    # Ignore the top-of-file project title lines that are not concept groups
                    if title and not title.upper().startswith("QUERY"):
                        current_section = title
            i += 1
            continue

        # Start of a query block
        m = re.match(r"^--\s*QUERY\s+(\d+)\s*$", stripped)
        if m:
            number = int(m.group(1))
            i += 1
            sql_lines = []
            # Collect until next QUERY header or next ==== banner or EOF
            while i < len(lines):
                nxt = lines[i].rstrip("\n")
                nxt_stripped = nxt.strip()
                if re.match(r"^--\s*QUERY\s+\d+\s*$", nxt_stripped):
                    break
                if re.match(r"^--\s*=+$", nxt_stripped):
                    break
                sql_lines.append(nxt)
                i += 1

            raw_sql = "\n".join(sql_lines).strip()
            # Drop trailing blank lines already handled by strip
            sql_for_client = _uncomment_sql(raw_sql)
            qtype = "MODIFIES" if _is_modifies(raw_sql) else "SELECT"

            queries.append({
                "number": number,
                "section": current_section,
                "sql": sql_for_client,
                "type": qtype,
            })
            continue

        i += 1

    return queries


@sql_bp.get("/sql-queries")
@login_required
def list_sql_queries():
    """Return the 30 curated queries parsed from queries.sql."""
    queries = parse_queries_file()
    if not queries:
        return jsonify({"error": f"Could not read {QUERIES_PATH}"}), 500
    return jsonify(queries)


def _validate_select_only(sql):
    """
    Allow only a single SELECT statement.
    Rejects ; chaining and any write / DDL keywords.
    Returns (ok: bool, error_message or None).
    """
    if not sql or not sql.strip():
        return False, "SQL is required"

    cleaned = sql.strip()

    # Remove trailing semicolon for the single-statement check
    if cleaned.endswith(";"):
        cleaned = cleaned[:-1].strip()

    # Reject any remaining semicolons (chained statements)
    if ";" in cleaned:
        return False, "Only a single SELECT statement is allowed (no ; chaining)"

    # Strip block and line comments for keyword checks
    no_block = re.sub(r"/\*.*?\*/", " ", cleaned, flags=re.S)
    no_line = re.sub(r"--.*?$", " ", no_block, flags=re.M)
    compact = " ".join(no_line.split())

    if not re.match(r"^SELECT\b", compact, re.IGNORECASE):
        return False, "Only SELECT queries are allowed"

    if FORBIDDEN_KEYWORDS.search(compact):
        return False, "Write / DDL keywords are not allowed in the SQL Explorer"

    return True, cleaned


@sql_bp.post("/sql-run")
@login_required
def run_sql():
    """
    Body: { "sql": "SELECT ..." }
    Runs as explorer_ro on a separate connection. Max 200 rows.
    """
    data = request.get_json(silent=True) or {}
    sql = data.get("sql", "")

    ok, result = _validate_select_only(sql)
    if not ok:
        return jsonify({"error": result}), 400

    cleaned_sql = result

    # Enforce row limit without requiring the student to type LIMIT
    limited_sql = f"SELECT * FROM ({cleaned_sql}) AS _explorer_sub LIMIT 200"

    # Some SELECTs already have LIMIT / are not subquery-friendly (e.g. nothing weird).
    # Prefer wrapping; if MySQL rejects the wrap we fall back to appending LIMIT.
    conn = None
    try:
        conn = get_readonly_connection()
        cursor = conn.cursor()

        started = time.perf_counter()
        try:
            cursor.execute(limited_sql)
        except Exception:
            # Fallback: append LIMIT if not already present
            fallback = cleaned_sql
            if not re.search(r"\bLIMIT\b", cleaned_sql, re.IGNORECASE):
                fallback = cleaned_sql + " LIMIT 200"
            cursor.execute(fallback)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

        columns = [col[0] for col in cursor.description] if cursor.description else []
        raw_rows = cursor.fetchall()
        rows = []
        for raw in raw_rows:
            rows.append([make_json_safe(v) for v in raw])

        cursor.close()

        return jsonify({
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "execution_ms": elapsed_ms,
        })
    except Exception as err:
        # mysql.connector errors and others → friendly JSON
        msg = getattr(err, "msg", None) or str(err)
        return jsonify({"error": msg}), 400
    finally:
        if conn is not None:
            conn.close()
