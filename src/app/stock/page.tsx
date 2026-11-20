"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Boxes,
  AlertTriangle,
  History,
  CheckCircle2,
  AlertCircle,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useWarcoffe } from "@/context/warcoffe-context";
import { MenuItem, StockMovementType } from "@/types/warcoffe";
import { formatDateTimeID } from "@/lib/format";
import { getLowStockMenuItems } from "@/lib/calculations";

export default function StockManagementPage() {
  const {
    categories,
    menuItems,
    stockMovements,
    recordStockMovement,
    updateStockThreshold,
  } = useWarcoffe();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("ALL");
  const [filterStockStatus, setFilterStockStatus] = useState<
    "ALL" | "CONFIGURED" | "UNCONFIGURED" | "LOW_STOCK"
  >("ALL");

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Stock Movement Modal
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [movementType, setMovementType] = useState<StockMovementType>("INITIAL");
  const [quantityInput, setQuantityInput] = useState<string>("");
  const [minThresholdInput, setMinThresholdInput] = useState<string>("");
  const [reasonInput, setReasonInput] = useState<string>("");
  const [noteInput, setNoteInput] = useState<string>("");

  const categoryMap = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const lowStockItems = useMemo(
    () => getLowStockMenuItems(menuItems),
    [menuItems]
  );

  const configuredCount = useMemo(
    () => menuItems.filter((m) => m.current_stock !== null).length,
    [menuItems]
  );

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCategoryId !== "ALL" && item.category_id !== selectedCategoryId) {
        return false;
      }
      if (filterStockStatus === "CONFIGURED" && item.current_stock === null) {
        return false;
      }
      if (filterStockStatus === "UNCONFIGURED" && item.current_stock !== null) {
        return false;
      }
      if (filterStockStatus === "LOW_STOCK") {
        if (item.current_stock === null) return false;
        const threshold = item.min_stock_threshold ?? 5;
        if (item.current_stock > threshold) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!item.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [menuItems, selectedCategoryId, filterStockStatus, searchQuery]);

  const openStockModal = (item: MenuItem, defaultType?: StockMovementType) => {
    setFeedback(null);
    setActiveItem(item);
    const initialMode: StockMovementType =
      defaultType || (item.current_stock === null ? "INITIAL" : "IN");
    setMovementType(initialMode);
    setQuantityInput(
      initialMode === "INITIAL" || initialMode === "ADJUSTMENT"
        ? String(item.current_stock ?? 0)
        : ""
    );
    setMinThresholdInput(
      item.min_stock_threshold !== null ? String(item.min_stock_threshold) : "5"
    );
    setReasonInput(
      initialMode === "INITIAL"
        ? "Input stok awal fisik warung"
        : initialMode === "IN"
        ? "Belanja / tambah stok masuk"
        : initialMode === "OUT"
        ? "Pemakaian / stok keluar"
        : "Penyesuaian stok opname"
    );
    setNoteInput("");
  };

  const handleSaveStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    const parsedQty = Number(quantityInput);
    const parsedMin =
      minThresholdInput.trim() === "" ? null : Number(minThresholdInput);

    const res = await recordStockMovement({
      menu_item_id: activeItem.id,
      movement_type: movementType,
      quantity_input: parsedQty,
      reason: reasonInput,
      note: noteInput,
      min_stock_threshold: parsedMin,
    });

    if (!res.ok) {
      setFeedback({ type: "error", text: res.error || "Gagal menyimpan stok." });
      return;
    }

    if (parsedMin !== activeItem.min_stock_threshold) {
      await updateStockThreshold(activeItem.id, parsedMin);
    }

    setFeedback({
      type: "success",
      text: `Stok "${activeItem.name}" berhasil diperbarui dan dicatat pada riwayat pergerakan stok.`,
    });
    setActiveItem(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-espresso-900">
            Manajemen Stok Produk Sederhana
          </h1>
          <p className="text-sm text-espresso-600">
            Stok awal seluruh produk bernilai <strong>Belum Diisi (NULL)</strong> sampai pemilik memasukkannya. Sistem tidak melakukan pengurangan bahan baku otomatis berbasis resep.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <span className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            {feedback.text}
          </span>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm">
          <span className="text-xs font-medium text-espresso-600">
            Produk Sudah Diisi Stok Awal
          </span>
          <p className="text-xl font-bold text-espresso-900 mt-1">
            {configuredCount} / {menuItems.length} Produk
          </p>
          <p className="text-xs text-espresso-500 mt-0.5">
            {menuItems.length - configuredCount} produk masih berstatus NULL (Belum Diisi)
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm">
          <span className="text-xs font-medium text-espresso-600">
            Peringatan Stok Menipis
          </span>
          <p className="text-xl font-bold text-amber-700 mt-1">
            {lowStockItems.length} Produk
          </p>
          <p className="text-xs text-espresso-500 mt-0.5">
            Hanya dihitung dari produk yang stoknya sudah diisi pemilik
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm">
          <span className="text-xs font-medium text-espresso-600">
            Total Riwayat Pergerakan Stok
          </span>
          <p className="text-xl font-bold text-espresso-900 mt-1">
            {stockMovements.length} Catatan
          </p>
          <p className="text-xs text-espresso-500 mt-0.5">
            Stok awal, masuk, keluar, dan penyesuaian
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama produk..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-espresso-200 text-xs focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="border border-espresso-200 rounded-xl px-3 py-2 text-xs font-semibold text-espresso-900"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterStockStatus}
            onChange={(e) =>
              setFilterStockStatus(
                e.target.value as
                  | "ALL"
                  | "CONFIGURED"
                  | "UNCONFIGURED"
                  | "LOW_STOCK"
              )
            }
            className="border border-espresso-200 rounded-xl px-3 py-2 text-xs font-semibold text-espresso-900"
          >
            <option value="ALL">Semua Status Stok</option>
            <option value="CONFIGURED">Sudah Diisi Stok ({configuredCount})</option>
            <option value="UNCONFIGURED">
              Belum Diisi / NULL ({menuItems.length - configuredCount})
            </option>
            <option value="LOW_STOCK">
              Stok Menipis ({lowStockItems.length})
            </option>
          </select>
        </div>
      </div>

      {/* Main Grid: Product Stock Table + Movement History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Product Stock Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-espresso-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-espresso-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-espresso-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-caramel-600" />
              Daftar Stok Produk ({filteredItems.length})
            </h2>
          </div>

          <div className="overflow-x-auto max-h-[540px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-cream-100 border-b border-espresso-200 text-[11px] font-bold text-espresso-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Produk</th>
                  <th className="py-3 px-4">Stok Saat Ini</th>
                  <th className="py-3 px-4">Batas Min.</th>
                  <th className="py-3 px-4 text-right">Aksi Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-espresso-100 text-xs">
                {filteredItems.map((item) => {
                  const isUnset = item.current_stock === null;
                  const threshold = item.min_stock_threshold ?? 5;
                  const isLow =
                    !isUnset &&
                    item.current_stock !== null &&
                    item.current_stock <= threshold;

                  return (
                    <tr key={item.id} className="hover:bg-cream-50/70">
                      <td className="py-3 px-4">
                        <p className="font-bold text-espresso-900">{item.name}</p>
                        <p className="text-[11px] text-espresso-500">
                          {categoryMap.get(item.category_id)}
                        </p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isUnset ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-espresso-100 text-espresso-600">
                            Belum Diisi (NULL)
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                              isLow
                                ? "bg-amber-100 text-amber-900"
                                : "bg-emerald-100 text-emerald-900"
                            }`}
                          >
                            {isLow && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                            {item.current_stock} {item.stock_unit}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-espresso-600 whitespace-nowrap">
                        {item.min_stock_threshold !== null
                          ? `${item.min_stock_threshold} ${item.stock_unit}`
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openStockModal(item)}
                          className="px-3 py-1.5 rounded-xl bg-espresso-900 hover:bg-caramel-600 text-cream-50 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          {isUnset ? "Isi Stok Awal" : "Sesuaikan Stok"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Movement History (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-espresso-200/80 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-espresso-100 pb-3">
            <History className="w-4 h-4 text-caramel-600" />
            <h2 className="text-sm font-bold text-espresso-900">
              Riwayat Pergerakan Stok
            </h2>
          </div>

          {stockMovements.length === 0 ? (
            <div className="py-12 px-4 text-center bg-cream-50 rounded-xl border border-dashed border-espresso-200">
              <History className="w-7 h-7 text-espresso-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-espresso-800">
                Belum Ada Riwayat Pergerakan Stok
              </p>
              <p className="text-xs text-espresso-600 mt-1">
                Setiap pengisian stok awal, barang masuk, barang keluar, dan penyesuaian akan tercatat lengkap dengan tanggal dan alasan di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {stockMovements.map((mv) => (
                <div
                  key={mv.id}
                  className="p-3 rounded-xl bg-cream-50 border border-espresso-100 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-espresso-900">
                      {mv.menu_name_snapshot}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        mv.movement_type === "INITIAL"
                          ? "bg-sky-100 text-sky-900"
                          : mv.movement_type === "IN"
                          ? "bg-emerald-100 text-emerald-900"
                          : mv.movement_type === "OUT"
                          ? "bg-rose-100 text-rose-900"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {mv.movement_type === "INITIAL"
                        ? "STOK AWAL"
                        : mv.movement_type === "IN"
                        ? `MASUK (+${mv.quantity_change})`
                        : mv.movement_type === "OUT"
                        ? `KELUAR (${mv.quantity_change})`
                        : `OPNAME (${mv.quantity_change >= 0 ? "+" : ""}${mv.quantity_change})`}
                    </span>
                  </div>

                  <div className="flex justify-between text-espresso-700">
                    <span>
                      Stok: {mv.previous_stock === null ? "NULL" : mv.previous_stock} →{" "}
                      <strong>{mv.resulting_stock}</strong>
                    </span>
                    <span className="text-[11px] text-espresso-500">
                      {formatDateTimeID(mv.movement_date)}
                    </span>
                  </div>

                  <p className="text-espresso-700">
                    <span className="font-semibold">Alasan:</span> {mv.reason}
                  </p>
                  {mv.note && (
                    <p className="text-espresso-500 text-[11px]">
                      Catatan: {mv.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL INPUT / PENYESUAIAN STOK                                       */}
      {/* ==================================================================== */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveStockMovement}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-espresso-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-espresso-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-espresso-900">
                  Atur Stok: {activeItem.name}
                </h3>
                <p className="text-xs text-espresso-500">
                  Stok saat ini:{" "}
                  {activeItem.current_stock === null
                    ? "Belum Diisi (NULL)"
                    : `${activeItem.current_stock} ${activeItem.stock_unit}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="p-1 rounded-lg hover:bg-espresso-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Jenis Perubahan Stok *
                </label>
                <select
                  value={movementType}
                  onChange={(e) => {
                    const nextType = e.target.value as StockMovementType;
                    setMovementType(nextType);
                    if (nextType === "INITIAL") {
                      setReasonInput("Input stok awal fisik warung");
                    } else if (nextType === "IN") {
                      setReasonInput("Pembelian / penambahan stok masuk");
                    } else if (nextType === "OUT") {
                      setReasonInput("Stok keluar / terpakai");
                    } else {
                      setReasonInput("Penyesuaian hitung fisik (stok opname)");
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200 font-semibold"
                >
                  <option value="INITIAL">
                    Set Stok Awal (Tetapkan Jumlah Stok Fisik)
                  </option>
                  <option value="IN">Stok Masuk (+ Tambah ke Stok Saat Ini)</option>
                  <option value="OUT">Stok Keluar (- Kurangi dari Stok Saat Ini)</option>
                  <option value="ADJUSTMENT">
                    Penyesuaian Opname (Ganti Total Stok Aktual)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-espresso-800 mb-1">
                    {movementType === "IN"
                      ? "Jumlah Masuk *"
                      : movementType === "OUT"
                      ? "Jumlah Keluar *"
                      : "Jumlah Stok Aktual *"}{" "}
                    ({activeItem.stock_unit})
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    placeholder="Contoh: 24"
                    className="w-full px-3 py-2 rounded-xl border border-espresso-200 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-espresso-800 mb-1">
                    Batas Minimum Alert ({activeItem.stock_unit})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minThresholdInput}
                    onChange={(e) => setMinThresholdInput(e.target.value)}
                    placeholder="Contoh: 5"
                    className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Alasan Perubahan Stok *
                </label>
                <input
                  type="text"
                  required
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Contoh: Belanja mingguan / Stok opname sore"
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Contoh: Beli 2 renceng / 1 dus di agen"
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="px-4 py-2 rounded-xl border border-espresso-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-espresso-900 text-cream-50 text-xs font-bold"
              >
                Simpan Stok
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
