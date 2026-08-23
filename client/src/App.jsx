import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Studio } from "./components/Studio.jsx";
import { Wellness } from "./pages/Wellness.jsx";
import { Archive } from "./pages/Archive.jsx";
import { FolioMark } from "./components/ui.jsx";
import {
  SETTINGS_KEY,
  STORAGE_KEY,
  applyTheme,
  defaultSettings,
  defaultStudio,
  loadJson,
  saveJson,
} from "./lib/store.js";

function routeFromHash() {
  const hash = location.hash.replace(/^#/, "") || "/estudio";
  if (hash.startsWith("/dia")) return "dia";
  if (hash.startsWith("/archivo")) return "archivo";
  return "estudio";
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [studio, setStudio] = useState(() => loadJson(STORAGE_KEY, defaultStudio));
  const [settings, setSettings] = useState(() => loadJson(SETTINGS_KEY, defaultSettings));
  const [edit, setEdit] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [installHint, setInstallHint] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    applyTheme(studio);
    saveJson(STORAGE_KEY, studio);
  }, [studio]);

  useEffect(() => {
    saveJson(SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "e" && !e.metaKey && !e.ctrlKey && e.target === document.body) {
        setEdit((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) setInstalled(true);
    const onPrompt = (e) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const profile = studio.profile || {};

  async function installApp() {
    if (installEvent) {
      installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      if (choice?.outcome === "accepted") setInstalled(true);
      return;
    }
    setInstallHint(true);
  }

  return (
    <div className="shell">
      {studio.customCss ? <style>{studio.customCss}</style> : null}
      <header className="topbar">
        <a className="brand" href="#/estudio">
          <FolioMark className="mark" />
          <div>
            <strong>{studio.title || "Pagweb"}</strong>
            <small>
              {profile.shortName || "Nacho"} · {profile.org || "UNC"} · {profile.city || "Córdoba"}
            </small>
          </div>
        </a>
        <nav className="nav">
          <a className={route === "estudio" ? "active" : ""} href="#/estudio">
            Estudio
          </a>
          <a className={route === "dia" ? "active" : ""} href="#/dia">
            Mejor Día
          </a>
          <a className={route === "archivo" ? "active" : ""} href="#/archivo">
            Archivo
          </a>
        </nav>
        <div className="actions">
          {installed ? null : (
            <button className="btn" type="button" onClick={installApp}>
              Instalar app
            </button>
          )}
          {route === "estudio" ? (
            <button className="btn primary" type="button" onClick={() => setEdit(true)}>
              Personalizar
            </button>
          ) : (
            <a className="btn" href="#/estudio">
              Volver al studio
            </a>
          )}
        </div>
      </header>
      {installHint && !installEvent ? (
        <p className="install-hint">
          En Android, Chrome → menú → <strong>Instalar app</strong>. En iPhone: Compartir → Añadir a inicio.
        </p>
      ) : null}

      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {route === "dia" ? (
            <Wellness settings={settings} setSettings={setSettings} />
          ) : route === "archivo" ? (
            <Archive />
          ) : (
            <Studio studio={studio} setStudio={setStudio} edit={edit} setEdit={setEdit} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
