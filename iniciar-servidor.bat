@echo off
chcp 65001 >nul
title Cafe Nocturno - servidor
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   No encontramos Node.js en esta computadora.
  echo.
  echo   Instalalo gratis desde https://nodejs.org  ^(boton verde LTS^)
  echo   y despues vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

echo.
echo   Iniciando Cafe Nocturno...
echo   Deja esta ventana abierta mientras usas el sistema.
echo.

start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000'"

node server.js

echo.
echo   El servidor se detuvo. Puedes cerrar esta ventana.
pause
