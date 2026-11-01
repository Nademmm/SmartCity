import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SmartCity: Panel Kendali ESP32",
  description: "Panel kendali perangkat keras ESP32 SmartCity: Sensor Gas MQ, LCD I2C, Dual Ultrasonik, Smart PJU LDR, dan Buzzer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-theme="light">
      <body
        className={`${plexSans.variable} ${plexMono.variable} antialiased min-h-dvh`}
      >
        {children}
      </body>
    </html>
  );
}
