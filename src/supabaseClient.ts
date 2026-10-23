/**
 * =========================================================================
 * SUPABASE CLIENT (HANYA UNTUK AUTENTIKASI PANITIA CETAK MASSAL)
 * =========================================================================
 * 
 * Aturan Keamanan:
 * 1. Hanya menggunakan Project URL dan anon key (keduanya bersifat publik).
 * 2. DILARANG KERAS menaruh service_role key atau secret key di sini.
 * 3. Jika variabel .env belum diisi oleh admin, aplikasi tetap berjalan
 *    dan menampilkan pesan ramah "Login belum dikonfigurasi, hubungi admin"
 *    tanpa menyebabkan layar putih (white screen).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Periksa apakah kredensial publik Supabase sudah dikonfigurasi dengan benar
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('ISI_PROJECT_URL_DI_SINI') &&
  !supabaseAnonKey.includes('ISI_ANON_KEY_DI_SINI') &&
  supabaseUrl.startsWith('http')
);

// Inisialisasi client Supabase jika sudah dikonfigurasi, jika belum null
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
