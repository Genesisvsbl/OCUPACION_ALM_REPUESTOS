"use client";

import { useState } from "react";

/** Ícono de la marca: usa public/logo-bavaria.png si existe; si no, la "R". */
export default function Logo({ clase }: { clase: string }) {
  const [falla, setFalla] = useState(false);
  if (falla) return <div className={clase} aria-hidden>R</div>;
  return (
    <div className={`${clase} con-img`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-bavaria.png" alt="" onError={() => setFalla(true)} />
    </div>
  );
}
