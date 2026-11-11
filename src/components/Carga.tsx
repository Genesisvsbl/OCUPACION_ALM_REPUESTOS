"use client";

import { FileSpreadsheet, ShieldCheck } from "lucide-react";

export default function Carga({ sobre, onElegir, onDemo }: { sobre: boolean; onElegir: () => void; onDemo: () => void }) {
  return (
    <section className="carga" aria-label="Cargar archivo">
      <div className={`carga-zona${sobre ? " sobre" : ""}`}>
        <span className="rotulo">Almacén de repuestos</span>
        <h1>Índice de <em>ocupación</em></h1>
        <p>Arrastra aquí el Excel del índice (el que tiene EXISTENCIAS, MM60, OCUPACION y MAPA) o selecciónalo. El tablero se arma solo.</p>
        <div className="carga-botones">
          <button className="btn p" onClick={onElegir}><FileSpreadsheet size={18} />Seleccionar Excel</button>
          <button className="btn" onClick={onDemo}>Ver con datos de ejemplo</button>
        </div>
        <div className="privado"><ShieldCheck size={16} />El archivo se lee en este equipo. No se sube a ningún servidor.</div>
      </div>
      <div className="carga-pasos">
        <h3>Cómo se alimenta</h3>
        <div className="paso"><span className="n">1</span><div><b>EXISTENCIAS</b><span>Pegas la descarga de SAP (A a J) en el Excel.</span></div></div>
        <div className="paso"><span className="n">2</span><div><b>MM60</b><span>Pegas el maestro cuando cambie. Da el ABC de cada material.</span></div></div>
        <div className="paso"><span className="n">3</span><div><b>OCUPACION y MAPA</b><span>La capacidad de cada clasificación y sus prefijos (<code>10080</code>, <code>10090</code>…).</span></div></div>
        <div className="paso"><span className="n">4</span><div><b>Este tablero</b><span>Subes el Excel guardado y ves todo con gráficas y filtros.</span></div></div>
      </div>
    </section>
  );
}
