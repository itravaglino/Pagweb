import { NACHO } from "../../../shared/profile.js";

export const STORAGE_KEY = "pagweb-studio-v2";
export const SETTINGS_KEY = "pagweb-settings-v2";

export const THEMES = {
  caliza: {
    id: "caliza",
    label: "Caliza",
    bg: "#f3eee6",
    bgElev: "#fbf8f2",
    ink: "#1a1714",
    muted: "#6a635b",
    accent: "#b03a2e",
    accent2: "#1f6f6a",
    danger: "#8f2d24",
    line: "rgba(26, 23, 20, 0.14)",
  },
  rio: {
    id: "rio",
    label: "Río",
    bg: "#e8f0ec",
    bgElev: "#f4faf7",
    ink: "#14201c",
    muted: "#4f635c",
    accent: "#1f6f6a",
    accent2: "#b03a2e",
    danger: "#8f2d24",
    line: "rgba(20, 32, 28, 0.14)",
  },
  asfalto: {
    id: "asfalto",
    label: "Asfalto",
    bg: "#161513",
    bgElev: "#201e1b",
    ink: "#f3eee6",
    muted: "#9b948a",
    accent: "#e07a3d",
    accent2: "#6ec4b8",
    danger: "#e07a6a",
    line: "rgba(243, 238, 230, 0.12)",
  },
  tinta: {
    id: "tinta",
    label: "Tinta",
    bg: "#0c0b0a",
    bgElev: "#161412",
    ink: "#f7f1e6",
    muted: "#a39b90",
    accent: "#d4a017",
    accent2: "#7ad0c9",
    danger: "#e07a6a",
    line: "rgba(247, 241, 230, 0.12)",
  },
};

export const FONTS = {
  editorial: {
    id: "editorial",
    label: "Editorial",
    display: '"Newsreader", serif',
    body: '"IBM Plex Sans", sans-serif',
  },
  geometrico: {
    id: "geometrico",
    label: "Geométrico",
    display: '"IBM Plex Sans", sans-serif',
    body: '"IBM Plex Sans", sans-serif',
  },
  tecnico: {
    id: "tecnico",
    label: "Técnico",
    display: '"IBM Plex Mono", monospace',
    body: '"IBM Plex Sans", sans-serif',
  },
};

export const defaultStudio = () => ({
  title: "Pagweb",
  kicker: "Studio de avances",
  tagline:
    "Una página a medida para mostrar cómo avanza el proyecto — y una demo que lee tu Fitbit con NVIDIA, accesible desde la web.",
  owner: NACHO.fullName,
  percent: 86,
  percentLabel: "studio vivo · mejor día · archivo · PWA · HTTPS público",
  status: "En la web",
  updatedLabel: "hoy",
  theme: "caliza",
  font: "editorial",
  radius: 8,
  density: "comoda",
  customCss: "",
  customCss: "",
  accentOverride: "",
  profile: { ...NACHO },
  widgetOrder: ["hero", "kpis", "milestones", "timeline", "next", "changelog", "notes", "wellbeing"],
  hidden: [],
  kpis: [
    { id: "k1", label: "Módulos", value: "3", hint: "Studio + Mejor Día + Archivo" },
    { id: "k2", label: "Widgets vivos", value: "8", hint: "todo reordenable" },
    { id: "k3", label: "APIs", value: "Fitbit · NIM", hint: "con fallback local" },
    { id: "k4", label: "Hosting", value: "HTTPS", hint: "túnel Cursor + /docs" },
  ],
  milestones: [
    { id: "m1", title: "Tablero customizable", detail: "Temas caliza / río / asfalto / tinta, Newsreader, widgets.", done: true },
    { id: "m2", title: "Demo Mejor Día", detail: "Personas Fitbit + modos fitness + coach NVIDIA NIM.", done: true },
    { id: "m3", title: "OAuth Fitbit real", detail: "PKCE, scopes activity/heartrate/sleep.", done: false },
    { id: "m4", title: "Hosting en la web", detail: "Puerto 3000 en Cursor Cloud + túnel HTTPS + estático en /docs.", done: true },
  ],
  timeline: [
    {
      id: "t1",
      when: "Ahora",
      title: "No es solo localhost",
      text: "El agente de Cursor corre Pagweb en la nube (puerto 3000). El túnel HTTPS deja entrar desde el teléfono o cualquier navegador.",
    },
    {
      id: "t2",
      when: "Demo",
      title: "NVIDIA lee el reloj",
      text: "Las métricas de sueño, pasos y recuperación se vuelven un plan para el resto del día.",
    },
    {
      id: "t3",
      when: "Siguiente",
      title: "Tu Fitbit de verdad",
      text: "Registrá una app Client en Fitbit y pegá el Client ID. El callback ya está listo.",
    },
  ],
  changelog: [
    { id: "c1", tag: "Nuevo", text: "Túnel HTTPS público mientras corre el agente de Cursor." },
    { id: "c2", tag: "Nuevo", text: "Archivo persistente en el store de Cursor + data/pagweb.json." },
    { id: "c3", tag: "Nuevo", text: "PWA instalable (Chrome → Instalar app) sobre HTTPS." },
    { id: "c4", tag: "Nuevo", text: "Modos fitness / recupero / sueño / foco UNC para el coach." },
  ],
  notes:
    "Usá **Personalizar** para cambiar nombre, % de avance, paleta y qué bloques se ven. Exportá el JSON si lo querés versionar en el repo. El archivo de días vive en el servidor, no solo en este navegador.",
  nextActions: [
    { id: "n1", text: "Abrir Pagweb desde el teléfono con el enlace HTTPS", done: false },
    { id: "n2", text: "Pegar NVIDIA API key (build.nvidia.com)", done: false },
    { id: "n3", text: "Activar GitHub Pages para la URL permanente", done: false },
  ],
  quote: "Si solo corre en localhost, no es una página: es un ensayo. Pagweb tiene que abrirse desde la web.",
});

export const defaultSettings = () => ({
  nvidiaKey: "",
  model: "meta/llama-3.3-70b-instruct",
  name: NACHO.shortName,
  focus: NACHO.focus,
  stepsGoal: 10000,
  sleepGoal: 7.5,
  activeGoal: 30,
  bedtime: "23:15",
  timezone: NACHO.timezone,
  fitnessMode: "general",
  mySleepHours: 6.4,
  mySteps: 5400,
  myRhr: 66,
  myHrv: 31,
  myActiveMinutes: 16,
  myWaterMl: 1000,
});

export function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback();
    const parsed = JSON.parse(raw);
    const base = fallback();
    if (key === STORAGE_KEY) {
      return {
        ...base,
        ...parsed,
        profile: { ...base.profile, ...(parsed.profile || {}) },
      };
    }
    return { ...base, ...parsed };
  } catch {
    return fallback();
  }
}

export function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function applyTheme(studio) {
  const theme = THEMES[studio.theme] || THEMES.caliza;
  const font = FONTS[studio.font] || FONTS.editorial;
  const root = document.documentElement;
  const map = {
    "--bg": theme.bg,
    "--bg-elev": theme.bgElev,
    "--ink": theme.ink,
    "--muted": theme.muted,
    "--accent": studio.accentOverride || theme.accent,
    "--accent-2": theme.accent2,
    "--danger": theme.danger,
    "--line": theme.line,
    "--radius": `${studio.radius ?? 8}px`,
    "--font-display": font.display,
    "--font-body": font.body,
  };
  Object.entries(map).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.density = studio.density || "comoda";
  root.dataset.theme = studio.theme || "caliza";
}
