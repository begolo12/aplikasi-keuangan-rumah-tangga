# Plan: Perbaikan Bug Modal Keluar/Tertutup Sendiri Saat Mengetik (Focus Trap & Effect Cleanup Refactor)

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Memperbaiki bug di mana modal/dialog tertutup sendiri atau fokus input terlempar saat pengguna mengetik data pada formulir transaksi, tagihan, aset, hutang, dan dompet.

## Akar Masalah (Root Cause)
1. `Modal.tsx` menyertakan `onClose` di dependency array `useEffect([isOpen, onClose])`. Setiap kali user mengetik karakter, state parent berubah dan inline callback `onClose` dibuat ulang.
2. Ini memicu cleanup `useEffect`, yang menjalankan `previousFocus?.focus()`, melempar fokus input keluar dari modal ke elemen di belakang modal dan mereset overflow body.
3. Pada saat bersamaan, `getFocusableElements()[0]?.focus()` terpanggil ulang dan mereset posisi kursor input.

## Solusi
1. Refactor `Modal.tsx`:
   - Gunakan `useRef` untuk menyimpan referensi `onClose` terbaru.
   - Dependency `useEffect` hanya bergantung pada `[isOpen]`.
   - Jalankan fokus awal ke elemen pertama hanya sekali saat `isOpen` berubah dari `false` ke `true`.
   - Jalankan `previousFocus?.focus()` hanya saat modal selesai ditutup.
   - Proteksi backdrop click dengan `e.target === e.currentTarget`.
2. Hapus key instabilitas pada `TransactionModal.tsx`.
3. Verifikasi `npm test` dan `npm run build`.
4. Update `changelog.md` dan push ke GitHub.

## File yang Disentuh
- `src/components/ui/Modal.tsx`
- `src/components/transactions/TransactionModal.tsx`
- `changelog.md`
- `docs/plans/2026-08-27-fix-modal-auto-close-dan-focus-trap-bug.md`

## Kriteria Selesai (Definition of Done)
1. Pengguna dapat mengetik teks dan nominal pada seluruh modal tanpa modal tertutup sendiri atau kursor melompat.
2. `npm test` dan `npm run build` lulus 100%.
