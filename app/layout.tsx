import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import SmoothScrollController from "@/components/SmoothScrollController";
import AmbientAudioController from "@/components/AmbientAudioController";
import OnboardingRoot from "@/components/onboarding/OnboardingRoot";
import { buildRootMetadata } from "@/lib/metadata";
import DesktopAppProviders from "@/components/auth/DesktopAppProviders";
import DesktopTitleBar from "@/components/layout/DesktopTitleBar";
import AppBackground from "@/components/background/AppBackground";

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
      className={`${inter.variable} ${oswald.variable} desktop-runtime h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-val-bg text-val-cream">
        <DesktopAppProviders>
          <AppBackground />
          <div className="relative z-10">
            <DesktopTitleBar />
            <SmoothScrollController />
            <AmbientAudioController />
            <Suspense fallback={null}>{children}</Suspense>
            <Suspense fallback={null}>
              <OnboardingRoot />
            </Suspense>
          </div>
        </DesktopAppProviders>
      </body>
    </html>
  );
}
