// ============================================================================
// WARCOFFE 13 — ADMINISTRATIVE MENU CATALOG SEED SCRIPT (57 ITEMS)
// Capstone Project Asah 2026 | Team ID: A26-CS187
// ============================================================================
// Jalankan di server/CLI dengan: npm run seed
//
// ATURAN KEAMANAN:
// 1. Script administratif ini MEWAJIBKAN variabel server-only SUPABASE_SERVICE_ROLE_KEY.
// 2. TIDAK menggunakan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY atau
//    NEXT_PUBLIC_SUPABASE_ANON_KEY sebagai fallback karena operasi administratif
//    seed melewati RLS (Row Level Security).
// 3. JANGAN PERNAH mengekspos SUPABASE_SERVICE_ROLE_KEY ke frontend atau prefix NEXT_PUBLIC_.
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import {
  INITIAL_MENU_CATEGORIES,
  INITIAL_MENU_ITEMS,
} from "../src/lib/menu-seed-data";

async function runSeed() {
  console.log("============================================================");
  console.log("WARCOFFE 13 — SEED KATALOG MENU AWAL (57 ITEM)");
  console.log("============================================================");
  console.log(`Total Kategori : ${INITIAL_MENU_CATEGORIES.length}`);
  console.log(`Total Menu Seed: ${INITIAL_MENU_ITEMS.length} (Wajib 57 entri)`);

  if (INITIAL_MENU_ITEMS.length !== 57) {
    throw new Error(
      `Jumlah menu seed harus tepat 57, ditemukan ${INITIAL_MENU_ITEMS.length}`
    );
  }

  // Pastikan semua current_stock adalah null
  const nonNullStock = INITIAL_MENU_ITEMS.filter((m) => m.current_stock !== null);
  if (nonNullStock.length > 0) {
    throw new Error(
      "Pelanggaran aturan data: Stok awal pada seed harus bernilai NULL!"
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl) {
    console.error(
      "\n[ERROR] NEXT_PUBLIC_SUPABASE_URL belum dikonfigurasi di environment variables (.env.local)."
    );
    process.exit(1);
  }

  if (!serviceRoleKey) {
    console.error(
      "\n[ERROR] SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di environment variables."
    );
    console.error(
      "Script seed administratif ini mewajibkan SUPABASE_SERVICE_ROLE_KEY (server-only) untuk melewati Row Level Security (RLS) dan tidak menerima NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ataupun NEXT_PUBLIC_SUPABASE_ANON_KEY sebagai fallback."
    );
    console.error(
      "Tambahkan SUPABASE_SERVICE_ROLE_KEY di .env.local (jangan pernah gunakan prefix NEXT_PUBLIC_) atau jalankan supabase/seed.sql langsung di SQL Editor Supabase."
    );
    process.exit(1);
  }

  console.log("\nMenghubungkan ke Supabase PostgreSQL menggunakan Service Role Key...");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: catErr } = await supabase
    .from("menu_categories")
    .upsert(INITIAL_MENU_CATEGORIES, { onConflict: "id" });

  if (catErr) {
    console.error("Gagal melakukan seed kategori:", catErr.message);
    process.exit(1);
  }

  const { error: menuErr } = await supabase
    .from("menu_items")
    .upsert(INITIAL_MENU_ITEMS, { onConflict: "id" });

  if (menuErr) {
    console.error("Gagal melakukan seed katalog menu:", menuErr.message);
    process.exit(1);
  }

  console.log(
    "SUKSES: 3 Kategori dan 57 Item Menu Warcoffe 13 berhasil di-seed ke Supabase!"
  );
}

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});
