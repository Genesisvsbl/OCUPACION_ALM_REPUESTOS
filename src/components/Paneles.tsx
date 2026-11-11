"use client";

import { AlertTriangle, ArrowDown, ArrowUp, Boxes, MapPin, PackageOpen } from "lucide-react";
import { useMemo, useState } from "react";
import type { FilaDet, Vista } from "@/lib/motor";
import { ESTADO_INFO, fDec, fInt, fPct, fPctNum } from "@/lib/formato";
import { Est } from "./piezas";

/* ========================================================= KPIs */
export function Kpis({ v, total }: { v: Vista; total: number }) {
  const info = ESTADO_INFO[v.estado];
  return (
    <section className="kpis" aria-label="Indicadores">
      <div className="kpi kpi-ix">
        <div>
          <div className="rotulo">Índice global{v.filtrado ? " · filtrado" : ""}</div>
          <div className="kpi-v">{fPct(v.indice)}</div>
        </div>
        <div className="medidor">
          <Est estado={v.estado} />
          <div className="medidor-pista" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((v.indice ?? 0) * 100)} aria-label="Ocupación">
            <i style={{ width: `${Math.min(v.indice ?? 0, 1) * 100}%`, background: info.color }} />
            {[0.4, 0.7, 0.85].map((m) => <b key={m} style={{ left: `${m * 100}%` }} />)}
          </div>
          <div className="kpi-n">{info.nota}</div>
        </div>
      </div>
      <div className="kpi">
        <div className="rotulo"><MapPin size={11} /> Ocupadas</div>
        <div className="kpi-v">{fInt(v.ocupadas)}<small>/ {fInt(v.capacidad)}</small></div>
        <div className="kpi-n">Ubicaciones distintas con existencia</div>
      </div>
      <div className="kpi">
        <div className="rotulo"><PackageOpen size={11} /> Libres</div>
        <div className="kpi-v">{fInt(v.libres)}</div>
        <div className="kpi-n">{v.capacidad ? `${fPctNum(v.libres / v.capacidad)}% de la capacidad` : "Sin capacidad"}</div>
      </div>
      <div className="kpi">
        <div className="rotulo"><Boxes size={11} /> Ítems</div>
        <div className="kpi-v">{fInt(v.items)}</div>
        <div className="kpi-n">{v.ocupadas ? `${fDec(v.items / Math.max(1, v.ocupadas + v.sinCapacidadPos))} por posición` : "—"}</div>
      </div>
      <div className={`kpi${v.alerta ? " alerta" : ""}`}>
        <div className="rotulo"><AlertTriangle size={11} /> En alerta</div>
        <div className="kpi-v">{v.alerta}<small>de {total}</small></div>
        <div className="kpi-n">Clasificaciones ≥ 85%</div>
      </div>
    </section>
  );
}

/* ========================================================= tabla de detalle */
type Llave = "zona" | "clas" | "capacidad" | "ocupadas" | "libres" | "items" | "indice";
const COLS: { k: Llave; t: string; n?: boolean; opc?: boolean }[] = [
  { k: "zona", t: "Zona", opc: true },
  { k: "clas", t: "Clasificación" },
  { k: "capacidad", t: "Capacidad", n: true, opc: true },
  { k: "ocupadas", t: "Ocupadas", n: true },
  { k: "libres", t: "Libres", n: true, opc: true },
  { k: "items", t: "Ítems", n: true, opc: true },
  { k: "indice", t: "Ocupación" },
];

