import "./globals.css";
import "./arena.css";
import SiteNav from "./site-nav";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AlgoArena",
  description: "Practice coding problems, test solutions, and review your submissions."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><head><link rel="stylesheet" href="/css/rx-theme.css" /></head><body><SiteNav />{children}</body></html>;
}
