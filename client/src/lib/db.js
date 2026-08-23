export async function fetchArchive() {
  try {
    const res = await fetch("/api/db");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.entries)) {
        return { ...data, source: data.source || "api" };
      }
    }
  } catch {
    /* sin API: caer al JSON estático */
  }
  const res = await fetch("/data/pagweb.json");
  if (!res.ok) throw new Error("archivo no disponible");
  const data = await res.json();
  return { ...data, source: "static" };
}

export async function saveCoachEntry(entry) {
  try {
    const res = await fetch("/api/db/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
