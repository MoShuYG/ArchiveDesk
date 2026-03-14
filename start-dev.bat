@echo off
setlocal

REM Launch ArchiveDesk in local release-like mode on http://localhost:3000.
set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\start-dev.ps1" %*

endlocal

