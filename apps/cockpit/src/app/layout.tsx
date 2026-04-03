import type { Metadata } from "next";
import { Nunito, Fredoka, Geist_Mono } from "next/font/google";
import { UserbackProvider } from "@/components/shared/userback-provider";
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
      className={`${nunito.variable} ${fredoka.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <UserbackProvider>{children}</UserbackProvider>
      </body>
    </html>
  );
}
