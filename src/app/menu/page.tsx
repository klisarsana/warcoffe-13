"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Tags,
  CheckCircle2,
  AlertCircle,
  X,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { useWarcoffe } from "@/context/warcoffe-context";
import { MenuItem, TemperatureMode } from "@/types/warcoffe";
import { formatIDR, formatMenuPriceLabel } from "@/lib/format";

export default function MenuManagementPage() {
  const {
    categories,
    menuItems,
    createCategory,
    updateCategory,
    deleteCategory,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    resetMenuToOfficialSeed,
  } = useWarcoffe();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  // Menu form modal state (Add & Edit)
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTempMode, setFormTempMode] = useState<TemperatureMode>("NONE");
  const [formDefaultPrice, setFormDefaultPrice] = useState("");
  const [formHotPrice, setFormHotPrice] = useState("");
  const [formColdPrice, setFormColdPrice] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formStockUnit, setFormStockUnit] = useState("pcs");
  const [formNotes, setFormNotes] = useState("");

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  const categoryMap = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCategoryId !== "ALL" && item.category_id !== selectedCategoryId) {
        return false;
      }
      if (filterStatus === "ACTIVE" && !item.is_active) return false;
      if (filterStatus === "INACTIVE" && item.is_active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const inName = item.name.toLowerCase().includes(q);
        const inDesc = item.description.toLowerCase().includes(q);
        const inNotes = item.notes.toLowerCase().includes(q);
        if (!inName && !inDesc && !inNotes) return false;
      }
      return true;
    });
  }, [menuItems, selectedCategoryId, filterStatus, searchQuery]);

  const openAddMenuModal = () => {
    setFeedback(null);
    setEditingItem(null);
    setFormName("");
    setFormCategoryId(categories[0]?.id || "cat-kemasan");
    setFormDescription("");
    setFormTempMode("NONE");
    setFormDefaultPrice("");
    setFormHotPrice("");
    setFormColdPrice("");
    setFormIsActive(true);
    setFormStockUnit("pcs");
    setFormNotes("");
    setShowMenuModal(true);
  };

  const openEditMenuModal = (item: MenuItem) => {
    setFeedback(null);
    setEditingItem(item);
    setFormName(item.name);
    setFormCategoryId(item.category_id);
    setFormDescription(item.description);
    setFormTempMode(item.temperature_mode);
    setFormDefaultPrice(item.default_price !== null ? String(item.default_price) : "");
    setFormHotPrice(item.hot_price !== null ? String(item.hot_price) : "");
    setFormColdPrice(item.cold_price !== null ? String(item.cold_price) : "");
    setFormIsActive(item.is_active);
    setFormStockUnit(item.stock_unit);
    setFormNotes(item.notes);
    setShowMenuModal(true);
  };

  const handleSaveMenuForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const parsePrice = (raw: string): number | null => {
      const cleaned = raw.trim();
      if (!cleaned) return null;
      const num = Number(cleaned);
      if (!Number.isInteger(num) || num <= 0) return -1;
      return num;
    };

    const defaultPrice =
      formTempMode === "NONE" || formTempMode === "UNSPECIFIED"
        ? parsePrice(formDefaultPrice)
        : null;
    const hotPrice =
      formTempMode === "HOT_ONLY" || formTempMode === "HOT_COLD"
        ? parsePrice(formHotPrice)
        : null;
    const coldPrice =
      formTempMode === "HOT_COLD" ? parsePrice(formColdPrice) : null;

    if (editingItem) {
      const res = await updateMenuItem(editingItem.id, {
        name: formName,
        category_id: formCategoryId,
        description: formDescription,
        temperature_mode: formTempMode,
        default_price: defaultPrice,
        hot_price: hotPrice,
        cold_price: coldPrice,
        is_active: formIsActive,
        stock_unit: formStockUnit,
        notes: formNotes,
      });

      if (!res.ok) {
        setFeedback({ type: "error", text: res.error || "Gagal memperbarui menu." });
        return;
      }

      setShowMenuModal(false);
      setFeedback({
        type: "success",
        text: `Menu "${formName}" berhasil diperbarui.`,
      });
    } else {
      const res = await createMenuItem({
        name: formName,
        category_id: formCategoryId,
        description: formDescription,
        temperature_mode: formTempMode,
        default_price: defaultPrice,
        hot_price: hotPrice,
        cold_price: coldPrice,
        is_active: formIsActive,
        current_stock: null, // Aturan: stok awal selalu NULL sampai diisi di Manajemen Stok
        min_stock_threshold: null,
        stock_unit: formStockUnit,
        notes: formNotes,
      });

      if (!res.ok) {
        setFeedback({ type: "error", text: res.error || "Gagal menambah menu." });
        return;
      }

      setShowMenuModal(false);
      setFeedback({
        type: "success",
        text: `Menu baru "${formName}" berhasil ditambahkan ke katalog.`,
      });
    }
  };

  const handleToggleStatus = async (item: MenuItem) => {
    const res = await updateMenuItem(item.id, { is_active: !item.is_active });
    if (res.ok) {
      setFeedback({
        type: "success",
        text: `Status "${item.name}" diubah menjadi ${!item.is_active ? "Aktif" : "Nonaktif"}.`,
      });
    }
  };

  const handleConfirmDeleteMenu = async () => {
    if (!deleteTarget) return;
    const res = await deleteMenuItem(deleteTarget.id);
    if (!res.ok) {
      setFeedback({ type: "error", text: res.error || "Gagal menghapus menu." });
    } else {
      setFeedback({
        type: "success",
        text: `Menu "${deleteTarget.name}" telah dihapus dari katalog.`,
      });
    }
    setDeleteTarget(null);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createCategory(newCategoryName);
    if (!res.ok) {
      setFeedback({ type: "error", text: res.error || "Gagal menambah kategori." });
      return;
    }
    setNewCategoryName("");
    setFeedback({ type: "success", text: "Kategori baru berhasil ditambahkan." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-espresso-900">
            Manajemen Katalog Menu Warcoffe 13
          </h1>
          <p className="text-sm text-espresso-600">
            Total {menuItems.length} item menu terdaftar. Variasi suhu yang belum pasti dari foto menu dipertahankan sebagai &ldquo;Tidak Disebutkan&rdquo; sampai pemilik memperbaruinya.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="px-3.5 py-2 rounded-xl border border-espresso-300 bg-white text-espresso-900 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-espresso-50"
          >
            <Tags className="w-4 h-4 text-caramel-600" />
            Kelola Kategori ({categories.length})
          </button>
          <button
            type="button"
            onClick={openAddMenuModal}
            className="px-4 py-2 rounded-xl bg-espresso-900 text-cream-50 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-espresso-800 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Menu Baru
          </button>
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

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari menu (nama, deskripsi, catatan)..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-espresso-200 text-xs focus:outline-none focus:ring-2 focus:ring-caramel-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="border border-espresso-200 rounded-xl px-3 py-2 text-xs font-semibold text-espresso-900"
          >
            <option value="ALL">Semua Kategori ({menuItems.length})</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({menuItems.filter((m) => m.category_id === cat.id).length})
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
            }
            className="border border-espresso-200 rounded-xl px-3 py-2 text-xs font-semibold text-espresso-900"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif Dijual</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>

          <button
            type="button"
            onClick={async () => {
              await resetMenuToOfficialSeed();
              setFeedback({
                type: "success",
                text: "Katalog menu berhasil dikembalikan ke 57 entri seed resmi Warcoffe 13.",
              });
            }}
            className="px-3 py-2 rounded-xl border border-espresso-200 text-espresso-700 hover:bg-espresso-50 text-xs font-medium inline-flex items-center gap-1"
            title="Kembalikan ke 57 data menu awal Warcoffe 13"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset 57 Seed Awal
          </button>
        </div>
      </div>

      {/* Menu Table */}
      <div className="bg-white rounded-2xl border border-espresso-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-cream-100 border-b border-espresso-200 text-[11px] font-bold text-espresso-700 uppercase">
                <th className="py-3 px-4">Nama Menu</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Konfigurasi Variasi & Harga (IDR)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-espresso-100 text-xs">
              {filteredMenu.map((item) => (
                <tr key={item.id} className="hover:bg-cream-50/70">
                  <td className="py-3 px-4">
                    <p className="font-bold text-espresso-900">{item.name}</p>
                    {item.notes && (
                      <p className="text-[11px] text-espresso-500 mt-0.5">
                        {item.notes}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-md bg-cream-100 text-espresso-800 font-medium text-[11px]">
                      {categoryMap.get(item.category_id) || item.category_id}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-espresso-900">
                      {formatMenuPriceLabel(item)}
                    </div>
                    {item.temperature_mode === "UNSPECIFIED" && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 mt-0.5">
                        <HelpCircle className="w-3 h-3 text-amber-600" />
                        Suhu belum ditentukan (sesuai foto menu)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                        item.is_active
                          ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                          : "bg-espresso-200 text-espresso-700 hover:bg-espresso-300"
                      }`}
                    >
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditMenuModal(item)}
                        className="p-1.5 rounded-lg border border-espresso-200 text-espresso-700 hover:bg-espresso-100"
                        title="Edit Menu"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                        title="Hapus Menu"
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

      {/* ==================================================================== */}
      {/* MODAL TAMBAH / EDIT MENU                                             */}
      {/* ==================================================================== */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMenuForm}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-espresso-200 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-espresso-100 pb-3">
              <h3 className="text-base font-bold text-espresso-900">
                {editingItem ? `Edit Menu: ${editingItem.name}` : "Tambah Menu Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setShowMenuModal(false)}
                className="p-1 rounded-lg hover:bg-espresso-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Nama Menu *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Kopi Liong / Teh Manis / Indomie Telur"
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-espresso-800 mb-1">
                    Kategori *
                  </label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-espresso-800 mb-1">
                    Satuan Stok
                  </label>
                  <input
                    type="text"
                    value={formStockUnit}
                    onChange={(e) => setFormStockUnit(e.target.value)}
                    placeholder="botol / sachet / porsi"
                    className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Mode Variasi Suhu / Penyajian *
                </label>
                <select
                  value={formTempMode}
                  onChange={(e) => setFormTempMode(e.target.value as TemperatureMode)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200 font-semibold"
                >
                  <option value="NONE">
                    Standar / Tanpa Variasi Suhu (Makanan & Minuman Kemasan)
                  </option>
                  <option value="HOT_ONLY">
                    Hanya Panas (Contoh: Kopi Hitam Panas Rp4.000)
                  </option>
                  <option value="HOT_COLD">
                    Panas & Dingin (Contoh: Teh Manis Panas Rp3.000 / Dingin Rp4.000)
                  </option>
                  <option value="UNSPECIFIED">
                    Variasi Suhu Tidak Disebutkan (Harga tunggal sesuai foto)
                  </option>
                </select>
              </div>

              {(formTempMode === "NONE" || formTempMode === "UNSPECIFIED") && (
                <div>
                  <label className="block font-semibold text-espresso-800 mb-1">
                    Harga Satuan (Integer Rupiah) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formDefaultPrice}
                    onChange={(e) => setFormDefaultPrice(e.target.value)}
                    placeholder="Contoh: 7000"
                    className="w-full px-3 py-2 rounded-xl border border-espresso-200 font-bold"
                  />
                </div>
              )}

              {formTempMode === "HOT_ONLY" && (
                <div>
                  <label className="block font-semibold text-espresso-800 mb-1">
                    Harga Varian Panas (Integer Rupiah) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formHotPrice}
                    onChange={(e) => setFormHotPrice(e.target.value)}
                    placeholder="Contoh: 4000"
                    className="w-full px-3 py-2 rounded-xl border border-espresso-200 font-bold"
                  />
                </div>
              )}

              {formTempMode === "HOT_COLD" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-espresso-800 mb-1">
                      Harga Panas (Rp) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formHotPrice}
                      onChange={(e) => setFormHotPrice(e.target.value)}
                      placeholder="Contoh: 5000"
                      className="w-full px-3 py-2 rounded-xl border border-espresso-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-espresso-800 mb-1">
                      Harga Dingin (Rp) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={formColdPrice}
                      onChange={(e) => setFormColdPrice(e.target.value)}
                      placeholder="Contoh: 6000"
                      className="w-full px-3 py-2 rounded-xl border border-espresso-200 font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Deskripsi Singkat
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-espresso-800 mb-1">
                  Catatan Data Menu
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-espresso-200"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-espresso-300 text-caramel-600"
                />
                <span className="font-semibold text-espresso-800">
                  Menu Aktif (Tampilkan di layar Kasir / POS)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMenuModal(false)}
                className="px-4 py-2 rounded-xl border border-espresso-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-espresso-900 text-cream-50 text-xs font-bold"
              >
                Simpan Menu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL KELOLA KATEGORI                                                */}
      {/* ==================================================================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-espresso-200 space-y-4">
            <div className="flex items-center justify-between border-b border-espresso-100 pb-3">
              <h3 className="text-base font-bold text-espresso-900">
                Kelola Kategori Menu
              </h3>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="p-1 rounded-lg hover:bg-espresso-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nama kategori baru..."
                className="flex-1 px-3 py-2 rounded-xl border border-espresso-200 text-xs"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-espresso-900 text-cream-50 text-xs font-bold"
              >
                Tambah
              </button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-cream-50 border border-espresso-200 text-xs"
                >
                  {editingCatId === cat.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="flex-1 px-2 py-1 rounded border border-espresso-300"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await updateCategory(cat.id, editingCatName);
                          if (res.ok) setEditingCatId(null);
                        }}
                        className="px-2 py-1 rounded bg-espresso-900 text-white font-bold"
                      >
                        Simpan
                      </button>
                    </div>
                  ) : (
                    <span className="font-semibold text-espresso-900">
                      {cat.name} (
                      {menuItems.filter((m) => m.category_id === cat.id).length} menu)
                    </span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setEditingCatName(cat.name);
                      }}
                      className="p-1 rounded hover:bg-espresso-200 text-espresso-700"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await deleteCategory(cat.id);
                        if (!res.ok) {
                          setFeedback({ type: "error", text: res.error || "" });
                        }
                      }}
                      className="p-1 rounded hover:bg-rose-100 text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL KONFIRMASI HAPUS MENU                                          */}
      {/* ==================================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-espresso-200 space-y-4">
            <h3 className="text-base font-bold text-espresso-900">
              Hapus Menu &ldquo;{deleteTarget.name}&rdquo;?
            </h3>
            <p className="text-xs text-espresso-700">
              Menu ini akan dihapus dari katalog. Jika Anda hanya ingin menggabungkan item duplikat (seperti Good Day Cappuccino) atau menyembunyikannya sementara, Anda juga dapat menonaktifkan statusnya.
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
                onClick={handleConfirmDeleteMenu}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Hapus Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
