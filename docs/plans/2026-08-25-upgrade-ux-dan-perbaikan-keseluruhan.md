# Plan: Upgrade UX, Alur Transaksi, Edit Transaksi & Perbaikan Visual

- Tanggal: 2026-08-25
- Status: done

## Tujuan
Mengimplementasikan perbaikan UX alur kerja, penambahan fitur Edit Transaksi, konfirmasi hapus inline tanpa browser alert/confirm, context-aware header period selector, dan perbaikan visual pada form serta list item.

## Ruang Lingkup
- [x] Buat handler `PUT` di `/api/transactions/[id]/route.ts` dengan reversal saldo atomik & validasi strict-zero.
- [x] Update `TransactionModal.tsx`: reorder alur form (Kategori/Dompet -> Nominal -> Tanggal -> Catatan), hilangkan native alert offline (pakai banner inline), dukung mode edit transaksi.
- [x] Update `TransactionItem.tsx` & `TransactionList.tsx`: tombol Edit transaksi & handler inline.
- [x] Update `page.tsx`: state & handler edit transaksi.
- [x] Update `BillItem.tsx` & `DebtItem.tsx`: tambahkan inline confirmation saat hapus (cegah data hilang terhapus tidak sengaja), ganti warna hardcoded ke token desain.
- [x] Update `WalletsView.tsx`: ganti `confirm()` browser dengan inline confirm modal/state.
- [x] Update `SettingsView.tsx`: gunakan `apiFetch`, hilangkan `alert()`, dukung edit nama user.
- [x] Update `/api/settings/route.ts` & `validations.ts`: dukung update nama user (`users.name`).
- [x] Update `TopHeader.tsx`: sembunyikan period selector pada tab yang non-period (Aset, Hutang, Pengaturan).
- [x] Update `DebtsView.tsx`: perbaiki kepadatan summary cards agar tidak banyak scroll di mobile.
- [x] Verifikasi semua test audit (`npm test`), lint (`npm run lint`), dan build (`npm run build`).

## File yang Disentuh
- `src/app/api/transactions/[id]/route.ts`
- `src/app/api/settings/route.ts`
- `src/lib/validations.ts`
- `src/components/transactions/TransactionModal.tsx`
- `src/components/transactions/TransactionItem.tsx`
- `src/components/transactions/TransactionList.tsx`
- `src/components/bills/BillItem.tsx`
- `src/components/debts/DebtItem.tsx`
- `src/components/wallets/WalletsView.tsx`
- `src/components/settings/SettingsView.tsx`
- `src/components/layout/TopHeader.tsx`
- `src/components/debts/DebtsView.tsx`
- `src/app/page.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
- Edit transaksi berfungsi penuh (reversal saldo lama, apply saldo baru, update DB).
- Tidak ada `alert()` / `confirm()` native yang memblokir browser thread.
- Alur form transaksi lebih intuitif (kategori & dompet terdefinisi sebelum nominal).
- `npm test` lulus 100% (70 unit + 28 E2E).
- `npm run lint` 0 warning/error.
- `npm run build` lulus 24/24 routes.
