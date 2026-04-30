import type { Metadata, Viewport } from "next";
import { Nunito, Fredoka, Geist_Mono, Instrument_Serif } from "next/font/google";
import { UserbackProvider } from "@/components/shared/userback-provider";
import { JaipWidgetScript } from "@/components/shared/jaip-widget-script";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fredoka = Fredoka({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * TH-014 (UI-402) — Editorial-stijl serif voor de Theme-Narrator lede + pull-
 * quotes in de Verhaal-tab. Uitsluitend daar gebruikt; rest van de cockpit
 * blijft op Nunito (sans) + Fredoka (heading).
 */
const instrumentSerif = Instrument_Serif({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Jouw AI Partner — Knowledge Platform",
  description: "AI-first knowledge platform voor jouw team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${nunito.variable} ${fredoka.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased overflow-x-hidden">
        {children}
        <UserbackProvider />
        <JaipWidgetScript />
      </body>
    </html>
  );
}
