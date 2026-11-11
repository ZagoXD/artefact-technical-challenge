import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task manager",
  description: "A simple place to organize your tasks.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <nav className="topbar" aria-label="Main navigation"><Link href="/" className="brand">artefact<span> / tasks</span></Link></nav>
        <main id="main">{children}</main>
        <footer>A simple space to get things done.</footer>
      </body>
    </html>
  );
}
