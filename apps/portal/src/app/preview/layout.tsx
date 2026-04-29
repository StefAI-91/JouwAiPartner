import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  axes: ["opsz", "SOFT"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-num",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Briefing — Connect-CRM · Jouw AI Partner",
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} preview-root`}
    >
      <style>{`
        .preview-root {
          --paper: #F4EFE3;
          --paper-2: #EAE3D1;
          --ink: #14110B;
          --ink-2: #3E382C;
          --ink-3: #6B6453;
          --rule: #1A140A;
          --hairline: #C8BFA9;
          --rust: #B8451F;
          --rust-deep: #7A2B0E;
          --moss: #2D5D3F;
          --amber: #B6831C;
          --signal: #C2300A;

          font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
          color: var(--ink);
          background: var(--paper);
          min-height: 100vh;
        }
        .preview-root .display {
          font-family: var(--font-display), ui-serif, Georgia, serif;
          font-feature-settings: "ss01", "ss02", "liga", "kern";
          letter-spacing: -0.015em;
        }
        .preview-root .num {
          font-family: var(--font-num), ui-monospace, SFMono-Regular, monospace;
          font-feature-settings: "tnum", "ss01";
        }
        .preview-root .label {
          font-family: var(--font-body), ui-sans-serif, sans-serif;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 500;
          color: var(--ink-3);
        }
        .preview-root .rule-thick {
          border-top: 2px solid var(--rule);
        }
        .preview-root .rule-hair {
          border-top: 1px solid var(--hairline);
        }
        .preview-root .paper-noise {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.08  0 0 0 0 0.07  0 0 0 0 0.04  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        }
        .preview-root .live-dot {
          background: var(--moss);
          box-shadow: 0 0 0 0 rgba(45, 93, 63, 0.6);
          animation: live-pulse 2.4s ease-out infinite;
        }
        @keyframes live-pulse {
          0% { box-shadow: 0 0 0 0 rgba(45, 93, 63, 0.55); }
          70% { box-shadow: 0 0 0 10px rgba(45, 93, 63, 0); }
          100% { box-shadow: 0 0 0 0 rgba(45, 93, 63, 0); }
        }
        .preview-root .reveal {
          opacity: 0;
          transform: translateY(8px);
          animation: reveal 700ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
        }
        @keyframes reveal {
          to { opacity: 1; transform: translateY(0); }
        }
        .preview-root .marker {
          background: linear-gradient(180deg, transparent 62%, rgba(184, 69, 31, 0.18) 62%, rgba(184, 69, 31, 0.18) 92%, transparent 92%);
          padding: 0 2px;
        }
        .preview-root .ledger-row:hover { background: rgba(20, 17, 11, 0.025); }
        .preview-root a { color: inherit; text-underline-offset: 3px; }
      `}</style>
      {children}
    </div>
  );
}
