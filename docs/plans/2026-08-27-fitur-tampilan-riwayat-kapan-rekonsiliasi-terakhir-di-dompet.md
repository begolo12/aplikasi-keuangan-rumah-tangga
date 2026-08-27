# Plan: Tampilan Riwayat Tanggal Rekonsiliasi Terakhir pada Kartu Dompet

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Menampilkan informasi tanggal dan waktu terakhir rekonsiliasi saldo riil (`reconciled_at`) secara jelas pada setiap kartu dompet/rekening di menu Pos Kas (`WalletsView.tsx`) dan Beranda Dashboard (`WalletScroller.tsx`), sehingga pengguna langsung mengetahui kapan terakhir kali saldo rekening tersebut diverifikasi atau di-update.

## Ruang Lingkup
- [x] Perbarui kartu dompet di `WalletsView.tsx` agar menyertakan label informatif tanggal rekonsiliasi terakhir (misal: "Rekom: 27 Agu 2026" / "Belum pernah direkom").
- [x] Perbarui kartu pos kas di `WalletScroller.tsx` agar menampilkan indikator tanggal verifikasi rekonsiliasi terakhir.
- [x] Verifikasi pengujian audit (`npm test`) dan build check (`npm run build`).
- [x] Catat ke `changelog.md` dan tandai plan doc `done`.

## File yang Disentuh
- `src/components/wallets/WalletsView.tsx`
- `src/components/dashboard/WalletScroller.tsx`
- `changelog.md`
- `docs/plans/2026-08-27-fitur-tampilan-riwayat-kapan-rekonsiliasi-terakhir-di-dompet.md`

## Kriteria Selesai (Definition of Done)
1. Setiap kartu dompet di menu Pos Kas dan Dashboard menampilkan status dan tanggal rekonsiliasi terakhir.
2. `npm test` dan `npm run build` lulus tanpa error.
