import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./fonts.css";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SWRegistration } from "@/components/SWRegistration";
import { OfflineSync } from "@/components/OfflineSync";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

import type { Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#DC2626',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: {
    default: "Achariya Ambassador | 25th Year Celebration",
    template: "%s | Achariya Ambassador"
  },
  description: "Join the Achariya 5-Star Ambassador Program. Refer students, earn rewards, and be part of our 25th Year Celebration journey.",
  keywords: ["Achariya", "Ambassador", "School Admission", "Referral Program", "Education", "Pondicherry", "5 Star"],
  authors: [{ name: "ACHARIYA WORLD CLASS EDUCATION" }],
  creator: "ACHARIYA WORLD CLASS EDUCATION",
  publisher: "ACHARIYA WORLD CLASS EDUCATION",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://ambassador.achariya.in",
    title: "Achariya Ambassador | 25th Year Celebration",
    description: "Join the Achariya 5-Star Ambassador Program. Refer students, earn rewards, and be part of our 25th Year Celebration journey.",
    siteName: "Achariya Ambassador Program",
    images: [
      {
        url: "/achariya_25_logo.jpg",
        width: 1200,
        height: 630,
        alt: "Achariya Ambassador Program",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Achariya Ambassador | 25th Year Celebration",
    description: "Join the Achariya 5-Star Ambassador Program. Refer students, earn rewards, and be part of our 25th Year Celebration journey.",
    images: ["/achariya_25_logo.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192x192.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} antialiased font-sans`} suppressHydrationWarning>
        <ThemeProvider>
          <Toaster position="top-center" richColors />
          <SWRegistration />
          <OfflineSync />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
