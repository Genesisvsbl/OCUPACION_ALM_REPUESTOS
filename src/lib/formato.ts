import type { Estado } from "./motor";

/** 2212 → "2.212" (punto de miles siempre, también con 4 cifras). */
export function fInt(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const n = Math.round(v);
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return n < 0 ? `−${s}` : s;
}
/** 0.7214 → "72,1" */
export function fPctNum(v: number | null | undefined, dec = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const [e, d] = (v * 100).toFixed(dec).split(".");
  return `${v < 0 ? "−" : ""}${e.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${d ? "," + d : ""}`;
}
export const fPct = (v: number | null | undefined, dec = 1) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : `${fPctNum(v, dec)}%`);
export const fDec = (v: number, dec = 1) => v.toFixed(dec).replace(".", ",");

export const ESTADO_INFO: Record<Estado, { clase: string; color: string; nota: string; corto: string }> = {
  BAJO: { clase: "e-bajo", color: "#7F93B3", nota: "Menos de 40%: hay espacio", corto: "< 40%" },
  MEDIO: { clase: "e-medio", color: "#4C8DFF", nota: "40–70%: controlado", corto: "40–70%" },
  ALTO: { clase: "e-alto", color: "#F5B83D", nota: "70–85%: revisar capacidad", corto: "70–85%" },
  "CRÍTICO": { clase: "e-critico", color: "#F2711C", nota: "85–100%: acción prioritaria", corto: "85–100%" },
  SATURADO: { clase: "e-saturado", color: "#E5484D", nota: "100% o más: sin espacio", corto: "≥ 100%" },
  "SIN CAPACIDAD": { clase: "e-sin", color: "#C9D4E5", nota: "No tiene capacidad: no entra al índice", corto: "sin cap." },
  "SIN PREFIJO": { clase: "e-sinpref", color: "#FFFFFF", nota: "No tiene prefijos en MAPA: siempre da 0", corto: "sin prefijo" },
};

export const ABC_COLOR: Record<string, string> = { A: "#0B1F3B", B: "#2563EB", C: "#9CC3FF", Otro: "#D6DEEA" };

export const normalizarBusqueda = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
