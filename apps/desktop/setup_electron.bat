@echo off
echo SONU Electron Setup Script
echo ============================
echo.

cd /d "%~dp0"

echo Step 1: Checking current electron installation...
if exist "node_modules\electron" (
    echo Found electron folder, attempting to remove...
    rmdir /s /q "node_modules\electron" 2>nul
    if exist "node_modules\electron" (
        echo WARNING: Could not remove electron folder (files may be locked)
        echo Please close any running Electron processes and try again
        echo.
        echo Alternatively, run these commands manually:
        echo   rmdir /s /q node_modules\electron
        echo   npm install electron --save-dev
    ) else (
        echo Successfully removed old electron installation
    )
) else (
    echo No electron folder found
)

echo.
echo Step 2: Installing electron...
npm install electron --save-dev

if %ERRORLEVEL% equ 0 (
    echo Successfully installed electron
) else (
    echo ERROR: Failed to install electron
    exit /b 1
)

echo.
echo Step 3: Verifying electron installation...
if exist "node_modules\electron\dist\electron.exe" (
    echo Electron binary found at: node_modules\electron\dist\electron.exe
    echo File size: %~z1
) else (
    echo ERROR: Electron binary not found!
    exit /b 1
)

echo.
echo Step 4: Testing electron...
echo Running: node_modules\electron\dist\electron.exe --version
node_modules\electron\dist\electron.exe --version

echo.
echo If the version was displayed above, electron is working correctly.
echo.
echo To run SONU, use: npm start
echo.
echo NOTE: If you still have issues, try:
echo   1. Restart your computer
echo   2. Run this script again
echo   3. If problems persist, there may be an issue with your Node.js installation
