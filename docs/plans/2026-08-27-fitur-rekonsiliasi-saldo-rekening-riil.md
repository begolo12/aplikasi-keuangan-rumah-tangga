# Plan: Fitur Rekonsiliasi Saldo Rekening Riil (Real Account Reconciliation)

- Tanggal: 2026-08-27
- Status: done

## Tujuan
Menambahkan fitur rekonsiliasi saldo rekening riil (bank/kas/e-wallet) untuk mendeteksi selisih antara saldo catatan aplikasi dengan saldo mutasi riil di rekening/dompet fisik (akibat lupa catat atau salah tulis), serta menyediakan tombol penyesuaian otomatis (1-klik rekonsiliasi).

## Ruang Lingkup
- [x] Tambahkan kolom `reconciled_at` dan `last_reconciled_balance` pada tabel `wallets` dan update migrasi live DB.
- [x] Buat endpoint API `/api/wallets/[id]/reconcile` untuk memproses rekonsiliasi dan membuat transaksi penyesuaian otomatis (adjustment).
- [x] Buat komponen modal `ReconcileModal.tsx` di modul Pos Kas (`WalletsView.tsx`) untuk input saldo riil, menampilkan perbandingan & selisih, dan eksekusi penyesuaian.
- [x] Tambahkan badge status rekonsiliasi (Cocok / Ada Selisih / Terakhir dicek) pada kartu dompet di `WalletsView.tsx`.
- [x] Jalankan pengujian audit (`npm test`) dan build check (`npm run build`).
- [x] Catat perubahan ke `changelog.md` dan tandai plan doc `done`.

## File yang Disentuh
- `src/lib/types.ts`
- `src/lib/validations.ts`
- `src/lib/apiFetch.ts`
- `src/app/api/init/route.ts`
- `scripts/run-db-migrations.ts`
- `src/app/api/wallets/[id]/reconcile/route.ts`
- `src/components/wallets/ReconcileModal.tsx`
- `src/components/wallets/WalletsView.tsx`
- `scripts/audit-self-test.ts`
- `changelog.md`
- `docs/plans/2026-08-27-fitur-rekonsiliasi-saldo-rekening-riil.md`

## Kriteria Selesai (Definition of Done)
1. Pengguna dapat menginputkan saldo rekening riil pada setiap pos kas / bank.
2. Selisih (variance) antara saldo sistem dan saldo riil terhitung dan ditampilkan secara transparan dengan analisis penyebab (lupa catat / salah nominal).
3. Tombol 1-klik rekonsiliasi dapat menyamakan saldo sistem dengan rekening riil melalui transaksi penyesuaian otomatis.
4. `npm test` dan `npm run build` lulus 100%.
