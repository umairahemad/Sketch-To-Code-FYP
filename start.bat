@echo off
echo ==========================================
echo Starting Sketch-to-Code Backend and Frontend
echo ==========================================

:: Start Backend in a new terminal window
start "FastAPI Backend" cmd /k "cd /d %~dp0backend && py -m uvicorn main:app --reload"

:: Start Frontend in a new terminal window
start "React Frontend" cmd /k "cd /d %~dp0 && npm run dev"