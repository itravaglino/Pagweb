let inference = null;

async function loadLib(cdn) {
  const mod = await import(/* @vite-ignore */ cdn);
  return mod;
}

self.onmessage = async (event) => {
  const msg = event.data || {};
  const { id, type } = msg;
  try {
    if (type === "load") {
      if (inference) {
        inference.close?.();
        inference = null;
      }
      const { FilesetResolver, LlmInference } = await loadLib(msg.cdn);
      const genai = await FilesetResolver.forGenAiTasks(msg.wasm);
      inference = await LlmInference.createFromOptions(genai, {
        baseOptions: { modelAssetPath: msg.blobUrl },
        maxTokens: msg.maxTokens || 1024,
        temperature: msg.temperature ?? 0.4,
        topK: msg.topK || 30,
        randomSeed: 7,
      });
      self.postMessage({ id, ok: true });
      return;
    }
    if (type === "generate") {
      if (!inference) throw new Error("Gemma no está cargado en el teléfono.");
      const text = await inference.generateResponse(msg.prompt);
      self.postMessage({ id, ok: true, text });
      return;
    }
    if (type === "unload") {
      inference?.close?.();
      inference = null;
      self.postMessage({ id, ok: true });
      return;
    }
    throw new Error(`mensaje desconocido: ${type}`);
  } catch (error) {
    self.postMessage({ id, error: error.message || String(error) });
  }
};
