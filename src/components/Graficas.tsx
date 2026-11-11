"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from "recharts";
import type { Estado, Vista } from "@/lib/motor";
import { clasificar } from "@/lib/motor";
import { ABC_COLOR, ESTADO_INFO, fInt, fPct } from "@/lib/formato";

const EJE = { fontSize: 11, fill: "#6b7f99", fontFamily: "Archivo Variable, sans-serif" };
const corto = (s: string, n = 16) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

type TipP = { active?: boolean; payload?: readonly { payload?: Record<string, unknown> }[] };

/* ============================================ 1. Mapa de zonas (treemap) */
type NodoMapa = { name: string; size: number; ocupadas: number; indice: number; estado: Estado; zona: string };

function CeldaMapa(props: Record<string, unknown>) {
  const { x, y, width, height, name, indice, ocupadas, size, estado, depth } = props as {
    x: number; y: number; width: number; height: number; name: string; indice: number; ocupadas: number; size: number; estado: Estado; depth: number;
  };
  if (depth !== 1 || !estado) return null;
  const color = ESTADO_INFO[estado].color;
  const oscuro = estado === "BAJO" || estado === "MEDIO" || estado === "CRÍTICO" || estado === "SATURADO";
  const t = oscuro ? "#fff" : "#0b1f3b";
  const grande = width > 120 && height > 96;
  return (
    <g style={{ cursor: "pointer" }}>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="#fff" strokeWidth={3} />
      {width > 60 && height > 30 && (
        <>
          <text x={x + 10} y={y + 18} fill={t} fontSize={11} fontWeight={800} style={{ letterSpacing: ".04em" }}>{corto(name, Math.floor(width / 7.5))}</text>
          <text x={x + 10} y={y + (grande ? 52 : 36)} fill={t} fontSize={grande ? 30 : 16} fontWeight={300}>{fPct(indice, 0)}</text>
          {grande && height > 110 && <text x={x + 10} y={y + height - 12} fill={t} fontSize={11} opacity={0.85}>{fInt(ocupadas)} de {fInt(size)} posiciones</text>}
        </>
      )}
    </g>
  );
}

export function MapaZonas({ v, onZona }: { v: Vista; onZona: (z: string) => void }) {
  const datos: NodoMapa[] = v.filas
    .filter((d) => d.capacidad && d.capacidad > 0)
    .map((d) => ({ name: v.zonas.length > 1 && d.clas !== d.zona ? `${d.zona} · ${d.clas}` : d.clas, size: d.capacidad!, ocupadas: d.ocupadas, indice: d.indice ?? 0, estado: d.estado, zona: d.zona }));
  return (
    <section className="panel" aria-labelledby="g-mapa">
      <div className="ph">
        <div>
          <h2 id="g-mapa">Mapa del almacén</h2>
          <p>Cada bloque es una clasificación: el tamaño es su capacidad y el color qué tan llena está. Toca un bloque para filtrar su zona.</p>
        </div>
      </div>
      <div className="graf graf-alto">
        {datos.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={datos}
              dataKey="size"
              aspectRatio={1.6}
              isAnimationActive
              animationDuration={500}
              content={<CeldaMapa />}
              onClick={(n: unknown) => {
                const z = (n as { zona?: string })?.zona;
                if (z) onZona(z);
              }}
            >
              <Tooltip
                content={({ active, payload }: TipP) =>
                  active && payload?.length ? (
                    <div className="tip">
                      <b>{String(payload[0].payload!.name)}</b>
                      <span>{fPct(payload[0].payload!.indice as number)} · {String(payload[0].payload!.estado)}</span>
                      <span>{fInt(payload[0].payload!.ocupadas as number)} ocupadas de {fInt(payload[0].payload!.size as number)}</span>
                    </div>
                  ) : null
                }
              />
            </Treemap>
          </ResponsiveContainer>
        ) : (
          <div className="vacio">No hay clasificaciones con capacidad en este filtro.</div>
        )}
      </div>
      <div className="leyenda">
        {(["BAJO", "MEDIO", "ALTO", "CRÍTICO", "SATURADO"] as Estado[]).map((e) => (
          <span key={e}><i style={{ background: ESTADO_INFO[e].color }} />{e.charAt(0) + e.slice(1).toLowerCase()} {ESTADO_INFO[e].corto}</span>
        ))}
      </div>
    </section>
  );
}

