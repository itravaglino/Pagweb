import { Readable } from "node:stream";
import { GEMMA_MODELS, gemmaModel, listGemmaModels } from "../shared/gemma.js";
import { clipWatchText } from "../shared/gemma.js";

export function gemmaCatalog() {
  return {
    ok: true,
    stack: "mediapipe-tasks-genai",
    defaultVariant: "watch",
    lightVariant: "light",
    models: listGemmaModels().map((m) => ({
      id: m.id,
      role: m.role,
      label: m.label,
      name: m.name,
      blurb: m.blurb,
      file: m.file,
      repo: m.repo,
      sizeHint: m.sizeHint,
      ramHint: m.ramHint,
      quant: m.quant,
      license: m.license,
      defaultFor: m.defaultFor,
    })),
    hfTokenConfigured: Boolean(process.env.HF_TOKEN),
    hint: "Gemma corre en el teléfono (WebGPU). El Fitbit solo muestra la respuesta corta. Aceptá la licencia en Hugging Face y pegá un token hf_ si el proxy pide auth.",
  };
}

function bearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();
  if (req.query?.hf) return String(req.query.hf);
  return process.env.HF_TOKEN || "";
}

export async function proxyGemmaAsset(req, res) {
  const spec = gemmaModel(req.params.id);
  if (!GEMMA_MODELS[req.params.id]) {
    return res.status(404).json({ error: "unknown_model", ids: Object.keys(GEMMA_MODELS) });
  }
  const token = bearerToken(req);
  const headers = {
    "User-Agent": "pagweb-gemma/1.0",
    Accept: "application/octet-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const upstream = await fetch(spec.url, { headers, redirect: "follow" });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return res.status(upstream.status).json({
        error: "hf_fetch_failed",
        status: upstream.status,
        repo: spec.repo,
        file: spec.file,
        hint:
          upstream.status === 401 || upstream.status === 403
            ? "Aceptá la licencia Gemma en Hugging Face y pegá un token hf_ (o HF_TOKEN en .env)."
            : detail.slice(0, 200),
      });
    }
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${spec.file}"`);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    const length = upstream.headers.get("content-length");
    if (length) res.setHeader("Content-Length", length);
    if (!upstream.body) {
      return res.status(502).json({ error: "empty_body" });
    }
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(502).json({ error: "proxy_failed", message: error.message });
    }
  }
}

export function clipReplyPayload(body = {}) {
  return {
    text: clipWatchText(body.text || body.watch || ""),
    title: clipWatchText(body.title || "Lumen", 18),
    model: body.model || null,
    variant: body.variant || null,
    at: new Date().toISOString(),
  };
}
