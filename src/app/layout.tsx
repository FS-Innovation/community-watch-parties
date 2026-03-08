import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOAC Watch Party — The Diary of a CEO",
  description:
    "Join the cinematic watch party experience. Watch together, react together, connect together.",
  openGraph: {
    title: "DOAC Watch Party",
    description: "A cinematic watch party experience by The Diary of a CEO",
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
