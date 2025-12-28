import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./fonts.css";
import "./globals.css";
import { Toaster } from "sonner";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: {
    default: "Achariya Ambassador | 25th Year Celebration",
    template: "%s | Achariya Ambassador"
  },
  description: "Join the Achariya 5-Star Ambassador Program. Refer students, earn rewards, and be part of our 25th Year Celebration journey.",
  keywords: ["Achariya", "Ambassador", "School Admission", "Referral Program", "Education", "Pondicherry", "5 Star"],
  authors: [{ name: "Achariya Group of Institutions" }],
  creator: "Achariya Group",
  publisher: "Achariya Group",
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
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans" suppressHydrationWarning>
        <Toaster position="top-center" richColors />
        {children}
      </body>
    </html>
  );
}
