import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UrbanPulse : Autonomous Smart City Virtual Command Center",
  description: "Virtual Command Center untuk memantau kondisi kota real-time, mengontrol perangkat IoT ESP32, dan menjalankan otomasi Smart City.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#070B14] text-slate-100 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
