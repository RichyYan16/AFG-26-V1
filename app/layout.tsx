import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unstuck - Academic Paralysis Diagnosis",
  description:
    "Diagnostic and intervention engine that helps students identify why they are stuck and what to do next.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
