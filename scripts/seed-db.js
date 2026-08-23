import { loadOrSeed } from "../server/db.js";

const db = loadOrSeed();
console.log(`Pagweb DB lista: ${db.entries.length} entradas → ${db.profile.shortName} · ${db.profile.org}`);
