# Plan: Fitur Smart Receipt & Nota Parser Menggunakan DeepSeek API (Server-Isolated Engine)

- Tanggal: 2026-08-28
- Status: done

## Tujuan
Memudahkan pencatatan transaksi dari struk belanja, nota, bukti transfer, mutasi, atau SMS banking secara instan dengan engine AI DeepSeek (`deepseek-v4-flash`). Menjaga keamanan penuh agar API key DeepSeek tersimpan secara rahasia di environment server (`.env.local` / Next.js Server Route) dan tidak pernah bocor ke client-bundle maupun git repository saat push ke GitHub / deploy ke Vercel.

## Ruang Lingkup
- [x] Konfigurasi `.env.example` dan `.env.local` untuk `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, dan `DEEPSEEK_MODEL`.
- [x] Validasi schema Zod untuk request dan output parser di `src/lib/validations.ts`.
- [x] Helper server-side `src/lib/deepseek.ts` dengan prompt ekstraksi terstruktur JSON & fallback aman jika API gagal/belum dikonfigurasi.
- [x] API route server-side `src/app/api/ai/parse-receipt/route.ts` dengan proteksi autentikasi JWT session (`requireAuth`).
- [x] Endpoint di `src/lib/apiFetch.ts` & komponen UI `ReceiptParserModal.tsx`.
- [x] Integrasi pemicu di `TransactionModal.tsx` dan `QuickActions.tsx` untuk auto-populate nilai transaksi (amount, type, date, description, category, wallet).
- [x] Unit test audit di `scripts/audit-self-test.ts` dan E2E test di `scripts/e2e-full-suite.ts`.
- [x] Verifikasi `npm test`, `npm run lint`, dan `npm run build`.
- [x] Catat hasil pekerjaan ke `changelog.md` dan update status plan ke `done`.


## File yang Disentuh
- `docs/plans/2026-08-28-fitur-smart-receipt-parser-deepseek.md`
- `.env.example`
- `.env.local`
- `src/lib/validations.ts`
- `src/lib/deepseek.ts`
- `src/app/api/ai/parse-receipt/route.ts`
- `src/lib/apiFetch.ts`
- `src/components/transactions/ReceiptParserModal.tsx`
- `src/components/transactions/TransactionModal.tsx`
- `src/components/dashboard/QuickActions.tsx`
- `scripts/audit-self-test.ts`
- `scripts/e2e-full-suite.ts`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. API Key DeepSeek tidak berada di client bundle atau file publik git.
2. Endpoint `/api/ai/parse-receipt` mengekstraksi data teks/struk menjadi objek transaksi terstruktur (nominal, tanggal, deskripsi, tebakan kategori/dompet).
3. Transaksi otomatis terisi di `TransactionModal` setelah parsing struk.
4. Semua test unit dan E2E (`npm test`) lulus.
5. Build Next.js (`npm run build`) sukses tanpa error.
6. Changelog terupdate di `changelog.md`.
