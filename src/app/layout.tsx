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
  title: "UrbanPulse: Miniatur Kota Cerdas IoT",
  description: "Pusat Kendali Miniatur Kota Cerdas berbasis ESP32 dan Kamera Pemantau.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#e6ecf5] text-[#19212d] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
