// ============================================================================
// WARCOFFE 13 — AUTOMATED VALIDATION & BUSINESS CALCULATION TESTS
// Capstone Project Asah 2026 | Team ID: A26-CS187
// ============================================================================
// Jalankan dengan: npm test
// Menguji:
// 1. Integritas data seed 57 menu Warcoffe 13 (stok = NULL, varian suhu akurat)
// 2. Validasi input transaksi & pengeluaran (menolak kosong, negatif, huruf)
// 3. Perhitungan rekap bulanan (pemasukan, pengeluaran, selisih bersih = Rp0 diff)
// 4. Evaluasi stok menipis (hanya menghitung stok yang sudah diisi pemilik)
// ============================================================================

import assert from "node:assert/strict";
import {
  INITIAL_MENU_CATEGORIES,
  INITIAL_MENU_ITEMS,
} from "../src/lib/menu-seed-data";
import {
  calculateCartTotal,
  calculateChangeAmount,
  calculateMonthlySummary,
  getLowStockMenuItems,
  validateExpenseInput,
  validateSaleTransactionInput,
} from "../src/lib/calculations";
import { formatIDR, getMenuVariantOptions } from "../src/lib/format";
import {
  isProtectedRoute,
  translateSupabaseAuthError,
  validateOwnerLoginInput,
} from "../src/lib/auth";
import { ExpenseRecord, SalesTransaction } from "../src/types/warcoffe";

