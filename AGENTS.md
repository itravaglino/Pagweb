# AGENTS.md

## Cursor Cloud specific instructions

Pagweb is a single web service: an Express server (`server/index.js`) that, in dev
mode, runs Vite in middleware mode and serves the React SPA (`client/`) plus the JSON
API on **port 3000**. There is no database or other backing service.

- Run (dev): `npm run dev` starts `node server/index.js` (Vite middleware, HMR). Do NOT
  run `vite` directly. Server binds `0.0.0.0:3000`. See `.cursor/environment.json` for the
  cloud terminal that already runs this.
- Test: `npm test` (`node --test tests/*.test.js`). Build: `npm run build` (Vite → `dist/`).
- There is no lint script; `package.json` only defines `dev`, `build`, `start`, `test`, `preview`.
- Production (`npm start`) requires a prior `npm run build`; the server exits with an error
  if `dist/index.html` is missing. For development, use `npm run dev` (no build needed).
- No secrets are required. `NVIDIA_API_KEY` and `FITBIT_CLIENT_ID`/`FITBIT_CLIENT_SECRET`
  are optional. Without an NVIDIA key the `/api/coach` endpoint falls back to a deterministic
  local engine (reported as `Motor: local ... missing_key` in the UI, which is expected).
  Without Fitbit credentials, the three demo personas ("Hoy realista", "Día recargado",
  "Día en deuda") exercise the full flow.
- Quick health check: `curl localhost:3000/api/health`. Core demo flow: open
  `http://localhost:3000`, go to the "Mejor Día" tab, pick a persona / click "Leer mi día"
  to generate the coaching plan.
