@echo off
cd /d %~dp0

echo Starte Mario Coach...
start http://localhost:3000

npm run dev
pause