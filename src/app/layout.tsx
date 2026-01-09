import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";

const briceBold = localFont({
  src: "../../public/fonts/Brice-Bold.woff2",
  variable: "--font-brice",
  display: "swap",
  weight: "700",
});

const mundial = localFont({
  src: [
    {
      path: "../../public/fonts/Mundial-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Mundial-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-mundial",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Good Vibes Club Analytics",
  description: "Comprehensive data visualization for the Good Vibes Club NFT collection on Ethereum",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${briceBold.variable} ${mundial.variable} font-mundial antialiased bg-background text-foreground`}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
