import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Coding Practice",
  description: "Run code through Judge0"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><head><link rel="stylesheet" href="/css/rx-theme.css" /></head><body>{children}</body></html>;
}
