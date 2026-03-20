import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin – POS عناية",
  description: "لوحة إدارة نظام POS لمحل منتجات العناية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
