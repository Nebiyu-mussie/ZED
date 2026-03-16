@echo off
color 0A

echo ===============================
echo    Git Push Helper - ZED Repo
echo ===============================
echo.

echo Pulling latest changes from GitHub...
git pull origin main

echo.
echo Adding new changes...
git add .

echo.
set /p commitmsg=Enter commit message: 
if "%commitmsg%"=="" set commitmsg=Update project

echo.
echo Creating commit...
git commit -m "%commitmsg%"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ===============================
echo   Push Complete Successfully
echo ===============================
pause