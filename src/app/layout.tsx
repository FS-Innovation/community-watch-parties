import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Community Watch Party — BTD Exclusive Screening",
  description:
    "An exclusive virtual screening experience. Watch together with a curated community of like-minded people.",
  openGraph: {
    title: "Community Watch Party — BTD Exclusive Screening",
    description:
      "Join the premiere screening. Pick your room. Meet your people.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
