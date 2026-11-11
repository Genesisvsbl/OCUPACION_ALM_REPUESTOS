/**
 * Motor del índice de ocupación — lee el Excel nuevo
 * (EXISTENCIAS + MAPA + OCUPACION + MM60) y calcula lo mismo que sus fórmulas:
 *  - Cada ubicación cae en el prefijo MÁS LARGO de MAPA con el que empieza
 *    (prefijos de 3 a 12 caracteres; si se repite, gana el primero). Espacios y mayúsculas no importan.
 *  - Posición ocupada = ubicación distinta con existencia.
 *  - Capacidad = la columna CAPACIDAD (UBIC.) del detalle de OCUPACION.
 *  - Índice global = posiciones en clasificaciones con capacidad ÷ capacidad total.
 */

export type Estado = "BAJO" | "MEDIO" | "ALTO" | "CRÍTICO" | "SATURADO" | "SIN CAPACIDAD" | "SIN PREFIJO";
export const ESTADOS: Estado[] = ["CRÍTICO", "SATURADO", "ALTO", "MEDIO", "BAJO", "SIN CAPACIDAD", "SIN PREFIJO"];

export interface Det {
  id: number;
  zona: string;
  tipo: string;
  clas: string;
  capacidad: number | null;
  prefijos: string[];
}
export interface Pref {
  prefijo: string;
  clave: string;
  zona: string;
  clas: string;
  det: number; // índice en detalle (-1 si no existe)
}
export interface Item {
  material: string;
  texto: string;
  alm: string;
  ubicRaw: string;
  ubic: string;
  stock: number | null;
  abc: string;
  pref: number; // índice en mapa (-1 fuera del mapa)
  det: number; // índice en detalle (-1)
}
export interface Base {
  archivo: string;
  fecha: string | null;
  demo: boolean;
  detalle: Det[];
  mapa: Pref[];
  items: Item[];
  avisos: string[];
}

export const normUbic = (v: unknown) =>
  v === null || v === undefined ? "" : String(v).replace(/ /g, "").replace(/\s+/g, "").toUpperCase();
export const normTxt = (v: unknown) =>
  v === null || v === undefined ? "" : String(v).normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
const llave = (z: string, c: string) => `${normTxt(z)}|${normTxt(c)}`;

export function clasificar(r: number | null): Estado {
  if (r === null || Number.isNaN(r)) return "SIN CAPACIDAD";
  if (r >= 1) return "SATURADO";
  if (r >= 0.85) return "CRÍTICO";
  if (r >= 0.7) return "ALTO";
  if (r >= 0.4) return "MEDIO";
  return "BAJO";
}

/** Asigna prefijo/clasificación a cada ítem. Se llama una vez al cargar. */
export function enlazar(detalle: Det[], mapaCrudo: Omit<Pref, "clave" | "det">[], items: Omit<Item, "pref" | "det" | "ubic">[]): { mapa: Pref[]; items: Item[] } {
  const idx = new Map(detalle.map((d, i) => [llave(d.zona, d.clas), i]));
  const mapa: Pref[] = mapaCrudo.map((m) => ({ ...m, clave: normUbic(m.prefijo), det: idx.get(llave(m.zona, m.clas)) ?? -1 }));
  for (const d of detalle) d.prefijos = mapa.filter((m) => m.det === d.id).map((m) => m.prefijo);
  // índice por longitud para la búsqueda del prefijo más largo
  // Igual que la fórmula del Excel: prefijos de 3 a 12 caracteres; si un prefijo está repetido gana el primero.
  const valido = (c: string) => c.length >= 3 && c.length <= 12;
  const largos = [...new Set(mapa.map((m) => m.clave.length).filter((l) => valido("x".repeat(l))))].sort((a, b) => b - a);
  const porClave = new Map<string, number>();
  mapa.forEach((m, i) => valido(m.clave) && !porClave.has(m.clave) && porClave.set(m.clave, i));
  const cache = new Map<string, number>();
  const buscar = (u: string) => {
    if (!u) return -1;
    const c = cache.get(u);
    if (c !== undefined) return c;
    let r = -1;
    for (const l of largos) {
      if (l > u.length) continue;
      const k = porClave.get(u.slice(0, l));
      if (k !== undefined) {
        r = k;
        break;
      }
    }
    cache.set(u, r);
    return r;
  };
  const out: Item[] = items.map((it) => {
    const ubic = normUbic(it.ubicRaw);
    const pref = buscar(ubic);
    return { ...it, ubic, pref, det: pref >= 0 ? mapa[pref].det : -1 };
  });
  return { mapa, items: out };
}

