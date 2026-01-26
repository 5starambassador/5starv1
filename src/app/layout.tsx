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
  themeColor: '#0f172a',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: "Achariya Partnership Program (APP) | 25th Year Celebration",
  description: "Join the Achariya Partnership Program (APP). Refer students, earn rewards, and be part of our 25th Year Celebration journey.",
  keywords: ["Achariya", "APP", "Partnership Program", "School Admission", "Referral Program", "Education", "Pondicherry", "5 Star", "25th Year"],
  authors: [{ name: "ACHARIYA WORLD CLASS EDUCATION" }],
  creator: "ACHARIYA WORLD CLASS EDUCATION",
  publisher: "ACHARIYA WORLD CLASS EDUCATION",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://app.achariya.in",
    title: "Achariya Partnership Program (APP) | 25th Year Celebration",
    description: "Join the Achariya Partnership Program (APP). Refer students, earn rewards, and be part of our 25th Year Celebration journey.",
    siteName: "Achariya Partnership Program (APP) | 25th Year Celebration",
    images: [
      {
        url: "/achariya_25_logo.jpg",
        width: 1200,
        height: 630,
        alt: "Achariya Partnership Program (APP) | 25th Year Celebration",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Achariya Partnership Program (APP) | 25th Year Celebration",
    description: "Join the Achariya Partnership Program (APP). Refer students, earn rewards, and be part of our 25th Year Celebration journey.",
    images: ["/achariya_25_logo.jpg"],
  },
  /* icons handled by file convention (src/app/icon.jpg) */
  /*
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192x192.png",
  },
  */
  manifest: "/manifest.json",
};

import { getSystemSettings } from "@/app/settings-actions";
import { getCurrentUser } from "@/lib/auth-service";
import { headers } from "next/headers";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSystemSettings();
  const user = await getCurrentUser();
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || "";

  // Maintenance Mode Logic
  // 1. If Maintenance Mode is active
  // 2. AND user is NOT a Super Admin
  // 3. AND they are not accessing a superadmin path
  const isMaintenanceActive = settings?.maintenanceMode;
  const isSuperAdmin = user?.role === "Super Admin";
  const isSuperAdminPath = pathname.includes("/superadmin");

  if (isMaintenanceActive && !isSuperAdmin && !isSuperAdminPath) {
    return (
      <html lang="en">
        <body className={`${outfit.variable} antialiased font-sans bg-slate-950 flex items-center justify-center min-h-screen p-4`}>
          <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[40px] text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white font-black text-2xl">!</span>
              </div>
            </div>
            <h1 className="text-3xl font-black text-white mb-4 tracking-tight uppercase">System Maintenance</h1>
            <p className="text-slate-400 font-medium leading-relaxed mb-10">
              The Achariya APP Engine is currently undergoing scheduled maintenance to improve your experience. We&apos;ll be back online shortly.
            </p>
            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-600 w-1/3 animate-[shimmer_2s_infinite]" />
            </div>
            <p className="mt-8 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Achariya IT Operations</p>
          </div>
        </body>
      </html>
    );
  }

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
