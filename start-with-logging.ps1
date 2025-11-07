# Start app with comprehensive logging
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$sessionLogDir = ".\logs\session-$timestamp"

# Create session log directory
New-Item -ItemType Directory -Force -Path $sessionLogDir | Out-Null

Write-Host "==================================="
Write-Host "Starting app with logging enabled"
Write-Host "Session: $timestamp"
Write-Host "Logs will be saved to: $sessionLogDir"
Write-Host "==================================="

# Start npm with output redirection
$process = Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow -PassThru -RedirectStandardOutput "$sessionLogDir\npm-output.log" -RedirectStandardError "$sessionLogDir\npm-error.log"

Write-Host ""
Write-Host "App starting... (PID: $($process.Id))"
Write-Host "Press Ctrl+C to stop monitoring (app will continue running)"
Write-Host ""
Write-Host "Monitoring logs..."
Write-Host "-----------------------------------"

# Monitor the output file
$outputFile = "$sessionLogDir\npm-output.log"
$errorFile = "$sessionLogDir\npm-error.log"

Start-Sleep -Seconds 2

# Tail both files
$lastOutputSize = 0
$lastErrorSize = 0

while ($true) {
    Start-Sleep -Milliseconds 500
    
    # Check output
    if (Test-Path $outputFile) {
        $currentSize = (Get-Item $outputFile).Length
        if ($currentSize -gt $lastOutputSize) {
            $newContent = Get-Content $outputFile -Encoding UTF8 -Tail 50
            if ($newContent) {
                $newContent | ForEach-Object { Write-Host $_ }
            }
            $lastOutputSize = $currentSize
        }
    }
    
    # Check errors
    if (Test-Path $errorFile) {
        $currentSize = (Get-Item $errorFile).Length
        if ($currentSize -gt $lastErrorSize) {
            $newContent = Get-Content $errorFile -Encoding UTF8 -Tail 20
            if ($newContent) {
                Write-Host "ERRORS:" -ForegroundColor Red
                $newContent | ForEach-Object { Write-Host $_ -ForegroundColor Red }
            }
            $lastErrorSize = $currentSize
        }
    }
    
    # Check if process is still running
    if ($process.HasExited) {
        Write-Host ""
        Write-Host "App has exited!" -ForegroundColor Yellow
        break
    }
}


