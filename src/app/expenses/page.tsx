"use client";

import React, { useMemo, useState } from "react";
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { useWarcoffe } from "@/context/warcoffe-context";
import { ExpenseRecord } from "@/types/warcoffe";
import { EXPENSE_CATEGORIES } from "@/lib/menu-seed-data";
import {
  formatDateID,
  formatIDR,
  formatMonthKeyID,
  getCurrentMonthKey,
  getLocalDateKey,
} from "@/lib/format";

export default function ExpensesPage() {
  const { expenses, createExpense, updateExpense, deleteExpense } = useWarcoffe();

  // Form state
  const [expenseDate, setExpenseDate] = useState<string>(getLocalDateKey());
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amountInput, setAmountInput] = useState<string>("");
  const [noteInput, setNoteInput] = useState<string>("");
  const [markAsDemo, setMarkAsDemo] = useState<boolean>(false);

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Edit modal state
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [editAmount, setEditAmount] = useState<string>("");
  const [editNote, setEditNote] = useState<string>("");

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    messages: string[];
  } | null>(null);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (selectedMonth && exp.expense_date.slice(0, 7) !== selectedMonth) {
        return false;
      }
      if (filterCategory !== "ALL" && exp.category !== filterCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const inDesc = exp.description.toLowerCase().includes(q);
        const inNote = exp.note.toLowerCase().includes(q);
        if (!inDesc && !inNote) return false;
      }
      return true;
    });
  }, [expenses, selectedMonth, filterCategory, searchQuery]);

  const totalFilteredExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedAmount = amountInput.trim();
    if (!/^-?\d+$/.test(trimmedAmount)) {
      setFeedback({
        type: "error",
        messages: [
          "Nominal pengeluaran harus berupa angka bulat Rupiah yang valid (tanpa huruf atau tanda baca).",
        ],
      });
      return;
    }

    const numericAmount = Number(trimmedAmount);
    const res = await createExpense({
      expense_date: expenseDate,
      description,
      category,
      amount: numericAmount,
      note: noteInput,
      is_demo: markAsDemo,
    });

    if (!res.ok) {
      setFeedback({
        type: "error",
        messages: res.errors || ["Gagal menyimpan pengeluaran."],
      });
      return;
    }

    setDescription("");
    setAmountInput("");
    setNoteInput("");
    setFeedback({
      type: "success",
      messages: [
        `Pengeluaran "${description}" sebesar ${formatIDR(numericAmount)} berhasil disimpan dan dimasukkan ke rekap bulanan.`,
      ],
    });
  };

  const openEditModal = (exp: ExpenseRecord) => {
    setFeedback(null);
    setEditingExpense(exp);
    setEditDate(exp.expense_date);
    setEditDescription(exp.description);
    setEditCategory(exp.category);
    setEditAmount(String(exp.amount));
    setEditNote(exp.note);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    const trimmedAmount = editAmount.trim();
    if (!/^-?\d+$/.test(trimmedAmount)) {
      setFeedback({
        type: "error",
        messages: ["Nominal pengeluaran harus berupa angka bulat Rupiah."],
      });
      return;
    }

    const res = await updateExpense(editingExpense.id, {
      expense_date: editDate,
      description: editDescription,
      category: editCategory,
      amount: Number(trimmedAmount),
      note: editNote,
    });

    if (!res.ok) {
      setFeedback({
        type: "error",
        messages: res.errors || ["Gagal memperbarui pengeluaran."],
      });
      return;
    }

    setEditingExpense(null);
    setFeedback({
      type: "success",
      messages: ["Catatan pengeluaran berhasil diperbarui."],
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await deleteExpense(deleteTarget.id);
    if (!res.ok) {
      setFeedback({
        type: "error",
        messages: [res.error || "Gagal menghapus pengeluaran."],
      });
    } else {
      setFeedback({
        type: "success",
        messages: [`Catatan pengeluaran "${deleteTarget.description}" telah dihapus.`],
      });
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-espresso-900">
          Pencatatan Pengeluaran Operasional Warcoffe 13
        </h1>
        <p className="text-sm text-espresso-600">
          Catat pembelian bahan baku, gas, listrik, es batu, kemasan, dan biaya operasional lainnya. Seluruh pengeluaran otomatis dihitung dalam rekap bulanan.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-start justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <div className="flex items-start gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <ul className="space-y-0.5">
              {feedback.messages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Add Expense Form (4 cols) */}
        <form
          onSubmit={handleCreateExpense}
          className="lg:col-span-4 bg-white rounded-2xl p-5 border border-espresso-200/80 shadow-sm space-y-3.5"
        >
          <div className="flex items-center gap-2 border-b border-espresso-100 pb-3">
            <Wallet className="w-4 h-4 text-caramel-600" />
            <h2 className="text-base font-bold text-espresso-900">
              Tambah Pengeluaran Baru
            </h2>
          </div>

          <div className="text-xs space-y-3">
            <div>
              <label className="block font-semibold text-espresso-800 mb-1">
                Tanggal Pengeluaran *
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-espresso-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-espresso-800 mb-1">
                Deskripsi Pengeluaran *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Beli Kopi Liong 2 pak & Es Batu"
                className="w-full px-3 py-2 rounded-xl border border-espresso-200"
              />
            </div>

            <div>
              <label className="block font-semibold text-espresso-800 mb-1">
                Kategori *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-espresso-200 font-semibold"
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
                Nominal Pengeluaran (Rp) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="Contoh: 45000"
                className="w-full px-3 py-2 rounded-xl border border-espresso-200 font-bold text-sm"
              />
              <p className="text-[11px] text-espresso-500 mt-1">
                Masukkan angka bulat Rupiah lebih dari 0 (tanpa titik/koma).
              </p>
            </div>

            <div>
              <label className="block font-semibold text-espresso-800 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Contoh: Nota toko sembako Pak Haji"
                className="w-full px-3 py-2 rounded-xl border border-espresso-200"
              />
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={markAsDemo}
                onChange={(e) => setMarkAsDemo(e.target.checked)}
                className="rounded border-espresso-300 text-caramel-600"
              />
              <span className="text-espresso-700">
                Tandai sebagai data DEMO / Pengujian
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-espresso-900 hover:bg-espresso-800 text-cream-50 text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Simpan Pengeluaran
          </button>
        </form>

        {/* RIGHT: Expense History & Monthly Summary (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 border border-espresso-200 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 text-caramel-600" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-xs font-semibold text-espresso-900 bg-transparent focus:outline-none"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border border-espresso-200 rounded-xl px-3 py-2 text-xs font-semibold text-espresso-900"
              >
                <option value="ALL">Semua Kategori</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-espresso-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari deskripsi pengeluaran..."
                className="w-full pl-8 pr-3 py-2 border border-espresso-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-espresso-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-espresso-600 font-medium">
                Total Pengeluaran ({formatMonthKeyID(selectedMonth)})
              </span>
              <p className="text-xs text-espresso-500">
                {filteredExpenses.length} transaksi pengeluaran tercatat
              </p>
            </div>
            <span className="text-lg font-bold text-rose-700">
              {formatIDR(totalFilteredExpenses)}
            </span>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-espresso-200/80">
              <Wallet className="w-9 h-9 text-espresso-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-espresso-900">
                Belum Ada Catatan Pengeluaran pada {formatMonthKeyID(selectedMonth)}
              </h3>
              <p className="text-xs text-espresso-600 mt-1 max-w-md mx-auto">
                Gunakan formulir di sebelah kiri untuk mencatat pengeluaran operasional warung.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-espresso-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-cream-100 border-b border-espresso-200 text-[11px] font-bold text-espresso-700 uppercase">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Deskripsi & Catatan</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-right">Nominal</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-espresso-100 text-xs">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-cream-50/70">
                        <td className="py-3 px-4 whitespace-nowrap text-espresso-700 font-medium">
                          {formatDateID(exp.expense_date)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-espresso-900">
                              {exp.description}
                            </span>
                            {exp.is_demo && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 font-bold text-[10px]">
                                DEMO
                              </span>
                            )}
                          </div>
                          {exp.note && (
                            <p className="text-[11px] text-espresso-500 mt-0.5">
                              {exp.note}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-cream-100 text-espresso-800 text-[11px] font-medium">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-700 whitespace-nowrap">
                          {formatIDR(exp.amount)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(exp)}
                              className="p-1.5 rounded-lg border border-espresso-200 text-espresso-700 hover:bg-espresso-100"
                              title="Edit Pengeluaran"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(exp)}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                              title="Hapus Pengeluaran"
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
        </div>
      </div>

      {/* Edit Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-espresso-200 space-y-4"
          >
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
                  Tanggal Pengeluaran *
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Deskripsi *
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Kategori *
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
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
                  Nominal (Rp) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200 font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Catatan
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
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
                type="submit"
                className="px-4 py-2 rounded-xl bg-espresso-900 text-cream-50 text-xs font-bold"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-espresso-200 space-y-4">
            <h3 className="text-base font-bold text-espresso-900">
              Hapus Catatan Pengeluaran?
            </h3>
            <p className="text-xs text-espresso-700">
              Hapus pengeluaran <strong>{deleteTarget.description}</strong> sebesar{" "}
              <strong>{formatIDR(deleteTarget.amount)}</strong>?
            </p>
            <div className="flex justify-end gap-2">
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
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
