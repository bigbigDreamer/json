import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura JSON Studio",
  description:
    "A refined JSON formatter with invisible character cleanup, tree inspection, and granular copy controls.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
