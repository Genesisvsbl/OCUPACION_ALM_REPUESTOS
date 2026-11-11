"use client";

import { Check, Copy, Download, Loader2, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Base, Vista } from "@/lib/motor";
import { ABC_COLOR, ESTADO_INFO, fInt, fPct } from "@/lib/formato";
import Logo from "./Logo";

type Pestana = "todo" | "zonas" | "clases";
const PESTANAS: { id: Pestana; t: string }[] = [
  { id: "todo", t: "Informe completo" },
  { id: "zonas", t: "Por zona" },
  { id: "clases", t: "Por clasificación" },
];

const ancho = (r: number | null) => `${Math.min(Math.max(r ?? 0, 0), 1) * 100}%`;

/* ---------------------------------------------------------- piezas del informe */
function Cabecera({ b, filtros, titulo }: { b: Base; filtros: string; titulo: string }) {
  return (
    <div className="ri-cab">
      <Logo clase="ri-logo" />
      <div>
        <div className="ri-eyebrow">ALMACÉN DE REPUESTOS · ÍNDICE DE OCUPACIÓN</div>
        <div className="ri-titulo">{titulo}</div>
        <div className="ri-sub">Existencias al {b.fecha ?? "—"}{filtros !== "ninguno" ? ` · ${filtros}` : " · todo el almacén"}</div>
      </div>
    </div>
  );
}

function Banda({ v }: { v: Vista }) {
  return (
    <div className="ri-banda">
      <div><span>ÍNDICE GLOBAL</span><b>{fPct(v.indice)}</b><small>{v.estado} · ocupadas ÷ capacidad</small></div>
      <div><span>POSICIONES OCUPADAS</span><b>{fInt(v.ocupadas)}</b><small>de {fInt(v.capacidad)} ubicaciones</small></div>
      <div><span>LIBRES</span><b>{fInt(v.libres)}</b><small>{v.capacidad ? fPct(v.libres / v.capacidad, 0) : "—"} de la capacidad</small></div>
      <div><span>ÍTEMS</span><b>{fInt(v.items)}</b><small>materiales ubicados</small></div>
      <div className="der"><span>EN ALERTA</span><b>{v.alerta} de {v.filas.length}</b><small>clasificaciones ≥ 85%</small></div>
    </div>
  );
}

function BarrasZona({ v }: { v: Vista }) {
  const zonas = v.zonas;
  const max = Math.max(1, ...zonas.map((z) => z.capacidad));
  return (
    <div className="ri-bloque">
      <h3>Ocupación por zona</h3>
      <p className="ri-nota">Largo gris = capacidad · color = ocupado según su nivel</p>
      {zonas.map((z) => (
        <div className="ri-zona" key={z.zona}>
          <span className="n">{z.zona}</span>
          <span className="pista" style={{ width: z.capacidad ? `${(z.capacidad / max) * 100}%` : "0%" }}>
            <i style={{ width: ancho(z.indice), background: ESTADO_INFO[z.estado].color }} />
          </span>
          <b className="p">{z.indice === null ? "sin cap." : fPct(z.indice, 0)}</b>
          <span className="d">{z.capacidad ? `${fInt(z.ocupadas)} / ${fInt(z.capacidad)}` : `${fInt(z.ocupadas)} pos.`}</span>
        </div>
      ))}
    </div>
  );
}

