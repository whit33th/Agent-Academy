import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/components/LenisProvider";
import GlobalAmbientInit from "@/components/GlobalAmbientInit";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Agent Academy",
  description:
    "Agent Academy — browse Valorant agents, maps, and tactical lineups.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-val-bg text-val-cream">
        <LenisProvider />
        <GlobalAmbientInit />
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  );
}
