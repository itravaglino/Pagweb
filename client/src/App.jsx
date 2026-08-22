import { useEffect, useState } from "react";
import { Studio } from "./components/Studio.jsx";
import { Wellness } from "./pages/Wellness.jsx";
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
  return "estudio";
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [studio, setStudio] = useState(() => loadJson(STORAGE_KEY, defaultStudio));
  const [settings, setSettings] = useState(() => loadJson(SETTINGS_KEY, defaultSettings));
  const [edit, setEdit] = useState(false);

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

  return (
    <div className="shell">
      {studio.customCss ? <style>{studio.customCss}</style> : null}
      <header className="topbar">
        <a className="brand" href="#/estudio">
          <div className="mark">
            <span />
          </div>
          <div>
            <strong>PAGWEB</strong>
            <small>avances a medida</small>
          </div>
        </a>
        <nav className="nav">
          <a className={route === "estudio" ? "active" : ""} href="#/estudio">
            Estudio
          </a>
          <a className={route === "dia" ? "active" : ""} href="#/dia">
            Mejor Día
          </a>
        </nav>
        <div className="actions">
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

      {route === "dia" ? (
        <Wellness settings={settings} setSettings={setSettings} />
      ) : (
        <Studio studio={studio} setStudio={setStudio} edit={edit} setEdit={setEdit} />
      )}
    </div>
  );
}
