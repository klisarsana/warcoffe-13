"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  ReceiptText,
  Coffee,
  Boxes,
  Wallet,
  BarChart3,
  Bot,
  Menu,
  X,
  Database,
  AlertTriangle,
  LogOut,
  Loader2,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { useWarcoffe } from "@/context/warcoffe-context";
import { useAuth } from "@/context/auth-context";
import { getLowStockMenuItems } from "@/lib/calculations";
import { isProtectedRoute } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { authStatus, user, logout } = useAuth();
  const { storageMode, connectionWarning, menuItems } = useWarcoffe();

  const routeRequiresAuth = isProtectedRoute(pathname);

  useEffect(() => {
    if (
      routeRequiresAuth &&
      (authStatus === "UNAUTHENTICATED" || authStatus === "UNCONFIGURED")
    ) {
      router.replace("/");
    }
  }, [routeRequiresAuth, authStatus, router]);

  // Root login page ("/") renders standalone without sidebar or business navigation
  if (pathname === "/") {
    return <>{children}</>;
  }

  // Strictly block rendering of protected pages and business data when not authenticated
  if (routeRequiresAuth && authStatus !== "AUTHENTICATED") {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-6">
        <div className="flex items-center gap-3 text-espresso-800">
          <Loader2 className="w-6 h-6 animate-spin text-caramel-600" />
          <span className="text-sm font-semibold">
            Memverifikasi akses pemilik Warcoffe 13...
          </span>
        </div>
      </div>
    );
  }

  const lowStockCount = getLowStockMenuItems(menuItems).length;

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pos", label: "Kasir (POS)", icon: ShoppingCart },
    { href: "/transactions", label: "Riwayat Transaksi", icon: ReceiptText },
    { href: "/menu", label: "Manajemen Menu", icon: Coffee },
    {
      href: "/stock",
      label: "Manajemen Stok",
      icon: Boxes,
      badgeCount: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { href: "/expenses", label: "Pengeluaran", icon: Wallet },
    { href: "/reports", label: "Laporan Bulanan", icon: BarChart3 },
    { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
    { href: "/audit-log", label: "Audit Log", icon: ShieldCheck },
  ];

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    router.replace("/");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-cream-50 text-espresso-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-espresso-900 text-cream-50 border-r border-espresso-800 shadow-lg z-30">
        <div className="p-5 border-b border-espresso-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-caramel-500 flex items-center justify-center text-white font-bold shadow-sm">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-cream-50">
              Warcoffe 13
            </h1>
            <p className="text-xs text-espresso-300">
              Sistem Keuangan & Stok
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-caramel-500 text-white shadow-sm"
                    : "text-espresso-200 hover:bg-espresso-800 hover:text-cream-50"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.badgeCount !== undefined && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500 text-espresso-950">
                    {item.badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-espresso-800 bg-espresso-950/60 text-xs space-y-3">
          {user?.email && (
            <div className="flex items-center gap-2 text-espresso-200 truncate">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate font-medium" title={user.email}>
                {user.email}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-caramel-400 shrink-0" />
            <span className="font-medium text-espresso-200">
              Mode:{" "}
              {storageMode === "SUPABASE"
                ? "Supabase PostgreSQL"
                : "Local Fallback Store"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 px-3 rounded-xl bg-espresso-800 hover:bg-rose-700 text-cream-50 text-xs font-bold inline-flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar (Logout)
          </button>

          <p className="text-[11px] text-espresso-300 leading-relaxed">
            Capstone Asah 2026 • Tim A26-CS187 • UMKM Warcoffe 13
          </p>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-espresso-900 text-cream-50 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-caramel-500 flex items-center justify-center text-white">
            <Coffee className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm block leading-none">
              Warcoffe 13
            </span>
            <span className="text-[11px] text-espresso-300">
              Manajemen Keuangan & Stok
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-cream-100 hover:bg-espresso-800 focus:outline-none"
          aria-label="Toggle Menu Navigasi"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-espresso-900 text-cream-50 p-4 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-espresso-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-caramel-500 flex items-center justify-center">
                    <Coffee className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-sm">Warcoffe 13</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-espresso-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium ${
                        isActive
                          ? "bg-caramel-500 text-white"
                          : "text-espresso-200 hover:bg-espresso-800"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </span>
                      {item.badgeCount !== undefined && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-espresso-950">
                          {item.badgeCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="pt-3 border-t border-espresso-800 text-xs text-espresso-300 space-y-2.5">
              {user?.email && (
                <p className="truncate font-medium text-cream-100">
                  {user.email}
                </p>
              )}
              <p>
                Mode: {storageMode === "SUPABASE" ? "Supabase" : "Local Fallback"}
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 px-3 rounded-xl bg-espresso-800 hover:bg-rose-700 text-cream-50 text-xs font-bold inline-flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Keluar (Logout)
              </button>
              <p className="mt-1">Tim Capstone A26-CS187</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {connectionWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{connectionWarning}</span>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
