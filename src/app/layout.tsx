import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Shopipal — A little help. A great find.",
  description:
    "Find your next favorite. Review every detail. Pay with PayPal sandbox.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
