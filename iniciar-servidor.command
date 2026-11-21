#!/bin/bash
# Café Nocturno — inicia el servidor local (Mac / Linux)
# No hay nada que configurar: el servidor elige un puerto libre y abre el navegador.

cd "$(dirname "$0")" || exit 1

NODE_BIN="$(command -v node 2>/dev/null)"
if [ -z "$NODE_BIN" ]; then
  for candidate in /usr/local/bin/node /opt/homebrew/bin/node /usr/bin/node /snap/bin/node; do
    if [ -x "$candidate" ]; then NODE_BIN="$candidate"; break; fi
  done
fi

if [ -z "$NODE_BIN" ]; then
  echo ""
  echo "  No encontramos Node.js en esta computadora."
  echo "  Abriendo https://nodejs.org/es — instala la versión LTS y vuelve a abrir este archivo."
  echo ""
  open "https://nodejs.org/es" 2>/dev/null || xdg-open "https://nodejs.org/es" 2>/dev/null
  read -r -p "  Presiona Enter para cerrar..." _
  exit 1
fi

echo ""
echo "  Iniciando Café Nocturno..."
echo "  El navegador se abrirá solo. Deja esta ventana abierta."
echo ""

"$NODE_BIN" server.js

echo ""
echo "  El servidor se detuvo. Puedes cerrar esta ventana."