/* ============================================ 2. Ocupadas vs libres por zona */
export function OcupadasLibres({ v, onZona }: { v: Vista; onZona: (z: string) => void }) {
  const datos = v.zonas
    .filter((z) => z.capacidad > 0)
    .map((z) => ({ et: `${corto(z.zona, 14)}  ${fPct(z.indice, 0)}`, zona: z.zona, ocupadas: Math.min(z.ocupadas, z.capacidad), exceso: Math.max(0, z.ocupadas - z.capacidad), libres: Math.max(0, z.capacidad - z.ocupadas), indice: z.indice, capacidad: z.capacidad, real: z.ocupadas }));
  const alto = Math.max(200, datos.length * 34 + 40);
  return (
    <section className="panel" aria-labelledby="g-ol">
      <div className="ph"><div><h2 id="g-ol">Ocupadas vs. libres por zona</h2><p>Largo de la barra = capacidad de la zona.</p></div></div>
      <div className="graf" style={{ height: alto }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} barCategoryGap={8}>
            <CartesianGrid horizontal={false} stroke="#edf1f7" />
            <XAxis type="number" tick={EJE} axisLine={false} tickLine={false} tickFormatter={(x) => fInt(x)} />
            <YAxis type="category" dataKey="et" tick={{ ...EJE, fill: "#0b1f3b" }} width={140} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "#eef3fb" }}
              content={({ active, payload }: TipP) =>
                active && payload?.length ? (
                  <div className="tip">
                    <b>{String(payload[0].payload!.zona)}</b>
                    <span>{fInt(payload[0].payload!.real as number)} ocupadas · {fInt(payload[0].payload!.libres as number)} libres</span>
                    <span>{fPct(payload[0].payload!.indice as number)} de {fInt(payload[0].payload!.capacidad as number)}</span>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="ocupadas" stackId="a" fill="#2563eb" animationDuration={500} onClick={(d: unknown) => onZona((d as { zona: string }).zona)} style={{ cursor: "pointer" }}>
              {datos.map((d) => <Cell key={d.zona} fill={ESTADO_INFO[clasificar(d.indice)].color === "#7F93B3" ? "#2563eb" : ESTADO_INFO[clasificar(d.indice)].color} />)}
            </Bar>
            <Bar dataKey="exceso" stackId="a" fill="#b3261e" animationDuration={500} />
            <Bar dataKey="libres" stackId="a" fill="#dbe4f0" animationDuration={500} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="leyenda">
        <span><i style={{ background: "#2563eb" }} />Ocupadas (color = nivel)</span>
        <span><i style={{ background: "#dbe4f0" }} />Libres</span>
        <span><i style={{ background: "#b3261e" }} />Sobre la capacidad</span>
      </div>
    </section>
  );
}

