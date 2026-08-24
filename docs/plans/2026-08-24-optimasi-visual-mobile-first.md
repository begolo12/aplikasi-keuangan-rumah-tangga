# Plan: Optimasi Visual Menyeluruh Mobile-First

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Memperbaiki seluruh tampilan visual dan tipografi pada layar handphone (mobile-first), mengatasi masalah teks terpotong (seperti "Pengeluaran" terpotong "Pengel...", "Pemasukan" terpotong "Pemas...", dan "Transfer Kas" terpotong) pada tombol aksi cepat, serta memastikan seluruh komponen responsif, proporsional, dan nyaman digunakan di berbagai ukuran layar smartphone (320px - 430px+).

## Ruang Lingkup
- [x] Optimasi `QuickActions.tsx`: hilangkan pemotongan teks (`truncate`), sesuaikan padding card, ukuran icon, dan tipografi label agar terbaca utuh dan rapi di semua layar smartphone.
- [x] Optimasi `MonthlySummary.tsx`: pastikan angka nominal jutaan/miliaran rupiah dan label arus kas tidak berdesakan atau meluap dari kartu pada layar sempit.
- [x] Optimasi `TransactionModal.tsx`: sesuaikan segmented control tab tipe transaksi ("Pengeluaran", "Pemasukan", "Transfer") dan form field agar ramah jemari (touch target >= 44px).
- [x] Optimasi `TransactionItem.tsx`: cegah overlap antara nominal transaksi dan catatan/kategori pada layar ponsel 360px.
- [x] Optimasi `BudgetProgressBar.tsx` & `BillItem.tsx`: tata letak progress bar, badge status tagihan, dan tombol aksi agar reflow secara natural tanpa horizontal scrollbar liar.
- [x] Optimasi `TopHeader.tsx` & `AppShell.tsx`: padding container mobile, safe-area inset, dan pemilih bulan yang proporsional.
- [x] Verifikasi visual & lint/build: `npm run lint` 0 warning, `npm test` lulus, `npm run build` sukses.

## File yang Disentuh
- `docs/plans/2026-08-24-optimasi-visual-mobile-first.md` (baru)
- `src/components/dashboard/QuickActions.tsx`
- `src/components/dashboard/MonthlySummary.tsx`
- `src/components/dashboard/BalanceHeader.tsx`
- `src/components/transactions/TransactionModal.tsx`
- `src/components/transactions/TransactionItem.tsx`
- `src/components/budget/BudgetProgressBar.tsx`
- `src/components/bills/BillItem.tsx`
- `src/components/layout/TopHeader.tsx`
- `src/components/layout/AppShell.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Teks "Pengeluaran", "Pemasukan", "Transfer", "Anggaran", "Tagihan", "Pos Kas", "Laporan", dan "Pengaturan" pada layar ponsel terbaca utuh tanpa terpotong ("Pengel...", "Pemas...").
2. Semua kartu dan komponen mobile tidak mengalami horizontal overflow / teks bertumpuk.
3. `npm run lint` 0 error & 0 warning, `npm test` lulus 51/51 assertions, `npm run build` sukses.
4. Dicatat di `changelog.md`.
