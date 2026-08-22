export const STORAGE_KEY = "pagweb-studio-v1";
export const SETTINGS_KEY = "pagweb-settings-v1";

export const THEMES = {
  nocturno: {
    id: "nocturno",
    label: "Nocturno",
    bg: "#101412",
    bgElev: "#181e1b",
    ink: "#f3eee4",
    muted: "#a49b8d",
    accent: "#d4a574",
    accent2: "#86a37c",
    danger: "#d07a68",
    line: "rgba(243,238,228,.10)",
  },
  aurora: {
    id: "aurora",
    label: "Aurora",
    bg: "#0d1220",
    bgElev: "#151c30",
    ink: "#eef3ff",
    muted: "#9aa6c4",
    accent: "#7ad0c9",
    accent2: "#c084fc",
    danger: "#fb7185",
    line: "rgba(238,243,255,.10)",
  },
  papel: {
    id: "papel",
    label: "Papel",
    bg: "#f3ecdf",
    bgElev: "#fffaf2",
    ink: "#1c1915",
    muted: "#6d6458",
    accent: "#b4532a",
    accent2: "#3f6b52",
    danger: "#9f2d2d",
    line: "rgba(28,25,21,.10)",
  },
  umbra: {
    id: "umbra",
    label: "Umbra",
    bg: "#070708",
    bgElev: "#121214",
    ink: "#f5f5f5",
    muted: "#9b9b9f",
    accent: "#f5c518",
    accent2: "#5eead4",
    danger: "#ff5c5c",
    line: "rgba(245,245,245,.10)",
  },
};

export const FONTS = {
  editorial: {
    id: "editorial",
    label: "Editorial",
    display: '"Fraunces", serif',
    body: '"Outfit", sans-serif',
  },
  geometrico: {
    id: "geometrico",
    label: "Geométrico",
    display: '"Outfit", sans-serif',
    body: '"Outfit", sans-serif',
  },
  tecnico: {
    id: "tecnico",
    label: "Técnico",
    display: '"IBM Plex Mono", monospace',
    body: '"Outfit", sans-serif',
  },
};

export const defaultStudio = () => ({
  title: "Pagweb",
  kicker: "Studio de avances",
  tagline: "Una página a medida para mostrar cómo avanza el proyecto — y una demo que lee tu Fitbit con NVIDIA.",
  owner: "Ignacio Travaglino",
  percent: 48,
  percentLabel: "demo usable + tablero vivo",
  status: "En curso",
  updatedLabel: "hoy",
  theme: "nocturno",
  font: "editorial",
  radius: 22,
  density: "comoda",
  customCss: "",
  widgetOrder: ["hero", "kpis", "milestones", "timeline", "next", "changelog", "notes", "wellbeing"],
  hidden: [],
  kpis: [
    { id: "k1", label: "Módulos", value: "2", hint: "Studio + Mejor Día" },
    { id: "k2", label: "Widgets vivos", value: "8", hint: "todo reordenable" },
    { id: "k3", label: "APIs", value: "Fitbit · NIM", hint: "con fallback local" },
    { id: "k4", label: "Temas", value: "4", hint: "y CSS propio" },
  ],
  milestones: [
    { id: "m1", title: "Tablero customizable", detail: "Temas, tipografías, widgets, export JSON.", done: true },
    { id: "m2", title: "Demo Mejor Día", detail: "Personas Fitbit + coach NVIDIA NIM.", done: true },
    { id: "m3", title: "OAuth Fitbit real", detail: "PKCE, scopes activity/heartrate/sleep.", done: false },
    { id: "m4", title: "Hosting", detail: "Docker + GitHub Pages (modo demo).", done: false },
  ],
  timeline: [
    { id: "t1", when: "Ahora", title: "Studio en vivo", text: "Editá colores, copete y hitos desde el panel. Se guarda en este navegador." },
    { id: "t2", when: "Demo", title: "NVIDIA lee el reloj", text: "Las métricas de sueño, pasos y recuperación se vuelven un plan para el resto del día." },
    { id: "t3", when: "Siguiente", title: "Tu Fitbit de verdad", text: "Registrá una app Client en Fitbit y pegá el Client ID. El callback ya está listo." },
  ],
  changelog: [
    { id: "c1", tag: "Nuevo", text: "Motor local de scoring para que la demo funcione sin claves." },
    { id: "c2", tag: "Nuevo", text: "Integración NVIDIA NIM (OpenAI-compatible) con JSON estricto." },
    { id: "c3", tag: "WIP", text: "Conexión OAuth Fitbit con PKCE." },
  ],
  notes:
    "Usá **Personalizar** para cambiar nombre, % de avance, paleta y qué bloques se ven. Exportá el JSON si lo querés versionar en el repo.",
  nextActions: [
    { id: "n1", text: "Probar Mejor Día con las 3 personas de demo", done: false },
    { id: "n2", text: "Pegar NVIDIA API key (build.nvidia.com)", done: false },
    { id: "n3", text: "Conectar Fitbit cuando tengas Client ID", done: false },
  ],
  quote: "El mejor status no es un screenshot: es una página que el equipo puede vestir en dos minutos.",
});

export const defaultSettings = () => ({
  nvidiaKey: "",
  model: "meta/llama-3.1-8b-instruct",
  name: "Nacho",
  focus: "estudio y el proyecto",
  stepsGoal: 10000,
  sleepGoal: 7.5,
  activeGoal: 30,
  bedtime: "23:15",
  timezone: "America/Argentina/Buenos_Aires",
});

export function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback();
    return { ...fallback(), ...JSON.parse(raw) };
  } catch {
    return fallback();
  }
}

export function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function applyTheme(studio) {
  const theme = THEMES[studio.theme] || THEMES.nocturno;
  const font = FONTS[studio.font] || FONTS.editorial;
  const root = document.documentElement;
  const map = {
    "--bg": theme.bg,
    "--bg-elev": theme.bgElev,
    "--ink": theme.ink,
    "--muted": theme.muted,
    "--accent": theme.accent,
    "--accent-2": theme.accent2,
    "--danger": theme.danger,
    "--line": theme.line,
    "--radius": `${studio.radius ?? 22}px`,
    "--font-display": font.display,
    "--font-body": font.body,
  };
  Object.entries(map).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.density = studio.density || "comoda";
}
