# Pagweb

Studio **customizable** para mostrar los avances de un proyecto, más la demo **Mejor Día**: NVIDIA NIM (API gratis) lee datos estilo Fitbit y te dice cómo viene el día y qué hacer con las horas que quedan.

## Demo en vivo

Cuando GitHub Pages esté activo:

- https://itravaglino.github.io/Pagweb/

Mientras tanto, el sitio estático queda en `/docs` (motor local + NVIDIA desde el navegador si pegás la clave). En Settings → Pages → Source: **GitHub Actions**, o branch con carpeta `/docs`.

## Qué incluye

- **Estudio**: temas, tipografías, radio, densidad, widgets reordenables, CSS propio, import/export JSON. Se guarda en el navegador.
- **Mejor Día**: 3 personas de demo (realista / recargado / en deuda) **o tus números de Fitbit** (sueño, pasos, FC, HRV) sin OAuth.
- **NVIDIA NIM**: `https://integrate.api.nvidia.com/v1/chat/completions`, modelo por defecto `meta/llama-3.3-70b-instruct` (el 3.1-8b se depreca el 25/08/2026). Sin clave, el motor local igual arma el plan horario.
- **Fitbit OAuth + PKCE** cuando cargás `FITBIT_CLIENT_ID`.

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

## GitHub Pages

```bash
npm run build:pages
```

Eso genera `/docs`. En el repo: Settings → Pages → Source: GitHub Actions (workflow `pages.yml`) **o** Deploy from a branch → `/docs`.

En Pages el coach usa el motor local. Si pegás la API key de NVIDIA en la UI, intenta NIM desde el navegador (depende de CORS). OAuth Fitbit real necesita el servidor (`npm start` o Docker).

También: `npm run build:pages` y el HTML de `docs/index.html` se puede ver por CDN, por ejemplo:

`https://cdn.jsdelivr.net/gh/itravaglino/Pagweb@cursor/wellness-dashboard-demo-561c/docs/index.html`
