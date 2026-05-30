import type { Metadata, Viewport } from "next";
import { Bangers, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { ToasterClient } from "@/components/ui/toaster-client";
import { ErrorBoundary } from "@/components/error-boundary";

const bangers = Bangers({
  variable: "--font-bangers",
  subsets: ["latin"],
  weight: "400",
});

const pressStart2P = Press_Start_2P({
  variable: "--font-press-start-2p",
  subsets: ["latin"],
  weight: "400",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F939A3" },
    { media: "(prefers-color-scheme: dark)", color: "#1a0a2e" },
  ],
};

export const metadata: Metadata = {
  title: "Karaoke Eleven - The Ultimate Karaoke Experience",
  description:
    "Sing your heart out with real-time pitch detection, compete with friends, and enjoy party games! The ultimate karaoke experience brought to you by Karaoke Eleven.",
  keywords: [
    "karaoke",
    "singing",
    "pitch detection",
    "party games",
    "music",
    "microphone",
    "karaoke game",
    "Karaoke Eleven",
  ],
  authors: [{ name: "Karaoke Eleven Team" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Karaoke Eleven",
    description:
      "The ultimate karaoke experience with real-time pitch detection",
    type: "website",
    images: [
      {
        url: "/screenshots/gameplay.png",
        width: 1280,
        height: 720,
        alt: "Karaoke Eleven Gameplay",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Karaoke Eleven",
    description:
      "The ultimate karaoke experience with real-time pitch detection",
    images: ["/screenshots/gameplay.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body
        className={`${bangers.variable} ${pressStart2P.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <ToasterClient />
      </body>
    </html>
  );
}
