import type { Metadata, Viewport } from "next";
import { Bitter, Geist } from "next/font/google";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const bitter = Bitter({
  variable: "--font-bitter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Melooha", template: "%s · Melooha" },
  description: "A quiet astrology reading, grounded in your chart.",
  openGraph: { siteName: "Melooha" },
};

export const viewport: Viewport = {
  themeColor: "#4a0b34",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${bitter.variable} h-full antialiased`}>
      <body className="min-h-dvh font-sans text-white">
        <Providers>
          <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
