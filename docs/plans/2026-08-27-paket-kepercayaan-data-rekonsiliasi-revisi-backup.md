# Plan: Paket Kepercayaan Data (Rekonsiliasi Basi, Tanda Direvisi, Backup)

- Tanggal: 2026-08-27
- Status: done
- Tujuan strategis: angka aplikasi layak dipercaya karena status verifikasi selalu kelihatan

## Tujuan
Tiga perbaikan kecil satu tema: pengguna yakin saldo cocok dunia nyata, koreksi angka transparan,
dan data aman tanpa proses manual yang gampang lupa.

## Ruang Lingkup
### A. Label Rekonsiliasi Basi
- [x] Helper `getReconcileAge(wallet)` di lib/formatters atau components/wallets: return 'fresh' | 'stale' | 'never' (ambang 14 hari).
- [x] Badge kecil "Belum dicek" / "Cek saldo" pada kartu dompet (`WalletScroller`, `WalletsView`) saat stale/never. Netral warna warning-subtle, teks text-muted.

### B. Tanda Direvisi pada Transaksi
- [x] Migrasi DB: kolom `edited_at TIMESTAMPTZ NULL` di tabel `transactions` (scripts/run-db-migrations.ts + init route).
- [x] Handler PUT `/api/transactions/[id]` mengisi `edited_at = now()` tiap kali menyimpan revisi.
- [x] types.ts: field opsional `edited_at`.
- [x] TransactionItem: indikator halus (ikon pencil 12px + title "Direvisi {tanggal}") hanya bila edited_at ada. Diskret, tidak berisik.

### C. Backup Percaya Diri
- [x] Pengaturan: kartu "Cadangkan Data" - tanggal cadangan terakhir (localStorage `kaskeluarga-last-backup`) + tombol unduh JSON memakai `/api/backup/export` yang sudah ada.
- [x] Nudge dashboard: chipReminder sekali, muncul bila backup terakhir > 30 hari ATAU belum pernah, dengan tombol langsung unduh dan aksi "tandai sudah".

## File yang Disentuh
- scripts/run-db-migrations.ts, src/app/api/init/route.ts
- src/app/api/transactions/[id]/route.ts
- src/lib/types.ts, src/lib/formatters.ts (helper)
- src/components/dashboard/WalletScroller.tsx, wallets/WalletsView.tsx
- src/components/transactions/TransactionItem.tsx
- src/components/settings/SettingsView.tsx, page.tsx (nudge)
- scripts/e2e-full-suite.ts (skenario PUT menghasilkan edited_at)
- changelog.md

## Kriteria Selesai (Definition of Done)
1. Dompet tak direkonsiliasi >= 14 hari terlihat statusnya di dashboard & halaman dompet.
2. Transaksi yang pernah diedit memiliki jejak waktu revisi yang tampil halus; PUT lintas-user tetap ditolak.
3. Pengguna bisa mengunduh cadangan sekali ketuk dan melihat usia cadangan terakhir.
4. npm test + build lulus 100%.
