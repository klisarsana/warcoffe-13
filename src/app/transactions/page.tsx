"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Eye,
  Pencil,
  Trash2,
  ReceiptText,
  ArrowUpRight,
  ArrowDownRight,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useWarcoffe } from "@/context/warcoffe-context";
import {
  ExpenseRecord,
  PaymentMethod,
  SalesTransaction,
  SalesTransactionItem,
} from "@/types/warcoffe";
import { EXPENSE_CATEGORIES } from "@/lib/menu-seed-data";
import {
  formatDateID,
  formatDateTimeID,
  formatIDR,
  formatMonthKeyID,
  getCurrentMonthKey,
} from "@/lib/format";

type UnifiedRecord =
  | {
      kind: "INCOME_SALE";
      id: string;
      dateKey: string;
      timestamp: string;
      title: string;
      categoryLabel: string;
      amount: number;
      paymentMethod: string;
      isDemo: boolean;
      rawSale: SalesTransaction;
    }
  | {
      kind: "EXPENSE";
      id: string;
      dateKey: string;
      timestamp: string;
      title: string;
      categoryLabel: string;
      amount: number;
      paymentMethod: string;
      isDemo: boolean;
      rawExpense: ExpenseRecord;
    };

export default function TransactionsPage() {
  const {
    categories,
    transactions,
    expenses,
    updateSaleTransaction,
    deleteSaleTransaction,
    updateExpense,
    deleteExpense,
  } = useWarcoffe();

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [filterType, setFilterType] = useState<"ALL" | "INCOME_SALE" | "EXPENSE">("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Detail modal state
  const [detailSale, setDetailSale] = useState<SalesTransaction | null>(null);

  // Edit Sale modal state
  const [editingSale, setEditingSale] = useState<SalesTransaction | null>(null);
  const [editSalePayment, setEditSalePayment] = useState<PaymentMethod>("TUNAI");
  const [editSalePaid, setEditSalePaid] = useState<string>("");
  const [editSaleNote, setEditSaleNote] = useState<string>("");
  const [editSaleDate, setEditSaleDate] = useState<string>("");
  const [editSaleItems, setEditSaleItems] = useState<SalesTransactionItem[]>([]);

  // Edit Expense modal state
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [editExpDate, setEditExpDate] = useState<string>("");
  const [editExpDesc, setEditExpDesc] = useState<string>("");
  const [editExpCategory, setEditExpCategory] = useState<string>("");
  const [editExpAmount, setEditExpAmount] = useState<string>("");
  const [editExpNote, setEditExpNote] = useState<string>("");

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "INCOME_SALE" | "EXPENSE";
    id: string;
    label: string;
  } | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const allCategoryOptions = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => set.add(c.name));
    EXPENSE_CATEGORIES.forEach((c) => set.add(c));
    return Array.from(set);
  }, [categories]);

  const unifiedRecords = useMemo<UnifiedRecord[]>(() => {
    const salesMapped: UnifiedRecord[] = transactions.map((tx) => {
      const itemSummary = tx.items
        .map((i) => `${i.quantity}x ${i.menu_name_snapshot}`)
        .join(", ");
      const uniqueCats = Array.from(
        new Set(tx.items.map((i) => i.category_name_snapshot))
      ).join(", ");
      return {
        kind: "INCOME_SALE",
        id: tx.id,
        dateKey: tx.transaction_date.slice(0, 10),
        timestamp: tx.transaction_date,
        title: `${tx.transaction_number} — ${itemSummary || "Penjualan POS"}`,
        categoryLabel: uniqueCats || "Penjualan Menu",
        amount: tx.total_amount,
        paymentMethod: tx.payment_method,
        isDemo: tx.is_demo,
        rawSale: tx,
      };
    });

    const expensesMapped: UnifiedRecord[] = expenses.map((exp) => ({
      kind: "EXPENSE",
      id: exp.id,
      dateKey: exp.expense_date.slice(0, 10),
      timestamp: `${exp.expense_date}T12:00:00.000Z`,
      title: exp.description,
      categoryLabel: exp.category,
      amount: exp.amount,
      paymentMethod: "PENGELUARAN",
      isDemo: exp.is_demo,
      rawExpense: exp,
    }));

    return [...salesMapped, ...expensesMapped].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    );
  }, [transactions, expenses]);

  const filteredRecords = useMemo(() => {
    return unifiedRecords.filter((rec) => {
      if (selectedMonth && rec.dateKey.slice(0, 7) !== selectedMonth) {
        return false;
      }
      if (filterType !== "ALL" && rec.kind !== filterType) {
        return false;
      }
      if (
        filterCategory !== "ALL" &&
        !rec.categoryLabel.toLowerCase().includes(filterCategory.toLowerCase())
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchTitle = rec.title.toLowerCase().includes(q);
        const matchCat = rec.categoryLabel.toLowerCase().includes(q);
        if (!matchTitle && !matchCat) return false;
      }
      return true;
    });
  }, [unifiedRecords, selectedMonth, filterType, filterCategory, searchQuery]);

  const periodTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const r of filteredRecords) {
      if (r.kind === "INCOME_SALE") income += r.amount;
      else expense += r.amount;
    }
    return { income, expense, net: income - expense };
  }, [filteredRecords]);

  // Open Edit Sale Modal
  const openEditSaleModal = (tx: SalesTransaction) => {
    setFeedbackMsg(null);
    setEditingSale(tx);
    setEditSalePayment(tx.payment_method);
    setEditSalePaid(String(tx.amount_paid));
    setEditSaleNote(tx.customer_note);
    setEditSaleDate(tx.transaction_date.slice(0, 10));
    setEditSaleItems(tx.items.map((i) => ({ ...i })));
  };

  const handleSaveEditedSale = async () => {
    if (!editingSale) return;
    const paidNum = Number(editSalePaid);
    const isoDate = `${editSaleDate}T${editingSale.transaction_date.slice(11) || "12:00:00.000Z"}`;

    const res = await updateSaleTransaction({
      id: editingSale.id,
      paymentMethod: editSalePayment,
      amountPaid: paidNum,
      customerNote: editSaleNote,
      transactionDate: isoDate,
      items: editSaleItems,
    });

    if (!res.ok) {
      setFeedbackMsg({
        type: "error",
        text: res.error || "Gagal memperbarui transaksi penjualan.",
      });
      return;
    }

    setEditingSale(null);
    setFeedbackMsg({
      type: "success",
      text: "Transaksi penjualan berhasil diperbarui. Rekap bulanan & dashboard telah disinkronkan.",
    });
  };

  // Open Edit Expense Modal
  const openEditExpenseModal = (exp: ExpenseRecord) => {
    setFeedbackMsg(null);
    setEditingExpense(exp);
    setEditExpDate(exp.expense_date);
    setEditExpDesc(exp.description);
    setEditExpCategory(exp.category);
    setEditExpAmount(String(exp.amount));
    setEditExpNote(exp.note);
  };

  const handleSaveEditedExpense = async () => {
    if (!editingExpense) return;
    const res = await updateExpense(editingExpense.id, {
      expense_date: editExpDate,
      description: editExpDesc,
      category: editExpCategory,
      amount: Number(editExpAmount),
      note: editExpNote,
    });

    if (!res.ok) {
      setFeedbackMsg({
        type: "error",
        text: (res.errors || ["Gagal memperbarui pengeluaran."]).join(" "),
      });
      return;
    }

    setEditingExpense(null);
    setFeedbackMsg({
      type: "success",
      text: "Catatan pengeluaran berhasil diperbarui. Rekap bulanan & dashboard telah disinkronkan.",
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "INCOME_SALE") {
      const res = await deleteSaleTransaction(deleteTarget.id);
      if (!res.ok) {
        setFeedbackMsg({ type: "error", text: res.error || "Gagal menghapus transaksi." });
      } else {
        setFeedbackMsg({
          type: "success",
          text: "Transaksi penjualan berhasil dihapus. Rekap bulanan & dashboard telah diperbarui.",
        });
      }
    } else {
      const res = await deleteExpense(deleteTarget.id);
      if (!res.ok) {
        setFeedbackMsg({ type: "error", text: res.error || "Gagal menghapus pengeluaran." });
      } else {
        setFeedbackMsg({
          type: "success",
          text: "Catatan pengeluaran berhasil dihapus. Rekap bulanan & dashboard telah diperbarui.",
        });
      }
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-espresso-900">
            Riwayat Transaksi (Pemasukan & Pengeluaran)
          </h1>
          <p className="text-sm text-espresso-600">
            Filter per bulan, kategori, dan jenis transaksi. Perubahan atau penghapusan langsung memperbarui Dashboard dan Laporan Bulanan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pos"
            className="px-3.5 py-2 rounded-xl bg-espresso-900 text-cream-50 text-xs font-bold hover:bg-espresso-800"
          >
            + Penjualan (POS)
          </Link>
          <Link
            href="/expenses"
            className="px-3.5 py-2 rounded-xl border border-espresso-300 bg-white text-espresso-900 text-xs font-bold hover:bg-espresso-50"
          >
            + Pengeluaran
          </Link>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <span className="flex items-center gap-2">
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            {feedbackMsg.text}
          </span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="p-1 hover:opacity-75"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-espresso-700 mb-1">
            Periode Bulan
          </label>
          <div className="flex items-center gap-2 border border-espresso-200 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-caramel-600 shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold text-espresso-900 w-full focus:outline-none bg-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-espresso-700 mb-1">
            Jenis Transaksi
          </label>
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as "ALL" | "INCOME_SALE" | "EXPENSE")
            }
            className="w-full border border-espresso-200 rounded-xl px-3 py-2 text-xs font-semibold text-espresso-900 focus:outline-none"
          >
            <option value="ALL">Semua Jenis (Pemasukan & Pengeluaran)</option>
            <option value="INCOME_SALE">Pemasukan Penjualan (POS)</option>
            <option value="EXPENSE">Pengeluaran Operasional</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-espresso-700 mb-1">
            Filter Kategori
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full border border-espresso-200 rounded-xl px-3 py-2 text-xs font-semibold text-espresso-900 focus:outline-none"
          >
            <option value="ALL">Semua Kategori</option>
            {allCategoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-espresso-700 mb-1">
            Cari Nomor Struk / Item / Deskripsi
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-espresso-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik kata kunci..."
              className="w-full pl-8 pr-3 py-2 border border-espresso-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Summary Strip for Current Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-3.5 border border-espresso-200 flex items-center justify-between">
          <span className="text-xs text-espresso-600 font-medium">
            Total Pemasukan Terfilter
          </span>
          <span className="text-sm font-bold text-emerald-700">
            {formatIDR(periodTotals.income)}
          </span>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-espresso-200 flex items-center justify-between">
          <span className="text-xs text-espresso-600 font-medium">
            Total Pengeluaran Terfilter
          </span>
          <span className="text-sm font-bold text-rose-700">
            {formatIDR(periodTotals.expense)}
          </span>
        </div>
        <div className="bg-white rounded-xl p-3.5 border border-espresso-200 flex items-center justify-between">
          <span className="text-xs text-espresso-600 font-medium">
            Selisih Bersih Periode Ini
          </span>
          <span
            className={`text-sm font-bold ${
              periodTotals.net >= 0 ? "text-espresso-900" : "text-rose-700"
            }`}
          >
            {formatIDR(periodTotals.net)}
          </span>
        </div>
      </div>

      {/* Transaction List / Empty State */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-espresso-200/80 shadow-sm">
          <ReceiptText className="w-10 h-10 text-espresso-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-espresso-900">
            Tidak Ada Data Transaksi pada Periode {formatMonthKeyID(selectedMonth)}
          </h3>
          <p className="text-xs text-espresso-600 max-w-md mx-auto mt-1">
            Belum ada catatan pemasukan maupun pengeluaran yang cocok dengan filter bulan atau kata kunci yang Anda pilih.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-espresso-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cream-100 border-b border-espresso-200 text-[11px] font-bold text-espresso-700 uppercase">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">Rincian Transaksi</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-espresso-100 text-xs">
                {filteredRecords.map((rec) => (
                  <tr key={`${rec.kind}-${rec.id}`} className="hover:bg-cream-50/70">
                    <td className="py-3 px-4 whitespace-nowrap text-espresso-700 font-medium">
                      {rec.kind === "INCOME_SALE"
                        ? formatDateTimeID(rec.timestamp)
                        : formatDateID(rec.dateKey)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {rec.kind === "INCOME_SALE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-900">
                          <ArrowUpRight className="w-3 h-3" /> Pemasukan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-900">
                          <ArrowDownRight className="w-3 h-3" /> Pengeluaran
                        </span>
                      )}
                      {rec.isDemo && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 font-bold text-[10px]">
                          DEMO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-espresso-900 max-w-md">
                      <p className="truncate">{rec.title}</p>
                    </td>
                    <td className="py-3 px-4 text-espresso-600">
                      {rec.categoryLabel}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                        rec.kind === "INCOME_SALE"
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {rec.kind === "INCOME_SALE" ? "+" : "-"}
                      {formatIDR(rec.amount)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {rec.kind === "INCOME_SALE" && (
                          <button
                            type="button"
                            onClick={() => setDetailSale(rec.rawSale)}
                            className="p-1.5 rounded-lg border border-espresso-200 text-espresso-700 hover:bg-espresso-100"
                            title="Lihat Detail Transaksi"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            rec.kind === "INCOME_SALE"
                              ? openEditSaleModal(rec.rawSale)
                              : openEditExpenseModal(rec.rawExpense)
                          }
                          className="p-1.5 rounded-lg border border-espresso-200 text-espresso-700 hover:bg-espresso-100"
                          title="Ubah Transaksi"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              kind: rec.kind,
                              id: rec.id,
                              label: rec.title,
                            })
                          }
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DETAIL TRANSAKSI PENJUALAN                                     */}
      {/* ==================================================================== */}
      {detailSale && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-espresso-200 space-y-4">
            <div className="flex items-center justify-between border-b border-espresso-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-espresso-900">
                  Detail Transaksi {detailSale.transaction_number}
                </h3>
                <p className="text-xs text-espresso-500">
                  {formatDateTimeID(detailSale.transaction_date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailSale(null)}
                className="p-1 rounded-lg hover:bg-espresso-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-cream-50 rounded-xl p-3.5 border border-espresso-200 space-y-2 text-xs">
              {detailSale.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>
                    {item.quantity}x {item.menu_name_snapshot} ({item.variant_label}) @{" "}
                    {formatIDR(item.unit_price)}
                  </span>
                  <span className="font-bold">{formatIDR(item.line_total)}</span>
                </div>
              ))}
              <div className="border-t border-espresso-200 pt-2 flex justify-between font-bold text-sm">
                <span>Total</span>
                <span>{formatIDR(detailSale.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Metode Pembayaran</span>
                <span className="font-semibold">{detailSale.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span>Dibayar</span>
                <span>{formatIDR(detailSale.amount_paid)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Kembalian</span>
                <span>{formatIDR(detailSale.change_amount)}</span>
              </div>
              {detailSale.customer_note && (
                <div className="pt-1 text-espresso-700">
                  Catatan: {detailSale.customer_note}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDetailSale(null)}
                className="px-4 py-2 rounded-xl bg-espresso-900 text-cream-50 text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL EDIT TRANSAKSI PENJUALAN                                       */}
      {/* ==================================================================== */}
      {editingSale && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-espresso-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-espresso-100 pb-3">
              <h3 className="text-base font-bold text-espresso-900">
                Ubah Transaksi {editingSale.transaction_number}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="p-1 rounded-lg hover:bg-espresso-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={editSaleDate}
                  onChange={(e) => setEditSaleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-espresso-800">
                  Item Pesanan (Ubah Jumlah)
                </label>
                {editSaleItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-cream-50 border border-espresso-200"
                  >
                    <div>
                      <p className="font-bold text-espresso-900">
                        {item.menu_name_snapshot} ({item.variant_label})
                      </p>
                      <p className="text-espresso-600">
                        Harga: {formatIDR(item.unit_price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Qty:</span>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const qty = Number(e.target.value);
                          setEditSaleItems((prev) =>
                            prev.map((it, i) =>
                              i === idx
                                ? {
                                    ...it,
                                    quantity: qty,
                                    line_total: qty * it.unit_price,
                                  }
                                : it
                            )
                          );
                        }}
                        className="w-16 px-2 py-1 rounded-lg border border-espresso-300 text-center font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-cream-100 flex justify-between font-bold text-sm">
                <span>Total Baru</span>
                <span>
                  {formatIDR(
                    editSaleItems.reduce(
                      (s, i) => s + i.unit_price * (i.quantity || 0),
                      0
                    )
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-espresso-800 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={editSalePayment}
                    onChange={(e) =>
                      setEditSalePayment(e.target.value as PaymentMethod)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                  >
                    <option value="TUNAI">TUNAI</option>
                    <option value="QRIS">QRIS</option>
                    <option value="TRANSFER">TRANSFER</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-espresso-800 mb-1">
                    Nominal Dibayar (Rp)
                  </label>
                  <input
                    type="number"
                    value={editSalePaid}
                    onChange={(e) => setEditSalePaid(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-espresso-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Catatan
                </label>
                <input
                  type="text"
                  value={editSaleNote}
                  onChange={(e) => setEditSaleNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="px-4 py-2 rounded-xl border border-espresso-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditedSale}
                className="px-4 py-2 rounded-xl bg-espresso-900 text-cream-50 text-xs font-bold"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL EDIT PENGELUARAN                                               */}
      {/* ==================================================================== */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-espresso-200 space-y-4">
            <div className="flex items-center justify-between border-b border-espresso-100 pb-3">
              <h3 className="text-base font-bold text-espresso-900">
                Ubah Catatan Pengeluaran
              </h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="p-1 rounded-lg hover:bg-espresso-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Tanggal Pengeluaran
                </label>
                <input
                  type="date"
                  value={editExpDate}
                  onChange={(e) => setEditExpDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Deskripsi Pengeluaran
                </label>
                <input
                  type="text"
                  value={editExpDesc}
                  onChange={(e) => setEditExpDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Kategori
                </label>
                <select
                  value={editExpCategory}
                  onChange={(e) => setEditExpCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Nominal (Rp)
                </label>
                <input
                  type="number"
                  value={editExpAmount}
                  onChange={(e) => setEditExpAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200 font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={editExpNote}
                  onChange={(e) => setEditExpNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="px-4 py-2 rounded-xl border border-espresso-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditedExpense}
                className="px-4 py-2 rounded-xl bg-espresso-900 text-cream-50 text-xs font-bold"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL KONFIRMASI HAPUS                                               */}
      {/* ==================================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-espresso-200 space-y-4">
            <h3 className="text-base font-bold text-espresso-900">
              Konfirmasi Hapus Transaksi
            </h3>
            <p className="text-xs text-espresso-700 leading-relaxed">
              Apakah Anda yakin ingin menghapus{" "}
              <strong>{deleteTarget.label}</strong>? Penghapusan ini akan langsung memperbarui perhitungan di Dashboard dan Laporan Bulanan.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-espresso-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
