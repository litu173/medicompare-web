import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart-context";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { Toast } from "@/components/toast";
import { getCurrentUser } from "@/lib/auth";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "MediCompare BD — Find cheaper medicine alternatives", template: "%s · MediCompare BD" },
  description:
    "Search any medicine by brand or generic name and see every equivalent brand in Bangladesh, cheapest first. Order online with home delivery.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b8a6b",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <CartProvider>
          <Header user={user ? { name: user.name, role: user.role } : null} />
          <main className="mx-auto w-full max-w-3xl px-4 pb-safe">{children}</main>
          <BottomNav signedIn={!!user} />
          <Toast />
        </CartProvider>
      </body>
    </html>
  );
}
