import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Xandeum pNode Explorer",
  description: "Xandeum Network pNode Explorer & Analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className="antialiased min-h-screen transition-colors duration-300 font-sans"
      >
        {children}
      </body>
    </html>
  );
}
