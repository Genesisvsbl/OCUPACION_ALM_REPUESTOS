"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FilaDet, Vista } from "@/lib/motor";
import { grupoAbc } from "@/lib/motor";
import { ABC_COLOR, fInt, fPct, normalizarBusqueda } from "@/lib/formato";
import { Est } from "./piezas";

const MAX = 150;

export default function Detalle({ v, d, onCerrar }: { v: Vista; d: FilaDet; onCerrar: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [q, setQ] = useState("");
  const ubic = useMemo(() => v.ubicaciones.get(d.id) ?? [], [v, d.id]);
  const lista = useMemo(() => {
    const nq = normalizarBusqueda(q);
    if (!nq) return ubic;
    return ubic.filter((u) => normalizarBusqueda(u.ubic + " " + u.items.map((i) => `${i.material} ${i.texto}`).join(" ")).includes(nq));
  }, [ubic, q]);

  useEffect(() => {
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onCerrar]);

  return (
    <>
      <div className="velo" onClick={onCerrar} />
      <aside className="detalle" role="dialog" aria-modal="true" aria-labelledby="det-t">
        <div className="det-cab">
          <div style={{ minWidth: 0 }}>
            <div className="t2">{d.zona} · {d.tipo}</div>
            <div className="t1" id="det-t">{d.clas}</div>
            <div className="t2">Prefijos: <span className="mono">{d.prefijos.length ? d.prefijos.join(" · ") : "ninguno"}</span></div>
          </div>
          <button className="cerrar" onClick={onCerrar} ref={ref} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="det-kpis">
          <div><span className="rotulo">Ocupación</span><b>{fPct(d.indice)}</b></div>
          <div><span className="rotulo">Ocupadas</span><b>{fInt(d.ocupadas)}</b></div>
          <div><span className="rotulo">Capacidad</span><b>{d.capacidad ? fInt(d.capacidad) : "—"}</b></div>
          <div><span className="rotulo">Libres</span><b className={d.libres !== null && d.libres < 0 ? "neg" : ""}>{d.libres === null ? "—" : fInt(d.libres)}</b></div>
        </div>
        <div className="det-cuerpo">
          <div className="det-sec" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <Est estado={d.estado} />
            <span style={{ fontSize: 12, color: "var(--tinta-2)" }}>{fInt(d.items)} ítems en {fInt(d.ocupadas)} posiciones</span>
          </div>
          {d.libres !== null && d.libres < 0 && (
            <div className="det-sec" style={{ background: "#fdecee", fontSize: 13 }}>
              Hay <b>{fInt(-d.libres)}</b> ubicaciones ocupadas más de las que permite su capacidad. Revisa la capacidad en OCUPACION o ubicaciones mal codificadas.
            </div>
          )}
          <div className="det-sec">
            <div className="rotulo" style={{ marginBottom: 8 }}>Ubicaciones ocupadas ({fInt(ubic.length)})</div>
            {ubic.length > 6 && (
              <label className="buscar" style={{ marginBottom: 8 }}>
                <Search size={14} aria-hidden />
                <span className="sr">Buscar</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ubicación, material o descripción…" />
              </label>
            )}
            {ubic.length === 0 && <p style={{ color: "var(--tinta-3)" }}>Sin existencias en esta clasificación.</p>}
            <ul className="ubic-lista">
              {lista.slice(0, MAX).map((u) => (
                <li key={u.ubic}>
                  <div className="ubic-cab">{u.ubic}<span>{u.items.length} {u.items.length === 1 ? "ítem" : "ítems"}</span></div>
                  {u.items.map((it, i) => (
                    <div className="ubic-art" key={i}>
                      <span className="mono" style={{ color: "var(--tinta)" }}>{it.material}</span>
                      <span className="abc" style={{ ["--c" as string]: ABC_COLOR[grupoAbc(it.abc)], color: grupoAbc(it.abc) === "C" || grupoAbc(it.abc) === "Otro" ? "#0b1f3b" : "#fff" }}>{it.abc || "–"}</span>
                      <span>{it.texto || "Sin descripción"}</span>
                      <span className="num">{it.stock !== null ? fInt(it.stock) : ""}</span>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
            {lista.length > MAX && <p style={{ fontSize: 12, color: "var(--tinta-3)" }}>Mostrando {MAX} de {fInt(lista.length)}. Usa el buscador o exporta a Excel.</p>}
          </div>
        </div>
      </aside>
    </>
  );
}
