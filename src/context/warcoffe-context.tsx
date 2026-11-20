"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  CartItem,
  ExpenseRecord,
  MenuCategory,
  MenuItem,
  PaymentMethod,
  SalesTransaction,
  SalesTransactionItem,
  StockMovement,
  StockMovementType,
  TransactionSource,
  ExpenseSource,
} from "@/types/warcoffe";
import { INITIAL_MENU_CATEGORIES, INITIAL_MENU_ITEMS } from "@/lib/menu-seed-data";
import {
  loadAllWarcoffeData,
  persistLocalState,
  supabaseClient,
} from "@/lib/supabase";
import {
  calculateCartTotal,
  calculateChangeAmount,
  validateExpenseInput,
  validateMenuItemInput,
  validateSaleTransactionInput,
} from "@/lib/calculations";
import { useAuth } from "@/context/auth-context";

interface CreateSaleParams {
  cart: CartItem[];
  paymentMethod: PaymentMethod;
  amountPaid: number;
  customerNote?: string;
  transactionDate?: string;
  source?: TransactionSource;
  isDemo?: boolean;
}

interface UpdateSaleParams {
  id: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  customerNote: string;
  transactionDate: string;
  items: SalesTransactionItem[];
}

interface CreateExpenseParams {
  expense_date: string;
  description: string;
  category: string;
  amount: number;
  note?: string;
  source?: ExpenseSource;
  is_demo?: boolean;
}

interface RecordStockMovementParams {
  menu_item_id: string;
  movement_type: StockMovementType;
  quantity_input: number;
  reason: string;
  note?: string;
  min_stock_threshold?: number | null;
}

interface WarcoffeContextValue {
  isLoading: boolean;
  storageMode: "SUPABASE" | "LOCAL_FALLBACK";
  connectionWarning?: string;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  transactions: SalesTransaction[];
  expenses: ExpenseRecord[];
  stockMovements: StockMovement[];

