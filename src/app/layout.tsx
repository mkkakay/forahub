import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallPrompt from "@/components/InstallPrompt";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import CookieConsent from "@/components/CookieConsent";
import AIWidget from "@/components/AIWidget";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: { default: "ForaHub — Global Development Events", template: "%s — ForaHub" },
  description: "Conferences, side events, and convenings across all 17 SDG goals. The premier platform for global development professionals.",
  keywords: ["SDG", "global development", "conferences", "events", "UN", "WHO", "health", "climate"],
  authors: [{ name: "ForaHub" }],
  creator: "ForaHub",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://forahub.org"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ForaHub",
    title: "ForaHub — Global Development Events",
    description: "Never miss a global development event. Conferences for all 17 SDG goals.",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "ForaHub" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ForaHub — Global Development Events",
    description: "Never miss a global development event.",
    images: ["/og-default.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "ForaHub", statusBarStyle: "black-translucent" },
  other: { "mobile-web-app-capable": "yes", "msapplication-TileColor": "#0f2a4a" },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f2a4a",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Pre-paint theme script — applies the saved theme class to <html>
  // before first paint so dark-mode users don't see a white flash. Runs
  // before React hydrates; the ThemeProvider then keeps state in sync.
  const themeInit = `(() => { try {
    var t = localStorage.getItem('forahub-theme') || 'light';
    var r = document.documentElement;
    r.classList.remove('dark','high-contrast');
    if (t === 'dark') r.classList.add('dark');
    else if (t === 'high-contrast') r.classList.add('dark','high-contrast');
  } catch (e) {} })();`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="canonical" href={process.env.NEXT_PUBLIC_APP_URL || "https://forahub.org"} />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground transition-colors duration-200`}>
        <Providers>
          <div className="flex flex-col min-h-screen pb-16 md:pb-0">
            {children}
            <Footer />
          </div>
          <BottomNav />
          <AIWidget />
          <CookieConsent />
          <ServiceWorkerRegistration />
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
