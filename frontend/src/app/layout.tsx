import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import { themeInitScript } from "@/lib/theme";

import { Providers } from "./providers";
import "./globals.css";

/** Duolingo's UI typeface: one variable file per style, weights 100-900. */
const duolingoSans = localFont({
  src: [
    { path: "./fonts/duolingo-sans.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/duolingo-sans-italic.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-duolingo-sans",
  display: "swap",
});

/** Duolingo's display face, used for the wordmark. */
const feather = localFont({
  src: [{ path: "./fonts/feather-bold.woff2", weight: "700", style: "normal" }],
  variable: "--font-feather",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Duolingo - Learn Spanish",
  description: "Learn Spanish with bite-sized lessons, streaks, XP and leagues.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131f24" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set by the inline script before React hydrates, hence the warning opt-out.
    <html
      lang="en"
      className={`${duolingoSans.variable} ${feather.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
