# Café Nocturno · Punto de venta

Punto de venta para cafetería con **modo meseros por Wi-Fi**. La caja trabaja en la computadora y cada mesero toma órdenes desde su teléfono o tablet escaneando su código QR personal. Funciona en la misma red sin internet y sin instalar nada extra: solo Node.js.

---

## Encender el servidor (3 pasos)

**1. Descarga el proyecto**

Botón verde **Code → Download ZIP** y descomprímelo (o `git clone` si usas Git).

**2. Instala Node.js (solo la primera vez)**

Entra a <https://nodejs.org> y pulsa el botón verde **LTS**. En el instalador dale *Siguiente* a todo hasta *Finalizar*.

**3. Abre el iniciador**

- **Windows:** doble clic en **`iniciar-servidor.bat`**
- **Mac:** doble clic en **`iniciar-servidor.command`** (si no abre: clic derecho → *Abrir*, o en la Terminal `chmod +x iniciar-servidor.command`)

Se abre el navegador con el punto de venta y la ventana del servidor muestra la dirección que deben abrir los teléfonos, por ejemplo:

```
http://192.168.1.25:3000
```

Deja esa ventana abierta mientras trabajas. Para apagarlo, ciérrala o presiona `Ctrl + C`.

> Si prefieres la terminal, también sirve cualquiera de estas dos, dentro de la carpeta del proyecto:
>
> ```bash
> npm start
> node server.js
> ```

---

## Cómo lo usan los meseros

1. En la caja, entra a la pestaña **Meseros**. Cada mesero tiene su tarjeta con un QR.
2. El mesero escanea su QR con la cámara del teléfono (misma red Wi-Fi) y escribe el número de mesa.
3. La orden aparece en la caja para revisarla y cobrarla.

Un usuario con rol **Mesero** en Usuarios también aparece automáticamente en la lista de meseros, con su QR.

---

## Ajustes

| Qué | Cómo |
| --- | --- |
| Puerto (por omisión 3000) | `PORT=3001 npm start` en Mac/Linux · `set PORT=3001 && npm start` en Windows |
| Dónde se guardan los datos | `.data/meseros.json` dentro de la carpeta del proyecto (no se sube a GitHub) |
| Reiniciar meseros y órdenes | Borra el archivo `.data/meseros.json` con el servidor apagado |
| Internet / GitHub Pages | Sin servidor, la app abre en **modo demostración**: solo en esa computadora y sin meseros |

---

## Si algo no funciona

- **“No encontramos Node.js”** → instala Node.js desde <https://nodejs.org> y vuelve a abrir el iniciador.
- **El teléfono no abre la dirección** → revisa que esté en la misma red Wi-Fi y que el firewall de Windows permita Node.js en redes privadas (pulsa *Permitir acceso*).
- **“El puerto 3000 ya está ocupado”** → cierra la otra app o inicia con otro puerto (ver tabla de ajustes).
- **El doble clic no hace nada** → abre una terminal en la carpeta del proyecto y ejecuta `node server.js`.
