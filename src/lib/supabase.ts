// ============================================================================
// WARCOFFE 13 — SUPABASE CLIENT & PERSISTENCE ADAPTER
// Capstone Project Asah 2026 | Team ID: A26-CS187
// ============================================================================
// Mendukung 2 mode penyimpanan:
// 1. SUPABASE CLOUD MODE: Jika NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY tersedia.
// 2. LOCAL FALLBACK MODE: Jika kredensial belum dikonfigurasi, data disimpan
//    secara persisten di browser localStorage dengan seed 57 katalog menu Warcoffe 13
//    dan 0 transaksi/0 pengeluaran/stok NULL (tanpa data palsu).
// ============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  ExpenseRecord,
  MenuCategory,
  MenuItem,
  SalesTransaction,
  SalesTransactionItem,
  StockMovement,
} from "@/types/warcoffe";
import { INITIAL_MENU_CATEGORIES, INITIAL_MENU_ITEMS } from "@/lib/menu-seed-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabasePublicKey &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-project")
);

export const supabaseClient: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublicKey)
  : null;

const STORAGE_KEYS = {
  CATEGORIES: "warcoffe13_menu_categories_v1",
  MENU_ITEMS: "warcoffe13_menu_items_v1",
  TRANSACTIONS: "warcoffe13_sales_transactions_v1",
  EXPENSES: "warcoffe13_expenses_v1",
  STOCK_MOVEMENTS: "warcoffe13_stock_movements_v1",
};

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("Failed writing to localStorage:", err);
  }
}

export interface InitialAppData {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  transactions: SalesTransaction[];
  expenses: ExpenseRecord[];
  stockMovements: StockMovement[];
  storageMode: "SUPABASE" | "LOCAL_FALLBACK";
  connectionWarning?: string;
}

/**
 * Memuat seluruh data aplikasi dari Supabase (jika dikonfigurasi) atau Local Fallback.
 */
export async function loadAllWarcoffeData(): Promise<InitialAppData> {
  // Inisialisasi seed katalog menu lokal jika belum ada
  const localCategories = readLocal<MenuCategory[]>(
    STORAGE_KEYS.CATEGORIES,
    INITIAL_MENU_CATEGORIES
  );
  const localMenu = readLocal<MenuItem[]>(STORAGE_KEYS.MENU_ITEMS, INITIAL_MENU_ITEMS);
  const localTransactions = readLocal<SalesTransaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  const localExpenses = readLocal<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES, []);
  const localStockMovements = readLocal<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, []);

  if (typeof window !== "undefined") {
    if (!window.localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      writeLocal(STORAGE_KEYS.CATEGORIES, INITIAL_MENU_CATEGORIES);
    }
    if (!window.localStorage.getItem(STORAGE_KEYS.MENU_ITEMS)) {
      writeLocal(STORAGE_KEYS.MENU_ITEMS, INITIAL_MENU_ITEMS);
    }
  }

  if (!supabaseClient) {
    return {
      categories: localCategories,
      menuItems: localMenu,
      transactions: localTransactions,
      expenses: localExpenses,
      stockMovements: localStockMovements,
      storageMode: "LOCAL_FALLBACK",
    };
  }

  try {
    const [catRes, menuRes, txRes, txItemsRes, expRes, stockRes] = await Promise.all([
      supabaseClient.from("menu_categories").select("*").order("sort_order", { ascending: true }),
      supabaseClient.from("menu_items").select("*").order("id", { ascending: true }),
      supabaseClient
        .from("sales_transactions")
        .select("*")
        .order("transaction_date", { ascending: false }),
      supabaseClient.from("sales_transaction_items").select("*"),
      supabaseClient.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabaseClient
        .from("stock_movements")
        .select("*")
        .order("movement_date", { ascending: false }),
    ]);

    if (catRes.error || menuRes.error || txRes.error || expRes.error || stockRes.error) {
      const errMsg =
        catRes.error?.message ||
        menuRes.error?.message ||
        txRes.error?.message ||
        expRes.error?.message ||
        stockRes.error?.message ||
        "Gagal terhubung ke tabel Supabase";

      return {
        categories: localCategories,
        menuItems: localMenu,
        transactions: localTransactions,
        expenses: localExpenses,
        stockMovements: localStockMovements,
        storageMode: "LOCAL_FALLBACK",
        connectionWarning: `Supabase belum di-migrasi atau tidak dapat diakses (${errMsg}). Menggunakan penyimpanan lokal.`,
      };
    }

    const categories: MenuCategory[] =
      catRes.data && catRes.data.length > 0
        ? (catRes.data as MenuCategory[])
        : INITIAL_MENU_CATEGORIES;

    const menuItems: MenuItem[] =
      menuRes.data && menuRes.data.length > 0
        ? (menuRes.data as MenuItem[])
        : INITIAL_MENU_ITEMS;

    const allTxItems = (txItemsRes.data || []) as SalesTransactionItem[];
    const itemsByTx = new Map<string, SalesTransactionItem[]>();
    for (const item of allTxItems) {
      const list = itemsByTx.get(item.transaction_id) || [];
      list.push(item);
      itemsByTx.set(item.transaction_id, list);
    }

    const transactions: SalesTransaction[] = (txRes.data || []).map((row) => ({
      ...(row as Omit<SalesTransaction, "items">),
      items: itemsByTx.get(row.id) || [],
    }));

    return {
      categories,
      menuItems,
      transactions,
      expenses: (expRes.data || []) as ExpenseRecord[],
      stockMovements: (stockRes.data || []) as StockMovement[],
      storageMode: "SUPABASE",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Supabase error";
    return {
      categories: localCategories,
      menuItems: localMenu,
      transactions: localTransactions,
      expenses: localExpenses,
      stockMovements: localStockMovements,
      storageMode: "LOCAL_FALLBACK",
      connectionWarning: `Koneksi Supabase gagal (${message}). Menggunakan penyimpanan lokal.`,
    };
  }
}

export function persistLocalState(state: {
  categories?: MenuCategory[];
  menuItems?: MenuItem[];
  transactions?: SalesTransaction[];
  expenses?: ExpenseRecord[];
  stockMovements?: StockMovement[];
}) {
  if (state.categories) writeLocal(STORAGE_KEYS.CATEGORIES, state.categories);
  if (state.menuItems) writeLocal(STORAGE_KEYS.MENU_ITEMS, state.menuItems);
  if (state.transactions) writeLocal(STORAGE_KEYS.TRANSACTIONS, state.transactions);
  if (state.expenses) writeLocal(STORAGE_KEYS.EXPENSES, state.expenses);
  if (state.stockMovements) writeLocal(STORAGE_KEYS.STOCK_MOVEMENTS, state.stockMovements);
}
