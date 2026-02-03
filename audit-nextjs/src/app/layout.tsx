// app/layout.tsx
import "./globals.css";
import { Providers } from "./AppWrapper";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PTEC Audit System",
    template: "%s | PTEC Audit System",
  },
  description: "ระบบตรวจสอบภายในบริษัท บริสุทธิ์ ไทย เอนเนอร์จี จำกัด",
  keywords: ["PTEC", "Audit", "ตรวจสอบภายใน", "Pure Thai Energy"],
  authors: [{ name: "PTEC IT Department" }],
  creator: "PTEC IT Department",
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: "https://audit.ptec.co.th",
    title: "PTEC Audit System",
    description: "ระบบตรวจสอบภายในบริษัท บริสุทธิ์ ไทย เอนเนอร์จี จำกัด",
    siteName: "PTEC Audit System",
  },
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains */}
        {/* <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /> */}
      </head>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}