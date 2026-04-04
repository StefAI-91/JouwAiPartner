import type { Metadata } from "next";
import { Nunito, Fredoka, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
        {children}
        <Script
          id="userback"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.Userback = window.Userback || {};
              Userback.access_token = '${process.env.NEXT_PUBLIC_USERBACK_TOKEN || 'A-yzBT0sBbRpLUAfh9yVWo0jSgV'}';
              (function(d) {
                var s = d.createElement('script');
                s.async = true;
                s.src = 'https://static.userback.io/widget/v1.js';
                (d.head || d.body).appendChild(s);
              })(document);
            `,
          }}
        />
      </body>
    </html>
  );
}