function runTests() {
  console.log("Menjalankan pengujian validasi & kalkulasi bisnis Warcoffe 13...\n");

  // 1. Test Menu Seed Integrity (Bagian 2 & 3 Master Prompt)
  assert.equal(
    INITIAL_MENU_CATEGORIES.length,
    3,
    "Harus terdapat tepat 3 kategori menu awal"
  );
  assert.equal(
    INITIAL_MENU_ITEMS.length,
    57,
    "Jumlah entri menu seed harus tepat 57 item"
  );

  const kemasanCount = INITIAL_MENU_ITEMS.filter(
    (m) => m.category_id === "cat-kemasan"
  ).length;
  const racikanCount = INITIAL_MENU_ITEMS.filter(
    (m) => m.category_id === "cat-racikan"
  ).length;
  const makananCount = INITIAL_MENU_ITEMS.filter(
    (m) => m.category_id === "cat-makanan"
  ).length;

  assert.equal(kemasanCount, 20, "Minuman Kemasan harus 20 item");
  assert.equal(racikanCount, 23, "Minuman Racikan / Sachet harus 23 item");
  assert.equal(makananCount, 14, "Makanan harus 14 item");

  // Pastikan seluruh stok awal bernilai null
  for (const item of INITIAL_MENU_ITEMS) {
    assert.equal(
      item.current_stock,
      null,
      `Stok awal untuk ${item.name} harus NULL`
    );
  }

  // Pastikan item dengan suhu tidak disebutkan berstatus UNSPECIFIED
  const unspecifiedNames = [
    "Matcha Zen Latte",
    "Nutrisari",
    "Chocolatos",
    "Mextea Teh Tarik",
    "Beng Beng",
    "Good Day Freeze",
    "Caffelatte",
    "Dalgona",
    "Ovaltine",
    "Bonteh Teh Tarik",
  ];
  for (const name of unspecifiedNames) {
    const found = INITIAL_MENU_ITEMS.find(
      (m) => m.name === name && m.category_id === "cat-racikan"
    );
    assert.ok(found, `Menu ${name} harus ada di kategori racikan`);
    assert.equal(
      found.temperature_mode,
      "UNSPECIFIED",
      `Menu ${name} tidak boleh ditebak suhunya (harus UNSPECIFIED)`
    );
    const variants = getMenuVariantOptions(found);
    assert.equal(variants.length, 1);
    assert.equal(variants[0].variant_key, "UNSPECIFIED");
  }

  // Pastikan Teh Manis memiliki Panas Rp3.000 & Dingin Rp4.000
  const tehManis = INITIAL_MENU_ITEMS.find((m) => m.id === "mr-07");
  assert.ok(tehManis);
  assert.equal(tehManis.temperature_mode, "HOT_COLD");
  assert.equal(tehManis.hot_price, 3000);
  assert.equal(tehManis.cold_price, 4000);

  console.log("✔ [LULUS] Uji 1: Integritas 57 Katalog Menu Seed & Aturan Varian/Stok NULL");

  // 2. Test Input Validation (Sesuai Rencana Pengujian Bab 6)
  const validExp = validateExpenseInput({
    expense_date: "2026-11-20",
    description: "Beli Kopi & Gula",
    category: "Bahan Baku & Kemasan",
    amount: 20000,
  });
  assert.equal(validExp.valid, true);

  const emptyAmountExp = validateExpenseInput({
    expense_date: "2026-11-20",
    description: "Beli Kopi",
    category: "Bahan Baku & Kemasan",
    amount: "",
  });
  assert.equal(emptyAmountExp.valid, false, "Nominal kosong harus ditolak");

  const negativeAmountExp = validateExpenseInput({
    expense_date: "2026-11-20",
    description: "Beli Kopi",
    category: "Bahan Baku & Kemasan",
    amount: -5000,
  });
  assert.equal(negativeAmountExp.valid, false, "Nominal negatif harus ditolak");

  const alphaAmountExp = validateExpenseInput({
    expense_date: "2026-11-20",
    description: "Beli Kopi",
    category: "Bahan Baku & Kemasan",
    amount: "20ribu",
  });
  assert.equal(alphaAmountExp.valid, false, "Nominal berisi huruf harus ditolak");

  const emptyDateExp = validateExpenseInput({
    expense_date: "",
    description: "Beli Kopi",
    category: "Bahan Baku & Kemasan",
    amount: 20000,
  });
  assert.equal(emptyDateExp.valid, false, "Tanggal kosong harus ditolak");

  console.log("✔ [LULUS] Uji 2: Validasi Input Transaksi & Penolakan Nominal Tidak Valid");

  // 3. Test POS Cart & Change Calculation
  const sampleCart = [
    {
      cart_item_id: "mr-06__PANAS",
      menu_item_id: "mr-06",
      menu_name: "Kopi Liong",
      category_id: "cat-racikan",
      category_name: "Minuman Racikan / Sachet",
      variant_key: "PANAS" as const,
      variant_label: "Panas",
      unit_price: 5000,
      quantity: 2,
      line_total: 10000,
    },
    {
      cart_item_id: "fd-03__DEFAULT",
      menu_item_id: "fd-03",
      menu_name: "Indomie Telur",
      category_id: "cat-makanan",
      category_name: "Makanan",
      variant_key: "DEFAULT" as const,
      variant_label: "Standar",
      unit_price: 11000,
      quantity: 1,
      line_total: 11000,
    },
  ];

  const totalCart = calculateCartTotal(sampleCart);
  assert.equal(totalCart, 21000);
  assert.equal(calculateChangeAmount(totalCart, 50000), 29000);

  const underpaidCheck = validateSaleTransactionInput({
    cart: sampleCart,
    paymentMethod: "TUNAI",
    amountPaid: 15000,
  });
  assert.equal(underpaidCheck.valid, false, "Pembayaran kurang dari total harus ditolak");

  console.log("✔ [LULUS] Uji 3: Kalkulasi Keranjang Kasir (POS) & Uang Kembalian");

  // 4. Test Monthly Summary Calculation (Accuracy vs Manual Spreadsheet = Rp0 diff)
  const sampleTransactions: SalesTransaction[] = [
    {
      id: "tx-1",
      transaction_number: "WC13-20261120-1001",
      transaction_date: "2026-11-20T09:00:00.000Z",
      subtotal_amount: 21000,
      total_amount: 21000,
      payment_method: "TUNAI",
      amount_paid: 25000,
      change_amount: 4000,
      customer_note: "",
      source: "POS_MANUAL",
      is_demo: false,
      created_at: "2026-11-20T09:00:00.000Z",
      updated_at: "2026-11-20T09:00:00.000Z",
      items: [
        {
          id: "i-1",
          transaction_id: "tx-1",
          menu_item_id: "mr-06",
          menu_name_snapshot: "Kopi Liong",
          category_name_snapshot: "Minuman Racikan / Sachet",
          variant_label: "Panas",
          unit_price: 5000,
          quantity: 2,
          line_total: 10000,
        },
        {
          id: "i-2",
          transaction_id: "tx-1",
          menu_item_id: "fd-03",
          menu_name_snapshot: "Indomie Telur",
          category_name_snapshot: "Makanan",
          variant_label: "Standar",
          unit_price: 11000,
          quantity: 1,
          line_total: 11000,
        },
      ],
    },
    {
      id: "tx-2",
      transaction_number: "WC13-20261120-1002",
      transaction_date: "2026-11-20T13:00:00.000Z",
      subtotal_amount: 15000,
      total_amount: 15000,
      payment_method: "QRIS",
      amount_paid: 15000,
      change_amount: 0,
      customer_note: "",
      source: "POS_MANUAL",
      is_demo: false,
      created_at: "2026-11-20T13:00:00.000Z",
      updated_at: "2026-11-20T13:00:00.000Z",
      items: [
        {
          id: "i-3",
          transaction_id: "tx-2",
          menu_item_id: "mr-06",
          menu_name_snapshot: "Kopi Liong",
          category_name_snapshot: "Minuman Racikan / Sachet",
          variant_label: "Panas",
          unit_price: 5000,
          quantity: 3,
          line_total: 15000,
        },
      ],
    },
  ];

  const sampleExpenses: ExpenseRecord[] = [
    {
      id: "exp-1",
      expense_date: "2026-11-20",
      description: "Beli Gas Elpiji 3kg",
      category: "Gas, Listrik & Air",
      amount: 22000,
      note: "",
      source: "MANUAL",
      is_demo: false,
      created_at: "2026-11-20T08:00:00.000Z",
      updated_at: "2026-11-20T08:00:00.000Z",
    },
  ];

  const summary = calculateMonthlySummary({
    transactions: sampleTransactions,
    expenses: sampleExpenses,
    monthKey: "2026-11",
    todayDateKey: "2026-11-20",
  });

  assert.equal(summary.monthly_revenue, 36000);
  assert.equal(summary.monthly_expenses, 22000);
  assert.equal(summary.net_difference, 14000);
  assert.equal(summary.monthly_transaction_count, 2);
  assert.equal(summary.top_selling_menus[0].menu_name, "Kopi Liong");
  assert.equal(summary.top_selling_menus[0].total_quantity_sold, 5);

  console.log("✔ [LULUS] Uji 4: Akurasi Rekap Bulanan (Pemasukan, Pengeluaran, Selisih & Menu Terlaris)");

  // 5. Test Low Stock Alert Rule (Null stock must NOT trigger low stock alert)
  const initialLowStock = getLowStockMenuItems(INITIAL_MENU_ITEMS);
  assert.equal(
    initialLowStock.length,
    0,
    "Menu dengan stok NULL tidak boleh memicu peringatan stok menipis"
  );

  const modifiedMenu = INITIAL_MENU_ITEMS.map((m, idx) =>
    idx === 0 ? { ...m, current_stock: 3, min_stock_threshold: 5 } : m
  );
  const afterOwnerEnteredStock = getLowStockMenuItems(modifiedMenu);
  assert.equal(afterOwnerEnteredStock.length, 1);
  assert.equal(afterOwnerEnteredStock[0].id, "mk-01");

  assert.equal(formatIDR(11000), "Rp11.000");

  console.log("✔ [LULUS] Uji 5: Evaluasi Peringatan Stok Menipis & Format Rupiah (id-ID)");

  // 6. Test Owner-Only Authentication Validation & Route Protection Rules
  assert.equal(isProtectedRoute("/"), false, "Root URL '/' harus berupa halaman login publik");
  assert.equal(isProtectedRoute("/dashboard"), true, "/dashboard wajib diproteksi");
  assert.equal(isProtectedRoute("/pos"), true, "/pos wajib diproteksi");
  assert.equal(isProtectedRoute("/transactions"), true, "/transactions wajib diproteksi");
  assert.equal(isProtectedRoute("/menu"), true, "/menu wajib diproteksi");
  assert.equal(isProtectedRoute("/stock"), true, "/stock wajib diproteksi");
  assert.equal(isProtectedRoute("/expenses"), true, "/expenses wajib diproteksi");
  assert.equal(isProtectedRoute("/reports"), true, "/reports wajib diproteksi");
  assert.equal(isProtectedRoute("/ai-assistant"), true, "/ai-assistant wajib diproteksi");

  assert.equal(validateOwnerLoginInput("", "secret").valid, false, "Email kosong harus ditolak");
  assert.equal(validateOwnerLoginInput("bukan-email", "secret").valid, false, "Format email salah harus ditolak");
  assert.equal(validateOwnerLoginInput("owner@warcoffe13.id", "").valid, false, "Password kosong harus ditolak");
  assert.equal(validateOwnerLoginInput("owner@warcoffe13.id", "rahasia123").valid, true, "Input kredensial valid harus diterima");

  const invalidCredMsg = translateSupabaseAuthError("Invalid login credentials");
  assert.ok(invalidCredMsg.includes("Email atau kata sandi salah"));
  const expiredMsg = translateSupabaseAuthError("JWT expired");
  assert.ok(expiredMsg.includes("Sesi login Anda telah berakhir"));

  console.log("✔ [LULUS] Uji 6: Alur Autentikasi Owner-Only, Proteksi Rute, & Penanganan Kredensial/Sesi");
  console.log("\nSEMUA PENGUJIAN LULUS DENGAN SUKSES!");
}

runTests();
