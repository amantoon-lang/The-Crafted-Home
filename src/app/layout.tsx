import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { Providers } from "@/components/providers/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const body = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: {
    default: "The Crafted Home | Made in India · Born in Bhopal",
    template: "%s | The Crafted Home",
  },
  description:
    "Handmade home décor made in India, born in Bhopal. Ceramics, textiles, wood, and light & scent — each piece with a story of why and how it was made.",
  keywords: [
    "handmade",
    "home decor",
    "made in India",
    "Bhopal",
    "artisan",
    "ceramics",
    "textiles",
    "marketplace",
  ],
  openGraph: {
    title: "The Crafted Home — Made in India · Born in Bhopal",
    description: "Handcrafted with Love, Designed for Your Home.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
