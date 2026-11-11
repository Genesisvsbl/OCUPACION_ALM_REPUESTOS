import * as XLSX from "xlsx";
import { enlazar, normTxt, type Base, type Det } from "./motor";

type Fila = unknown[];

function hoja(wb: XLSX.WorkBook, nombre: string): Fila[] | null {
  const real = wb.SheetNames.find((n) => normTxt(n) === nombre) ?? wb.SheetNames.find((n) => normTxt(n).includes(nombre));
  if (!real) return null;
  const ws = wb.Sheets[real];
  if (!ws["!ref"]) return [];
  const r = XLSX.utils.decode_range(ws["!ref"]);
  r.s.r = 0;
  r.s.c = 0;
  return XLSX.utils.sheet_to_json<Fila>(ws, { header: 1, raw: true, defval: null, blankrows: true, range: r });
}

/** Busca la fila de encabezado que contiene todas las palabras pedidas. */
function encabezado(filas: Fila[], requeridas: string[], max = 40): { fila: number; col: (nombre: string) => number } | null {
  for (let i = 0; i < Math.min(filas.length, max); i++) {
    const celdas = (filas[i] ?? []).map((v) => normTxt(v));
    if (requeridas.every((q) => celdas.some((c) => c === q || c.startsWith(q)))) {
      return {
        fila: i,
        col: (nombre: string) => {
          const q = normTxt(nombre);
          let j = celdas.findIndex((c) => c === q);
          if (j < 0) j = celdas.findIndex((c) => c.startsWith(q));
          return j;
        },
      };
    }
  }
  return null;
}

const txt = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "number" && Number.isInteger(v) ? String(v) : String(v).trim());
const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};

export class ErrorFormato extends Error {}

export function leerLibro(buf: ArrayBuffer, archivo: string): Base {
  const wb = XLSX.read(buf, { type: "array", dense: true, cellDates: true, cellFormula: false, cellHTML: false, cellStyles: false, cellText: false });
  const avisos: string[] = [];

  /* OCUPACION: detalle por clasificación (capacidades) */
  const oc = hoja(wb, "OCUPACION");
  if (!oc) throw new ErrorFormato("No encontré la hoja OCUPACION. Usa el Excel nuevo (EXISTENCIAS, MM60, OCUPACION, MAPA).");
  const eo = encabezado(oc, ["ZONA", "TIPO DE ALMACENAMIENTO", "CLASIFICACION", "CAPACIDAD"]);
  if (!eo) throw new ErrorFormato("En OCUPACION no encontré la tabla de detalle (ZONA, TIPO, CLASIFICACIÓN, CAPACIDAD).");
  const [cz, ct, cc, ccap] = [eo.col("ZONA"), eo.col("TIPO DE ALMACENAMIENTO"), eo.col("CLASIFICACION"), eo.col("CAPACIDAD")];
  const detalle: Det[] = [];
  for (let i = eo.fila + 1; i < oc.length; i++) {
    const f = oc[i] ?? [];
    const zona = txt(f[cz]);
    if (!zona) {
      if (detalle.length) break;
      continue;
    }
    if (normTxt(zona).startsWith("TOTAL")) break;
    detalle.push({ id: detalle.length, zona, tipo: txt(f[ct]), clas: txt(f[cc]), capacidad: num(f[ccap]), prefijos: [] });
  }
  if (!detalle.length) throw new ErrorFormato("La tabla de detalle de OCUPACION está vacía.");

  // fecha de corte ("Existencias al:")
  let fecha: string | null = null;
  for (let i = 0; i < Math.min(oc.length, 6) && !fecha; i++) {
    const f = oc[i] ?? [];
    const j = f.findIndex((v) => normTxt(v).startsWith("EXISTENCIAS AL"));
    if (j >= 0) {
      const v = f.slice(j + 1).find((x) => x !== null && x !== "");
      if (v instanceof Date) fecha = `${String(v.getDate()).padStart(2, "0")}/${String(v.getMonth() + 1).padStart(2, "0")}/${v.getFullYear()}`;
      else if (v) fecha = String(v);
    }
  }

  /* MAPA */
  const mp = hoja(wb, "MAPA");
  if (!mp) throw new ErrorFormato("No encontré la hoja MAPA.");
  const em = encabezado(mp, ["PREFIJO", "ZONA", "CLASIFICACION"]);
  if (!em) throw new ErrorFormato("En MAPA no encontré los encabezados PREFIJO, ZONA y CLASIFICACIÓN.");
  const [mpP, mpZ, mpC] = [em.col("PREFIJO"), em.col("ZONA"), em.col("CLASIFICACION")];
  const mapa: { prefijo: string; zona: string; clas: string }[] = [];
  for (let i = em.fila + 1; i < mp.length; i++) {
    const f = mp[i] ?? [];
    const p = txt(f[mpP]);
    if (!p) continue;
    mapa.push({ prefijo: p, zona: txt(f[mpZ]), clas: txt(f[mpC]) });
  }

  /* MM60 → ABC (primer registro de cada material) */
  const abcDe = new Map<string, string>();
  const mm = hoja(wb, "MM60");
  if (mm) {
    const e = encabezado(mm, ["MATERIAL"]);
    if (e) {
      const cm = e.col("MATERIAL");
      const ca = e.col("INDICADOR ABC");
      if (ca >= 0)
        for (let i = e.fila + 1; i < mm.length; i++) {
          const f = mm[i] ?? [];
          const m = txt(f[cm]);
          if (m && !abcDe.has(m)) abcDe.set(m, txt(f[ca]).toUpperCase());
        }
    }
  }

  /* EXISTENCIAS */
  const ex = hoja(wb, "EXISTENCIAS");
  if (!ex) throw new ErrorFormato("No encontré la hoja EXISTENCIAS.");
  const ee = encabezado(ex, ["MATERIAL", "UBIC."]);
  if (!ee) throw new ErrorFormato("En EXISTENCIAS no encontré las columnas Material y Ubic.");
  const c = {
    mat: ee.col("MATERIAL"),
    txt: ee.col("TEXTO BREVE"),
    alm: ee.col("ALM."),
    ub: ee.col("UBIC."),
    stk: ee.col("STOCK ALM."),
    abc: ee.col("ABC"),
  };
  const crudos = [];
  for (let i = ee.fila + 1; i < ex.length; i++) {
    const f = ex[i] ?? [];
    const material = txt(f[c.mat]);
    if (!material) continue;
    const abc = abcDe.get(material) ?? (c.abc >= 0 ? txt(f[c.abc]).toUpperCase() : "");
    crudos.push({
      material,
      texto: c.txt >= 0 ? txt(f[c.txt]) : "",
      alm: c.alm >= 0 ? txt(f[c.alm]) : "",
      ubicRaw: c.ub >= 0 ? txt(f[c.ub]) : "",
      stock: c.stk >= 0 ? num(f[c.stk]) : null,
      abc,
    });
  }
  if (!crudos.length) avisos.push("EXISTENCIAS no tiene filas.");
  if (!mm) avisos.push("No se encontró MM60: el ABC se toma de la columna ABC de EXISTENCIAS.");

  const { mapa: m2, items } = enlazar(detalle, mapa, crudos);
  const sinDet = m2.filter((m) => m.det < 0);
  if (sinDet.length) avisos.push(`${sinDet.length} prefijos de MAPA apuntan a una zona/clasificación que no está en OCUPACION.`);
  return { archivo, fecha, demo: false, detalle, mapa: m2, items, avisos };
}
