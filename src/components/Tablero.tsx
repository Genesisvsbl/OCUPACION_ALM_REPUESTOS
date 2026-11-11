"use client";

import { ChevronDown, Download, ImageDown, Loader2, Printer, Trash2, Upload, X } from "lucide-react";
import { del, get, set } from "idb-keyval";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { grupoAbc, SIN_FILTROS, vista, type Base, type Estado, type FilaDet, type Filtros } from "@/lib/motor";
import { baseDemo } from "@/lib/demo";
import { exportarExcel } from "@/lib/exportar";
import { ESTADO_INFO, fInt } from "@/lib/formato";
import Carga from "./Carga";
import { Kpis, TablaDetalle, Zonas } from "./Paneles";
import { AbcZona, ItemsPorPosicion, MapaZonas, OcupadasLibres, PorPrefijo } from "./Graficas";
import Detalle from "./Detalle";
import Revision from "./Revision";
import ReporteImagen from "./ReporteImagen";
import Logo from "./Logo";
import { Confirmar } from "./piezas";

const CLAVE = "almacen-repuestos:base:v2";
const NIVELES: Estado[] = ["CRÍTICO", "SATURADO", "ALTO", "MEDIO", "BAJO"];

async function leerEnSegundoPlano(buf: ArrayBuffer, archivo: string): Promise<Base> {
  try {
    const w = new Worker(new URL("../lib/lector.worker.ts", import.meta.url));
    return await new Promise<Base>((ok, mal) => {
      w.onmessage = (e) => {
        w.terminate();
        if (e.data.ok) ok(e.data.base as Base);
        else mal(new Error(e.data.mensaje));
      };
      w.onerror = (e) => {
        w.terminate();
        mal(new Error(e.message || "No se pudo leer el archivo"));
      };
      w.postMessage({ buf, archivo }, [buf]);
    });
  } catch (e) {
    if (e instanceof Error && e.message && !/Worker/i.test(e.message)) throw e;
    const { leerLibro } = await import("@/lib/leer");
    return leerLibro(buf, archivo);
  }
}

