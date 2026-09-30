@echo off
REM Reset College Project Team Finder database
REM Runs database.sql, db_upgrades.sql, then seed_passwords.py
REM Tip: set MYSQL_PWD to skip the password prompt (non-interactive).

setlocal
cd /d "%~dp0"

REM Locate mysql.exe (PATH first, then common install dirs)
set "MYSQL_EXE="
where mysql >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%I in ('where mysql') do (
        set "MYSQL_EXE=%%I"
        goto :mysql_found
    )
)
if exist "%ProgramFiles%\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    set "MYSQL_EXE=%ProgramFiles%\MySQL\MySQL Server 8.0\bin\mysql.exe"
    goto :mysql_found
)
if exist "%ProgramFiles%\MySQL\MySQL Server 8.4\bin\mysql.exe" (
    set "MYSQL_EXE=%ProgramFiles%\MySQL\MySQL Server 8.4\bin\mysql.exe"
    goto :mysql_found
)
if exist "%ProgramFiles%\MySQL\MySQL Server 8.3\bin\mysql.exe" (
    set "MYSQL_EXE=%ProgramFiles%\MySQL\MySQL Server 8.3\bin\mysql.exe"
    goto :mysql_found
)

echo mysql.exe not found. Add MySQL bin to PATH or install MySQL 8.
exit /b 1

:mysql_found
echo Using: %MYSQL_EXE%

REM SOURCE needs forward slashes
set "DB_SQL=%~dp0database.sql"
set "UP_SQL=%~dp0db_upgrades.sql"
set "DB_SQL=%DB_SQL:\=/%"
set "UP_SQL=%UP_SQL:\=/%"

echo Running database.sql ...
if defined MYSQL_PWD (
    "%MYSQL_EXE%" -u root < "%~dp0database.sql"
) else (
    REM -p prompts on the console; -e SOURCE avoids stdin/password clash
    "%MYSQL_EXE%" -u root -p -e "SOURCE %DB_SQL%"
)
if errorlevel 1 (
    echo Failed to run database.sql
    exit /b 1
)

echo Running db_upgrades.sql ...
if defined MYSQL_PWD (
    "%MYSQL_EXE%" -u root < "%~dp0db_upgrades.sql"
) else (
    "%MYSQL_EXE%" -u root -p -e "SOURCE %UP_SQL%"
)
if errorlevel 1 (
    echo Failed to run db_upgrades.sql
    exit /b 1
)

echo Seeding real password hashes (demo123) ...
cd /d "%~dp0..\backend"
if exist "venv\Scripts\python.exe" (
    "venv\Scripts\python.exe" seed_passwords.py
) else (
    python seed_passwords.py
)
if errorlevel 1 (
    echo Failed to run seed_passwords.py
    exit /b 1
)

echo Database reset complete.
endlocal
