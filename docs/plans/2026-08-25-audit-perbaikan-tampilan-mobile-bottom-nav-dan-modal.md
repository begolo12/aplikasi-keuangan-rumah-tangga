# Plan: Audit & Perbaikan Tampilan Handphone, Bottom Bar, dan Modal Overlap

- Tanggal: 2026-08-25
- Status: done

## Tujuan
Mengatasi masalah tumpang tindih elemen UI pada perangkat handphone (mobile), khususnya tombol simpan/aksi form (seperti Simpan Pengeluaran, Pemasukan, Tagihan, Hutang, Aset) yang terpotong/tertutup oleh batas bawah atau bottom navigation bar, serta memperbaiki konflik z-index dan safe area pada BottomNav sheet.

## Ruang Lingkup
- [ ] Perbaiki `Modal.tsx`: dynamic viewport height (`88dvh`), safe-area bottom padding (`pb-[max(env(safe-area-inset-bottom),2rem)]`) agar tombol submit form di dalam bottom sheet modal selalu memiliki ruang bebas dan tidak terpotong.
- [ ] Perbaiki `BottomNav.tsx`: ubah z-index More Bottom Sheet dan overlay ke `z-50` (sebelumnya `z-35`, berada di bawah nav bar `z-40` sehingga menu bawah sheet tertutup bottom bar dan tidak bisa diklik).
- [ ] Perbaiki padding bawah konten utama di `AppShell.tsx` dengan kalkulasi safe-area (`pb-[calc(6.5rem+env(safe-area-inset-bottom))]`).
- [ ] Audit dan sesuaikan posisi elemen fixed mengambang di `page.tsx` (Exit Toast) dan `IosInstallPrompt.tsx` agar tidak bertabrakan dengan bottom bar.
- [ ] Verifikasi seluruh form modal transaksi dan modul pendukung pada resolusi mobile.
- [ ] Jalankan lint, build, dan test audit untuk memastikan zero-regression.

## File yang Disentuh
- `src/components/ui/Modal.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/IosInstallPrompt.tsx`
- `src/app/page.tsx`
- `src/components/transactions/TransactionModal.tsx`

## Kriteria Selesai (Definition of Done)
1. Seluruh tombol aksi simpan di dalam modal transaksi (Pengeluaran, Pemasukan, Transfer) dan modal modul lain (Anggaran, Tagihan, Hutang, Aset, Dompet) terlihat utuh dan dapat dipencet tanpa tertutup atau terhalang di layar mobile.
2. Bottom Sheet "Menu Lainnya" di BottomNav terbuka mulus di atas seluruh elemen layar (`z-50`) tanpa tertumpuk nav bar di bawahnya.
3. Konten halaman di bagian paling bawah tidak terpotong atau tertutup bottom bar (`pb-safe`).
4. `npm test`, `npm run lint`, dan `npm run build` sukses 100% tanpa error.
