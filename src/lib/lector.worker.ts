import { leerLibro, ErrorFormato } from "./leer";

self.onmessage = (e: MessageEvent<{ buf: ArrayBuffer; archivo: string }>) => {
  try {
    const base = leerLibro(e.data.buf, e.data.archivo);
    (self as unknown as Worker).postMessage({ ok: true, base });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, formato: err instanceof ErrorFormato, mensaje: err instanceof Error ? err.message : String(err) });
  }
};
