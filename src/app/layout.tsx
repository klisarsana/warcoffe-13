import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { WarcoffeProvider } from "@/context/warcoffe-context";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Warcoffe 13 Management System — Pencatatan Keuangan & Stok",
  description:
    "Sistem Pencatatan Keuangan Bulanan dan Pemantauan Stok UMKM Warcoffe 13 (Capstone Project Asah 2026 - A26-CS187)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        <AuthProvider>
          <WarcoffeProvider>
            <AppShell>{children}</AppShell>
          </WarcoffeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
