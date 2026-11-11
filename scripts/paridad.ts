// Compara el motor web con los valores calculados por el propio Excel (fórmulas).
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { leerLibro } from "../src/lib/leer";
import { vista, SIN_FILTROS } from "../src/lib/motor";
const [, , xlsxPath, verifPath] = process.argv;
const buf = readFileSync(xlsxPath);
const t0 = performance.now();
const b = leerLibro(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, "x.xlsx");
const v = vista(b, SIN_FILTROS);
console.log("tiempo", Math.round(performance.now() - t0), "ms; items", b.items.length, "avisos", b.avisos);
const wb = XLSX.read(readFileSync(verifPath), { type: "buffer" });
const ws = wb.Sheets["OCUPACION"]; const rr = XLSX.utils.decode_range(ws["!ref"]!); rr.s.c = 0; rr.s.r = 0;
const oc = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, range: rr, blankrows: true }) as unknown[][];
const errs: string[] = [];
let nComp = 0; const eq = (k: string, a: unknown, e: unknown) => { nComp++; const ok = typeof a === "number" && typeof e === "number" ? Math.abs(a - e) < 1e-9 : a === e; if (!ok) errs.push(`${k}: web=${a} excel=${e}`); };
const k5 = oc[4];
eq("indice", v.indice, k5[1]); eq("ocupadas", v.ocupadas, k5[2]); eq("capacidad", v.capacidad, k5[3]); eq("libres", v.libres, k5[4]); eq("items", v.items, k5[5]); eq("alerta", v.alerta, k5[6]);
for (const fila of oc) {
  const z = v.zonas.find((x) => x.zona === fila[1]);
  if (z && typeof fila[2] === "number" && typeof fila[3] === "number" && fila[7] !== undefined && typeof fila[8] !== "string") {
    eq(`zona ${z.zona} cap`, z.capacidad, fila[2]); eq(`zona ${z.zona} oc`, z.ocupadas, fila[3]); eq(`zona ${z.zona} items`, z.items, fila[5]);
    eq(`zona ${z.zona} A`, z.abc.A, fila[8]); eq(`zona ${z.zona} B`, z.abc.B, fila[9]); eq(`zona ${z.zona} C`, z.abc.C, fila[10]);
  }
  const d = v.todas.find((x) => x.zona === fila[1] && x.clas === fila[3] && x.tipo === fila[2]);
  if (d) { eq(`det ${d.zona}/${d.clas} oc`, d.ocupadas, fila[5]); eq(`det ${d.zona}/${d.clas} items`, d.items, fila[7]); eq(`det ${d.zona}/${d.clas} estado`, d.estado, fila[9]); }
}
eq("fuera ubic", v.fuera.length, oc[53][4]); eq("fuera items", v.fuera.reduce((s, f) => s + f.items, 0), oc[52][4]); eq("sin ubic", v.sinUbicacion, oc[51][4]);
console.log("comparaciones", nComp); console.log(errs.length ? "DIFERENCIAS\n" + errs.join("\n") : `OK paridad con el Excel — ${(v.indice! * 100).toFixed(2)}% · ${v.ocupadas}/${v.capacidad} · ${v.items} ítems · ${v.zonas.length} zonas`);
