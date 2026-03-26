import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Momentum Calendar",
  description: "A single-user calendar for events, money tracking, and healthy habits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
