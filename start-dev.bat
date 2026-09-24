@echo off
setlocal

set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\start-dev.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
    echo ArchiveDesk failed to start. See the error above.
    pause
)

endlocal & exit /b %EXIT_CODE%

