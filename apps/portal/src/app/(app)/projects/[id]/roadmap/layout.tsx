import { Newsreader, Geist } from "next/font/google";

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

export default function RoadmapLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`editorial paper-grain flex flex-1 flex-col ${newsreader.variable} ${geist.variable}`}
      style={{ fontFamily: "var(--font-editorial-body)" }}
    >
      {children}
    </div>
  );
}
