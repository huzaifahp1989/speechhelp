import type { Metadata, Viewport } from "next";
import { Inter, Amiri, Noto_Naskh_Arabic, Noto_Nastaliq_Urdu, Scheherazade_New } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import Script from "next/script";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});
const notoNaskh = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-naskh',
  display: 'swap',
  preload: true,
});
const notoNastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-noto-nastaliq',
  display: 'swap',
});
const scheherazade = Scheherazade_New({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-mushaf',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "SpeechHelp - Quranic Learning Platform",
  description: "Read the Qur'an in 13-line mushaf format, with voice search, audio, hifz tools, and more.",
  manifest: '/manifest.json',
  icons: {
    icon: '/globe.svg',
    shortcut: '/globe.svg',
    apple: '/globe.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SpeechHelp',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0d4f4f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap"
        />
      </head>
      <body className={`${inter.variable} ${amiri.variable} ${notoNaskh.variable} ${notoNastaliq.variable} ${scheherazade.variable} font-sans flex flex-col min-h-full bg-parchment text-foreground antialiased`}>
        <ServiceWorkerRegister />
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script src="https://www.googletagmanager.com/gtag/js?id=G-V6LJFPJK0S" strategy="afterInteractive" />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-V6LJFPJK0S');
              `}
            </Script>
          </>
        )}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
