"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  Flame,
  Snowflake,
  HelpCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { useWarcoffe } from "@/context/warcoffe-context";
import {
  CartItem,
  MenuItem,
  MenuVariantOption,
  PaymentMethod,
  SalesTransaction,
} from "@/types/warcoffe";
import {
  formatDateTimeID,
  formatIDR,
  getMenuVariantOptions,
} from "@/lib/format";
import {
  calculateCartTotal,
  calculateChangeAmount,
} from "@/lib/calculations";

export default function POSPage() {
  const { categories, menuItems, createSaleTransaction } = useWarcoffe();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TUNAI");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [customerNote, setCustomerNote] = useState<string>("");
  const [markAsDemo, setMarkAsDemo] = useState<boolean>(false);

  // Modal Konfirmasi Sebelum Simpan
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modal Struk Tercetak Setelah Transaksi Disimpan
  const [savedReceiptTx, setSavedReceiptTx] = useState<SalesTransaction | null>(
    null
  );

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const activeFilteredMenu = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.is_active) return false;
      const matchesCat =
        selectedCategoryId === "ALL" || item.category_id === selectedCategoryId;
      const matchesQuery =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  const cartTotal = useMemo(() => calculateCartTotal(cart), [cart]);

  const parsedAmountPaid = useMemo(() => {
    if (paymentMethod !== "TUNAI" && amountPaidInput.trim() === "") {
      return cartTotal;
    }
    const clean = amountPaidInput.replace(/[^\d-]/g, "");
    if (!clean) return 0;
    return Number(clean);
  }, [amountPaidInput, paymentMethod, cartTotal]);

  const changeAmount = useMemo(
    () => calculateChangeAmount(cartTotal, parsedAmountPaid),
    [cartTotal, parsedAmountPaid]
  );

  const addItemToCart = (item: MenuItem, option: MenuVariantOption) => {
    setValidationErrors([]);
    const cartItemId = `${item.id}__${option.variant_key}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.cart_item_id === cartItemId);
      if (existing) {
        return prev.map((c) =>
          c.cart_item_id === cartItemId
            ? {
                ...c,
                quantity: c.quantity + 1,
                line_total: (c.quantity + 1) * c.unit_price,
              }
            : c
        );
      }
      const created: CartItem = {
        cart_item_id: cartItemId,
        menu_item_id: item.id,
        menu_name: item.name,
        category_id: item.category_id,
        category_name: categoryNameMap.get(item.category_id) || "Menu",
        variant_key: option.variant_key,
        variant_label: option.label,
        unit_price: option.price,
        quantity: 1,
        line_total: option.price,
      };
      return [...prev, created];
    });
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.cart_item_id !== cartItemId) return c;
          const nextQty = c.quantity + delta;
          if (nextQty <= 0) return null;
          return {
            ...c,
            quantity: nextQty,
            line_total: nextQty * c.unit_price,
          };
        })
        .filter((x): x is CartItem => x !== null)
    );
  };

  const setDirectQuantity = (cartItemId: string, rawVal: string) => {
    const qty = Number(rawVal);
    if (!Number.isInteger(qty) || qty <= 0) return;
    setCart((prev) =>
      prev.map((c) =>
        c.cart_item_id === cartItemId
          ? { ...c, quantity: qty, line_total: qty * c.unit_price }
          : c
      )
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((c) => c.cart_item_id !== cartItemId));
  };

  const handleOpenConfirmation = () => {
    setValidationErrors([]);
    if (cart.length === 0) {
      setValidationErrors(["Pilih minimal 1 menu ke keranjang belanja terlebih dahulu."]);
      return;
    }

    const effectivePaid =
      paymentMethod !== "TUNAI" && amountPaidInput.trim() === ""
        ? cartTotal
        : parsedAmountPaid;

    if (!Number.isInteger(effectivePaid) || effectivePaid < cartTotal) {
      setValidationErrors([
        `Nominal uang diterima (${formatIDR(effectivePaid)}) tidak boleh kurang dari total pembayaran (${formatIDR(cartTotal)}).`,
      ]);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmAndSave = async () => {
    setIsSaving(true);
    setValidationErrors([]);

    const effectivePaid =
      paymentMethod !== "TUNAI" && amountPaidInput.trim() === ""
        ? cartTotal
        : parsedAmountPaid;

    const result = await createSaleTransaction({
      cart,
      paymentMethod,
      amountPaid: effectivePaid,
      customerNote,
      source: "POS_MANUAL",
      isDemo: markAsDemo,
    });

    setIsSaving(false);

    if (!result.ok || !result.transaction) {
      setValidationErrors(result.errors || ["Gagal menyimpan transaksi."]);
      setShowConfirmModal(false);
      return;
    }

    setShowConfirmModal(false);
    setSavedReceiptTx(result.transaction);
    setCart([]);
    setAmountPaidInput("");
    setCustomerNote("");
  };

  const quickCashAmounts = useMemo(() => {
    if (cartTotal <= 0) return [];
    const options = new Set<number>([cartTotal]);
    const roundUp5k = Math.ceil(cartTotal / 5000) * 5000;
    const roundUp10k = Math.ceil(cartTotal / 10000) * 10000;
    const roundUp20k = Math.ceil(cartTotal / 20000) * 20000;
    const roundUp50k = Math.ceil(cartTotal / 50000) * 50000;
    const roundUp100k = Math.ceil(cartTotal / 100000) * 100000;
    [roundUp5k, roundUp10k, roundUp20k, roundUp50k, roundUp100k].forEach((amt) => {
      if (amt >= cartTotal) options.add(amt);
    });
    return Array.from(options).slice(0, 4);
  }, [cartTotal]);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-espresso-900">
            Kasir / Point of Sale (POS) Warcoffe 13
          </h1>
          <p className="text-sm text-espresso-600">
            Pilih menu dan varian yang tersedia. Transaksi hanya disimpan setelah Anda menekan Konfirmasi Penjualan.
          </p>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-xl p-4 text-sm space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Periksa kembali input transaksi:</span>
          </div>
          <ul className="list-disc list-inside text-xs space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Menu Catalog Browser (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Tabs */}
          <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama menu (contoh: Teh Manis, Indomie, Kopi Liong, Seblak)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-espresso-200 text-sm focus:outline-none focus:ring-2 focus:ring-caramel-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategoryId("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  selectedCategoryId === "ALL"
                    ? "bg-espresso-900 text-cream-50"
                    : "bg-cream-100 text-espresso-800 hover:bg-espresso-100"
                }`}
              >
                Semua Menu ({menuItems.filter((m) => m.is_active).length})
              </button>
              {categories.map((cat) => {
                const count = menuItems.filter(
                  (m) => m.is_active && m.category_id === cat.id
                ).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                      selectedCategoryId === cat.id
                        ? "bg-espresso-900 text-cream-50"
                        : "bg-cream-100 text-espresso-800 hover:bg-espresso-100"
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Grid */}
          {activeFilteredMenu.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-espresso-200/80">
              <p className="text-sm font-semibold text-espresso-800">
                Tidak ada menu aktif yang cocok dengan pencarian Anda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {activeFilteredMenu.map((item) => {
                const variantOptions = getMenuVariantOptions(item);
                const catName = categoryNameMap.get(item.category_id) || "";

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm flex flex-col justify-between hover:border-caramel-400 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-cream-100 text-espresso-700">
                          {catName}
                        </span>
                        {item.current_stock !== null && (
                          <span className="text-[11px] font-semibold text-espresso-600">
                            Stok: {item.current_stock} {item.stock_unit}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-espresso-900 mt-2">
                        {item.name}
                      </h3>

                      {item.temperature_mode === "UNSPECIFIED" && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 mt-1 inline-flex items-center gap-1">
                          <HelpCircle className="w-3 h-3 text-amber-600 shrink-0" />
                          Variasi suhu tidak disebutkan di foto
                        </p>
                      )}
                    </div>

                    {/* Variant Selection Buttons */}
                    <div className="mt-3 pt-3 border-t border-espresso-100 flex flex-wrap gap-2">
                      {variantOptions.map((opt) => (
                        <button
                          key={opt.variant_key}
                          type="button"
                          onClick={() => addItemToCart(item, opt)}
                          className="flex-1 min-w-[115px] inline-flex items-center justify-between px-3 py-2 rounded-xl bg-espresso-900 hover:bg-caramel-600 text-cream-50 text-xs font-semibold transition"
                        >
                          <span className="inline-flex items-center gap-1">
                            {opt.variant_key === "PANAS" && (
                              <Flame className="w-3.5 h-3.5 text-amber-300" />
                            )}
                            {opt.variant_key === "DINGIN" && (
                              <Snowflake className="w-3.5 h-3.5 text-sky-300" />
                            )}
                            <span>
                              {item.temperature_mode === "NONE"
                                ? "Tambah"
                                : item.temperature_mode === "UNSPECIFIED"
                                ? "Tambah"
                                : opt.label}
                            </span>
                          </span>
                          <span>{formatIDR(opt.price)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Shopping Cart & Checkout (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-espresso-200/90 shadow-sm p-5 sticky top-6 space-y-4">
          <div className="flex items-center justify-between border-b border-espresso-100 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-caramel-600" />
              <h2 className="text-base font-bold text-espresso-900">
                Keranjang Pesanan
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                Kosongkan
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="py-10 text-center bg-cream-50 rounded-xl border border-dashed border-espresso-200">
              <ShoppingCart className="w-7 h-7 text-espresso-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-espresso-800">
                Keranjang Masih Kosong
              </p>
              <p className="text-xs text-espresso-600 mt-0.5 px-4">
                Klik tombol harga/varian pada daftar menu di sebelah kiri untuk menambahkan pesanan.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.cart_item_id}
                  className="p-3 rounded-xl bg-cream-50 border border-espresso-100 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-espresso-900 truncate">
                      {item.menu_name}
                    </p>
                    <p className="text-xs text-espresso-600">
                      {item.variant_label} • {formatIDR(item.unit_price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.cart_item_id, -1)}
                      className="w-7 h-7 rounded-lg bg-white border border-espresso-200 flex items-center justify-center hover:bg-espresso-100"
                      aria-label="Kurangi jumlah"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        setDirectQuantity(item.cart_item_id, e.target.value)
                      }
                      className="w-11 text-center text-xs font-bold py-1 rounded-lg border border-espresso-200 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.cart_item_id, 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-espresso-200 flex items-center justify-center hover:bg-espresso-100"
                      aria-label="Tambah jumlah"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right min-w-[78px]">
                    <p className="text-xs font-bold text-espresso-900">
                      {formatIDR(item.line_total)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cart_item_id)}
                      className="text-[11px] text-rose-600 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subtotal & Total */}
          <div className="border-t border-espresso-200 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-espresso-600 text-xs">
              <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} item)</span>
              <span>{formatIDR(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-espresso-900">
              <span>Total Tagihan</span>
              <span className="text-caramel-600">{formatIDR(cartTotal)}</span>
            </div>
          </div>

          {/* Payment Fields */}
          <div className="space-y-3 pt-2 border-t border-espresso-100">
            <div>
              <label className="block text-xs font-semibold text-espresso-800 mb-1">
                Metode Pembayaran
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["TUNAI", "QRIS", "TRANSFER"] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method !== "TUNAI") {
                        setAmountPaidInput(String(cartTotal));
                      }
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      paymentMethod === method
                        ? "bg-espresso-900 text-cream-50 border-espresso-900"
                        : "bg-cream-50 text-espresso-800 border-espresso-200 hover:bg-espresso-100"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-espresso-800 mb-1">
                Nominal Uang Diterima (Rp)
              </label>
              <input
                type="number"
                min={0}
                step={500}
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                placeholder={
                  cartTotal > 0 ? `Minimal ${cartTotal}` : "Masukkan nominal Rupiah"
                }
                className="w-full px-3.5 py-2 rounded-xl border border-espresso-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-caramel-500"
              />
              {quickCashAmounts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {quickCashAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountPaidInput(String(amt))}
                      className="px-2.5 py-1 rounded-lg bg-cream-100 hover:bg-espresso-200 text-espresso-800 text-xs font-medium"
                    >
                      {amt === cartTotal ? "Uang Pas" : formatIDR(amt)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-cream-100 border border-espresso-200">
              <span className="text-xs font-semibold text-espresso-800">
                Uang Kembalian
              </span>
              <span className="text-sm font-bold text-emerald-700">
                {formatIDR(changeAmount)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-espresso-800 mb-1">
                Catatan Pesanan / Pelanggan (Opsional)
              </label>
              <input
                type="text"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Contoh: Meja 3 / Bungkus / Kurangi gula"
                className="w-full px-3 py-2 rounded-xl border border-espresso-200 text-xs focus:outline-none focus:ring-2 focus:ring-caramel-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-espresso-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={markAsDemo}
                onChange={(e) => setMarkAsDemo(e.target.checked)}
                className="rounded border-espresso-300 text-caramel-600 focus:ring-caramel-500"
              />
              <span>Tandai transaksi ini sebagai data DEMO / Pengujian</span>
            </label>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleOpenConfirmation}
              className="w-full py-3 rounded-xl bg-caramel-600 hover:bg-caramel-500 disabled:bg-espresso-200 disabled:text-espresso-400 text-white font-bold text-sm transition shadow-sm"
            >
              Lanjut Konfirmasi Penjualan
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: KONFIRMASI PENJUALAN SEBELUM DISIMPAN                        */}
      {/* ==================================================================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-espresso-200 space-y-4">
            <div className="flex items-center justify-between border-b border-espresso-100 pb-3">
              <h3 className="text-base font-bold text-espresso-900">
                Konfirmasi Penyimpanan Transaksi
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-lg hover:bg-espresso-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-espresso-600">
              Periksa rincian pesanan di bawah ini. Transaksi baru akan dicatat ke dalam pembukuan setelah Anda menekan tombol <strong>Konfirmasi & Simpan</strong>.
            </p>

            <div className="bg-cream-50 rounded-xl p-3.5 border border-espresso-200 space-y-2 max-h-56 overflow-y-auto text-xs">
              {cart.map((item) => (
                <div key={item.cart_item_id} className="flex justify-between">
                  <span>
                    {item.quantity}x {item.menu_name} ({item.variant_label})
                  </span>
                  <span className="font-semibold">{formatIDR(item.line_total)}</span>
                </div>
              ))}
              <div className="border-t border-espresso-200 pt-2 flex justify-between font-bold text-sm text-espresso-900">
                <span>Total Pembayaran</span>
                <span>{formatIDR(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-espresso-700">
                <span>Metode ({paymentMethod}) • Dibayar</span>
                <span>{formatIDR(parsedAmountPaid)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Kembalian</span>
                <span>{formatIDR(changeAmount)}</span>
              </div>
              {markAsDemo && (
                <div className="pt-1">
                  <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-bold text-[10px]">
                    LABEL: DATA DEMO / UJI
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-espresso-300 text-espresso-800 text-xs font-semibold hover:bg-espresso-50"
              >
                Kembali Ubah
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmAndSave}
                className="px-5 py-2 rounded-xl bg-espresso-900 hover:bg-espresso-800 text-cream-50 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSaving ? "Menyimpan..." : "Konfirmasi & Simpan Transaksi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: STRUK PEMBAYARAN SIAP CETAK (PRINTABLE RECEIPT)              */}
      {/* ==================================================================== */}
      {savedReceiptTx && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-espresso-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Transaksi Berhasil Disimpan
              </span>
              <button
                type="button"
                onClick={() => setSavedReceiptTx(null)}
                className="p-1 rounded-lg hover:bg-espresso-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Container */}
            <div
              id="printable-receipt"
              className="bg-cream-50 border border-espresso-200 rounded-xl p-4 font-mono text-xs space-y-2.5 text-espresso-900"
            >
              <div className="text-center border-b border-dashed border-espresso-300 pb-2">
                <p className="font-bold text-sm">WARCOFFE 13</p>
                <p className="text-[11px] text-espresso-600">
                  Struk Pembayaran Pelanggan
                </p>
                {savedReceiptTx.is_demo && (
                  <p className="text-[10px] font-bold bg-amber-200 text-amber-950 inline-block px-2 py-0.5 rounded mt-1">
                    [TRANSAKSI DEMO / DATA UJI]
                  </p>
                )}
              </div>

              <div className="text-[11px] space-y-0.5 border-b border-dashed border-espresso-300 pb-2">
                <div className="flex justify-between">
                  <span>No. Struk:</span>
                  <span className="font-bold">{savedReceiptTx.transaction_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>{formatDateTimeID(savedReceiptTx.transaction_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Metode:</span>
                  <span>{savedReceiptTx.payment_method}</span>
                </div>
              </div>

              <div className="space-y-1.5 border-b border-dashed border-espresso-300 pb-2">
                {savedReceiptTx.items.map((item) => (
                  <div key={item.id}>
                    <div className="font-semibold">
                      {item.menu_name_snapshot}{" "}
                      {item.variant_label !== "Standar"
                        ? `(${item.variant_label})`
                        : ""}
                    </div>
                    <div className="flex justify-between text-[11px] text-espresso-700">
                      <span>
                        {item.quantity} x {formatIDR(item.unit_price)}
                      </span>
                      <span>{formatIDR(item.line_total)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-bold">
                  <span>TOTAL</span>
                  <span>{formatIDR(savedReceiptTx.total_amount)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Dibayar ({savedReceiptTx.payment_method})</span>
                  <span>{formatIDR(savedReceiptTx.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold">
                  <span>Kembali</span>
                  <span>{formatIDR(savedReceiptTx.change_amount)}</span>
                </div>
              </div>

              {savedReceiptTx.customer_note && (
                <div className="text-[11px] border-t border-dashed border-espresso-300 pt-2">
                  Catatan: {savedReceiptTx.customer_note}
                </div>
              )}

              <div className="text-center text-[10px] text-espresso-500 pt-2 border-t border-dashed border-espresso-300">
                Terima kasih telah berkunjung ke Warcoffe 13!
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-espresso-300 text-espresso-900 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-espresso-50"
              >
                <Printer className="w-4 h-4" />
                Cetak Struk
              </button>
              <button
                type="button"
                onClick={() => setSavedReceiptTx(null)}
                className="px-4 py-2 rounded-xl bg-espresso-900 text-cream-50 text-xs font-bold hover:bg-espresso-800"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
