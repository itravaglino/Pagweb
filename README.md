# Pagweb

Studio **customizable** para mostrar los avances de un proyecto, más la demo **Mejor Día**: NVIDIA NIM (API gratis) lee datos estilo Fitbit y te dice cómo viene el día y qué hacer con las horas que quedan.

## Demo en vivo

Abrí **ahora** desde el celular o cualquier navegador (no es localhost):

### 1. Con API + NVIDIA (túnel HTTPS, mientras el agente está prendido)

**https://construction-forget-lights-ata.trycloudflare.com**

Ahí corren Estudio, Mejor Día, Archivo, Lumen, voz y NVIDIA NIM del servidor. OAuth Fitbit también, si está configurado. Cuando este agente se apaga, el túnel cae.

### 2. Estático (queda en GitHub, sin servidor)

UI + motor local. NVIDIA **solo** si pegás una clave `nvapi-` en el navegador (CORS). OAuth Fitbit **no** anda acá: hace falta el túnel.

- [jsDelivr](https://cdn.jsdelivr.net/gh/itravaglino/Pagweb@cursor/wellness-dashboard-demo-561c/docs/index.html)
- [raw.githack](https://raw.githack.com/itravaglino/Pagweb/cursor/wellness-dashboard-demo-561c/docs/index.html)

Si jsDelivr te muestra una versión vieja, usá la URL con el SHA del commit (queda en el PR).

### GitHub Pages

https://itravaglino.github.io/Pagweb/ **todavía no está prendido**: este token no puede activar Pages (403). Para publicarlo: Settings → Pages → Source: **Deploy from a branch** → este branch (`cursor/wellness-dashboard-demo-561c`) y carpeta `/docs`, o **GitHub Actions** (el workflow `pages.yml` corre en este branch, en `main` y con `workflow_dispatch`).

En Android: Chrome → menú → **Instalar app**.


## Qué incluye

- **Estudio**: temas caliza / río / asfalto / tinta, Newsreader + IBM Plex, perfil de Nacho (UNC Córdoba), widgets, CSS propio. Incluye un pulso Fitbit en vivo (widget Mejor Día).
- **Mejor Día**: cinco días sintéticos de Charge 6 (Martes UNC, Sábado gym, Post parcial, Semana de mesas, Domingo Güemes) **o tus números de Fitbit**. Pasos por hora, etapas de sueño, zonas cardíacas, HRV, SpO₂ y AZM — lo que recogería la Web API.
- **Archivo**: una semana sintética persistida en el store de Cursor (`/cursor/stores/self/pagweb/db.json`) y en `data/pagweb.json`.
- **PWA**: instalable en Android (Chrome → Instalar app). Manifiesto, service worker e iconos maskable.
- **NVIDIA NIM** y **Fitbit OAuth + PKCE** como antes.

No es consejo médico.

## Cómo correrlo

```bash
cp .env.example .env   # opcional
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

- Estudio → **Personalizar**
- Mejor Día → **Leer mi día** o cambiá de persona

Producción:

```bash
npm run build
npm start
```

Docker: `docker build -t pagweb . && docker run -p 3000:3000 --env-file .env pagweb`

## NVIDIA Developer (gratis)

Conexión de primera con [NVIDIA NIM](https://build.nvidia.com) para una IA personalizada de health / wellness.

1. Entrá a [build.nvidia.com](https://build.nvidia.com) y creá cuenta.
2. **Get API Key**. La clave empieza con `nvapi-`.
3. Pegala en **Mejor Día → NVIDIA Developer**, o en `.env` como `NVIDIA_API_KEY`.
4. Elegí el modelo (por defecto `meta/llama-3.1-8b-instruct`; si el 70B timeout, el servidor reintenta con 8B).
5. Tocá un modo fitness; el coach (NIM o motor local) cambia de verdad, no solo el chip.

La clave del navegador queda en `localStorage`. **No se commitea.**

### Modos

| Modo | Qué hace |
| --- | --- |
| Día completo | Sueño, movimiento, recupero y foco con las horas que quedan. |
| Fitness | Estímulo, volumen y progresión. Si HRV/sueño están bajos, no machaca. |
| Recupero | Nada de HIIT. Caminata fácil, movilidad, sistema nervioso. |
| Sueño | Empuja a una noche larga: cafeína, luz, hora de apagado. |
| Foco UNC | Bloques profundos de estudio y movimiento corto entre bloques. |
| Wellness | Ánimo, aire, hidratación. Sin obsesionarte con el 10k. |

El perfil de Nacho (UNC Córdoba, `America/Argentina/Buenos_Aires`, estudio + wellness) entra al prompt. No es consejo médico.

## Fitbit

1. Creá una app en [dev.fitbit.com/apps](https://dev.fitbit.com/apps), tipo **Client**.
2. Redirect: `http://localhost:3000/api/fitbit/callback` (o tu `PUBLIC_URL`).
3. Scopes: `activity heartrate sleep profile`.
4. `.env`: `FITBIT_CLIENT_ID` (y `FITBIT_CLIENT_SECRET` si la app es server).

Sin eso, la demo con personas locales cubre el flujo entero.

## Archivo persistente

Los días de prueba (semana Charge 6: post parcial, mesas, UNC, gym, Güemes + nota) viven en:

- Cursor store: `/cursor/stores/self/pagweb/db.json`
- Fallback local: `data/pagweb.json`
- Tests: `PAGWEB_DB_PATH` apunta a un temp

En la UI: **Archivo**. Cada lectura del coach se suma ahí.

## App Android (PWA)

En Chrome Android: menú → **Instalar app**. Manifiesto, service worker e iconos maskable. En iPhone: Compartir → Añadir a inicio.

## GitHub Pages

```bash
npm run build:pages
```

Eso genera `/docs`. En el repo: Settings → Pages → Source: GitHub Actions (workflow `pages.yml`) **o** Deploy from a branch → `/docs`.

En Pages el coach usa el motor local. Si pegás la API key de NVIDIA en la UI, intenta NIM desde el navegador (depende de CORS). OAuth Fitbit real necesita el servidor (`npm start` o Docker).

También: `npm run build:pages` y el HTML de `docs/index.html` se puede ver por CDN (jsDelivr / raw.githack), ver **Demo en vivo**.
