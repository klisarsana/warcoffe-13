"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ReceiptText,
  Coffee,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
  Calendar,
  Boxes,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useWarcoffe } from "@/context/warcoffe-context";
import {
  calculateMonthlySummary,
  getLowStockMenuItems,
} from "@/lib/calculations";
import {
  formatIDR,
  formatMonthKeyID,
  getCurrentMonthKey,
} from "@/lib/format";

export default function DashboardPage() {
  const { isLoading, transactions, expenses, menuItems } = useWarcoffe();
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());

  const summary = useMemo(
    () =>
      calculateMonthlySummary({
        transactions,
        expenses,
        monthKey: selectedMonth,
      }),
    [transactions, expenses, selectedMonth]
  );

  const lowStockItems = useMemo(
    () => getLowStockMenuItems(menuItems),
    [menuItems]
  );

  const configuredStockCount = useMemo(
    () => menuItems.filter((m) => m.current_stock !== null).length,
    [menuItems]
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-espresso-200/60 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-espresso-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-espresso-100 text-espresso-800">
            <Coffee className="w-3.5 h-3.5 text-caramel-600" />
            Dashboard Pemilik Warcoffe 13
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-espresso-900 mt-1">
            Ringkasan Operasional & Keuangan
          </h1>
          <p className="text-sm text-espresso-600">
            Seluruh angka dihitung langsung dari catatan transaksi dan pengeluaran yang tersimpan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white border border-espresso-200 rounded-xl px-3 py-2 shadow-sm">
            <Calendar className="w-4 h-4 text-caramel-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Pilih Bulan Ringkasan"
              className="text-sm font-medium text-espresso-900 bg-transparent focus:outline-none"
            />
          </div>
          <Link
            href="/pos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-espresso-900 text-cream-50 text-sm font-semibold hover:bg-espresso-800 transition shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Catat Penjualan (POS)
          </Link>
        </div>
      </div>

      {summary.has_demo_data && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center gap-3 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Label Data Demo/Uji:</strong> Periode bulan ini mencakup transaksi yang ditandai sebagai data <strong>DEMO/UJI</strong>.
          </span>
        </div>
      )}

      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Today's Sales */}
        <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-espresso-600">
            <span>Penjualan Hari Ini</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-espresso-900 mt-2">
            {formatIDR(summary.today_revenue)}
          </p>
          <p className="text-xs text-espresso-500 mt-1">
            {summary.today_transaction_count} transaksi hari ini
          </p>
        </div>

        {/* 2. Current Month Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-espresso-600">
            <span>Pemasukan ({formatMonthKeyID(selectedMonth)})</span>
            <TrendingUp className="w-4 h-4 text-caramel-600" />
          </div>
          <p className="text-xl font-bold text-emerald-700 mt-2">
            {formatIDR(summary.monthly_revenue)}
          </p>
          <p className="text-xs text-espresso-500 mt-1">
            Dari penjualan tercatat
          </p>
        </div>

        {/* 3. Current Month Expenses */}
        <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-espresso-600">
            <span>Pengeluaran ({formatMonthKeyID(selectedMonth)})</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-bold text-rose-700 mt-2">
            {formatIDR(summary.monthly_expenses)}
          </p>
          <p className="text-xs text-espresso-500 mt-1">
            {summary.monthly_expense_count} catatan pengeluaran
          </p>
        </div>

        {/* 4. Net Difference (Not formal accounting profit) */}
        <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-espresso-600">
            <span>Selisih Bersih Bulanan</span>
            <Wallet className="w-4 h-4 text-espresso-700" />
          </div>
          <p
            className={`text-xl font-bold mt-2 ${
              summary.net_difference >= 0 ? "text-espresso-900" : "text-rose-700"
            }`}
          >
            {formatIDR(summary.net_difference)}
          </p>
          <p className="text-[11px] text-espresso-500 mt-1">
            Pemasukan dikurangi pengeluaran (bukan laba akuntansi formal)
          </p>
        </div>

        {/* 5. Number of Transactions */}
        <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-espresso-600">
            <span>Jumlah Transaksi</span>
            <ReceiptText className="w-4 h-4 text-caramel-600" />
          </div>
          <p className="text-xl font-bold text-espresso-900 mt-2">
            {summary.monthly_transaction_count} Transaksi
          </p>
          <p className="text-xs text-espresso-500 mt-1">
            Periode {formatMonthKeyID(selectedMonth)}
          </p>
        </div>
      </div>

      {/* Main Grid: Sales Trend Chart + Top Selling Menu */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Expense Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-espresso-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-espresso-900">
                Grafik Tren Penjualan & Pengeluaran ({formatMonthKeyID(selectedMonth)})
              </h2>
              <p className="text-xs text-espresso-500">
                Perbandingan pemasukan penjualan dan pengeluaran harian yang tercatat
              </p>
            </div>
            <Link
              href="/reports"
              className="text-xs font-semibold text-caramel-600 hover:text-caramel-500 inline-flex items-center gap-1"
            >
              Lihat Laporan Lengkap <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {summary.daily_trends.length === 0 ? (
            <div className="my-auto py-12 px-4 text-center bg-cream-50 rounded-xl border border-dashed border-espresso-200">
              <ReceiptText className="w-8 h-8 text-espresso-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-espresso-800">
                Belum Ada Data Transaksi pada {formatMonthKeyID(selectedMonth)}
              </p>
              <p className="text-xs text-espresso-600 max-w-md mx-auto mt-1">
                Sistem tidak membuat angka penjualan palsu. Silakan catat penjualan melalui halaman Kasir (POS) atau pengeluaran operasional untuk melihat grafik tren.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Link
                  href="/pos"
                  className="px-3.5 py-2 rounded-lg bg-espresso-900 text-cream-50 text-xs font-semibold hover:bg-espresso-800"
                >
                  Buka Kasir (POS)
                </Link>
                <Link
                  href="/expenses"
                  className="px-3.5 py-2 rounded-lg border border-espresso-300 text-espresso-800 text-xs font-semibold hover:bg-espresso-50"
                >
                  Catat Pengeluaran
                </Link>
              </div>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.daily_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5d3c5" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#4a2c20" }} />
                  <YAxis
                    tickFormatter={(v) => `Rp${(Number(v) / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12, fill: "#4a2c20" }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatIDR(value)}
                    contentStyle={{
                      backgroundColor: "#fdfbf7",
                      borderColor: "#d3b59f",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar
                    dataKey="revenue"
                    name="Pemasukan Penjualan"
                    fill="#c67d3b"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Pengeluaran"
                    fill="#7c4c3a"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top-Selling Menu Based Only on Recorded Transactions */}
        <div className="bg-white rounded-2xl p-5 border border-espresso-200/80 shadow-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-bold text-espresso-900">
              Menu Terlaris ({formatMonthKeyID(selectedMonth)})
            </h2>
            <p className="text-xs text-espresso-500">
              Berdasarkan transaksi penjualan yang benar-benar tercatat
            </p>
          </div>

          {summary.top_selling_menus.length === 0 ? (
            <div className="my-auto py-10 px-4 text-center bg-cream-50 rounded-xl border border-dashed border-espresso-200">
              <Coffee className="w-7 h-7 text-espresso-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-espresso-800">
                Belum Ada Penjualan Menu
              </p>
              <p className="text-xs text-espresso-600 mt-1">
                Daftar menu terlaris akan muncul secara otomatis setelah pemilik menyimpan transaksi penjualan di Kasir (POS).
              </p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {summary.top_selling_menus.slice(0, 6).map((item, idx) => (
                <div
                  key={item.menu_item_id}
                  className="flex items-center justify-between p-3 rounded-xl bg-cream-50 border border-espresso-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-espresso-900 text-cream-50 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-espresso-900 truncate">
                        {item.menu_name}
                      </p>
                      <p className="text-xs text-espresso-500">
                        {item.category_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <p className="text-sm font-bold text-caramel-600">
                      {item.total_quantity_sold} terjual
                    </p>
                    <p className="text-xs text-espresso-600">
                      {formatIDR(item.total_revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Low Stock Alert & Catalog Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Card based ONLY on owner-entered stock */}
        <div className="bg-white rounded-2xl p-5 border border-espresso-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-espresso-900">
                Peringatan Stok Menipis
              </h2>
              <p className="text-xs text-espresso-500">
                Hanya mengevaluasi produk yang stok awalnya telah diisi oleh pemilik ({configuredStockCount} dari {menuItems.length} menu telah diisi stok)
              </p>
            </div>
            <Link
              href="/stock"
              className="text-xs font-semibold text-caramel-600 hover:text-caramel-500 inline-flex items-center gap-1"
            >
              Kelola Stok <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {configuredStockCount === 0 ? (
            <div className="p-6 text-center bg-cream-50 rounded-xl border border-dashed border-espresso-200">
              <Boxes className="w-7 h-7 text-espresso-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-espresso-800">
                Stok Awal Belum Diisi (Status: Belum Diketahui / NULL)
              </p>
              <p className="text-xs text-espresso-600 mt-1 max-w-md mx-auto">
                Sesuai aturan data Warcoffe 13, stok awal tidak ditebak otomatis. Silakan buka halaman Manajemen Stok untuk mengisi jumlah stok fisik warung.
              </p>
              <Link
                href="/stock"
                className="inline-block mt-3 px-3.5 py-2 rounded-lg bg-espresso-900 text-cream-50 text-xs font-semibold hover:bg-espresso-800"
              >
                Isi Stok Awal Sekarang
              </Link>
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="p-6 text-center bg-emerald-50/70 rounded-xl border border-emerald-200">
              <p className="text-sm font-semibold text-emerald-900">
                Semua Produk yang Dipantau Memiliki Stok Aman
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                Tidak ada item dengan stok di bawah batas minimum dari {configuredStockCount} menu yang sudah diisi stoknya.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-espresso-900">
                        {item.name}
                      </p>
                      <p className="text-xs text-espresso-600">
                        Batas minimum: {item.min_stock_threshold ?? 5} {item.stock_unit}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-950">
                    Sisa: {item.current_stock} {item.stock_unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Module Shortcut Cards */}
        <div className="bg-white rounded-2xl p-5 border border-espresso-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-espresso-900">
              Akses Cepat Operasional Warcoffe 13
            </h2>
            <p className="text-xs text-espresso-500 mt-0.5">
              Katalog awal berisi {menuItems.length} item menu resmi Warcoffe 13 (Minuman Kemasan, Minuman Racikan/Sachet, dan Makanan).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <Link
              href="/pos"
              className="p-3.5 rounded-xl bg-cream-50 hover:bg-cream-100 border border-espresso-200 transition flex items-start justify-between"
            >
              <div>
                <p className="text-sm font-bold text-espresso-900">Kasir / POS</p>
                <p className="text-xs text-espresso-600 mt-0.5">
                  Catat pesanan pelanggan & cetak struk pembayaran
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-caramel-600 shrink-0 mt-1" />
            </Link>

            <Link
              href="/expenses"
              className="p-3.5 rounded-xl bg-cream-50 hover:bg-cream-100 border border-espresso-200 transition flex items-start justify-between"
            >
              <div>
                <p className="text-sm font-bold text-espresso-900">Catat Pengeluaran</p>
                <p className="text-xs text-espresso-600 mt-0.5">
                  Belanja bahan baku, gas, listrik, & operasional
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-caramel-600 shrink-0 mt-1" />
            </Link>

            <Link
              href="/menu"
              className="p-3.5 rounded-xl bg-cream-50 hover:bg-cream-100 border border-espresso-200 transition flex items-start justify-between"
            >
              <div>
                <p className="text-sm font-bold text-espresso-900">Katalog Menu ({menuItems.length})</p>
                <p className="text-xs text-espresso-600 mt-0.5">
                  Ubah harga, variasi suhu Panas/Dingin, & ketersediaan
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-caramel-600 shrink-0 mt-1" />
            </Link>

            <Link
              href="/ai-assistant"
              className="p-3.5 rounded-xl bg-cream-50 hover:bg-cream-100 border border-espresso-200 transition flex items-start justify-between"
            >
              <div>
                <p className="text-sm font-bold text-espresso-900">AI Business Assistant</p>
                <p className="text-xs text-espresso-600 mt-0.5">
                  Input draft transaksi via teks & tanya insight usaha
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-caramel-600 shrink-0 mt-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
