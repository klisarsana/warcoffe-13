// ============================================================================
// WARCOFFE 13 — BUSINESS CALCULATIONS & INPUT VALIDATION
// Capstone Project Asah 2026 | Team ID: A26-CS187
// ============================================================================
// Semua perhitungan rekap dan dashboard bersumber murni dari record transaksi
// dan pengeluaran yang tersimpan. Tidak ada angka yang di-hardcode.
// ============================================================================

import {
  CartItem,
  DailyTrendPoint,
  ExpenseRecord,
  MenuItem,
  MonthlySummaryReport,
  PaymentMethod,
  SalesTransaction,
  TopSellingMenuSummary,
} from "@/types/warcoffe";
import { getLocalDateKey } from "@/lib/format";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validasi transaksi penjualan POS sebelum disimpan
 */
export function validateSaleTransactionInput(params: {
  cart: CartItem[];
  paymentMethod: PaymentMethod;
  amountPaid: number;
}): ValidationResult {
  const errors: string[] = [];

  if (!params.cart || params.cart.length === 0) {
    errors.push("Keranjang belanja masih kosong. Pilih minimal 1 item menu.");
  }

  for (const item of params.cart) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      errors.push(`Jumlah untuk "${item.menu_name}" harus bilangan bulat lebih dari 0.`);
    }
    if (!Number.isInteger(item.unit_price) || item.unit_price <= 0) {
      errors.push(`Harga satuan untuk "${item.menu_name}" tidak valid.`);
    }
  }

  const totalAmount = calculateCartTotal(params.cart);

  if (!["TUNAI", "QRIS", "TRANSFER"].includes(params.paymentMethod)) {
    errors.push("Metode pembayaran tidak valid.");
  }

  if (
    typeof params.amountPaid !== "number" ||
    Number.isNaN(params.amountPaid) ||
    !Number.isInteger(params.amountPaid) ||
    params.amountPaid < 0
  ) {
    errors.push("Nominal uang dibayar harus berupa angka Rupiah bulat yang valid.");
  } else if (params.amountPaid < totalAmount) {
    errors.push(
      `Nominal dibayar (Rp${params.amountPaid.toLocaleString("id-ID")}) kurang dari total belanja (Rp${totalAmount.toLocaleString("id-ID")}).`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validasi input pengeluaran (Expense) sesuai Rencana Pengujian:
 * Menolak nominal kosong, negatif, nol, bukan angka, atau tanggal/deskripsi kosong.
 */
export function validateExpenseInput(params: {
  expense_date: string;
  description: string;
  category: string;
  amount: number | string;
}): ValidationResult {
  const errors: string[] = [];

  if (!params.expense_date || !/^\d{4}-\d{2}-\d{2}$/.test(params.expense_date.trim())) {
    errors.push("Tanggal pengeluaran wajib diisi dengan format yang benar (YYYY-MM-DD).");
  }

  if (!params.description || params.description.trim().length < 2) {
    errors.push("Deskripsi pengeluaran wajib diisi (minimal 2 karakter).");
  }

  if (!params.category || params.category.trim().length === 0) {
    errors.push("Kategori pengeluaran wajib dipilih.");
  }

  const rawAmount =
    typeof params.amount === "string" ? params.amount.trim() : String(params.amount ?? "");

  if (rawAmount === "") {
    errors.push("Nominal pengeluaran tidak boleh kosong.");
  } else if (!/^-?\d+$/.test(rawAmount)) {
    errors.push("Nominal pengeluaran harus berupa angka bulat Rupiah tanpa huruf/simbol.");
  } else {
    const parsed = Number(rawAmount);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      errors.push("Nominal pengeluaran harus lebih besar dari Rp0 (tidak boleh nol atau negatif).");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validasi input item menu baru atau edit menu
 */
export function validateMenuItemInput(item: Partial<MenuItem>): ValidationResult {
  const errors: string[] = [];

  if (!item.name || item.name.trim().length < 2) {
    errors.push("Nama menu wajib diisi (minimal 2 karakter).");
  }
  if (!item.category_id || item.category_id.trim().length === 0) {
    errors.push("Kategori menu wajib dipilih.");
  }

  const mode = item.temperature_mode;
  if (!mode || !["NONE", "HOT_ONLY", "HOT_COLD", "UNSPECIFIED"].includes(mode)) {
    errors.push("Pengaturan variasi suhu tidak valid.");
  } else if (mode === "NONE" || mode === "UNSPECIFIED") {
    if (
      item.default_price === null ||
      item.default_price === undefined ||
      !Number.isInteger(item.default_price) ||
      item.default_price <= 0
    ) {
      errors.push("Harga menu harus berupa angka bulat Rupiah lebih dari Rp0.");
    }
  } else if (mode === "HOT_ONLY") {
    if (
      item.hot_price === null ||
      item.hot_price === undefined ||
      !Number.isInteger(item.hot_price) ||
      item.hot_price <= 0
    ) {
      errors.push("Harga varian Panas wajib diisi dengan angka bulat Rupiah lebih dari Rp0.");
    }
  } else if (mode === "HOT_COLD") {
    if (
      item.hot_price === null ||
      item.hot_price === undefined ||
      !Number.isInteger(item.hot_price) ||
      item.hot_price <= 0
    ) {
      errors.push("Harga varian Panas wajib diisi untuk menu Panas & Dingin.");
    }
    if (
      item.cold_price === null ||
      item.cold_price === undefined ||
      !Number.isInteger(item.cold_price) ||
      item.cold_price <= 0
    ) {
      errors.push("Harga varian Dingin wajib diisi untuk menu Panas & Dingin.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Hitung total keranjang belanja
 */
export function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
}

/**
 * Hitung uang kembalian
 */
export function calculateChangeAmount(totalAmount: number, amountPaid: number): number {
  if (amountPaid < totalAmount) return 0;
  return amountPaid - totalAmount;
}

/**
 * Mendapatkan daftar item dengan stok menipis.
 * PENTING: Hanya memeriksa item yang stoknya SUDAH DIISI oleh pemilik (current_stock !== null).
 * Jika current_stock === null (unknown), item TIDAK dianggap low-stock.
 */
export function getLowStockMenuItems(menuItems: MenuItem[]): MenuItem[] {
  return menuItems.filter((item) => {
    if (!item.is_active) return false;
    if (item.current_stock === null || item.current_stock === undefined) return false;
    const threshold = item.min_stock_threshold ?? 5;
    return item.current_stock <= threshold;
  });
}

/**
 * Hitung laporan rekapitulasi bulanan dan dashboard dari data transaksi & pengeluaran yang tersimpan.
 */
export function calculateMonthlySummary(params: {
  transactions: SalesTransaction[];
  expenses: ExpenseRecord[];
  monthKey: string; // YYYY-MM
  todayDateKey?: string; // YYYY-MM-DD
}): MonthlySummaryReport {
  const todayKey = params.todayDateKey ?? getLocalDateKey();

  // Transaksi hari ini
  const todayTransactions = params.transactions.filter((tx) => {
    const txDateKey = tx.transaction_date.slice(0, 10);
    return txDateKey === todayKey;
  });
  const today_revenue = todayTransactions.reduce((sum, tx) => sum + tx.total_amount, 0);
  const today_transaction_count = todayTransactions.length;

  // Filter transaksi bulan terpilih
  const monthTransactions = params.transactions.filter(
    (tx) => tx.transaction_date.slice(0, 7) === params.monthKey
  );

  // Filter pengeluaran bulan terpilih
  const monthExpenses = params.expenses.filter(
    (exp) => exp.expense_date.slice(0, 7) === params.monthKey
  );

  const monthly_revenue = monthTransactions.reduce((sum, tx) => sum + tx.total_amount, 0);
  const monthly_expenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const net_difference = monthly_revenue - monthly_expenses;

  const has_demo_data =
    monthTransactions.some((t) => t.is_demo) || monthExpenses.some((e) => e.is_demo);

  // Hitung produk terlaris hanya berdasarkan transaksi tersimpan pada bulan tersebut
  const menuStatsMap = new Map<string, TopSellingMenuSummary>();

  for (const tx of monthTransactions) {
    for (const item of tx.items) {
      const key = item.menu_item_id || item.menu_name_snapshot;
      const existing = menuStatsMap.get(key);
      if (existing) {
        existing.total_quantity_sold += item.quantity;
        existing.total_revenue += item.line_total;
      } else {
        menuStatsMap.set(key, {
          menu_item_id: key,
          menu_name: item.menu_name_snapshot,
          category_name: item.category_name_snapshot,
          total_quantity_sold: item.quantity,
          total_revenue: item.line_total,
        });
      }
    }
  }

  const top_selling_menus = Array.from(menuStatsMap.values()).sort((a, b) => {
    if (b.total_quantity_sold !== a.total_quantity_sold) {
      return b.total_quantity_sold - a.total_quantity_sold;
    }
    return b.total_revenue - a.total_revenue;
  });

  // Hitung tren harian pada bulan tersebut (hanya tanggal yang memiliki aktivitas atau rentang tanggal aktif)
  const dailyMap = new Map<string, DailyTrendPoint>();

  const ensureDay = (dateStr: string): DailyTrendPoint => {
    const existing = dailyMap.get(dateStr);
    if (existing) return existing;
    const d = new Date(`${dateStr}T00:00:00`);
    const label = Number.isNaN(d.getTime())
      ? dateStr.slice(8, 10)
      : new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(d);
    const created: DailyTrendPoint = {
      date: dateStr,
      label,
      revenue: 0,
      expenses: 0,
      net_difference: 0,
      transaction_count: 0,
    };
    dailyMap.set(dateStr, created);
    return created;
  };

  for (const tx of monthTransactions) {
    const dayKey = tx.transaction_date.slice(0, 10);
    const point = ensureDay(dayKey);
    point.revenue += tx.total_amount;
    point.transaction_count += 1;
    point.net_difference = point.revenue - point.expenses;
  }

  for (const exp of monthExpenses) {
    const dayKey = exp.expense_date.slice(0, 10);
    const point = ensureDay(dayKey);
    point.expenses += exp.amount;
    point.net_difference = point.revenue - point.expenses;
  }

  const daily_trends = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return {
    month_key: params.monthKey,
    today_revenue,
    today_transaction_count,
    monthly_revenue,
    monthly_expenses,
    net_difference,
    monthly_transaction_count: monthTransactions.length,
    monthly_expense_count: monthExpenses.length,
    has_demo_data,
    daily_trends,
    top_selling_menus,
  };
}