/* ------------------------------------------------------------- vista */

export interface Filtros {
  zonas: string[];
  clas: string | null;
  estados: Estado[];
  abc: string[];
  alm: string | null;
}
export const SIN_FILTROS: Filtros = { zonas: [], clas: null, estados: [], abc: [], alm: null };

export interface FilaDet extends Det {
  ocupadas: number;
  items: number;
  libres: number | null;
  indice: number | null;
  estado: Estado;
}
export interface FilaZona {
  zona: string;
  capacidad: number;
  ocupadas: number;
  libres: number | null;
  items: number;
  indice: number | null;
  estado: Estado;
  abc: Record<string, number>;
}
export interface Vista {
  filas: FilaDet[];
  todas: FilaDet[];
  zonas: FilaZona[];
  capacidad: number;
  ocupadas: number;
  libres: number;
  items: number;
  indice: number | null;
  estado: Estado;
  alerta: number;
  filtrado: boolean;
  porPosicion: { etiqueta: string; posiciones: number }[];
  porPrefijo: { prefijo: string; zona: string; clas: string; posiciones: number }[];
  abcTotal: Record<string, number>;
  fuera: { ubic: string; items: number }[];
  sinUbicacion: number;
  sinCapacidadPos: number;
  ubicaciones: Map<number, { ubic: string; items: Item[] }[]>; // por det
}

const ABC_ORDEN = ["A", "B", "C"];
export const grupoAbc = (a: string) => (ABC_ORDEN.includes(a) ? a : "Otro");

