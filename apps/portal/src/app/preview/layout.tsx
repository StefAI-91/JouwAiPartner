import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Briefing — Connect-CRM · Jouw AI Partner",
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen text-foreground"
      style={{
        background: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)",
        backgroundAttachment: "fixed",
      }}
    >
      {children}
    </div>
  );
}
