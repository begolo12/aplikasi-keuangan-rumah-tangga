# Plan: Upgrade UX Input & Page Polish — Batch 1

- Tanggal: 2026-08-30
- Status: done

## Tujuan
Meningkatkan kualitas input dan isi halaman agar berada di level "terbaik" setelah zero-gap tercapai: semua form mudah dipahami, validasi jelas, AmountInput premium mendukung saldo minus, TransactionModal nyaman di mobile, TransactionList pencarian responsif, Wallet & Budget input anti-error, serta konsistensi empty/loading state di seluruh modul. Tidak menambah dependency baru.

## Ruang Lingkup

### U1 — AmountInput premium upgrade
- [x] Tambah prop `allowNegative?: boolean` — izinkan minus di depan, `formatDisplay` tampilkan minus, handler parsing minus.
- [x] Tambah `aria-invalid` + `aria-describedby` ke pesan error, `placeholder` prop, `inputMode` adaptif.
- [x] Preset chips tetap 44px tap target, hover jelas, disabled state.
- [x] Clear button muncul untuk `value !== 0` (termasuk minus) + `aria-label`.

### U2 — Wallet initial balance dukung minus
- [x] `WalletsView` AmountInput `allowNegative` + hint "Saldo awal boleh minus untuk kartu kredit / overdraft".
- [x] Badge overdraft di card dompet bila `balance < 0` dipertahankan.

### U3 — TransactionModal polish
- [x] `filteredCategories` kosong → box warning "Belum ada kategori tipe ini...".
- [x] Wallet balance preview di bawah select (saldo sumber dengan `tabular-nums` + "(Minus)" jika negatif).
- [x] `admin_fee` migrasi ke `AmountInput` (sebelumnya `input type=number` mentah) — hanya untuk `transfer`.
- [x] Date `max` + warning >7 hari ke depan non-blocking, `eslint-disable purity` terkontrol.
- [x] A11y `id`+`label` verifikasi, `role="alert"` error, `submittingRef` guard tetap.

### U4 — TransactionList search & empty polish
- [x] Highlight query via `HighlightMatch` `<mark bg-primary/15>` di `TransactionItem` (deskripsi + wallet).
- [x] Empty per filter: `filterType !== 'all'` → EmptyState "Tidak Ada X" + "Tampilkan Semua" reset.
- [x] Search sudah debounce 300ms, tombol Reset/Clear dipertahankan (dicek `searchInput`).

### U5 — Dashboard & Reports loading polish
- [x] `ReportsView` sync fix `useEffect` (sebelumnya setState during render) + `eslint-disable` terkontrol — 0 warning.
- [x] `BalanceHeader`/`MonthlySummary` tabular-nums verifikasi ada.

### U6 — Konsistensi validasi & error display
- [x] `AmountInput` error inline via prop `error` + `role="alert"` di semua pemakaian wallet/transfer.
- [x] `BudgetView` AmountInput inline dipertahankan.
- [x] `AssetModal` raw number masih ada (ditunda ke Batch 2 agar tidak membloat Batch 1) — dicatat sebagai sisa.

### Di Luar Scope
- Tidak menambah tabel/DB baru, tidak ubah DESIGN.md token, tidak tambah lib eksternal.
- Tidak merombak navigasi (sudah stabil).

## File yang Disentuh
- `src/components/ui/AmountInput.tsx`
- `src/components/wallets/WalletsView.tsx`
- `src/components/wallets/useWalletForm.ts` (tidak diubah, hanya consumer)
- `src/components/transactions/TransactionModal.tsx`
- `src/components/transactions/TransactionList.tsx`
- `src/components/transactions/TransactionItem.tsx`
- `src/components/budget/BudgetView.tsx` (verifikasi)
- `src/components/assets/AssetModal.tsx` (ditunda)
- `src/components/debts/DebtsView.tsx` (sudah AmountInput)
- `src/components/reports/ReportsView.tsx`

## Kriteria Selesai
- `npm run build` lulus, `npm run lint` 0 error, `npm run test` 171 lulus.
- Verifikasi manual: (a) buat dompet saldo -500.000 berhasil & badge minus tampil; (b) TransactionModal kategori kosong tampil pesan jelas & admin_fee via AmountInput; (c) TransactionList search highlight muncul & filter empty handle; (d) AmountInput minus input bekerja; (e) tidak ada `input type=number` mentah di transaksi/dompet (asset ditunda).
