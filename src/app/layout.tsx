import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { RegisterSW } from "@/components/pwa/register-sw";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Sentinel — Digital Companion for Field Drug Testing",
  description:
    "AI-assisted presumptive field drug-testing companion with GPS-stamped, tamper-evident records and verification. SIH 2026 — PS-231.",
  keywords: ["drug testing", "field test", "presumptive", "Marquis", "colour analysis", "SIH 2026", "PWA"],
  authors: [{ name: "Sentinel" }],
  manifest: "/manifest.json",
  applicationName: "Sentinel",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sentinel",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Sentinel — Field Drug Testing Companion",
    description: "AI-assisted presumptive field drug testing with tamper-evident records.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#3d2a5c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <SonnerToaster richColors position="top-right" />
        <RegisterSW />
      </body>
    </html>
  );
}
