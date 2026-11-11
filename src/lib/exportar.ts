import type { Base, Vista } from "./motor";

const MARINO = "FF0B1F3B";
const AZUL = "FF2563EB";

type Col = { t: string; w: number; f?: string };

export async function exportarExcel(b: Base, v: Vista, filtros: string): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Índice de ocupación — Almacén de repuestos";

  const tabla = (nombre: string, cols: Col[], filas: (string | number | null)[][]) => {
    const ws = wb.addWorksheet(nombre, { views: [{ state: "frozen", ySplit: 1 }] });
    cols.forEach((c, i) => {
      ws.getColumn(i + 1).width = c.w;
      if (c.f) ws.getColumn(i + 1).numFmt = c.f;
      const cell = ws.getRow(1).getCell(i + 1);
      cell.value = c.t;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MARINO } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = { bottom: { style: "medium", color: { argb: AZUL } } };
    });
    ws.getRow(1).height = 28;
    filas.forEach((f) => ws.addRow(f));
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, filas.length + 1), column: cols.length } };
  };

  const ws = wb.addWorksheet("RESUMEN", { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 3 }, { width: 30 }, { width: 20 }];
  ws.mergeCells("B2:F2");
  ws.getCell("B2").value = "ÍNDICE DE OCUPACIÓN — ALMACÉN DE REPUESTOS";
  ws.getCell("B2").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" }, name: "Arial" };
  ws.getCell("B2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: MARINO } };
  ws.getRow(2).height = 34;
  ws.getCell("B3").value = `Archivo: ${b.archivo}${b.demo ? " (ejemplo)" : ""} · Existencias al ${b.fecha ?? "—"} · Generado ${new Date().toLocaleString("es-CO")} · Filtros: ${filtros}`;
  ws.getCell("B3").font = { size: 9, color: { argb: "FF3A506B" }, name: "Arial" };
  const kp: [string, number | null, string][] = [
    ["Índice global", v.indice, "0.0%"],
    ["Posiciones ocupadas", v.ocupadas, "#,##0"],
    ["Capacidad", v.capacidad, "#,##0"],
    ["Ubicaciones libres", v.libres, "#,##0"],
    ["Ítems", v.items, "#,##0"],
    ["Clasificaciones en alerta", v.alerta, "0"],
  ];
  kp.forEach(([k, val, f], i) => {
    ws.getCell(5 + i, 2).value = k;
    ws.getCell(5 + i, 2).font = { bold: true, name: "Arial" };
    const c = ws.getCell(5 + i, 3);
    c.value = val ?? "—";
    c.numFmt = f;
    c.font = { bold: true, size: 12, name: "Arial", color: { argb: i === 0 ? AZUL : MARINO } };
  });
  ws.getCell(11, 2).value = "Estado";
  ws.getCell(11, 3).value = v.estado;

  tabla(
    "ZONAS",
    [{ t: "Zona", w: 26 }, { t: "Capacidad", w: 12, f: "#,##0" }, { t: "Ocupadas", w: 12, f: "#,##0" }, { t: "Libres", w: 12, f: "#,##0" }, { t: "Ítems", w: 10, f: "#,##0" }, { t: "Índice", w: 10, f: "0.0%" }, { t: "Estado", w: 16 }, { t: "Ítems A", w: 10 }, { t: "Ítems B", w: 10 }, { t: "Ítems C", w: 10 }],
    v.zonas.map((z) => [z.zona, z.capacidad, z.ocupadas, z.libres, z.items, z.indice, z.estado, z.abc.A, z.abc.B, z.abc.C]),
  );
  tabla(
    "CLASIFICACION",
    [{ t: "Zona", w: 24 }, { t: "Tipo", w: 16 }, { t: "Clasificación", w: 24 }, { t: "Prefijos", w: 30 }, { t: "Capacidad", w: 12, f: "#,##0" }, { t: "Ocupadas", w: 12, f: "#,##0" }, { t: "Libres", w: 12, f: "#,##0" }, { t: "Ítems", w: 10, f: "#,##0" }, { t: "Índice", w: 10, f: "0.0%" }, { t: "Estado", w: 16 }],
    v.filas.map((d) => [d.zona, d.tipo, d.clas, d.prefijos.join(" · "), d.capacidad, d.ocupadas, d.libres, d.items, d.indice, d.estado]),
  );
  const filasUb: (string | number | null)[][] = [];
  for (const d of v.filas)
    for (const u of v.ubicaciones.get(d.id) ?? []) for (const it of u.items) filasUb.push([d.zona, d.clas, u.ubic, it.material, it.texto, it.abc, it.alm, it.stock]);
  tabla(
    "UBICACIONES",
    [{ t: "Zona", w: 20 }, { t: "Clasificación", w: 20 }, { t: "Ubicación", w: 14 }, { t: "Material", w: 12 }, { t: "Descripción", w: 44 }, { t: "ABC", w: 6 }, { t: "Alm.", w: 8 }, { t: "Stock", w: 10, f: "#,##0" }],
    filasUb,
  );
  tabla("FUERA_DEL_MAPA", [{ t: "Ubicación", w: 18 }, { t: "Ítems", w: 10 }], v.fuera.map((f) => [f.ubic, f.items]));

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const d = new Date();
  const a = document.createElement("a");
  a.href = url;
  a.download = `Indice_Ocupacion_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
