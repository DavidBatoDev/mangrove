import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import Header from "@/components/Header";
import { SessionProvider } from "@/components/session";
import "./globals.css";
import "./pages.css";

// One font: Schibsted Grotesk, the brand's body face, for everything (team choice; the kit's Newsreader
// display and IBM Plex Mono label faces are not used). It feeds all --mg-font-* tokens in globals.css.
const body = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "AIDE-M",
  description: "Mangrove restoration promises, made public before the money moves, then checked against evidence.",
  icons: { icon: "/brand/logo/mangrove-mark.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`mg-fonts ${body.variable}`}>
      <head>
        {/* Brand kit components and tokens (ADR-043), synced to public/brand by scripts/sync-brand.mjs. Linked, not
            bundled, so its relative texture URLs resolve under /brand/ as brand/WEB.md §1.4 requires. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/brand/mangrove.css" precedence="default" />
      </head>
      <body className="mg-page">
        <SessionProvider>
          <Header />
          <main className="main">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