  // Menu & Category CRUD
  createCategory: (name: string) => Promise<{ ok: boolean; error?: string }>;
  updateCategory: (id: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  deleteCategory: (id: string) => Promise<{ ok: boolean; error?: string }>;
  createMenuItem: (item: Omit<MenuItem, "id">) => Promise<{ ok: boolean; error?: string }>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<{ ok: boolean; error?: string }>;
  deleteMenuItem: (id: string) => Promise<{ ok: boolean; error?: string }>;
  resetMenuToOfficialSeed: () => Promise<void>;

  // POS & Sales Transactions CRUD
  createSaleTransaction: (
    params: CreateSaleParams
  ) => Promise<{ ok: boolean; transaction?: SalesTransaction; errors?: string[] }>;
  updateSaleTransaction: (
    params: UpdateSaleParams
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteSaleTransaction: (id: string) => Promise<{ ok: boolean; error?: string }>;

  // Expenses CRUD
  createExpense: (
    params: CreateExpenseParams
  ) => Promise<{ ok: boolean; expense?: ExpenseRecord; errors?: string[] }>;
  updateExpense: (
    id: string,
    params: CreateExpenseParams
  ) => Promise<{ ok: boolean; errors?: string[] }>;
  deleteExpense: (id: string) => Promise<{ ok: boolean; error?: string }>;

  // Stock Management
  recordStockMovement: (
    params: RecordStockMovementParams
  ) => Promise<{ ok: boolean; error?: string }>;
  updateStockThreshold: (
    menuItemId: string,
    minThreshold: number | null,
    unit?: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

const WarcoffeContext = createContext<WarcoffeContextValue | null>(null);

export function WarcoffeProvider({ children }: { children: React.ReactNode }) {
  const { authStatus } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storageMode, setStorageMode] = useState<"SUPABASE" | "LOCAL_FALLBACK">("LOCAL_FALLBACK");
  const [connectionWarning, setConnectionWarning] = useState<string | undefined>(undefined);

  // Do NOT expose business data to unauthenticated users
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  useEffect(() => {
    let mounted = true;

    if (authStatus !== "AUTHENTICATED") {
      // Clear all in-memory business data when user is not authenticated
      setCategories([]);
      setMenuItems([]);
      setTransactions([]);
      setExpenses([]);
      setStockMovements([]);
      setIsLoading(authStatus === "LOADING");
      return () => {
        mounted = false;
      };
    }

    setIsLoading(true);
    loadAllWarcoffeData()
      .then((data) => {
        if (!mounted) return;
        setCategories(data.categories);
        setMenuItems(data.menuItems);
        setTransactions(data.transactions);
        setExpenses(data.expenses);
        setStockMovements(data.stockMovements);
        setStorageMode(data.storageMode);
        setConnectionWarning(data.connectionWarning);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [authStatus]);

  // ==========================================================================
  // 1. CATEGORIES & MENU MANAGEMENT
  // ==========================================================================

  const createCategory = async (name: string): Promise<{ ok: boolean; error?: string }> => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return { ok: false, error: "Nama kategori minimal 2 karakter." };
    }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, error: "Kategori dengan nama tersebut sudah ada." };
    }
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const newCat: MenuCategory = {
      id: `cat-${Date.now()}`,
      name: trimmed,
      slug: slug || `cat-${Date.now()}`,
      sort_order: categories.length + 1,
    };

    if (storageMode === "SUPABASE" && supabaseClient) {
      const { error } = await supabaseClient.from("menu_categories").insert(newCat);
      if (error) return { ok: false, error: error.message };
    }

    const updated = [...categories, newCat];
    setCategories(updated);
    persistLocalState({ categories: updated });
    return { ok: true };
  };

  const updateCategory = async (
    id: string,
    name: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return { ok: false, error: "Nama kategori minimal 2 karakter." };
    }
    if (storageMode === "SUPABASE" && supabaseClient) {
      const { error } = await supabaseClient
        .from("menu_categories")
        .update({ name: trimmed })
        .eq("id", id);
      if (error) return { ok: false, error: error.message };
    }

    const updated = categories.map((c) => (c.id === id ? { ...c, name: trimmed } : c));
    setCategories(updated);
    persistLocalState({ categories: updated });
    return { ok: true };
  };

  const deleteCategory = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    const hasItems = menuItems.some((m) => m.category_id === id);
    if (hasItems) {
      return {
        ok: false,
        error: "Kategori tidak dapat dihapus karena masih memiliki item menu. Pindahkan atau hapus item menu terlebih dahulu.",
      };
    }

    if (storageMode === "SUPABASE" && supabaseClient) {
      const { error } = await supabaseClient.from("menu_categories").delete().eq("id", id);
      if (error) return { ok: false, error: error.message };
    }

    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    persistLocalState({ categories: updated });
    return { ok: true };
  };

  const createMenuItem = async (
    item: Omit<MenuItem, "id">
  ): Promise<{ ok: boolean; error?: string }> => {
    const validation = validateMenuItemInput(item);
    if (!validation.valid) {
      return { ok: false, error: validation.errors.join(" ") };
    }

    const newItem: MenuItem = {
      ...item,
      id: `menu-${Date.now()}`,
      name: item.name.trim(),
      description: item.description?.trim() || "",
      notes: item.notes?.trim() || "",
      stock_unit: item.stock_unit?.trim() || "pcs",
      updated_at: new Date().toISOString(),
    };

    if (storageMode === "SUPABASE" && supabaseClient) {
      const { error } = await supabaseClient.from("menu_items").insert(newItem);
      if (error) return { ok: false, error: error.message };
    }

    const updated = [...menuItems, newItem];
    setMenuItems(updated);
    persistLocalState({ menuItems: updated });
    return { ok: true };
  };

