"use client";

import { ArrowUp, Circle, CircleDashed, CircleDot, Minus, OctagonX, TriangleAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Estado } from "@/lib/motor";
import { ESTADO_INFO } from "@/lib/formato";

export function IconoEstado({ estado, size = 11 }: { estado: Estado; size?: number }) {
  const p = { size, strokeWidth: 2.4, "aria-hidden": true } as const;
  switch (estado) {
    case "BAJO": return <Circle {...p} />;
    case "MEDIO": return <CircleDot {...p} />;
    case "ALTO": return <ArrowUp {...p} />;
    case "CRÍTICO": return <TriangleAlert {...p} />;
    case "SATURADO": return <OctagonX {...p} />;
    case "SIN PREFIJO": return <Minus {...p} />;
    default: return <CircleDashed {...p} />;
  }
}

/** Estado con color + icono + texto (nunca solo color). */
export function Est({ estado }: { estado: Estado }) {
  return (
    <span className={`est ${ESTADO_INFO[estado].clase}`}>
      <IconoEstado estado={estado} />
      {estado}
    </span>
  );
}

/** Ventana propia para confirmar (sin confirm() del navegador). */
export function Confirmar({ titulo, texto, accion, onSi, onNo }: { titulo: string; texto: string; accion: string; onSi: () => void; onNo: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onNo();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onNo]);
  return (
    <>
      <div className="velo modal-velo" onClick={onNo} />
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-t">
        <div className="modal-cuerpo">
          <h3 id="modal-t">{titulo}</h3>
          <p>{texto}</p>
        </div>
        <div className="modal-pie">
          <button className="btn" ref={ref} onClick={onNo}>Cancelar</button>
          <button className="btn peligro" onClick={onSi}>{accion}</button>
        </div>
      </div>
    </>
  );
}
