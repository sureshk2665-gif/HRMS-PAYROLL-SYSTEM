@echo off
REM Runs the database backup. Intended to be scheduled via Windows Task
REM Scheduler (see README.md "Backup / Restore" section for setup steps).
REM This just wraps "npm run backup" so Task Scheduler has a simple,
REM double-clickable target with the working directory set correctly.

cd /d "%~dp0.."
call npm run backup
