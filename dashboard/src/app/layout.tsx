import type { Metadata } from "next";
import { Orbitron, IBM_Plex_Mono, Barlow } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AIS · Sistema OSINT Aeroespacial | Conflicto Irán–Israel 2026",
  description: "Cinematic aerospace intelligence experience and tactical OSINT dashboard.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${orbitron.variable} ${plexMono.variable} ${barlow.variable}`}>
        {children}
      </body>
    </html>
  );
}
