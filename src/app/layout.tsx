import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Nav } from "@/components/ui/Nav";
import { AuthGuard } from "@/components/AuthGuard";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Job Application Tracker",
  description: "Track your job applications and stay organized",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Nav />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </body>
    </html>
  );
}
