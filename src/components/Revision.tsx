"use client";

import { BookOpen, ChevronRight, TriangleAlert } from "lucide-react";
import type { Base, Vista } from "@/lib/motor";
import { fInt } from "@/lib/formato";

/** Lo secundario: al final y cerrado. */
export default function Revision({ b, v }: { b: Base; v: Vista }) {
  const sinPref = v.todas.filter((d) => d.estado === "SIN PREFIJO");
  const mapaHuerfano = b.mapa.filter((m) => m.det < 0);
  const sobre = v.todas.filter((d) => d.libres !== null && d.libres < 0);
  const n = (v.fuera.length ? 1 : 0) + (sinPref.length ? 1 : 0) + (mapaHuerfano.length ? 1 : 0) + (sobre.length ? 1 : 0) + (v.sinUbicacion ? 1 : 0);
  return (
    <div className="secundario no-print">
      <details>
        <summary>
          <TriangleAlert size={16} />
          Revisión del archivo <span className={`cuenta${n ? "" : " cero"}`}>{n}</span>
          <small>datos para corregir en el Excel</small>
          <ChevronRight size={16} className="chev" />
        </summary>
        <div className="sec-cuerpo">
          {n === 0 && <p>Todo cuadra: cada ubicación cae en un prefijo y cada clasificación tiene los suyos.</p>}
          {v.fuera.length > 0 && (
            <>
              <h4>{fInt(v.fuera.length)} ubicaciones fuera del MAPA ({fInt(v.fuera.reduce((s, f) => s + f.items, 0))} ítems)</h4>
              <p>No empiezan por ningún prefijo de la hoja MAPA, así que no cuentan en el índice. Agrega su prefijo en MAPA.</p>
              <div className="codigos">
                {v.fuera.slice(0, 150).map((f) => <span key={f.ubic} title={`${f.items} ítems`}>{f.ubic}</span>)}
                {v.fuera.length > 150 && <span>+{fInt(v.fuera.length - 150)}</span>}
              </div>
            </>
          )}
          {v.sinUbicacion > 0 && <><h4>{fInt(v.sinUbicacion)} ítems sin ubicación</h4><p>Filas de EXISTENCIAS con la columna Ubic. vacía.</p></>}
          {sinPref.length > 0 && (
            <>
              <h4>{sinPref.length} clasificaciones sin prefijo</h4>
              <p>Siempre darán 0 hasta que les pongas prefijos en MAPA.</p>
              <div className="codigos">{sinPref.map((d) => <span key={d.id}>{d.zona} · {d.clas}</span>)}</div>
            </>
          )}
          {sobre.length > 0 && (
            <>
              <h4>{sobre.length} clasificaciones sobre su capacidad</h4>
              <div className="codigos">{sobre.map((d) => <span key={d.id}>{d.zona} · {d.clas}: {d.ocupadas}/{d.capacidad}</span>)}</div>
            </>
          )}
          {mapaHuerfano.length > 0 && (
            <>
              <h4>{mapaHuerfano.length} prefijos de MAPA que no coinciden con OCUPACION</h4>
              <div className="codigos">{mapaHuerfano.map((m, i) => <span key={i}>{m.prefijo} → {m.zona} · {m.clas}</span>)}</div>
            </>
          )}
        </div>
      </details>
      <details>
        <summary>
          <BookOpen size={16} />
          Cómo se calcula
          <ChevronRight size={16} className="chev" />
        </summary>
        <div className="sec-cuerpo">
          <ol className="reglas">
            <li>Cada ubicación de EXISTENCIAS cae en el prefijo <b>más largo</b> de MAPA con el que empieza: <code>100402-082</code> → <code>10040</code> → ZONA 100 · C. Espacios y mayúsculas no importan.</li>
            <li><b>Posiciones ocupadas</b> = ubicaciones distintas con existencia. Varias filas en la misma ubicación son más ítems en la misma posición.</li>
            <li><b>Capacidad</b> = columna CAPACIDAD (UBIC.) del detalle de OCUPACION. Las clasificaciones sin capacidad muestran sus ítems pero no entran al índice.</li>
            <li><b>Índice</b> = ocupadas ÷ capacidad. Niveles: bajo &lt; 40%, medio 40–70%, alto 70–85%, crítico 85–100%, saturado ≥ 100%.</li>
            <li>Filtros de zona, clasificación y nivel cambian la capacidad (suma de lo filtrado). Los filtros ABC y almacén cuentan solo las posiciones de esos ítems sobre la misma capacidad.</li>
            <li>Es el mismo cálculo de las fórmulas del Excel: sin filtros, las cifras son idénticas.</li>
          </ol>
        </div>
      </details>
    </div>
  );
}