export function vista(b: Base, f: Filtros): Vista {
  const pasaItem = (it: Item) => (!f.abc.length || f.abc.includes(grupoAbc(it.abc))) && (!f.alm || it.alm === f.alm);
  const itemsF = b.items.filter(pasaItem);

  // estadísticas por clasificación (con filtros de ítem)
  const ubicPorDet = new Map<number, Map<string, Item[]>>();
  for (const it of itemsF) {
    if (it.det < 0) continue;
    const m = ubicPorDet.get(it.det) ?? new Map<string, Item[]>();
    const l = m.get(it.ubic) ?? [];
    l.push(it);
    m.set(it.ubic, l);
    ubicPorDet.set(it.det, m);
  }
  const todas: FilaDet[] = b.detalle.map((d) => {
    const m = ubicPorDet.get(d.id);
    const ocupadas = m?.size ?? 0;
    const items = m ? [...m.values()].reduce((s, l) => s + l.length, 0) : 0;
    const cap = d.capacidad && d.capacidad > 0 ? d.capacidad : null;
    const indice = cap ? ocupadas / cap : null;
    const estado: Estado = d.prefijos.length === 0 ? "SIN PREFIJO" : clasificar(indice);
    return { ...d, ocupadas, items, libres: cap ? cap - ocupadas : null, indice, estado };
  });

  const filas = todas.filter(
    (d) => (!f.zonas.length || f.zonas.includes(d.zona)) && (!f.clas || d.clas === f.clas) && (!f.estados.length || f.estados.includes(d.estado)),
  );
  const visibles = new Set(filas.map((d) => d.id));
  const filtradoFilas = !!(f.zonas.length || f.clas || f.estados.length);
  const filtrado = filtradoFilas || !!(f.abc.length || f.alm);

  const capacidad = filas.reduce((s, d) => s + (d.capacidad && d.capacidad > 0 ? d.capacidad : 0), 0);
  const ocupadas = filas.reduce((s, d) => s + (d.capacidad && d.capacidad > 0 ? d.ocupadas : 0), 0);
  const items = filas.reduce((s, d) => s + d.items, 0);
  const indice = capacidad > 0 ? ocupadas / capacidad : null;

  // zonas (orden del detalle)
  const zonasOrden = [...new Set(filas.map((d) => d.zona))];
  const itemsVis = itemsF.filter((it) => it.det >= 0 && visibles.has(it.det));
  const zonas: FilaZona[] = zonasOrden.map((z) => {
    const ds = filas.filter((d) => d.zona === z);
    const capZ = ds.reduce((s, d) => s + (d.capacidad && d.capacidad > 0 ? d.capacidad : 0), 0);
    const ocZ = capZ > 0 ? ds.reduce((s, d) => s + (d.capacidad && d.capacidad > 0 ? d.ocupadas : 0), 0) : ds.reduce((s, d) => s + d.ocupadas, 0);
    const idx = capZ > 0 ? ocZ / capZ : null;
    const abc: Record<string, number> = { A: 0, B: 0, C: 0, Otro: 0 };
    for (const it of itemsVis) if (b.detalle[it.det].zona === z) abc[grupoAbc(it.abc)]++;
    return { zona: z, capacidad: capZ, ocupadas: ocZ, libres: capZ > 0 ? capZ - ocZ : null, items: ds.reduce((s, d) => s + d.items, 0), indice: idx, estado: clasificar(idx), abc };
  });

  // ítems por posición
  const conteo = new Map<string, number>();
  for (const it of itemsVis) conteo.set(it.ubic, (conteo.get(it.ubic) ?? 0) + 1);
  const cubetas = [1, 2, 3, 4, 5];
  const porPosicion = cubetas.map((k) => ({
    etiqueta: k === 5 ? "5 o más" : String(k),
    posiciones: [...conteo.values()].filter((v) => (k === 5 ? v >= 5 : v === k)).length,
  }));

  // posiciones por prefijo
  const porPref = new Map<number, Set<string>>();
  for (const it of itemsVis) {
    const s = porPref.get(it.pref) ?? new Set<string>();
    s.add(it.ubic);
    porPref.set(it.pref, s);
  }
  const porPrefijo = [...porPref.entries()]
    .map(([i, s]) => ({ prefijo: b.mapa[i].prefijo, zona: b.mapa[i].zona, clas: b.mapa[i].clas, posiciones: s.size }))
    .sort((a, c) => c.posiciones - a.posiciones);

  const abcTotal: Record<string, number> = { A: 0, B: 0, C: 0, Otro: 0 };
  for (const it of itemsVis) abcTotal[grupoAbc(it.abc)]++;

  const fueraMap = new Map<string, number>();
  let sinUbicacion = 0;
  if (!filtradoFilas)
    for (const it of itemsF) {
      if (!it.ubic) sinUbicacion++;
      else if (it.pref < 0) fueraMap.set(it.ubic, (fueraMap.get(it.ubic) ?? 0) + 1);
    }

  const ubicaciones = new Map<number, { ubic: string; items: Item[] }[]>();
  for (const [det, m] of ubicPorDet) ubicaciones.set(det, [...m.entries()].map(([ubic, l]) => ({ ubic, items: l })).sort((a, c) => (a.ubic < c.ubic ? -1 : 1)));

  return {
    filas,
    todas,
    zonas,
    capacidad,
    ocupadas,
    libres: capacidad - ocupadas,
    items,
    indice,
    estado: clasificar(indice),
    alerta: filas.filter((d) => d.estado === "CRÍTICO" || d.estado === "SATURADO").length,
    filtrado,
    porPosicion,
    porPrefijo,
    abcTotal,
    fuera: [...fueraMap.entries()].map(([ubic, items]) => ({ ubic, items })).sort((a, c) => c.items - a.items),
    sinUbicacion,
    sinCapacidadPos: filas.filter((d) => !(d.capacidad && d.capacidad > 0)).reduce((s, d) => s + d.ocupadas, 0),
    ubicaciones,
  };
}
