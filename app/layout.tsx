import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Crux",
  description: "Practice DSA with your crew — one room, one problem, one shared streak.",
};

// Read the persisted theme before paint to avoid a flash of the wrong theme.
const THEME_INIT_SCRIPT = `
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${archivo.variable} ${jetbrainsMono.variable}`}
        style={{ fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
