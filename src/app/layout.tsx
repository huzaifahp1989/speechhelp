import type { Metadata } from "next";
import { Inter, Amiri } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const amiri = Amiri({ 
  subsets: ["arabic"], 
  weight: ['400', '700'],
  variable: '--font-amiri'
});

export const metadata: Metadata = {
  title: "Lecture Hub - Islamic Research & Lecture Prep",
  description: "Prepare khutbahs, lectures, and lessons with ease. Search Qur’an, Hadith, Seerah, and Topics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} ${amiri.variable} font-sans flex flex-col min-h-full bg-slate-50 text-slate-900 antialiased`}>
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
