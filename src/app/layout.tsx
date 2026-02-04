import type { Metadata } from "next";
import { Inter, Amiri } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const amiri = Amiri({ 
  subsets: ["arabic"], 
  weight: ['400', '700'],
  variable: '--font-amiri'
});

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Lecture Hub - Islamic Research & Lecture Prep",
  description: "Prepare khutbahs, lectures, and lessons with ease. Search Qur’an, Hadith, Seerah, and Topics.",
  manifest: '/manifest.json',
  themeColor: '#ffffff',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SpeechHelp',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} ${amiri.variable} font-sans flex flex-col min-h-full bg-slate-50 text-slate-900 antialiased`}>
        <ServiceWorkerRegister />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-V6LJFPJK0S" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-V6LJFPJK0S');
          `}
        </Script>
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