/* ============================================ 3. ABC por zona */
export function AbcZona({ v, activos, onAbc }: { v: Vista; activos: string[]; onAbc: (a: string) => void }) {
  const datos = v.zonas
    .filter((z) => z.items > 0)
    .map((z) => {
      const t = Math.max(1, z.abc.A + z.abc.B + z.abc.C + z.abc.Otro);
      return { zona: z.zona, A: z.abc.A / t, B: z.abc.B / t, C: z.abc.C / t, Otro: z.abc.Otro / t, nA: z.abc.A, nB: z.abc.B, nC: z.abc.C, nO: z.abc.Otro };
    });
  const tot = v.abcTotal;
  const totN = Math.max(1, tot.A + tot.B + tot.C + tot.Otro);
  const alto = Math.max(200, datos.length * 34 + 40);
  return (
    <section className="panel" aria-labelledby="g-abc">
      <div className="ph"><div><h2 id="g-abc">Ítems por ABC en cada zona</h2><p>Qué tan rotativo es lo que ocupa cada zona. Toca A, B o C para filtrar.</p></div></div>
      <div className="graf" style={{ height: alto }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }} barCategoryGap={8}>
            <XAxis type="number" domain={[0, 1]} tick={EJE} axisLine={false} tickLine={false} tickFormatter={(x) => fPct(x, 0)} />
            <YAxis type="category" dataKey="zona" tick={EJE} width={110} axisLine={false} tickLine={false} tickFormatter={(s) => corto(s, 15)} />
            <Tooltip
              cursor={{ fill: "#eef3fb" }}
              content={({ active, payload }: TipP) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload!;
                return (
                  <div className="tip">
                    <b>{String(p.zona)}</b>
                    <span>A: {fInt(p.nA as number)} · B: {fInt(p.nB as number)} · C: {fInt(p.nC as number)}{(p.nO as number) ? ` · otro: ${fInt(p.nO as number)}` : ""}</span>
                  </div>
                );
              }}
            />
            {["A", "B", "C", "Otro"].map((k) => (
              <Bar key={k} dataKey={k} stackId="abc" fill={ABC_COLOR[k]} animationDuration={500} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="leyenda">
        {["A", "B", "C"].map((k) => (
          <button key={k} aria-pressed={!activos.length || activos.includes(k)} onClick={() => onAbc(k)}>
            <i style={{ background: ABC_COLOR[k] }} />{k}: {fInt(tot[k])} ítems ({fPct(tot[k] / totN, 0)})
          </button>
        ))}
        {tot.Otro > 0 && <span><i style={{ background: ABC_COLOR.Otro }} />Sin ABC: {fInt(tot.Otro)}</span>}
      </div>
    </section>
  );
}

/* ============================================ 4. Ítems por posición */
export function ItemsPorPosicion({ v }: { v: Vista }) {
  const total = v.porPosicion.reduce((s, x) => s + x.posiciones, 0);
  const una = v.porPosicion[0]?.posiciones ?? 0;
  return (
    <section className="panel" aria-labelledby="g-ipp">
      <div className="ph"><div><h2 id="g-ipp">¿Cuántos materiales hay en cada posición?</h2><p>Posiciones ocupadas según cuántos ítems guardan.</p></div></div>
      <div className="graf graf-medio">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={v.porPosicion} margin={{ left: 0, right: 8, top: 20, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#edf1f7" />
            <XAxis dataKey="etiqueta" tick={EJE} axisLine={false} tickLine={false} label={{ value: "ítems en la posición", position: "insideBottom", offset: -2, style: { ...EJE, fontSize: 10 } }} height={36} />
            <YAxis tick={EJE} axisLine={false} tickLine={false} width={44} tickFormatter={(x) => fInt(x)} />
            <Tooltip cursor={{ fill: "#eef3fb" }} content={({ active, payload }: TipP) => (active && payload?.length ? <div className="tip"><b>{String(payload[0].payload!.etiqueta)} ítem(s)</b><span>{fInt(payload[0].payload!.posiciones as number)} posiciones · {fPct((payload[0].payload!.posiciones as number) / Math.max(1, total), 0)}</span></div> : null)} />
            <Bar dataKey="posiciones" fill="#2563eb" animationDuration={500}>
              {v.porPosicion.map((p, i) => <Cell key={p.etiqueta} fill={i >= 3 ? "#0b1f3b" : "#2563eb"} />)}
              <LabelList dataKey="posiciones" position="top" formatter={(x: unknown) => fInt(x as number)} style={{ fontSize: 11, fontWeight: 700, fill: "#0b1f3b" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="nota-graf">{total ? <>El <b>{fPct(una / total, 0)}</b> de las posiciones guarda un solo material.</> : "Sin posiciones en este filtro."}</div>
    </section>
  );
}

/* ============================================ 5. Posiciones por prefijo */
export function PorPrefijo({ v }: { v: Vista }) {
  const datos = v.porPrefijo.slice(0, 14).map((p) => ({ ...p, et: `${p.prefijo} · ${p.clas}` }));
  return (
    <section className="panel" aria-labelledby="g-pre">
      <div className="ph"><div><h2 id="g-pre">Posiciones ocupadas por prefijo</h2><p>Los {datos.length} prefijos de MAPA con más ubicaciones ocupadas.</p></div></div>
      <div className="graf" style={{ height: Math.max(200, datos.length * 26 + 30) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }} barCategoryGap={5}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="et" tick={{ ...EJE, fontFamily: "IBM Plex Mono, monospace", fontSize: 10.5 }} width={170} axisLine={false} tickLine={false} tickFormatter={(s) => corto(s, 24)} />
            <Tooltip cursor={{ fill: "#eef3fb" }} content={({ active, payload }: TipP) => (active && payload?.length ? <div className="tip"><b>{String(payload[0].payload!.prefijo)}</b><span>{String(payload[0].payload!.zona)} · {String(payload[0].payload!.clas)}</span><span>{fInt(payload[0].payload!.posiciones as number)} posiciones ocupadas</span></div> : null)} />
            <Bar dataKey="posiciones" fill="#1d4ed8" animationDuration={500}>
              <LabelList dataKey="posiciones" position="right" formatter={(x: unknown) => fInt(x as number)} style={{ fontSize: 11, fontWeight: 700, fill: "#0b1f3b" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
