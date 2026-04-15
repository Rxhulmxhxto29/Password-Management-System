@echo off
echo ==============================================
echo   ZERO-KNOWLEDGE SECURE PASSWORD MANAGER
echo ==============================================
echo.

echo Starting backend server (Express + MongoDB)...
start cmd /k "cd backend && npm start"

echo Starting frontend server (React/Vite)...
start cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are launching in separate windows! 
echo Open your browser to: http://localhost:3000/
echo.
pause