export function TablaDetalle({ v, sel, onSel }: { v: Vista; sel: number | null; onSel: (d: FilaDet) => void }) {
  const [orden, setOrden] = useState<{ k: Llave | null; asc: boolean }>({ k: null, asc: false });
  const filas = useMemo(() => {
    if (!orden.k) return v.filas;
    const k = orden.k;
    const val = (d: FilaDet) => (d[k] ?? -1) as number | string;
    return [...v.filas].sort((a, b) => {
      const x = val(a), y = val(b);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es");
      return orden.asc ? c : -c;
    });
  }, [v.filas, orden]);
  const capT = v.filas.reduce((s, d) => s + (d.capacidad ?? 0), 0);

  return (
    <section className="panel" aria-labelledby="t-det">
      <div className="ph">
        <div>
          <h2 id="t-det">Detalle por clasificación</h2>
          <p>Toca una fila para ver sus ubicaciones y materiales. Toca un encabezado para ordenar.</p>
        </div>
      </div>
      <div className="tabla-wrap">
        <table className="t">
          <thead>
            <tr>
              {COLS.map((c) => {
                const on = orden.k === c.k;
                return (
                  <th key={c.k} className={`${c.n ? "n" : ""} ${c.opc ? "col-opc" : ""}`} aria-sort={on ? (orden.asc ? "ascending" : "descending") : undefined}>
                    <button onClick={() => setOrden(on ? { k: c.k, asc: !orden.asc } : { k: c.k, asc: !c.n && c.k !== "indice" })}>
                      {c.t}
                      {on && (orden.asc ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                    </button>
                  </th>
                );
              })}
              <th className="col-opc"><button tabIndex={-1}>Estado</button></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((d) => {
              const info = ESTADO_INFO[d.estado];
              return (
                <tr key={d.id} onClick={() => onSel(d)} aria-selected={sel === d.id} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSel(d)}>
                  <td className="col-opc">{d.zona}</td>
                  <td><b>{d.clas}</b><small className="solo-movil">{d.zona}</small></td>
                  <td className="n col-opc">{d.capacidad ? fInt(d.capacidad) : "—"}</td>
                  <td className="n">{fInt(d.ocupadas)}</td>
                  <td className={`n col-opc${d.libres !== null && d.libres < 0 ? " neg" : ""}`}>{d.libres === null ? "—" : fInt(d.libres)}</td>
                  <td className="n col-opc">{fInt(d.items)}</td>
                  <td>
                    <div className={`cb ${info.clase}`}>
                      <span className="p" aria-hidden><i style={{ width: `${Math.min(d.indice ?? 0, 1) * 100}%` }} /></span>
                      <span className="v">{fPct(d.indice)}</span>
                    </div>
                  </td>
                  <td className="col-opc"><Est estado={d.estado} /></td>
                </tr>
              );
            })}
          </tbody>
          {filas.length > 1 && (
            <tfoot>
              <tr>
                <td className="col-opc">Total</td>
                <td>(con capacidad)</td>
                <td className="n col-opc">{fInt(capT)}</td>
                <td className="n">{fInt(v.ocupadas)}</td>
                <td className="n col-opc">{fInt(v.libres)}</td>
                <td className="n col-opc">{fInt(v.items)}</td>
                <td><span className="v num" style={{ fontWeight: 700 }}>{fPct(v.indice)}</span></td>
                <td className="col-opc" />
              </tr>
            </tfoot>
          )}
        </table>
        {filas.length === 0 && <div className="vacio">Ninguna clasificación cumple los filtros.</div>}
      </div>
    </section>
  );
}

/* ========================================================= zonas */
export function Zonas({ v, activas, onZona }: { v: Vista; activas: string[]; onZona: (z: string) => void }) {
  return (
    <section className="panel" aria-labelledby="t-zon">
      <div className="ph"><div><h2 id="t-zon">Por zona</h2><p>Toca para filtrar.</p></div></div>
      {v.zonas.map((z) => {
        const info = ESTADO_INFO[z.estado];
        return (
          <button key={z.zona} className={`zr ${info.clase}`} aria-pressed={activas.includes(z.zona)} onClick={() => onZona(z.zona)}>
            <div className="h"><span>{z.zona}</span><span className="num">{z.indice === null ? "sin cap." : fPct(z.indice)}</span></div>
            <div className="tr"><i style={{ width: `${Math.min(z.indice ?? 0, 1) * 100}%` }} /></div>
            <div className="s num">{z.capacidad ? `${fInt(z.ocupadas)} de ${fInt(z.capacidad)}` : `${fInt(z.ocupadas)} posiciones`} · {fInt(z.items)} ítems</div>
          </button>
        );
      })}
      {v.zonas.length === 0 && <div className="vacio">Sin zonas.</div>}
    </section>
  );
}
