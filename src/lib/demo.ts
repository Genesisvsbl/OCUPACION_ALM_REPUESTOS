import { enlazar, type Base, type Det } from "./motor";

/** Datos de ejemplo FICTICIOS con la misma forma del Excel nuevo. */
export function baseDemo(): Base {
  let s = 20261111;
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const plan: [string, string, string, number | null, string[], number][] = [
    ["ZONA 100", "ESTANTERIA", "A", 252, ["10080", "10090"], 0.42],
    ["ZONA 100", "ESTANTERIA", "B", 336, ["10070", "10060"], 0.78],
    ["ZONA 100", "ESTANTERIA", "C", 392, ["100501", "100502", "10040"], 0.81],
    ["ZONA 100", "ESTANTERIA", "IMPUTADOS", 252, ["10020", "10010"], 0.05],
    ["ZONA 100", "ESTANTERIA", "CONSIGNACION", 56, ["100303"], 0.08],
    ["ZONA 200", "ESTANTERIA", "TODA LA ZONA", 505, ["200"], 0.93],
    ["ZONA 1300", "PISO", "MOTORES", 35, ["13001"], 0.89],
    ["ZONA 1400", "PISO", "STOCK", 132, ["14001", "14002"], 0.2],
    ["ZONA 1400", "ESTANTERIA", "VARIOS", 40, ["14006"], 0.97],
    ["ZONA ACEITES", "PISO", "ACEITES", 7, ["ACEITE"], 1.0],
    ["BOD. ALTERNA", "ESTANTERIA", "EXTRADIMENSIONADOS", 40, ["15001"], 0.25],
    ["TRANSITO", "ESTANTERIA", "NACIONAL", 16, [], 0],
    ["CUARTO EPP", "CUARTO", "EPP Y DOTACION", null, ["CUARTOEPP"], 0],
  ];
  const detalle: Det[] = plan.map(([zona, tipo, clas, capacidad], id) => ({ id, zona, tipo, clas, capacidad, prefijos: [] }));
  const mapa = plan.flatMap(([zona, , clas, , pref]) => pref.map((prefijo) => ({ prefijo, zona, clas })));
  const nombres = ["RODAMIENTO 6205 2RS", "CONTACTOR 3P 25A", "SENSOR INDUCTIVO M18", "CORREA B-52", "SELLO MECÁNICO 35 MM", "VÁLVULA SOLENOIDE 1/2", "MOTOR 5 HP", "GRASA EP2", "FILTRO DE AIRE", "CILINDRO NEUMÁTICO 50X100", "RELÉ TÉRMICO", "ACOPLE FLEXIBLE"];
  const items = [];
  let mat = 300100;
  for (const [, , , cap, pref, tasa] of plan) {
    if (!pref.length) continue;
    const n = cap ? Math.round(cap * tasa) : 4;
    for (let j = 0; j < n; j++) {
      const p = pref[j % pref.length];
      const ubic = /^\d+$/.test(p) ? `${p}${p.length === 5 ? "1" : ""}-${String(Math.floor(j / pref.length) + 1).padStart(3, "0")}` : `${p} ${j + 1}`;
      const veces = pick([1, 1, 1, 2, 2, 3, 4, 6]);
      for (let v = 0; v < veces; v++) {
        mat += 1 + Math.floor(rnd() * 30);
        items.push({ material: String(mat), texto: pick(nombres), alm: rnd() < 0.9 ? "AG05" : "AG97", ubicRaw: ubic, stock: 1 + Math.floor(rnd() * 40), abc: pick(["A", "B", "C", "C", "C"]) });
      }
    }
  }
  for (let i = 0; i < 25; i++) items.push({ material: String(400000 + i), texto: "SIN UBICAR", alm: "AG05", ubicRaw: "", stock: 2, abc: "C" });
  for (let i = 0; i < 9; i++) items.push({ material: String(410000 + i), texto: "UBICACIÓN VIEJA", alm: "AG05", ubicRaw: `10801${20 + i}`, stock: 1, abc: "B" });
  const { mapa: m, items: it } = enlazar(detalle, mapa, items);
  return { archivo: "Ejemplo_ocupacion.xlsx", fecha: "30/05/2026", demo: true, detalle, mapa: m, items: it, avisos: [] };
}
