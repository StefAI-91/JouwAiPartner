import type { Metadata } from "next";
import { Newsreader, Geist, Geist_Mono } from "next/font/google";
import { PreviewSidebar } from "@/components/roadmap-preview/preview-sidebar";
import { PreviewTopbar } from "@/components/roadmap-preview/preview-topbar";

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
      {/* Preview-only banner above the chrome */}
      <div
        className="border-b px-6 py-2 text-center"
        style={{
          backgroundColor: "var(--paper-cream)",
          borderColor: "var(--rule-hairline)",
        }}
      >
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--ink-muted)]">
          <span
            aria-hidden
            className="inline-block size-1 rounded-full mr-2 align-middle"
            style={{ backgroundColor: "var(--accent-brand)" }}
          />
          Design preview · prd-portal-roadmap · mock data, geen DB-verbinding
        </p>
      </div>

      <div className="flex min-h-[calc(100vh-2.25rem)]">
        <PreviewSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <PreviewTopbar />
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </div>
    </div>
  );
}
