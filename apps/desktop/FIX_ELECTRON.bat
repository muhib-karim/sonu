@echo off
echo ========================================================
echo SONU - Electron Fix Script
echo ========================================================
echo.
echo This script will fix the Electron installation issue.
echo.

cd /d "%~dp0"

echo Step 1: Removing old Electron installation...
echo (This may fail if files are locked, that's okay)
rmdir /s /q node_modules\electron 2>nul
rmdir /s /q node_modules\.electron-* 2>nul
del /q node_modules\electron 2>nul
echo Done.

echo.
echo Step 2: Clearing npm cache...
call npm cache clean --force
echo Done.

echo.
echo Step 3: Installing fresh Electron...
call npm install electron --save-dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Failed to install Electron.
    echo Please restart your computer and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo Step 4: Verifying installation...
if exist "node_modules\electron\dist\electron.exe" (
    echo SUCCESS: Electron is installed correctly!
    echo.
) else (
    echo ERROR: Electron binary not found!
    echo.
    pause
    exit /b 1
)

echo Step 5: Testing Electron...
echo Running: node_modules\electron\dist\electron.exe --version
node_modules\electron\dist\electron.exe --version
echo.

echo ========================================================
echo All done! Electron should now work correctly.
echo ========================================================
echo.
echo To run SONU, use: npm start
echo.
pause
