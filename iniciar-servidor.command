#!/bin/bash
# Café Nocturno — inicia el servidor local (Mac / Linux)
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  No encontramos Node.js en esta computadora."
  echo "  Instálalo gratis desde https://nodejs.org (botón verde LTS)"
  echo "  y después vuelve a abrir este archivo."
  echo ""
  read -r -p "  Presiona Enter para cerrar..." _
  exit 1
fi

echo ""
echo "  Iniciando Café Nocturno..."
echo "  Deja esta ventana abierta mientras usas el sistema."
echo ""

( sleep 2; open "http://localhost:3000" 2>/dev/null || xdg-open "http://localhost:3000" 2>/dev/null ) &

node server.js

echo ""
echo "  El servidor se detuvo. Puedes cerrar esta ventana."
