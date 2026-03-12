import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Watch Party — BTD Screening Room",
  description: "A virtual screening room. Watch together in sync.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
