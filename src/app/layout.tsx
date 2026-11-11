import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Índice de ocupación · Almacén de repuestos",
  description: "Tablero de ocupación del almacén de repuestos: capacidad, posiciones ocupadas, zonas y direcciones críticas.",
};

export const viewport: Viewport = { themeColor: "#0b1f3b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}
