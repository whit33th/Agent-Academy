import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/components/LenisProvider";
import GlobalAmbientInit from "@/components/GlobalAmbientInit";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import OnboardingRoot from "@/components/onboarding/OnboardingRoot";
import { buildRootMetadata } from "@/lib/metadata";
import AppProviders from "@/components/auth/AppProviders";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = buildRootMetadata();

export const viewport: Viewport = {
  themeColor: "#FF4655",
  colorScheme: "dark",
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
        <AppProviders>
        <LenisProvider />
        <GlobalAmbientInit />
        <Suspense fallback={null}>{children}</Suspense>
        <InstallPrompt />
        <Suspense fallback={null}>
          <OnboardingRoot />
        </Suspense>
        </AppProviders>
      </body>
    </html>
  );
}
