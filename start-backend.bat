@echo off
title Vedic Astrologer - Backend (port 8000)
cd /d "%~dp0backend"
call .venv\Scripts\activate.bat
echo Backend starting on http://localhost:8000  (close this window to stop)
python -m uvicorn app.main:app --port 8000 --reload
pause