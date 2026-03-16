@echo off
color 0A

echo ===============================
echo    Git Push Helper - ZED Repo
echo ===============================
echo.

git add .

git diff --cached --quiet
if %errorlevel%==0 (
    echo No changes to commit.
) else (
    set /p commitmsg=Enter commit message: 
    if "%commitmsg%"=="" set commitmsg=Update project
    git commit -m "%commitmsg%"
)

echo Pulling latest changes from main...
git pull origin main --rebase

echo Pushing to GitHub main branch...
git push origin main

echo.
echo Done! Your changes are on GitHub.
pause