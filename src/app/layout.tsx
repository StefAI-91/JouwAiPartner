import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="nl" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
