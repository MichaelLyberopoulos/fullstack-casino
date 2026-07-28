import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Header } from "@/components/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Good Vibes Casino",
  description: "Full-Stack Developer Test — game lobby, search and slot machine",
};

// Mobile-first: explicit viewport rather than relying on the framework default.
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <Header />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 pb-16">{children}</main>
          <footer className="border-t border-white/10 py-6 text-center text-xs text-white/40">
            Full-Stack Developer Test — demo casino. Play money only.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