function TablaClases({ v }: { v: Vista }) {
  const filas = [...v.filas].sort((a, b) => (b.indice ?? -1) - (a.indice ?? -1));
  return (
    <div className="ri-bloque">
      <h3>Detalle por clasificación</h3>
      <table className="ri-tabla">
        <thead>
          <tr><th>Zona</th><th>Clasificación</th><th className="n">Capacidad</th><th className="n">Ocupadas</th><th className="n">Libres</th><th className="n">Ítems</th><th>Ocupación</th><th>Nivel</th></tr>
        </thead>
        <tbody>
          {filas.map((d) => {
            const info = ESTADO_INFO[d.estado];
            return (
              <tr key={d.id}>
                <td>{d.zona}</td>
                <td><b>{d.clas}</b></td>
                <td className="n">{d.capacidad ? fInt(d.capacidad) : "—"}</td>
                <td className="n">{fInt(d.ocupadas)}</td>
                <td className="n" style={d.libres !== null && d.libres < 0 ? { color: "#e5484d", fontWeight: 700 } : undefined}>{d.libres === null ? "—" : fInt(d.libres)}</td>
                <td className="n">{fInt(d.items)}</td>
                <td><span className="ri-mini"><i style={{ width: ancho(d.indice), background: info.color }} /></span><b className="ri-pct">{fPct(d.indice)}</b></td>
                <td><span className="ri-est" style={{ background: info.color, color: ["ALTO", "SIN CAPACIDAD"].includes(d.estado) ? "#0b1f3b" : d.estado === "SIN PREFIJO" ? "#e5484d" : "#fff", border: d.estado === "SIN PREFIJO" ? "1px solid #e5484d" : 0 }}>{d.estado}</span></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr><td colSpan={2}>Total (con capacidad)</td><td className="n">{fInt(v.capacidad)}</td><td className="n">{fInt(v.ocupadas)}</td><td className="n">{fInt(v.libres)}</td><td className="n">{fInt(v.items)}</td><td><b>{fPct(v.indice)}</b></td><td /></tr>
        </tfoot>
      </table>
    </div>
  );
}

function Abc({ v }: { v: Vista }) {
  const zonas = v.zonas.filter((z) => z.items > 0);
  const t = v.abcTotal;
  const tot = Math.max(1, t.A + t.B + t.C + t.Otro);
  return (
    <div className="ri-bloque">
      <h3>Ítems por ABC en cada zona</h3>
      <p className="ri-nota">A: {fInt(t.A)} ({fPct(t.A / tot, 0)}) · B: {fInt(t.B)} ({fPct(t.B / tot, 0)}) · C: {fInt(t.C)} ({fPct(t.C / tot, 0)}){t.Otro ? ` · sin ABC: ${fInt(t.Otro)}` : ""}</p>
      {zonas.map((z) => {
        const s = Math.max(1, z.abc.A + z.abc.B + z.abc.C + z.abc.Otro);
        return (
          <div className="ri-zona" key={z.zona}>
            <span className="n">{z.zona}</span>
            <span className="pista apilada">
              {(["A", "B", "C", "Otro"] as const).map((k) => z.abc[k] > 0 && <i key={k} style={{ position: "static", display: "inline-block", width: `${(z.abc[k] / s) * 100}%`, background: ABC_COLOR[k] }} />)}
            </span>
            <span className="d" style={{ width: 120 }}>{fInt(z.abc.A)} · {fInt(z.abc.B)} · {fInt(z.abc.C)}</span>
          </div>
        );
      })}
      <div className="ri-ley">
        {(["A", "B", "C"] as const).map((k) => <span key={k}><i style={{ background: ABC_COLOR[k] }} />{k}</span>)}
        <span><i style={{ background: ABC_COLOR.Otro }} />Sin ABC</span>
      </div>
    </div>
  );
}

function PorPosicion({ v }: { v: Vista }) {
  const max = Math.max(1, ...v.porPosicion.map((p) => p.posiciones));
  const total = v.porPosicion.reduce((s, p) => s + p.posiciones, 0);
  return (
    <div className="ri-bloque">
      <h3>Materiales por posición</h3>
      <p className="ri-nota">{total ? `El ${fPct((v.porPosicion[0]?.posiciones ?? 0) / total, 0)} de las posiciones guarda un solo material.` : "Sin posiciones."}</p>
      <div className="ri-cols">
        {v.porPosicion.map((p, i) => (
          <div key={p.etiqueta}>
            <b>{fInt(p.posiciones)}</b>
            <span className="col" style={{ height: `${(p.posiciones / max) * 120}px`, background: i >= 3 ? "#0b1f3b" : "#2563eb" }} />
            <small>{p.etiqueta} {p.etiqueta === "1" ? "ítem" : "ítems"}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function Conclusion({ v, revision }: { v: Vista; revision: Vista }) {
  const llenas = [...v.filas].filter((d) => d.indice !== null).sort((a, b) => (b.indice ?? 0) - (a.indice ?? 0)).slice(0, 3);
  const sinPref = revision.todas.filter((d) => d.estado === "SIN PREFIJO").length;
  return (
    <div className="ri-conc">
      <p>
        {llenas.length ? (
          <>
            Lo más lleno: {llenas.map((d, i) => <span key={d.id}>{i ? " · " : ""}<b>{d.zona.includes(d.clas) ? d.zona : `${d.zona} · ${d.clas}`}</b> {fPct(d.indice, 0)}</span>)}.
          </>
        ) : "Sin clasificaciones con capacidad en este filtro."}
      </p>
      <small>
        Posición ocupada = ubicación distinta con existencia · capacidad de la hoja OCUPACION · cada ubicación cae en el prefijo más largo de MAPA.
        {revision.fuera.length ? ` Fuera del MAPA: ${fInt(revision.fuera.length)} ubicaciones.` : ""}
        {revision.sinUbicacion ? ` Sin ubicación: ${fInt(revision.sinUbicacion)} ítems.` : ""}
        {sinPref ? ` Clasificaciones sin prefijo: ${sinPref}.` : ""}
      </small>
    </div>
  );
}

/* ---------------------------------------------------------- ventana */
export default function ReporteImagen({ b, v, revision, filtros, onCerrar }: { b: Base; v: Vista; revision: Vista; filtros: string; onCerrar: () => void }) {
  const [pest, setPest] = useState<Pestana>("todo");
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<null | "copiar" | "compartir" | "descargar">(null);
  const lienzo = useRef<HTMLDivElement>(null);
  const [puedeCompartir] = useState(() => {
    try {
      const f = new File([new Blob()], "x.png", { type: "image/png" });
      return typeof navigator !== "undefined" && typeof navigator.canShare === "function" && navigator.canShare({ files: [f] });
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onCerrar]);


  const nombre = () => {
    const d = new Date();
    return `Ocupacion_Repuestos_${pest === "todo" ? "Informe" : pest === "zonas" ? "Zonas" : "Clasificaciones"}_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.png`;
  };

  const generar = async (): Promise<Blob> => {
    const { toBlob } = await import("html-to-image");
    await document.fonts.ready;
    const nodo = lienzo.current!;
    const blob = await toBlob(nodo, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true, width: nodo.offsetWidth, height: nodo.offsetHeight });
    if (!blob) throw new Error("No se pudo generar la imagen");
    return blob;
  };

  const copiar = async () => {
    setOcupado("copiar");
    try {
      // La promesa va directo al ClipboardItem para no perder el permiso del clic (Safari/Chrome).
      await navigator.clipboard.write([new ClipboardItem({ "image/png": generar() })]);
      setAviso("Copiada. Pégala en el correo o en WhatsApp con Ctrl + V.");
    } catch {
      setAviso("Tu navegador no dejó copiar la imagen. Usa «Descargar PNG».");
    } finally {
      setOcupado(null);
    }
  };

  const compartir = async () => {
    setOcupado("compartir");
    try {
      const file = new File([await generar()], nombre(), { type: "image/png" });
      await navigator.share({ files: [file], title: "Índice de ocupación · Almacén de repuestos" });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setAviso("No se pudo compartir. Usa «Descargar PNG».");
    } finally {
      setOcupado(null);
    }
  };

  const descargar = async () => {
    setOcupado("descargar");
    try {
      const url = URL.createObjectURL(await generar());
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setAviso("Imagen descargada.");
    } catch {
      setAviso("No se pudo generar la imagen.");
    } finally {
      setOcupado(null);
    }
  };

  const titulo = pest === "todo" ? "Informe de ocupación" : pest === "zonas" ? "Ocupación por zona" : "Ocupación por clasificación";

  return (
    <>
      <div className="velo" onClick={onCerrar} />
      <div className="ri-ventana" role="dialog" aria-modal="true" aria-label="Imagen del informe">
        <div className="ri-barra">
          <div className="ri-tabs" role="tablist">
            {PESTANAS.map((p) => (
              <button key={p.id} role="tab" aria-selected={pest === p.id} onClick={() => { setPest(p.id); setAviso(null); }}>{p.t}</button>
            ))}
          </div>
          <div className="ri-acc">
            <button className="btn p chico" onClick={copiar} disabled={!!ocupado}>{ocupado === "copiar" ? <Loader2 size={15} className="girar" /> : <Copy size={15} />}Copiar imagen</button>
            {puedeCompartir && <button className="btn chico" onClick={compartir} disabled={!!ocupado}>{ocupado === "compartir" ? <Loader2 size={15} className="girar" /> : <Share2 size={15} />}Compartir</button>}
            <button className="btn chico" onClick={descargar} disabled={!!ocupado}>{ocupado === "descargar" ? <Loader2 size={15} className="girar" /> : <Download size={15} />}Descargar PNG</button>
            <button className="cerrar oscuro" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
          </div>
        </div>
        {aviso && <div className="ri-aviso"><Check size={15} />{aviso}</div>}
        <div className="ri-scroll">
          <div className="ri-centro"><div className="ri-lienzo" ref={lienzo}>
            <Cabecera b={b} filtros={filtros} titulo={titulo} />
            <Banda v={v} />
            <div className="ri-cuerpo">
              {pest === "todo" && (
                <>
                  <div className="ri-dos"><BarrasZona v={v} /><Abc v={v} /></div>
                  <TablaClases v={v} />
                  <div className="ri-dos"><PorPosicion v={v} /><Conclusion v={v} revision={revision} /></div>
                </>
              )}
              {pest === "zonas" && (<><BarrasZona v={v} /><Conclusion v={v} revision={revision} /></>)}
              {pest === "clases" && (<><TablaClases v={v} /><Conclusion v={v} revision={revision} /></>)}
            </div>
          </div></div>
        </div>
      </div>
    </>
  );
}
