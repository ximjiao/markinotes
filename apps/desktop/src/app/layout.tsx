import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Markidown",
  description: "A local-first, markdown-based notes app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
