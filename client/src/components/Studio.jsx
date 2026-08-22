import { useMemo } from "react";
import { FONTS, THEMES, defaultStudio } from "../lib/store.js";
import { Field } from "./ui.jsx";

function markdownLite(text = "") {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
}

function ProgressSun({ value }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <div className="progress-wrap">
      <svg width="160" height="160" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="76" textAnchor="middle" fill="currentColor" fontSize="28" fontFamily="var(--font-display)">
          {v}%
        </text>
      </svg>
    </div>
  );
}

const WIDGET_META = {
  hero: "Portada",
  kpis: "Números",
  milestones: "Hitos",
  timeline: "Línea de tiempo",
  next: "Próximo",
  changelog: "Changelog",
  notes: "Notas",
  wellbeing: "Mejor Día",
};

export function Studio({ studio, setStudio, edit, setEdit }) {
  const visible = useMemo(
    () => (studio.widgetOrder || []).filter((id) => !(studio.hidden || []).includes(id)),
    [studio]
  );

  function patch(partial) {
    setStudio((s) => ({ ...s, ...partial }));
  }

  function onDragStart(event, id) {
    event.dataTransfer.setData("text/plain", id);
  }
  function onDrop(event, targetId) {
    event.preventDefault();
    const source = event.dataTransfer.getData("text/plain");
    if (!source || source === targetId) return;
    const order = [...studio.widgetOrder];
    const from = order.indexOf(source);
    const to = order.indexOf(targetId);
    if (from < 0 || to < 0) return;
    order.splice(from, 1);
    order.splice(to, 0, source);
    patch({ widgetOrder: order });
  }

  const widgets = {
    hero: (
      <article className="card hero" key="hero">
        <div>
          <div className="kicker">{studio.kicker}</div>
          <h1>{studio.title}</h1>
          <p className="tagline">{studio.tagline}</p>
          <div className="meta-row">
            <span className="chip good">{studio.status}</span>
            <span className="chip">{studio.owner}</span>
            <span className="chip">actualizado {studio.updatedLabel}</span>
          </div>
        </div>
        <div>
          <ProgressSun value={studio.percent} />
          <div className="progress-label">{studio.percentLabel}</div>
        </div>
      </article>
    ),
    kpis: (
      <article className="card" key="kpis">
        <div className="widget-head">
          <h2>Pulso</h2>
        </div>
        <div className="kpi-grid">
          {(studio.kpis || []).map((k) => (
            <div className="kpi" key={k.id}>
              <div className="muted">{k.label}</div>
              <div className="value">{k.value}</div>
              <div className="hint">{k.hint}</div>
            </div>
          ))}
        </div>
      </article>
    ),
    milestones: (
      <article className="card" key="milestones">
        <div className="widget-head">
          <h2>Hitos</h2>
          <span className="muted">
            {(studio.milestones || []).filter((m) => m.done).length}/{studio.milestones?.length || 0}
          </span>
        </div>
        <div className="list">
          {(studio.milestones || []).map((m) => (
            <div className="item" key={m.id}>
              <div className={`check ${m.done ? "on" : ""}`} />
              <div>
                <strong>{m.title}</strong>
                <div className="muted">{m.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </article>
    ),
    timeline: (
      <article className="card" key="timeline">
        <h2 className="widget-head">Cómo se está construyendo</h2>
        <div className="timeline">
          {(studio.timeline || []).map((t) => (
            <div key={t.id}>
              <div className="when">{t.when}</div>
              <strong>{t.title}</strong>
              <div className="muted">{t.text}</div>
            </div>
          ))}
        </div>
      </article>
    ),
    next: (
      <article className="card" key="next">
        <h2 className="widget-head">Siguiente</h2>
        <div className="list">
          {(studio.nextActions || []).map((n) => (
            <label className="item" key={n.id}>
              <input
                type="checkbox"
                checked={n.done}
                onChange={() =>
                  patch({
                    nextActions: studio.nextActions.map((x) =>
                      x.id === n.id ? { ...x, done: !x.done } : x
                    ),
                  })
                }
              />
              <span>{n.text}</span>
            </label>
          ))}
        </div>
      </article>
    ),
    changelog: (
      <article className="card" key="changelog">
        <h2 className="widget-head">Changelog</h2>
        <div className="list">
          {(studio.changelog || []).map((c) => (
            <div key={c.id}>
              <span className="chip">{c.tag}</span> {c.text}
            </div>
          ))}
        </div>
      </article>
    ),
    notes: (
      <article className="card notes" key="notes">
        <h2 className="widget-head">Notas del proyecto</h2>
        <p dangerouslySetInnerHTML={{ __html: markdownLite(studio.notes) }} />
        <p className="quote">{studio.quote}</p>
      </article>
    ),
    wellbeing: (
      <article className="card" key="wellbeing">
        <div className="kicker">Demo</div>
        <h2>Mejor Día</h2>
        <p className="tagline">
          NVIDIA NIM lee métricas estilo Fitbit (sueño, pasos, FC, HRV) y te dice cómo viene el día y qué hacer con las horas que quedan.
        </p>
        <div className="meta-row">
          <a className="btn primary" href="#/dia">
            Abrir la demo
          </a>
        </div>
      </article>
    ),
  };

  return (
    <>
      <div className="grid studio">
        {visible.map((id) => (
          <div
            key={id}
            draggable={edit}
            onDragStart={(e) => onDragStart(e, id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, id)}
            className={edit ? "drag-over-host" : ""}
          >
            {edit ? (
              <div className="widget-head">
                <button className="handle" type="button">
                  ↕ {WIDGET_META[id] || id}
                </button>
              </div>
            ) : null}
            {widgets[id]}
          </div>
        ))}
      </div>
      {edit ? <Customizer studio={studio} patch={patch} setEdit={setEdit} setStudio={setStudio} /> : null}
    </>
  );
}

function nid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function RowsEditor({ items, onChange, fields, create }) {
  return (
    <div>
      {(items || []).map((item, i) => (
        <div className={`editor-row ${fields.length > 2 ? "wide" : ""}`} key={item.id || i}>
          {fields.map((f) =>
            f.type === "checkbox" ? (
              <label key={f.key} className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={Boolean(item[f.key])}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...item, [f.key]: e.target.checked };
                    onChange(next);
                  }}
                />
                {f.label}
              </label>
            ) : (
              <input
                key={f.key}
                type="text"
                placeholder={f.label}
                value={item[f.key] ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...item, [f.key]: e.target.value };
                  onChange(next);
                }}
              />
            )
          )}
          <button className="btn" type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button className="btn" type="button" onClick={() => onChange([...(items || []), create()])}>
        + agregar
      </button>
    </div>
  );
}

function Customizer({ studio, patch, setEdit, setStudio }) {
  function toggleHidden(id) {
    const hidden = new Set(studio.hidden || []);
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
    patch({ hidden: [...hidden] });
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(studio, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pagweb-studio.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setStudio((s) => ({ ...s, ...JSON.parse(String(reader.result)) }));
      } catch {
        alert("JSON inválido");
      }
    };
    reader.readAsText(file);
  }

  return (
    <>
      <div className="overlay" onClick={() => setEdit(false)} />
      <aside className="drawer">
        <div className="widget-head">
          <h2>Personalizar</h2>
          <button className="btn" type="button" onClick={() => setEdit(false)}>
            Cerrar
          </button>
        </div>
        <p className="muted">Todo se guarda en este navegador. Arrastrá los bloques para reordenarlos.</p>

        <Field label="Título">
          <input value={studio.title} onChange={(e) => patch({ title: e.target.value })} />
        </Field>
        <Field label="Copete">
          <input value={studio.kicker} onChange={(e) => patch({ kicker: e.target.value })} />
        </Field>
        <Field label="Tagline">
          <textarea value={studio.tagline} onChange={(e) => patch({ tagline: e.target.value })} />
        </Field>
        <Field label="Dueño / equipo">
          <input value={studio.owner} onChange={(e) => patch({ owner: e.target.value })} />
        </Field>
        <Field label={`Avance (${studio.percent}%)`}>
          <input
            type="range"
            min="0"
            max="100"
            value={studio.percent}
            onChange={(e) => patch({ percent: Number(e.target.value) })}
          />
        </Field>
        <Field label="Etiqueta del avance">
          <input value={studio.percentLabel} onChange={(e) => patch({ percentLabel: e.target.value })} />
        </Field>
        <Field label="Estado">
          <input value={studio.status} onChange={(e) => patch({ status: e.target.value })} />
        </Field>

        <Field label="Tema">
          <div className="swatches">
            {Object.values(THEMES).map((t) => (
              <button
                key={t.id}
                className={`swatch ${studio.theme === t.id ? "on" : ""}`}
                type="button"
                onClick={() => patch({ theme: t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Tipografía">
          <div className="swatches">
            {Object.values(FONTS).map((f) => (
              <button
                key={f.id}
                className={`swatch ${studio.font === f.id ? "on" : ""}`}
                type="button"
                onClick={() => patch({ font: f.id })}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label={`Radio (${studio.radius}px)`}>
          <input
            type="range"
            min="8"
            max="36"
            value={studio.radius}
            onChange={(e) => patch({ radius: Number(e.target.value) })}
          />
        </Field>
        <Field label="Densidad">
          <select value={studio.density} onChange={(e) => patch({ density: e.target.value })}>
            <option value="compacta">Compacta</option>
            <option value="comoda">Cómoda</option>
            <option value="aire">Con aire</option>
          </select>
        </Field>

        <h3>Widgets</h3>
        {(studio.widgetOrder || []).map((id) => (
          <label key={id} className="item" style={{ margin: "8px 0" }}>
            <input
              type="checkbox"
              checked={!(studio.hidden || []).includes(id)}
              onChange={() => toggleHidden(id)}
            />
            <span>{WIDGET_META[id] || id}</span>
          </label>
        ))}

        <Field label="Números (pulso)">
          <RowsEditor
            items={studio.kpis}
            onChange={(kpis) => patch({ kpis })}
            fields={[
              { key: "label", label: "etiqueta" },
              { key: "value", label: "valor" },
              { key: "hint", label: "detalle" },
            ]}
            create={() => ({ id: nid("k"), label: "Nuevo", value: "0", hint: "" })}
          />
        </Field>
        <Field label="Hitos">
          <RowsEditor
            items={studio.milestones}
            onChange={(milestones) => patch({ milestones })}
            fields={[
              { key: "title", label: "título" },
              { key: "detail", label: "detalle" },
              { key: "done", label: "listo", type: "checkbox" },
            ]}
            create={() => ({ id: nid("m"), title: "Nuevo hito", detail: "", done: false })}
          />
        </Field>
        <Field label="Siguiente">
          <RowsEditor
            items={studio.nextActions}
            onChange={(nextActions) => patch({ nextActions })}
            fields={[
              { key: "text", label: "acción" },
              { key: "done", label: "hecho", type: "checkbox" },
            ]}
            create={() => ({ id: nid("n"), text: "Nueva acción", done: false })}
          />
        </Field>
        <Field label="Notas">
          <textarea value={studio.notes} onChange={(e) => patch({ notes: e.target.value })} />
        </Field>
        <Field label="Cita">
          <textarea value={studio.quote} onChange={(e) => patch({ quote: e.target.value })} />
        </Field>
        <Field label="CSS extra">
          <textarea
            value={studio.customCss}
            onChange={(e) => patch({ customCss: e.target.value })}
            placeholder=".card { border-color: gold; }"
          />
        </Field>

        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn primary" type="button" onClick={exportJson}>
            Exportar JSON
          </button>
          <label className="btn">
            Importar
            <input type="file" accept="application/json" hidden onChange={importJson} />
          </label>
          <button
            className="btn"
            type="button"
            onClick={() => {
              localStorage.removeItem("pagweb-studio-v1");
              setStudio(defaultStudio());
            }}
          >
            Reset
          </button>
        </div>
      </aside>
    </>
  );
}
