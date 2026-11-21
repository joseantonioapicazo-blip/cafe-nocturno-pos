@echo off
chcp 65001 >nul
title Cafe Nocturno - servidor
cd /d "%~dp0"

rem Buscar Node.js: primero en el PATH y luego en las carpetas tipicas.
set "NODE="
for /f "delims=" %%G in ('where node 2^>nul') do if not defined NODE set "NODE=%%G"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"

if not defined NODE goto sin_node

echo.
echo   Iniciando Cafe Nocturno...
echo   El navegador se abrira solo. Deja esta ventana abierta.
echo.

"%NODE%" server.js
goto fin

:sin_node
echo.
echo   No encontramos Node.js en esta computadora.
echo   Se abrira la pagina de descarga: pulsa el boton verde LTS,
echo   instala con "Siguiente" y vuelve a abrir este archivo.
start "" "https://nodejs.org/es"
echo.
pause
exit /b 1

:fin
echo.
echo   El servidor se detuvo. Puedes cerrar esta ventana.
pause
