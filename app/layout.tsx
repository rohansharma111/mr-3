import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MR 3.0 — Smarter. Faster. Better.",
  description: "Field intelligence and execution platform."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
