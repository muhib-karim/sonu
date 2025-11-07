# Rebuild robotjs for Electron compatibility
Write-Host "Rebuilding robotjs for Electron..." -ForegroundColor Cyan

# Get Electron version
$electronVersion = (npm list electron --depth=0 2>$null | Select-String 'electron@').ToString() -replace '.*electron@', '' -replace '\s.*', ''
Write-Host "Electron version: $electronVersion" -ForegroundColor Yellow

# Rebuild robotjs
Write-Host "Uninstalling robotjs..." -ForegroundColor Yellow
npm uninstall robotjs

Write-Host "Installing robotjs..." -ForegroundColor Yellow
npm install robotjs --save

Write-Host "Rebuilding robotjs for Electron $electronVersion..." -ForegroundColor Yellow
npm rebuild robotjs --runtime=electron --target=$electronVersion --dist-url=https://electronjs.org/headers

Write-Host "Rebuild complete!" -ForegroundColor Green