export default function Tablero() {
  const [listo, setListo] = useState(false);
  const [base, setBase] = useState<Base | null>(null);
  const [f, setF] = useState<Filtros>(SIN_FILTROS);
  const [sel, setSel] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [sobre, setSobre] = useState(false);
  const [quitar, setQuitar] = useState(false);
  const [imagen, setImagen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    get<Base>(CLAVE)
      .then((b) => b && setBase(b))
      .catch(() => {})
      .finally(() => setListo(true));
  }, []);

  const abrir = useCallback((b: Base) => {
    setBase(b);
    setF(SIN_FILTROS);
    setSel(null);
    set(CLAVE, b).catch(() => toast.warning("No se pudo guardar en este equipo", { description: "Al recargar la página habrá que subir el Excel otra vez." }));
  }, []);

  const onArchivo = useCallback(
    async (file?: File) => {
      if (!file) return;
      if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
        toast.error("Ese archivo no es un Excel", { description: "Sube el Excel del índice (.xlsx)." });
        return;
      }
      setCargando(true);
      try {
        const b = await leerEnSegundoPlano(await file.arrayBuffer(), file.name);
        abrir(b);
        if (b.avisos.length) toast.warning("Archivo cargado con avisos", { description: b.avisos.join(" ") });
        else toast.success("Archivo cargado", { description: `${file.name} · ${fInt(b.items.length)} filas de existencias` });
      } catch (e) {
        toast.error("No se pudo leer el Excel", { description: e instanceof Error ? e.message : String(e), duration: 9000 });
      } finally {
        setCargando(false);
        if (input.current) input.current.value = "";
      }
    },
    [abrir],
  );

  useEffect(() => {
    let n = 0;
    const archivos = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => { if (archivos(e)) { n++; setSobre(true); } };
    const leave = () => { n = Math.max(0, n - 1); if (!n) setSobre(false); };
    const over = (e: DragEvent) => { if (archivos(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => { if (!archivos(e)) return; e.preventDefault(); n = 0; setSobre(false); onArchivo(e.dataTransfer?.files?.[0]); };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [onArchivo]);

  const v = useMemo(() => (base ? vista(base, f) : null), [base, f]);
  const vBase = useMemo(() => (base ? vista(base, SIN_FILTROS) : null), [base]);
  const opciones = useMemo(() => {
    if (!base) return { zonas: [] as string[], clases: [] as string[], alms: [] as string[], abcs: [] as string[] };
    return {
      zonas: [...new Set(base.detalle.map((d) => d.zona))],
      clases: [...new Set(base.detalle.filter((d) => !f.zonas.length || f.zonas.includes(d.zona)).map((d) => d.clas))],
      alms: [...new Set(base.items.map((i) => i.alm).filter(Boolean))].sort(),
      abcs: ["A", "B", "C"].filter((k) => base.items.some((i) => grupoAbc(i.abc) === k)),
    };
  }, [base, f.zonas]);

  const alternar = <K extends "zonas" | "estados" | "abc">(k: K, val: Filtros[K][number]) =>
    setF((x) => {
      const lista = x[k] as string[];
      const nueva = lista.includes(val as string) ? lista.filter((y) => y !== val) : [...lista, val as string];
      return { ...x, [k]: nueva, ...(k === "zonas" ? { clas: null } : {}) };
    });

  const hayFiltros = !!(f.zonas.length || f.clas || f.estados.length || f.abc.length || f.alm);
  const textoFiltros = () =>
    [f.zonas.length && `Zona: ${f.zonas.join(", ")}`, f.clas && `Clasificación: ${f.clas}`, f.estados.length && `Nivel: ${f.estados.join(", ")}`, f.abc.length && `ABC: ${f.abc.join(", ")}`, f.alm && `Alm.: ${f.alm}`]
      .filter(Boolean)
      .join(" · ") || "ninguno";

  const exportar = async () => {
    if (!base || !v) return;
    setExportando(true);
    try {
      await exportarExcel(base, v, textoFiltros());
      toast.success("Reporte descargado");
    } catch (e) {
      toast.error("No se pudo crear el Excel", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setExportando(false);
    }
  };

  const detSel: FilaDet | undefined = v && sel !== null ? v.todas.find((d) => d.id === sel) : undefined;
  const cerrar = useCallback(() => setSel(null), []);

  return (
    <>
      <header className="barra">
        <Logo clase="barra-logo" />
        <div className="barra-titulo">
          <b><span className="t-larga">ALMACÉN DE </span>REPUESTOS</b>
          <span>Índice de ocupación{base ? ` · existencias al ${base.fecha ?? "—"} · ${base.archivo}` : ""}</span>
          {base?.demo && <span className="chip-demo">EJEMPLO</span>}
        </div>
        <div className="barra-acciones">
          {base && (
            <>
              <button className="barra-btn" onClick={() => setImagen(true)} title="Copiar o descargar el informe como imagen">
                <ImageDown size={16} /><span className="txt">Imagen</span>
              </button>
              <button className="barra-btn" onClick={exportar} disabled={exportando} title="Descargar reporte en Excel">
                {exportando ? <Loader2 size={16} className="girar" /> : <Download size={16} />}<span className="txt">Exportar</span>
              </button>
              <button className="barra-btn imprimir" onClick={() => window.print()} title="Imprimir o guardar en PDF">
                <Printer size={16} /><span className="txt">Imprimir</span>
              </button>
              <button className="barra-btn" onClick={() => setQuitar(true)} title="Quitar el archivo de este equipo">
                <Trash2 size={16} /><span className="sr">Quitar archivo</span>
              </button>
              <button className="barra-btn primario" onClick={() => input.current?.click()} disabled={cargando}>
                <Upload size={16} /><span className="txt">Cargar Excel</span>
              </button>
            </>
          )}
        </div>
      </header>
      <input ref={input} type="file" accept=".xlsx,.xlsm,.xls" hidden onChange={(e) => onArchivo(e.target.files?.[0])} />

      {listo && !base && <Carga sobre={sobre} onElegir={() => input.current?.click()} onDemo={() => abrir(baseDemo())} />}

      {base && v && (
        <>
          <Kpis v={v} total={v.filas.length} />

          <div className="filtros" role="toolbar" aria-label="Filtros">
            <div className="fgrupo" role="group" aria-label="Zona">
              <span>Zona</span>
              {opciones.zonas.map((z) => (
                <button key={z} className="chip" aria-pressed={f.zonas.includes(z)} onClick={() => alternar("zonas", z)}>{z}</button>
              ))}
            </div>
            <div className={`sel${f.clas ? " on" : ""}`}>
              <select aria-label="Clasificación" value={f.clas ?? ""} onChange={(e) => setF((x) => ({ ...x, clas: e.target.value || null }))}>
                <option value="">Todas las clasificaciones</option>
                {opciones.clases.map((c) => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} />
            </div>
            <div className="fgrupo" role="group" aria-label="Nivel">
              <span>Nivel</span>
              {NIVELES.map((e) => (
                <button key={e} className={`chip ${ESTADO_INFO[e].clase}`} aria-pressed={f.estados.includes(e)} onClick={() => alternar("estados", e)}>
                  <span className="m" />{e}
                </button>
              ))}
            </div>
            <div className="fgrupo" role="group" aria-label="ABC">
              <span>ABC</span>
              {opciones.abcs.map((k) => (
                <button key={k} className="chip" aria-pressed={f.abc.includes(k)} onClick={() => alternar("abc", k)}>{k}</button>
              ))}
            </div>
            {opciones.alms.length > 1 && (
              <div className={`sel${f.alm ? " on" : ""}`}>
                <select aria-label="Almacén" value={f.alm ?? ""} onChange={(e) => setF((x) => ({ ...x, alm: e.target.value || null }))}>
                  <option value="">Todos los almacenes</option>
                  {opciones.alms.map((a) => <option key={a}>{a}</option>)}
                </select>
                <ChevronDown size={14} />
              </div>
            )}
            <div className="filtros-fin">
              <span className="num">{fInt(v.filas.length)} de {fInt(base.detalle.length)} clasificaciones</span>
              {hayFiltros && <button className="limpiar" onClick={() => setF(SIN_FILTROS)}><X size={13} />Limpiar</button>}
            </div>
          </div>

          <main className="contenido">
            <div className="rej">
              <TablaDetalle v={v} sel={sel} onSel={(d) => setSel(d.id)} />
              <Zonas v={v} activas={f.zonas} onZona={(z) => alternar("zonas", z)} />
            </div>

            <div className="seccion">
              <h2>Gráficas</h2>
              <span>Todas cambian con los filtros de arriba.</span>
            </div>
            <MapaZonas v={v} onZona={(z) => !f.zonas.includes(z) && alternar("zonas", z)} />
            <div className="rej-2">
              <OcupadasLibres v={v} onZona={(z) => alternar("zonas", z)} />
              <AbcZona v={v} activos={f.abc} onAbc={(k) => alternar("abc", k)} />
            </div>
            <div className="rej-2">
              <ItemsPorPosicion v={v} />
              <PorPrefijo v={v} />
            </div>

            {vBase && <Revision b={base} v={vBase} />}
            <footer className="pie">
              <span>Mismo cálculo que las fórmulas del Excel · prefijo más largo de MAPA · capacidad de OCUPACION.</span>
              <span>El archivo se lee y se guarda solo en este equipo.</span>
            </footer>
          </main>
        </>
      )}

      {cargando && (
        <div className="cargando" role="status">
          <div><Loader2 className="girar" size={20} />Leyendo el Excel…</div>
        </div>
      )}
      {sobre && base && (
        <div className="soltar" aria-hidden><Upload size={28} />Suelta el Excel para actualizar el tablero</div>
      )}
      {detSel && v && <Detalle v={v} d={detSel} onCerrar={cerrar} />}
      {imagen && base && v && vBase && <ReporteImagen b={base} v={v} revision={vBase} filtros={textoFiltros()} onCerrar={() => setImagen(false)} />}
      {quitar && (
        <Confirmar
          titulo="¿Quitar el archivo?"
          texto="Se borra de este equipo el Excel cargado y el tablero vuelve a la pantalla inicial. Tu archivo original no se toca."
          accion="Quitar archivo"
          onNo={() => setQuitar(false)}
          onSi={() => {
            setQuitar(false);
            setBase(null);
            setSel(null);
            setF(SIN_FILTROS);
            del(CLAVE).catch(() => {});
            toast("Archivo quitado");
          }}
        />
      )}
      <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: 0, fontFamily: "var(--f-ui)", borderLeft: "4px solid #2563eb" } }} />
    </>
  );
}
