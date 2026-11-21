# Café Nocturno · Punto de venta

Punto de venta para cafetería con **modo meseros por Wi-Fi**. La caja trabaja en la computadora y cada mesero toma órdenes desde su teléfono o tablet escaneando su código QR personal. Funciona en la misma red sin internet y sin instalar nada extra: solo Node.js.

---

## Encender el servidor (automático)

**1. Descarga el proyecto**

Botón verde **Code → Download ZIP** y descomprímelo (o `git clone` si usas Git).

**2. Haz doble clic en el iniciador**

- **Windows:** `iniciar-servidor.bat`
- **Mac:** `iniciar-servidor.command` (si no abre: clic derecho → *Abrir*, o en la Terminal `chmod +x iniciar-servidor.command`)

Eso es todo. El iniciador busca Node.js solo, arranca el servidor, **elige un puerto libre** (no importa si el 3000 está ocupado) y **abre el navegador solo** con el punto de venta. La ventana del servidor muestra la dirección que deben abrir los teléfonos, por ejemplo:

```
http://192.168.1.25:3000
```

Deja esa ventana abierta mientras trabajas. Para apagarlo, ciérrala o presiona `Ctrl + C`.

> Solo la primera vez hace falta instalar Node.js (<https://nodejs.org>, botón verde LTS); si falta, el iniciador abre esa página por ti.
>
> Si prefieres la terminal, también sirve cualquiera de estas dos, dentro de la carpeta del proyecto:
>
> ```bash
> npm start
> node server.js
> ```
>
> Para que no se abra el navegador (por ejemplo en un servidor sin pantalla): `NO_OPEN=1 node server.js`.

---

## Cómo lo usan los meseros

1. En la caja, entra a la pestaña **Meseros**. Cada mesero tiene su tarjeta con un QR.
2. El mesero escanea su QR con la cámara del teléfono (misma red Wi-Fi) y escribe el número de mesa.
3. La orden aparece en la caja para revisarla y cobrarla.

Un usuario con rol **Mesero** en Usuarios también aparece automáticamente en la lista de meseros, con su QR.

---

## Dirección fija para los teléfonos (recomendado)

El servidor ya muestra su dirección solo, pero el router puede cambiársela de un día a otro y entonces los códigos QR viejos dejan de abrir. Para que la dirección **nunca cambie**, fija la IP de la computadora de la caja en tu red. Elige una y anótala, por ejemplo `192.168.1.50`.

**Opción A · En el router (lo más estable)**

1. Entra a la página del router desde el navegador (suele ser `192.168.1.1` o `192.168.0.1`; usuario y contraseña están en la etiqueta del aparato).
2. Busca *DHCP* → *Reservas de IP* o *Static DHCP*.
3. Elige la computadora de la caja y asígnale siempre la misma IP (`192.168.1.50`). Guarda.

**Opción B · En la computadora (Windows)**

1. *Configuración* → *Red e Internet* → *Wi-Fi* (o *Ethernet*) → *Propiedades* del adaptador.
2. *Asignación de IP* → *Manual* → *IPv4*.
3. IP: `192.168.1.50` · Máscara: `255.255.255.0` · Puerta de enlace: la del router (`192.168.1.1`) · DNS: `8.8.8.8`.
4. Guarda y vuelve a encender el servidor: la ventana mostrará `http://192.168.1.50:3000`.

Vuelve a entrar a la pestaña **Meseros** y los QR nuevos ya apuntan a esa dirección para siempre.

> La dirección `192.168.x.x` solo existe dentro de tu red: sirve para los teléfonos conectados a tu Wi-Fi, no desde otra ciudad. Para usarlo desde fuera hace falta un túnel de internet (por ejemplo Cloudflare Tunnel o Tailscale) o contratar una IP pública fija con tu proveedor de internet; eso no se configura desde el proyecto.

---

## Ajustes

| Qué | Cómo |
| --- | --- |
| Puerto | Se elige solo: si el 3000 está ocupado, prueba el 3001, 3002… Para fijar uno: `PORT=3001 npm start` en Mac/Linux · `set PORT=3001 && npm start` en Windows |
| Dónde se guardan los datos | `.data/meseros.json` dentro de la carpeta del proyecto (no se sube a GitHub) |
| Reiniciar meseros y órdenes | Borra el archivo `.data/meseros.json` con el servidor apagado |
| Dirección fija de la caja | Reserva la IP en el router o fíjala en Windows (ver arriba); los QR dejarán de cambiar |
| Internet / GitHub Pages | Sin servidor, la app abre en **modo demostración**: solo en esa computadora y sin meseros |

---

## Si algo no funciona

- **“No encontramos Node.js”** → el iniciador abre <https://nodejs.org>; instala la versión LTS y vuelve a abrir el iniciador.
- **El teléfono no abre la dirección** → revisa que esté en la misma red Wi-Fi y que el firewall de Windows permita Node.js en redes privadas (pulsa *Permitir acceso*).
- **El navegador no se abrió** → abre a mano la dirección que muestra la ventana del servidor (por ejemplo `http://localhost:3000`).
- **El doble clic no hace nada** → abre una terminal en la carpeta del proyecto y ejecuta `node server.js`.
