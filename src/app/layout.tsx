import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart-context";
import { Toast } from "@/components/toast";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const bangla = Hind_Siliguri({ variable: "--font-bangla", subsets: ["bengali", "latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: "সাশ্রয় Sashroy — Same medicine, lower price", template: "%s · Sashroy" },
  applicationName: "Sashroy",
  description:
    "Search any medicine by brand or generic name and see every equivalent brand in Bangladesh, cheapest first. Order online with home delivery.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a7c60",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${bangla.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <CartProvider>
          {children}
          <Toast />
        </CartProvider>
      </body>
    </html>
  );
}
