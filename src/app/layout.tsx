import type { Metadata, Viewport } from "next";
import { Newsreader, DM_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Scroll",
  description:
    "Replace doom scrolling with Torah scrolling — personalized bite-sized learning paths",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Scroll",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#B45309",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body
        className={`${newsreader.variable} ${dmSans.variable} antialiased`}
        style={{
          fontFamily:
            "var(--font-body), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
