import type { Metadata } from "next";
import { Archivo, Newsreader } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  title: "Olit - Data Visualization Portfolio",
  description: "A 3D analytics dashboard on Brazilian e-commerce orders, reviews, delivery and sellers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
