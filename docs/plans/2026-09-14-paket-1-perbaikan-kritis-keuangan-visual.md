# Plan: Paket 1 — Perbaikan Kritis Keuangan, Cron, dan Aksesibilitas Visual

- Tanggal: 2026-09-14
- Status: done

## Tujuan

Menutup 8 temuan Kritis/Tinggi hasil audit 2026-09-14 (`audit_report.md`) yang berdampak langsung pada
data pengguna atau fungsi yang tidak pernah jalan di produksi. Tidak ada fitur baru. Semua perubahan
adalah perbaikan perilaku yang sudah salah.

Referensi temuan: K-03, K-04, OPS-01, FIN-01, UX-01, UX-02, UX-06, FE-04.

## Ruang Lingkup

- [x] **K-04** — hentikan auto-isi `paid_amount` dan tulisan riwayat pembayaran fiktif saat hutang dibuat.
- [x] **K-03** — hilangkan jalur `wallet_id = null` ke `debt_payments.wallet_id NOT NULL` (500 + rollback).
- [x] **OPS-01** — cron Vercel memanggil `GET`; handler saat ini hanya `POST`. Tambah `subscriptions/cron` ke `vercel.json`.
- [x] **FIN-01** — satu ekspresi SQL bersama agar pengeluaran di laporan bulanan/tahunan/kategori rekonsiliasi.
- [x] **UX-01** — token `-fg` untuk income/expense/transfer/warning (dark mode gagal AA 2,19–3,41:1) + ganti `text-white`.
- [x] **UX-02** — `inert` + `aria-hidden` pada sheet BottomNav.
- [x] **UX-06** — `role="alert"` pada 5 kotak galat.
- [x] **FE-04** — buang saldo dari 11 `<option>` dompet dan 4 atribut `title`.
- [x] Perbaiki komentar menyesatkan di `transactions/route.ts:174-176` (satu baris, satu file).

Di luar scope (jangan dikerjakan di plan ini): konsolidasi rumus ke `src/lib/financials.ts` (Paket 2),
migrasi DDL K-01/K-02 (Paket 3), pembersihan token sisa (Paket 4), SaaS (Paket 5).

## File yang Disentuh

Backend:
- `src/app/api/debts/route.ts`
- `src/app/api/reports/monthly/route.ts`
- `src/app/api/reports/yearly/route.ts`
- `src/app/api/reports/category/route.ts`
- `src/app/api/dashboard/bootstrap/route.ts`
- `src/app/api/push/cron/route.ts`
- `src/app/api/bills/cron/route.ts`
- `src/app/api/transactions/route.ts` (komentar saja)
- `vercel.json`

Baru:
- `src/lib/reportSql.ts` — fragmen SQL bersama untuk pengeluaran termasuk biaya admin

Tema & CSS:
- `src/app/globals.css`
- `tailwind.config.ts`

Klien (±60 lokasi `text-white`, daftar pasti diambil saat eksekusi):
- `src/components/**`

Uji:
- `scripts/audit-self-test.ts` (tambah assertion kontrak hutang)

## Bukti yang Sudah Diverifikasi

| Temuan | Lokasi | Fakta |
|---|---|---|
| K-04 | `debts/route.ts:94-102` | `monthsElapsed` × `monthly_installment` langsung mengisi `paidAmount` |
| K-04 | `debts/route.ts:120` | `initialStatus` jadi `'paid'` bila `paidAmount >= totalAmount` |
| K-04 | `debts/route.ts:261-318` | menulis baris `debt_payments` + `bill_payments` untuk bulan yang tidak pernah dibayar |
| K-03 | `debts/route.ts:287` | `validated.wallet_id \|\| null` |
| K-03 | `init/route.ts:192` | `wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT` |
| K-03 | `debts/route.ts:123` | berada di dalam `withTransaction` tanpa try/catch → ROLLBACK total, API 500 |
| OPS-01 | `vercel.json:6,10` | mendaftarkan `/api/push/cron` dan `/api/bills/cron` |
| OPS-01 | `push/cron:47`, `bills/cron:12` | hanya `export async function POST` |
| OPS-01 | `subscriptions/cron:12` | punya `GET`, tetapi tidak terdaftar di `vercel.json` |
| FIN-01 | `monthly/route.ts:44-45,96,121` | menambahkan `SUM(admin_fee)` ke pengeluaran |
| FIN-01 | `yearly/route.ts:28-29` | hanya `SUM(amount)` |
| FIN-01 | `category/route.ts:41` | hanya `SUM(t.amount)` |
| FIN-01 | `bootstrap/route.ts:218-220` | menambahkan `admin_total` |
| UX-01 | `globals.css:44-57` | warna semantik dark mode adalah warna latar terang; dipakai sebagai `bg-*` dengan `text-white` |
| UX-02 | `BottomNav.tsx:228-232` | hanya `translate-y-full pointer-events-none`; `grep inert` di `src/` = 0 |
| UX-06 | `login/page.tsx:40-44`, `register/page.tsx:45-49`, `page.tsx:633-636`, `BillsView.tsx:494-498`, `WalletsView.tsx:286-290` | kotak galat tanpa `role="alert"` |
| FE-04 | `globals.css:199-206` | selektor `[data-amount]` nol pemakaian; `<option>` dan `title` tidak bisa diblur CSS |

Perhitungan kontras (WCAG 2.1, ambang 4,5:1):

