import type { Metadata } from "next";
import { Newsreader, Geist, Geist_Mono } from "next/font/google";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-preview-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Design preview — Portal roadmap",
  description: "Visuele mock van de portal-roadmap. Niet productie.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignPreviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`preview-editorial paper-grain min-h-screen ${newsreader.variable} ${geist.variable} ${geistMono.variable}`}
      style={{ fontFamily: "var(--font-editorial-body)" }}
    >
      {children}
    </div>
  );
}
