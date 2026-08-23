@echo off
echo Stopping backend (uvicorn/python)...
taskkill /F /IM python.exe >nul 2>&1
echo Stopping frontend (next/node)...
taskkill /F /IM node.exe >nul 2>&1
echo All stopped.
pause