| Token | Mode gelap | vs putih | vs `225 20% 10%` |
|---|---|---|---|
| `--color-primary` | `158 50% 46%` | **2,72 : 1** ❌ | 6,59 : 1 ✅ |
| `--color-income` | `130 40% 56%` | **2,35 : 1** ❌ | 7,61 : 1 ✅ |
| `--color-expense` | `12 70% 58%` | **3,41 : 1** ❌ | 5,26 : 1 ✅ |
| `--color-transfer` | `205 46% 58%` | **2,96 : 1** ❌ | 6,05 : 1 ✅ |
| `--color-warning` | `33 86% 58%` | **2,19 : 1** ❌ | 8,18 : 1 ✅ |

Mode terang sudah lulus (primary 9,06 · income 6,14 · expense 5,32 · transfer 5,13 · warning 6,82),
jadi masalahnya khusus mode gelap — bukan pada markup, melainkan pada token.

## Keputusan

**K-04 — auto-hitung cicilan dihapus, bukan diperbaiki.**

Alasan: `paid_amount` adalah klaim "uang ini sudah keluar". Mengisinya tanpa mutasi dompet dan tanpa
baris transaksi membuat laporan mengklaim pembayaran yang tidak pernah terjadi. Angka hasilnya tidak
bisa direkonsiliasi dengan saldo.

Yang dihapus:
- blok `monthsElapsed` → `paidAmount` (`debts/route.ts:93-102`)
- blok tulis `debt_payments` + `bill_payments` fiktif (`:261-318`) — sekaligus menutup K-03

Yang dipertahankan:
- auto-hitung `due_date` cicilan berikutnya (`:104-117`) — murni tanggal, tidak mengklaim uang
- penjadwalan `recurring_bills` (`:221-259`) — jalur pembayaran resmi lewat menu Tagihan
- `initial_paid_amount` manual dari body request — user tetap bisa menyatakan sudah bayar berapa

Dampak ke UI: `DebtsView.tsx:85-88` masih mengirim `initial_paid_amount: effectiveInitialPaid` hasil
hitung otomatis, dan `:59` menyediakan toggle `autoCalculatePaid`. Setelah server berhenti mengarang,
nilai itu berubah arti menjadi pernyataan eksplisit user. Toggle tetap ada, tetapi labelnya harus jujur
(estimasi yang bisa dikoreksi), dan nilainya tidak dikirim bila user tidak menyentuhnya.

**UX-01 — token `-fg` baru, bukan menaikkan warna semantik.**

Warna semantik mode gelap (`income`/`expense`/`transfer`/`warning`/`primary`) dipilih agar terbaca
sebagai teks di atas latar gelap (`globals.css:41-42` → 5,26–8,18:1). Kalau warnanya digelapkan untuk
memenuhi kontras terhadap putih, warna itu berhenti berfungsi sebagai teks di atas latar gelap.
Jadi tambahkan token `-fg` terpisah untuk pemakaian sebagai latar, mengikuti pola `--color-primary-fg`
(`:45` = `225 20% 10%`, sudah 6,59:1 terhadap `primary`). Kelima `-fg` memakai nilai gelap yang sama.

**Bonus temuan** — `transactions/route.ts:174-176` berkomentar bahwa `admin_fee` baris utama dinolkan
dan biaya dicatat sebagai transaksi pendamping, padahal yang terjadi sebaliknya: satu baris INSERT
dengan `admin_fee = feeAmount` (`:238`) dan tidak ada baris pendamping. Komentar menyesatkan; kode
sudah benar karena FIN-01 ikut menjumlahkan `SUM(admin_fee)`. Perbaiki komentar saja.

## Pertanyaan Terbuka

**Q1.** Sesi sebelumnya belum pernah di-deploy dengan fitur auto-paid ini, jadi tidak perlu skrip
perbaikan data. Mohon konfirmasi bila ternyata sudah ada data produksi dengan `paid_amount` yang salah.

## Kriteria Selesai (Definition of Done)

1. `npm run build` lulus tanpa error TypeScript baru.
2. `npm run lint` tanpa error baru.
3. `npm run test:audit` lulus 151/151, ditambah assertion baru: POST hutang tanpa `initial_paid_amount`
   menghasilkan `paid_amount = 0` dan `status = 'unpaid'`.
4. POST hutang dengan `start_date` lampau + `monthly_installment` tidak lagi menghasilkan baris
   `debt_payments`, dan tidak lagi 500 saat `wallet_id` kosong.
5. `GET /api/bills/cron` dan `GET /api/push/cron` dengan `Authorization: Bearer $CRON_SECRET`
   mengembalikan JSON sukses, bukan 405.
6. Transaksi Rp100.000 + `admin_fee` Rp5.000 menghasilkan pengeluaran Rp105.000 di laporan bulanan
   **dan** tahunan.
7. Rasio kontras `text-*-fg` di atas `bg-*` ≥ 4,5:1 di mode gelap (dihitung ulang, bukan diklaim).
8. Elemen sheet BottomNav tidak dapat difokus lewat Tab saat tertutup.
9. Saldo dompet tidak muncul lagi di 11 `<option>` dan 4 `title`.
10. `changelog.md` diperbarui satu entri di paling atas.

## Catatan

- Tidak ada perubahan skema DB. Tidak ada migrasi.
- Tidak mengubah logika saldo, `strict-zero`, atau rumus `safe_to_spend`.
- `npm test` penuh tidak dijalankan (destruktif terhadap DB `.env.local`); cukup `test:audit` + `build`.
