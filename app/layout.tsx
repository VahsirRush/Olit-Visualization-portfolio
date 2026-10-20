import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Olit - Data Visualization Portfolio",
  description: "A 3D analytics dashboard on Brazilian e-commerce orders, reviews, delivery and sellers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
