"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  ReceiptText,
  Info,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useWarcoffe } from "@/context/warcoffe-context";
import { calculateMonthlySummary } from "@/lib/calculations";
import {
  formatDateID,
  formatIDR,
  formatMonthKeyID,
  getCurrentMonthKey,
  objectsToCSV,
} from "@/lib/format";

export default function ReportsPage() {
  const { transactions, expenses } = useWarcoffe();
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [excludeDemoData, setExcludeDemoData] = useState<boolean>(false);

  const activeTransactions = useMemo(
    () =>
      excludeDemoData
        ? transactions.filter((t) => !t.is_demo)
        : transactions,
    [transactions, excludeDemoData]
  );

  const activeExpenses = useMemo(
    () =>
      excludeDemoData ? expenses.filter((e) => !e.is_demo) : expenses,
    [expenses, excludeDemoData]
  );

  const summary = useMemo(
    () =>
      calculateMonthlySummary({
        transactions: activeTransactions,
        expenses: activeExpenses,
        monthKey: selectedMonth,
      }),
    [activeTransactions, activeExpenses, selectedMonth]
  );

  const monthTransactions = useMemo(
    () =>
      activeTransactions.filter(
        (t) => t.transaction_date.slice(0, 7) === selectedMonth
      ),
    [activeTransactions, selectedMonth]
  );

  const monthExpenses = useMemo(
    () =>
      activeExpenses.filter((e) => e.expense_date.slice(0, 7) === selectedMonth),
    [activeExpenses, selectedMonth]
  );

  const handleExportCSV = () => {
    const rows: Array<Record<string, string | number>> = [];

    for (const tx of monthTransactions) {
      const itemDesc = tx.items
        .map(
          (i) =>
            `${i.quantity}x ${i.menu_name_snapshot} (${i.variant_label})`
        )
        .join("; ");
      rows.push({
        tanggal: tx.transaction_date.slice(0, 10),
        jenis: "PEMASUKAN_PENJUALAN",
        nomor_referensi: tx.transaction_number,
        kategori: Array.from(
          new Set(tx.items.map((i) => i.category_name_snapshot))
        ).join(", "),
        deskripsi: itemDesc,
        metode_pembayaran: tx.payment_method,
        nominal_masuk_idr: tx.total_amount,
        nominal_keluar_idr: 0,
        status_data: tx.is_demo ? "DEMO_UJI" : "DATA_ASLI_TERCATAT",
      });
    }

    for (const exp of monthExpenses) {
      rows.push({
        tanggal: exp.expense_date,
        jenis: "PENGELUARAN_OPERASIONAL",
        nomor_referensi: exp.id,
        kategori: exp.category,
        deskripsi: exp.description,
        metode_pembayaran: "-",
        nominal_masuk_idr: 0,
        nominal_keluar_idr: exp.amount,
        status_data: exp.is_demo ? "DEMO_UJI" : "DATA_ASLI_TERCATAT",
      });
    }

    // Tambahkan baris ringkasan rekap bulanan di bagian bawah CSV
    rows.push({
      tanggal: selectedMonth,
      jenis: "REKAP_TOTAL_BULANAN",
      nomor_referensi: "SUMMARY",
      kategori: "Selisih Bersih (Pemasukan - Pengeluaran)",
      deskripsi: `Total Pemasukan: ${summary.monthly_revenue} | Total Pengeluaran: ${summary.monthly_expenses} | Selisih Bersih: ${summary.net_difference}`,
      metode_pembayaran: "-",
      nominal_masuk_idr: summary.monthly_revenue,
      nominal_keluar_idr: summary.monthly_expenses,
      status_data: summary.has_demo_data ? "TERMASUK_DEMO" : "DATA_ASLI_TERCATAT",
    });

    const csvContent = objectsToCSV(
      [
        { key: "tanggal", label: "Tanggal" },
        { key: "jenis", label: "Jenis Transaksi" },
        { key: "nomor_referensi", label: "No. Referensi" },
        { key: "kategori", label: "Kategori" },
        { key: "deskripsi", label: "Rincian / Deskripsi" },
        { key: "metode_pembayaran", label: "Metode Pembayaran" },
        { key: "nominal_masuk_idr", label: "Nominal Pemasukan (IDR)" },
        { key: "nominal_keluar_idr", label: "Nominal Pengeluaran (IDR)" },
        { key: "status_data", label: "Status Data" },
      ],
      rows
    );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Rekap-Bulanan-Warcoffe13-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-espresso-900">
            Laporan & Rekapitulasi Keuangan Bulanan
          </h1>
          <p className="text-sm text-espresso-600">
            Rekap otomatis total pemasukan, total pengeluaran, dan selisih bersih bulanan Warcoffe 13 beserta ekspor CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white border border-espresso-200 rounded-xl px-3 py-2 shadow-sm">
            <Calendar className="w-4 h-4 text-caramel-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm font-semibold text-espresso-900 bg-transparent focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-espresso-900 hover:bg-espresso-800 text-cream-50 text-xs font-bold shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            Ekspor Laporan ke CSV
          </button>
        </div>
      </div>

      {/* Distinction Banner: Recorded vs Empty vs Demo Data */}
      <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs">
          <Info className="w-4 h-4 text-caramel-600 shrink-0" />
          {summary.monthly_transaction_count === 0 &&
          summary.monthly_expense_count === 0 ? (
            <span className="text-espresso-700">
              <strong>Status Data ({formatMonthKeyID(selectedMonth)}):</strong>{" "}
              <span className="px-2 py-0.5 rounded bg-espresso-100 text-espresso-800 font-bold">
                DATA KOSONG (0 Transaksi Tercatat)
              </span>{" "}
              — Sistem tidak menampilkan angka simulasi palsu.
            </span>
          ) : summary.has_demo_data ? (
            <span className="text-amber-900">
              <strong>Status Data ({formatMonthKeyID(selectedMonth)}):</strong>{" "}
              <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-bold">
                MENGANDUNG DATA DEMO / UJI
              </span>
            </span>
          ) : (
            <span className="text-emerald-900">
              <strong>Status Data ({formatMonthKeyID(selectedMonth)}):</strong>{" "}
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                100% DATA TRANSAKSI TERCATAT AKTUAL
              </span>
            </span>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-espresso-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excludeDemoData}
            onChange={(e) => setExcludeDemoData(e.target.checked)}
            className="rounded border-espresso-300 text-caramel-600"
          />
          <span>Sembunyikan transaksi berlabel DEMO dari rekap</span>
        </label>
      </div>

      {/* 4 Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-espresso-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-espresso-600">
            <span>Total Pemasukan Bulanan</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            {formatIDR(summary.monthly_revenue)}
          </p>
          <p className="text-xs text-espresso-500 mt-1">
            Dari {summary.monthly_transaction_count} transaksi penjualan
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-espresso-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-espresso-600">
            <span>Total Pengeluaran Bulanan</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">
            {formatIDR(summary.monthly_expenses)}
          </p>
          <p className="text-xs text-espresso-500 mt-1">
            Dari {summary.monthly_expense_count} catatan pengeluaran
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-espresso-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-espresso-600">
            <span>Selisih Bersih (Pemasukan - Pengeluaran)</span>
            <Wallet className="w-4 h-4 text-caramel-600" />
          </div>
          <p
            className={`text-2xl font-bold mt-2 ${
              summary.net_difference >= 0 ? "text-espresso-900" : "text-rose-700"
            }`}
          >
            {formatIDR(summary.net_difference)}
          </p>
          <p className="text-[11px] text-espresso-500 mt-1">
            Selisih kas masuk & keluar (bukan laporan laba rugi akuntansi resmi)
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-espresso-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-espresso-600">
            <span>Total Aktivitas Tercatat</span>
            <ReceiptText className="w-4 h-4 text-espresso-700" />
          </div>
          <p className="text-2xl font-bold text-espresso-900 mt-2">
            {summary.monthly_transaction_count + summary.monthly_expense_count}{" "}
            Catatan
          </p>
          <p className="text-xs text-espresso-500 mt-1">
            {summary.monthly_transaction_count} penjualan •{" "}
            {summary.monthly_expense_count} pengeluaran
          </p>
        </div>
      </div>

      {/* Daily Trend Chart */}
      <div className="bg-white rounded-2xl p-5 border border-espresso-200/80 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-bold text-espresso-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-caramel-600" />
            Tren Harian Pemasukan vs Pengeluaran ({formatMonthKeyID(selectedMonth)})
          </h2>
          <p className="text-xs text-espresso-500">
            Menampilkan pergerakan pemasukan dan pengeluaran per tanggal aktif
          </p>
        </div>

        {summary.daily_trends.length === 0 ? (
          <div className="py-12 text-center bg-cream-50 rounded-xl border border-dashed border-espresso-200">
            <p className="text-sm font-semibold text-espresso-800">
              Tidak Ada Data Tren pada Bulan {formatMonthKeyID(selectedMonth)}
            </p>
            <p className="text-xs text-espresso-600 mt-1">
              Grafik dan tabel harian akan otomatis terisi setelah ada transaksi yang disimpan pada bulan ini.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.daily_trends}>
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
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Pemasukan"
                  stroke="#047857"
                  fill="#a7f3d0"
                  fillOpacity={0.5}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Pengeluaran"
                  stroke="#be123c"
                  fill="#fecdd3"
                  fillOpacity={0.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Daily Breakdown Table */}
      {summary.daily_trends.length > 0 && (
        <div className="bg-white rounded-2xl border border-espresso-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-espresso-100">
            <h2 className="text-sm font-bold text-espresso-900">
              Tabel Rincian Rekap Harian ({formatMonthKeyID(selectedMonth)})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cream-100 border-b border-espresso-200 text-[11px] font-bold text-espresso-700 uppercase">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4 text-center">Jml Penjualan</th>
                  <th className="py-3 px-4 text-right">Total Pemasukan</th>
                  <th className="py-3 px-4 text-right">Total Pengeluaran</th>
                  <th className="py-3 px-4 text-right">Selisih Harian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-espresso-100 text-xs">
                {summary.daily_trends.map((d) => (
                  <tr key={d.date} className="hover:bg-cream-50/70">
                    <td className="py-3 px-4 font-semibold text-espresso-900">
                      {formatDateID(d.date)}
                    </td>
                    <td className="py-3 px-4 text-center text-espresso-700">
                      {d.transaction_count} transaksi
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {formatIDR(d.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-700">
                      {formatIDR(d.expenses)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold ${
                        d.net_difference >= 0 ? "text-espresso-900" : "text-rose-700"
                      }`}
                    >
                      {formatIDR(d.net_difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-cream-100 border-t-2 border-espresso-200 text-xs font-bold">
                  <td className="py-3 px-4">TOTAL BULANAN</td>
                  <td className="py-3 px-4 text-center">
                    {summary.monthly_transaction_count} transaksi
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-800">
                    {formatIDR(summary.monthly_revenue)}
                  </td>
                  <td className="py-3 px-4 text-right text-rose-800">
                    {formatIDR(summary.monthly_expenses)}
                  </td>
                  <td className="py-3 px-4 text-right text-espresso-950">
                    {formatIDR(summary.net_difference)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
