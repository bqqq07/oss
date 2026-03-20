import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS - نظام نقطة البيع",
  description: "نظام نقطة البيع لمحل منتجات العناية",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
