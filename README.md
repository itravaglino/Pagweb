# Pagweb

Studio **customizable** para mostrar los avances de un proyecto, más la demo **Mejor Día**: NVIDIA NIM (API gratis) lee datos estilo Fitbit y te dice cómo viene el día y qué hacer con las horas que quedan.

## Demo en vivo

Cuando GitHub Pages esté activo:

- https://itravaglino.github.io/Pagweb/

Mientras tanto, el sitio estático queda en `/docs` (motor local + NVIDIA desde el navegador si pegás la clave). En Settings → Pages → Source: **GitHub Actions**, o branch con carpeta `/docs`.


## Acceso desde la web (no solo localhost)

Cursor Cloud **no publica un dominio propio permanente** de la app: el agente corre en un contenedor y, en el escritorio, el puerto 3000 se reenvía a tu `localhost`. Para entrar **desde el teléfono o cualquier navegador** dejamos dos caminos:

### 1. URL pública con API (túnel, mientras el agente está activo)

El servidor escucha en `0.0.0.0:3000` y un túnel HTTPS de Cloudflare lo publica:

**https://bracelet-adjustment-boxes-amounts.trycloudflare.com**

Ahí corre Estudio, Mejor Día, Archivo, NVIDIA NIM y Fitbit. Cuando este agente se apaga, el túnel cae.

### 2. URL pública permanente (estática)

Después de mergear a `main` (o desde este branch):

- GitHub Pages, si lo activás en Settings → Pages: https://itravaglino.github.io/Pagweb/
- jsDelivr (ya, sin esperar Pages):
  `https://cdn.jsdelivr.net/gh/itravaglino/Pagweb@cursor/wellness-dashboard-demo-561c/docs/index.html`

En estático el coach usa el motor local; NVIDIA desde el navegador si pegás la clave (CORS). OAuth Fitbit necesita el servidor.

En Android: Chrome → menú → **Instalar app**.


## Qué incluye

- **Estudio**: temas caliza / río / asfalto / tinta, Newsreader + IBM Plex, perfil de Nacho (UNC Córdoba), widgets, CSS propio.
- **Mejor Día**: 3 personas de demo (mixto / recargado / agotado) **o tus números de Fitbit**.
- **Archivo**: días de prueba persistidos en el store de Cursor (`/cursor/stores/self/pagweb/db.json`) y en `data/pagweb.json`.
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

## NVIDIA (gratis)

1. Entrá a [build.nvidia.com](https://build.nvidia.com) y generá un API key (`nvapi-…`).
2. Pegalo en **Mejor Día → Claves y metas**, o en `.env` como `NVIDIA_API_KEY`.
3. El servidor lo manda a NIM; la clave del navegador no se commitea.

## Fitbit

1. Creá una app en [dev.fitbit.com/apps](https://dev.fitbit.com/apps), tipo **Client**.
2. Redirect: `http://localhost:3000/api/fitbit/callback` (o tu `PUBLIC_URL`).
3. Scopes: `activity heartrate sleep profile`.
4. `.env`: `FITBIT_CLIENT_ID` (y `FITBIT_CLIENT_SECRET` si la app es server).

Sin eso, la demo con personas locales cubre el flujo entero.

## Archivo persistente

Los días de prueba (mixto, recargado, agotado + nota UNC) viven en:

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

También: `npm run build:pages` y el HTML de `docs/index.html` se puede ver por CDN, por ejemplo:

`https://cdn.jsdelivr.net/gh/itravaglino/Pagweb@cursor/wellness-dashboard-demo-561c/docs/index.html`
