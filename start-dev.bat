@echo off
echo ========================================
echo FounderBrain Development Servers
echo ========================================
echo.
echo Starting both servers in separate windows:
echo   - API Server on port 23608
echo   - Frontend on port 3000
echo.
echo Frontend will proxy /api requests to the API server.
echo.
echo Close the server windows to stop them.
echo Press Ctrl+C in this window to exit.
echo ========================================
echo.

REM Start API server
cd /d "%~dp0artifacts\api-server"
start "FounderBrain API (Port 23608)" cmd /k "set PORT=23608 && set BASE_PATH=/ && pnpm run dev || echo ERROR: API server failed to start && pause"

REM Wait a bit for API to start
timeout /t 3 /nobreak >nul

REM Return to root and start frontend
cd /d "%~dp0"
cd artifacts\founderbrain-app
start "FounderBrain Frontend (Port 3000)" cmd /k "set PORT=3000 && set BASE_PATH=/ && pnpm run dev || echo ERROR: Frontend failed to start && pause"

echo.
echo Both servers are starting...
echo Check the separate windows for any errors.
echo.
echo Open http://localhost:3000 in your browser once both servers are running.
echo.
pause
