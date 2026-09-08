# Plan: E2E Verifikasi Akun Uji

- Tanggal: 2026-09-01
- Status: cancelled

## Tujuan
Menjalankan seluruh suite E2E terhadap akun baru dan database yang terisolasi, lalu mencatat kegagalan yang dapat direproduksi.

## Ruang Lingkup
- [ ] Jalankan migrasi schema pada database test.
- [ ] Buat akun E2E timestamped.
- [ ] Jalankan seluruh skenario domain dan teardown.
- [ ] Catat setiap kegagalan dan perbaiki dalam plan terpisah.

## File yang Disentuh
`scripts/e2e-full-suite.ts`, `docs/plans/2026-09-01-e2e-verifikasi-akun-uji.md`.

## Kriteria Selesai (Definition of Done)
- Suite selesai tanpa error runtime.
- Semua assertion lulus.
- Akun test dan seluruh data turunannya terhapus.

## Status Eksekusi
Tidak dijalankan terhadap `.env.local` karena probe menunjukkan database Neon `neondb` berisi 5 user dan tidak ada penanda bahwa database tersebut aman untuk pengujian destruktif. Suite melakukan insert, update saldo, dan delete langsung. Menjalankan tanpa database test terisolasi berisiko mengubah data nyata.