  const updateMenuItem = async (
    id: string,
    updates: Partial<MenuItem>
  ): Promise<{ ok: boolean; error?: string }> => {
    const existing = menuItems.find((m) => m.id === id);
    if (!existing) return { ok: false, error: "Item menu tidak ditemukan." };

    const merged: MenuItem = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const validation = validateMenuItemInput(merged);
    if (!validation.valid) {
      return { ok: false, error: validation.errors.join(" ") };
    }

    if (storageMode === "SUPABASE" && supabaseClient) {
      const { error } = await supabaseClient.from("menu_items").update(merged).eq("id", id);
      if (error) return { ok: false, error: error.message };
    }

    const updated = menuItems.map((m) => (m.id === id ? merged : m));
    setMenuItems(updated);
    persistLocalState({ menuItems: updated });
    return { ok: true };
  };

  const deleteMenuItem = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    if (storageMode === "SUPABASE" && supabaseClient) {
      const { error } = await supabaseClient.from("menu_items").delete().eq("id", id);
      if (error) return { ok: false, error: error.message };
    }

    const updated = menuItems.filter((m) => m.id !== id);
    setMenuItems(updated);
    persistLocalState({ menuItems: updated });
    return { ok: true };
  };

  const resetMenuToOfficialSeed = async (): Promise<void> => {
    setCategories(INITIAL_MENU_CATEGORIES);
    setMenuItems(INITIAL_MENU_ITEMS);
    persistLocalState({
      categories: INITIAL_MENU_CATEGORIES,
      menuItems: INITIAL_MENU_ITEMS,
    });
  };

  // ==========================================================================
  // 2. POS & SALES TRANSACTIONS
  // ==========================================================================

  const createSaleTransaction = async (
    params: CreateSaleParams
  ): Promise<{ ok: boolean; transaction?: SalesTransaction; errors?: string[] }> => {
    const validation = validateSaleTransactionInput({
      cart: params.cart,
      paymentMethod: params.paymentMethod,
      amountPaid: params.amountPaid,
    });

    if (!validation.valid) {
      return { ok: false, errors: validation.errors };
    }

    const nowIso = params.transactionDate || new Date().toISOString();
    const txId = `tx-${Date.now()}`;
    const datePart = nowIso.slice(0, 10).replace(/-/g, "");
    const randomPart = String(Math.floor(1000 + Math.random() * 9000));
    const txNumber = `WC13-${datePart}-${randomPart}`;

    const totalAmount = calculateCartTotal(params.cart);
    const changeAmount = calculateChangeAmount(totalAmount, params.amountPaid);

    const txItems: SalesTransactionItem[] = params.cart.map((c, idx) => ({
      id: `${txId}-item-${idx + 1}`,
      transaction_id: txId,
      menu_item_id: c.menu_item_id,
      menu_name_snapshot: c.menu_name,
      category_name_snapshot: c.category_name,
      variant_label: c.variant_label,
      unit_price: c.unit_price,
      quantity: c.quantity,
      line_total: c.unit_price * c.quantity,
    }));

    const newTransaction: SalesTransaction = {
      id: txId,
      transaction_number: txNumber,
      transaction_date: nowIso,
      subtotal_amount: totalAmount,
      total_amount: totalAmount,
      payment_method: params.paymentMethod,
      amount_paid: params.amountPaid,
      change_amount: changeAmount,
      customer_note: params.customerNote?.trim() || "",
      source: params.source || "POS_MANUAL",
      is_demo: Boolean(params.isDemo),
      items: txItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (storageMode === "SUPABASE" && supabaseClient) {
      const { items, ...headerRow } = newTransaction;
      const { error: txError } = await supabaseClient
        .from("sales_transactions")
        .insert(headerRow);
      if (txError) return { ok: false, errors: [txError.message] };

      const { error: itemError } = await supabaseClient
        .from("sales_transaction_items")
        .insert(items);
      if (itemError) return { ok: false, errors: [itemError.message] };
    }

    const updated = [newTransaction, ...transactions];
    setTransactions(updated);
    persistLocalState({ transactions: updated });
    return { ok: true, transaction: newTransaction };
  };

  const updateSaleTransaction = async (
    params: UpdateSaleParams
  ): Promise<{ ok: boolean; error?: string }> => {
    const existing = transactions.find((t) => t.id === params.id);
    if (!existing) return { ok: false, error: "Transaksi tidak ditemukan." };

    if (!params.items || params.items.length === 0) {
      return { ok: false, error: "Transaksi harus memiliki minimal 1 item." };
    }

    for (const item of params.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return { ok: false, error: `Jumlah item "${item.menu_name_snapshot}" harus lebih dari 0.` };
      }
      if (!Number.isInteger(item.unit_price) || item.unit_price <= 0) {
        return { ok: false, error: `Harga item "${item.menu_name_snapshot}" tidak valid.` };
      }
    }

    const recalculatedItems = params.items.map((item) => ({
      ...item,
      line_total: item.unit_price * item.quantity,
    }));

    const totalAmount = recalculatedItems.reduce((sum, i) => sum + i.line_total, 0);

    if (!Number.isInteger(params.amountPaid) || params.amountPaid < totalAmount) {
      return {
        ok: false,
        error: `Nominal dibayar (Rp${params.amountPaid.toLocaleString("id-ID")}) tidak boleh kurang dari total transaksi (Rp${totalAmount.toLocaleString("id-ID")}).`,
      };
    }

    const updatedTx: SalesTransaction = {
      ...existing,
      transaction_date: params.transactionDate,
      subtotal_amount: totalAmount,
      total_amount: totalAmount,
      payment_method: params.paymentMethod,
      amount_paid: params.amountPaid,
      change_amount: params.amountPaid - totalAmount,
      customer_note: params.customerNote.trim(),
      items: recalculatedItems,
      updated_at: new Date().toISOString(),
    };

    if (storageMode === "SUPABASE" && supabaseClient) {
      const { items, ...headerRow } = updatedTx;
      const { error: txErr } = await supabaseClient
        .from("sales_transactions")
        .update(headerRow)
        .eq("id", params.id);
      if (txErr) return { ok: false, error: txErr.message };

      await supabaseClient
        .from("sales_transaction_items")
        .delete()
        .eq("transaction_id", params.id);

      const { error: itemErr } = await supabaseClient
        .from("sales_transaction_items")
        .insert(items);
      if (itemErr) return { ok: false, error: itemErr.message };
    }

    const updatedList = transactions.map((t) => (t.id === params.id ? updatedTx : t));
    setTransactions(updatedList);
    persistLocalState({ transactions: updatedList });
    return { ok: true };
  };

  const deleteSaleTransaction = async (
    id: string
  ): Promise<{ ok: boolean; error?: string }> => {
    if (storageMode === "SUPABASE" && supabaseClient) {
      const { error } = await supabaseClient.from("sales_transactions").delete().eq("id", id);
      if (error) return { ok: false, error: error.message };
    }

    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    persistLocalState({ transactions: updated });
    return { ok: true };
  };

  // ==========================================================================
  // 3. EXPENSES MANAGEMENT
  // ==========================================================================

  const createExpense = async (
    params: CreateExpenseParams
  ): Promise<{ ok: boolean; expense?: ExpenseRecord; errors?: string[] }> => {
    const validation = validateExpenseInput({
      expense_date: params.expense_date,
      description: params.description,
      category: params.category,
      amount: params.amount,
    });

    if (!validation.valid) {
      return { ok: false, errors: validation.errors };
    }

    const nowIso = new Date().toISOString();
    const newExpense: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      expense_date: params.expense_date,
      description: params.description.trim(),
      category: params.category.trim(),
      amount: Math.round(params.amount),
      note: params.note?.trim() || "",
      source: params.source || "MANUAL",
      is_demo: Boolean(params.is_demo),
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (storageMode === "SUPABASE" && supabaseClient) {
      const { error } = await supabaseClient.from("expenses").insert(newExpense);
      if (error) return { ok: false, errors: [error.message] };
    }

    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    persistLocalState({ expenses: updated });
    return { ok: true, expense: newExpense };
  };

  const updateExpense = async (
    id: string,
    params: CreateExpenseParams
  ): Promise<{ ok: boolean; errors?: string[] }> => {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return { ok: false, errors: ["Data pengeluaran tidak ditemukan."] };

    const validation = validateExpenseInput({
      expense_date: params.expense_date,
      description: params.description,
      category: params.category,
      amount: params.amount,
    });

    if (!validation.valid) {
      return { ok: false, errors: validation.errors };
    }

    const updatedRecord: ExpenseRecord = {
      ...existing,
      expense_date: params.expense_date,
      description: params.description.trim(),
      category: params.category.trim(),
      amount: Math.round(params.amount),
      note: params.note?.trim() || "",
      updated_at: new Date().toISOString(),
    };

    if (storageMode === "SUPABASE" && supabaseClient) {
      const { error } = await supabaseClient
        .from("expenses")
        .update(updatedRecord)
        .eq("id", id);
      if (error) return { ok: false, errors: [error.message] };
    }

    const updated = expenses.map((e) => (e.id === id ? updatedRecord : e));
    setExpenses(updated);
    persistLocalState({ expenses: updated });
    return { ok: true };
  };

  const deleteExpense = async (id: string): Promise<{ ok: boolean; error?: string }> => {
    if (storageMode === "SUPABASE" && supabaseClient) {
      const { error } = await supabaseClient.from("expenses").delete().eq("id", id);
      if (error) return { ok: false, error: error.message };
    }

    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    persistLocalState({ expenses: updated });
    return { ok: true };
  };

  // ==========================================================================
  // 4. STOCK MANAGEMENT
  // ==========================================================================

  const recordStockMovement = async (
    params: RecordStockMovementParams
  ): Promise<{ ok: boolean; error?: string }> => {
    const item = menuItems.find((m) => m.id === params.menu_item_id);
    if (!item) return { ok: false, error: "Produk menu tidak ditemukan." };

    if (!Number.isInteger(params.quantity_input) || params.quantity_input < 0) {
      return { ok: false, error: "Jumlah stok harus berupa bilangan bulat positif." };
    }

    if (!params.reason || params.reason.trim().length < 2) {
      return { ok: false, error: "Alasan perubahan stok wajib diisi." };
    }

    const prevStock = item.current_stock;
    let resultingStock = 0;
    let quantityChange = 0;

    if (params.movement_type === "INITIAL" || params.movement_type === "ADJUSTMENT") {
      resultingStock = params.quantity_input;
      quantityChange = prevStock === null ? params.quantity_input : params.quantity_input - prevStock;
    } else if (params.movement_type === "IN") {
      if (params.quantity_input <= 0) {
        return { ok: false, error: "Jumlah stok masuk harus lebih dari 0." };
      }
      resultingStock = (prevStock ?? 0) + params.quantity_input;
      quantityChange = params.quantity_input;
    } else if (params.movement_type === "OUT") {
      if (prevStock === null) {
        return {
          ok: false,
          error: "Stok awal produk ini belum diisi (masih NULL). Silakan isi Stok Awal terlebih dahulu sebelum mencatat stok keluar.",
        };
      }
      if (params.quantity_input <= 0) {
        return { ok: false, error: "Jumlah stok keluar harus lebih dari 0." };
      }
      if (params.quantity_input > prevStock) {
        return {
          ok: false,
          error: `Stok keluar (${params.quantity_input}) melebihi stok saat ini (${prevStock}).`,
        };
      }
      resultingStock = prevStock - params.quantity_input;
      quantityChange = -params.quantity_input;
    }

    const newThreshold =
      params.min_stock_threshold !== undefined
        ? params.min_stock_threshold
        : item.min_stock_threshold;

    const movement: StockMovement = {
      id: `stk-${Date.now()}`,
      menu_item_id: item.id,
      menu_name_snapshot: item.name,
      movement_type: params.movement_type,
      quantity_change: quantityChange,
      previous_stock: prevStock,
      resulting_stock: resultingStock,
      reason: params.reason.trim(),
      note: params.note?.trim() || "",
      movement_date: new Date().toISOString(),
    };

    const updatedItem: MenuItem = {
      ...item,
      current_stock: resultingStock,
      min_stock_threshold: newThreshold,
      updated_at: new Date().toISOString(),
    };

    if (storageMode === "SUPABASE" && supabaseClient) {
      const { error: mErr } = await supabaseClient.from("stock_movements").insert(movement);
      if (mErr) return { ok: false, error: mErr.message };

      const { error: iErr } = await supabaseClient
        .from("menu_items")
        .update({
          current_stock: resultingStock,
          min_stock_threshold: newThreshold,
          updated_at: updatedItem.updated_at,
        })
        .eq("id", item.id);
      if (iErr) return { ok: false, error: iErr.message };
    }

    const updatedMenu = menuItems.map((m) => (m.id === item.id ? updatedItem : m));
    const updatedMovements = [movement, ...stockMovements];

    setMenuItems(updatedMenu);
    setStockMovements(updatedMovements);
    persistLocalState({
      menuItems: updatedMenu,
      stockMovements: updatedMovements,
    });

    return { ok: true };
  };

  const updateStockThreshold = async (
    menuItemId: string,
    minThreshold: number | null,
    unit?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const item = menuItems.find((m) => m.id === menuItemId);
    if (!item) return { ok: false, error: "Item tidak ditemukan." };

    if (minThreshold !== null && (!Number.isInteger(minThreshold) || minThreshold < 0)) {
      return { ok: false, error: "Batas minimum stok harus bilangan bulat >= 0." };
    }

    const updatedItem: MenuItem = {
      ...item,
      min_stock_threshold: minThreshold,
      stock_unit: unit?.trim() || item.stock_unit,
      updated_at: new Date().toISOString(),
    };

    if (storageMode === "SUPABASE" && supabaseClient) {
      const { error } = await supabaseClient
        .from("menu_items")
        .update({
          min_stock_threshold: updatedItem.min_stock_threshold,
          stock_unit: updatedItem.stock_unit,
          updated_at: updatedItem.updated_at,
        })
        .eq("id", menuItemId);
      if (error) return { ok: false, error: error.message };
    }

    const updatedMenu = menuItems.map((m) => (m.id === menuItemId ? updatedItem : m));
    setMenuItems(updatedMenu);
    persistLocalState({ menuItems: updatedMenu });
    return { ok: true };
  };

  return (
    <WarcoffeContext.Provider
      value={{
        isLoading,
        storageMode,
        connectionWarning,
        categories,
        menuItems,
        transactions,
        expenses,
        stockMovements,
        createCategory,
        updateCategory,
        deleteCategory,
        createMenuItem,
        updateMenuItem,
        deleteMenuItem,
        resetMenuToOfficialSeed,
        createSaleTransaction,
        updateSaleTransaction,
        deleteSaleTransaction,
        createExpense,
        updateExpense,
        deleteExpense,
        recordStockMovement,
        updateStockThreshold,
      }}
    >
      {children}
    </WarcoffeContext.Provider>
  );
}

export function useWarcoffe(): WarcoffeContextValue {
  const ctx = useContext(WarcoffeContext);
  if (!ctx) {
    throw new Error("useWarcoffe must be used within a WarcoffeProvider");
  }
  return ctx;
}
