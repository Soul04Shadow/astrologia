@echo off
title Vedic Astrologer - Frontend (port 3000)
cd /d "%~dp0frontend"
echo Frontend starting on http://localhost:3000  (close this window to stop)
npm run dev -- --port 3000
pause