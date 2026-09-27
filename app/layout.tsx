import type { Metadata, Viewport } from "next";
import { Overpass, IBM_Plex_Mono } from "next/font/google";
import { Agentation } from "agentation";
import "./globals.css";

// Overpass: people at 800, films and interface at 400/600.
const overpass = Overpass({
  subsets: ["latin"],
  variable: "--font-overpass",
  weight: ["400", "600", "800"],
});

// IBM Plex Mono: years, timecode and counts.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#15171B",
};

export const metadata: Metadata = {
  title: "Six Degrees",
  description: "Connect any two actors through the movies and shows they share",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${overpass.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh font-sans">
        {children}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
