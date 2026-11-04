import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { StorageNotice } from "@/components/StorageNotice";
import "./globals.css";

// Hanken Grotesk carries the interface; Zodiak (Fontshare, linked in <head>)
// sets display type and scores; IBM Plex Mono is reserved for measurement.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DecisionnX — cross-examine any idea",
  description:
    "Submit an idea and a panel of AI experts is assembled around it. Each argues its own corner; you get a scored verdict that shows exactly where they disagree.",
};

// Match browser chrome to the interface's dark theme.
export const viewport: Viewport = {
  themeColor: "#1a2318",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. "I don't care about
    // cookies" adds `idc0_*`) mutate <html> attributes before hydration.
    // Only silences this element's own attributes, not its children.
    <html
      lang="en"
      data-theme="decisionx"
      className={`${hanken.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=zodiak@300,400,401&display=swap"
        />
      </head>
      <body className="min-h-dvh">
        {children}
        <StorageNotice />
      </body>
    </html>
  );
}
