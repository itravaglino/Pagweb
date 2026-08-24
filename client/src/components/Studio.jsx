import { useEffect, useMemo, useState } from "react";
import { FONTS, STORAGE_KEY, THEMES, defaultStudio } from "../lib/store.js";
import { Field, Ring } from "./ui.jsx";
import { fetchDay } from "../lib/api.js";
import { minutesToHm } from "@shared/analyze.js";

function markdownLite(text = "") {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
}

function ProgressSlab({ value }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="progress-wrap">
      <div className="progress-slab" aria-label={`${v}%`}>
        <i style={{ height: `${v}%` }} />
        <b>{v}%</b>
      </div>
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

function WellbeingPreview() {
  const [pulse, setPulse] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchDay("mixto", "demo")
      .then((data) => {
        if (!cancelled) setPulse(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const m = pulse?.metrics;
  const max = Math.max(1, ...(m?.week || []).map((d) => d.steps));
  return (
    <article className="card">
      <div className="kicker">Fitbit · demo Córdoba</div>
      <h2>Mejor Día</h2>
      <p className="tagline">
        {m?.story ||
          "Cinco días sintéticos con la forma de la Web API de Fitbit. Tocá la demo: pasos por hora, sueño, HRV y el coach."}
      </p>
      {m ? (
        <>
          <div className="meta-row">
            <span className="chip good">Sueño {minutesToHm(m.sleepMinutes)}</span>
            <span className="chip">Pasos {(m.steps || 0).toLocaleString("es-AR")}</span>
            <span className="chip">FC {m.restingHeartRate}</span>
            <span className="chip">HRV {Math.round(m.hrvRmssd)} ms</span>
          </div>
          <div className="week-bars mini">
            {(m.week || []).map((d) => (
              <div key={d.date} className="week-col" title={`${d.label} · ${d.steps}`}>
                <i style={{ height: `${Math.max(8, (d.steps / max) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="rings" style={{ marginTop: 12 }}>
            <Ring value={Math.round((m.sleepMinutes / 450) * 100)} label="Sueño" />
            <Ring value={Math.min(100, Math.round((m.steps / 10000) * 100))} label="Pasos" color="var(--accent-2)" />
            <Ring value={Math.min(100, m.hrvRmssd * 2)} label="HRV" />
            <Ring value={Math.min(100, m.azmTotal * 2)} label="AZM" color="var(--accent-2)" />
          </div>
        </>
      ) : (
        <p className="muted">Cargando el Charge 6 de demo…</p>
      )}
      <div className="meta-row">
        <a className="btn primary" href="#/dia">
          Abrir la demo
        </a>
        <a className="btn" href="#/archivo">
          Ver la semana
        </a>
      </div>
    </article>
  );
}

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
            <span className="chip">
              {studio.profile?.org || "UNC"} · {studio.profile?.city || "Córdoba"}
            </span>
            <span className="chip">actualizado {studio.updatedLabel}</span>
          </div>
        </div>
        <div>
          <ProgressSlab value={studio.percent} />
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
    wellbeing: <WellbeingPreview key="wellbeing" />,
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
        <h3>Perfil de Nacho</h3>
        <Field label="Nombre completo">
          <input
            value={studio.profile?.fullName || ""}
            onChange={(e) => patch({ profile: { ...studio.profile, fullName: e.target.value } })}
          />
        </Field>
        <Field label="Cómo te decimos">
          <input
            value={studio.profile?.shortName || ""}
            onChange={(e) => patch({ profile: { ...studio.profile, shortName: e.target.value } })}
          />
        </Field>
        <Field label="Ciudad">
          <input
            value={studio.profile?.city || ""}
            onChange={(e) => patch({ profile: { ...studio.profile, city: e.target.value } })}
          />
        </Field>
        <Field label="Organización">
          <input
            value={studio.profile?.org || ""}
            onChange={(e) => patch({ profile: { ...studio.profile, org: e.target.value } })}
          />
        </Field>
        <Field label="Mail">
          <input
            value={studio.profile?.email || ""}
            onChange={(e) => patch({ profile: { ...studio.profile, email: e.target.value } })}
          />
        </Field>
        <Field label="Rol">
          <input
            value={studio.profile?.role || ""}
            onChange={(e) => patch({ profile: { ...studio.profile, role: e.target.value } })}
          />
        </Field>
        <Field label="Foco">
          <input
            value={studio.profile?.focus || ""}
            onChange={(e) => patch({ profile: { ...studio.profile, focus: e.target.value } })}
          />
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
        <Field label="Acento (vacío = del tema)">
          <input
            type="color"
            value={studio.accentOverride || THEMES[studio.theme]?.accent || "#b03a2e"}
            onChange={(e) => patch({ accentOverride: e.target.value })}
          />
          <button className="btn" type="button" onClick={() => patch({ accentOverride: "" })}>
            Usar acento del tema
          </button>
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
        <Field label="Línea de tiempo">
          <RowsEditor
            items={studio.timeline}
            onChange={(timeline) => patch({ timeline })}
            fields={[
              { key: "when", label: "cuándo" },
              { key: "title", label: "título" },
              { key: "text", label: "texto" },
            ]}
            create={() => ({ id: nid("t"), when: "Ahora", title: "Nuevo", text: "" })}
          />
        </Field>
        <Field label="Changelog">
          <RowsEditor
            items={studio.changelog}
            onChange={(changelog) => patch({ changelog })}
            fields={[
              { key: "tag", label: "tag" },
              { key: "text", label: "texto" },
            ]}
            create={() => ({ id: nid("c"), tag: "Nuevo", text: "" })}
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
              localStorage.removeItem(STORAGE_KEY);
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
