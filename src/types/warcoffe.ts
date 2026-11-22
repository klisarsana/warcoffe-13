// ============================================================================
// WARCOFFE 13 MANAGEMENT SYSTEM — TYPESCRIPT DOMAIN MODELS & API CONTRACTS
// Capstone Project Asah 2026 | Team ID: A26-CS187
// ============================================================================

/**
 * Mode suhu/varian menu sesuai aturan data menu Warcoffe 13:
 * - NONE: Tidak memiliki varian suhu (Makanan & Minuman Kemasan)
 * - HOT_ONLY: Hanya harga Panas yang tercatat pada foto menu
 * - HOT_COLD: Memiliki harga Panas dan Dingin terpisah pada foto menu
 * - UNSPECIFIED: Harga tercatat di foto menu tetapi variasi suhu tidak disebutkan
 */
export type TemperatureMode = "NONE" | "HOT_ONLY" | "HOT_COLD" | "UNSPECIFIED";

export type PaymentMethod = "TUNAI" | "QRIS" | "TRANSFER";

export type TransactionSource = "POS_MANUAL" | "AI_DRAFT_CONFIRMED";

export type ExpenseSource = "MANUAL" | "AI_DRAFT_CONFIRMED";

export type StockMovementType = "INITIAL" | "IN" | "OUT" | "ADJUSTMENT";

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category_id: string;
  description: string;
  temperature_mode: TemperatureMode;
  default_price: number | null; // Integer IDR
  hot_price: number | null; // Integer IDR
  cold_price: number | null; // Integer IDR
  is_active: boolean;
  /**
   * PENTING: Stok awal bernilai null (Belum Diisi / Unknown) sampai pemilik
   * memasukkan nilai stok secara eksplisit melalui modul Manajemen Stok.
   */
  current_stock: number | null;
  min_stock_threshold: number | null;
  stock_unit: string;
  notes: string;
  updated_at?: string;
}

export interface MenuVariantOption {
  variant_key: "DEFAULT" | "PANAS" | "DINGIN" | "UNSPECIFIED";
  label: string;
  price: number; // Integer IDR
}

export interface CartItem {
  cart_item_id: string; // `${menu_item_id}__${variant_key}`
  menu_item_id: string;
  menu_name: string;
  category_id: string;
  category_name: string;
  variant_key: "DEFAULT" | "PANAS" | "DINGIN" | "UNSPECIFIED";
  variant_label: string;
  unit_price: number; // Integer IDR
  quantity: number;
  line_total: number; // Integer IDR
}

export interface SalesTransactionItem {
  id: string;
  transaction_id: string;
  menu_item_id: string | null;
  menu_name_snapshot: string;
  category_name_snapshot: string;
  variant_label: string;
  unit_price: number; // Integer IDR
  quantity: number;
  line_total: number; // Integer IDR
}

export interface SalesTransaction {
  id: string;
  transaction_number: string;
  transaction_date: string; // ISO 8601 timestamp
  subtotal_amount: number; // Integer IDR
  total_amount: number; // Integer IDR
  payment_method: PaymentMethod;
  amount_paid: number; // Integer IDR
  change_amount: number; // Integer IDR
  customer_note: string;
  source: TransactionSource;
  is_demo: boolean;
  items: SalesTransactionItem[];
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory =
  | "Bahan Baku & Kemasan"
  | "Gas, Listrik & Air"
  | "Operasional Warung"
  | "Perlengkapan & Peralatan"
  | "Transportasi & Belanja"
  | "Lainnya";

export interface ExpenseRecord {
  id: string;
  expense_date: string; // YYYY-MM-DD
  description: string;
  category: ExpenseCategory | string;
  amount: number; // Integer IDR
  note: string;
  source: ExpenseSource;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  menu_item_id: string;
  menu_name_snapshot: string;
  movement_type: StockMovementType;
  quantity_change: number;
  previous_stock: number | null;
  resulting_stock: number;
  reason: string;
  note: string;
  movement_date: string; // ISO 8601 timestamp
}

export type AuditActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STOCK_MOVE"
  | "AI_CONFIRM";

export type AuditEntityType =
  | "SALE_TRANSACTION"
  | "EXPENSE"
  | "MENU_ITEM"
  | "CATEGORY"
  | "STOCK";

export interface AuditLogRecord {
  id: string;
  action_type: AuditActionType;
  entity_type: AuditEntityType;
  entity_id: string;
  actor_email: string;
  summary: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string; // ISO 8601 timestamp
}

// ============================================================================
// DASHBOARD & REPORT SUMMARY MODELS
// ============================================================================

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g., "20 Nov"
  revenue: number;
  expenses: number;
  net_difference: number;
  transaction_count: number;
}

export interface TopSellingMenuSummary {
  menu_item_id: string;
  menu_name: string;
  category_name: string;
  total_quantity_sold: number;
  total_revenue: number;
}

export interface MonthlySummaryReport {
  month_key: string; // YYYY-MM
  today_revenue: number;
  today_transaction_count: number;
  monthly_revenue: number;
  monthly_expenses: number;
  /**
   * Selisih bersih (Pemasukan - Pengeluaran).
   * BUKAN laba akuntansi formal (sesuai aturan proyek).
   */
  net_difference: number;
  monthly_transaction_count: number;
  monthly_expense_count: number;
  has_demo_data: boolean;
  daily_trends: DailyTrendPoint[];
  top_selling_menus: TopSellingMenuSummary[];
}

// ============================================================================
// NEXT-GEN AI ENGINEER (AE) & DATA SCIENCE (DS) FASTAPI INTEGRATION CONTRACTS
// ============================================================================

export interface AITransactionDraftItem {
  raw_item_text: string;
  matched_menu_item_id: string | null;
  item_name: string;
  variant_label: string;
  quantity: number;
  unit_price: number | null;
  line_total: number | null;
  confidence: number;
}

export interface AITransactionDraftResponse {
  status: "SUCCESS" | "INCOMPLETE" | "OUT_OF_CONTEXT" | "SERVICE_UNAVAILABLE";
  draft_type: "INCOME_SALE" | "EXPENSE" | "UNKNOWN";
  predicted_category: string;
  classifier_model_used?: string;
  confidence_score?: number;
  transaction_date: string;
  items: AITransactionDraftItem[];
  total_amount: number | null;
  expense_description?: string;
  missing_fields: string[];
  assistant_message: string;
  requires_owner_confirmation: true;
}

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  is_error?: boolean;
  metadata?: {
    endpoint?: string;
    service_status?: string;
  };
}

export interface AIChatRequestPayload {
  question: string;
  context_summary: {
    current_month: string;
    monthly_revenue: number;
    monthly_expenses: number;
    net_difference: number;
    transaction_count: number;
    top_selling_items: Array<{ name: string; qty: number; revenue: number }>;
    low_stock_items: Array<{ name: string; current_stock: number; min_threshold: number }>;
  };
}

export interface AIChatResponsePayload {
  status: "SUCCESS" | "OUT_OF_CONTEXT" | "SERVICE_UNAVAILABLE" | "ERROR";
  answer: string;
  referenced_metrics?: string[];
  error_code?: string;
}
