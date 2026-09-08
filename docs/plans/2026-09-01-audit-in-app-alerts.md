# Plan: Audit dan Verifikasi Alert In-App

- Tanggal: 2026-09-01
- Status: done

## Tujuan
Memastikan seluruh komponen dan interaksi di aplikasi KasKeluarga menggunakan notifikasi/alert/dialog in-app (komponen UI terintegrasi), tanpa menggunakan dialog bawaan browser (window.alert, window.confirm, window.prompt).

## Ruang Lingkup
- [x] Sweep kode sumber untuk pola lert(), window.alert(), confirm(), window.confirm(), prompt(), window.prompt().
- [x] Verifikasi modul UI (ConfirmModal, error banners, inline confirms, toast feedback).
- [x] Verifikasi build TypeScript dan audit test suite (
pm run build, 
pm run test:audit).

## File yang Disentuh
- scripts/audit-self-test.ts (penambahan fallback JWT_SECRET untuk lingkungan tes audit)
- docs/plans/2026-09-01-audit-in-app-alerts.md
- changelog.md

## Kriteria Selesai (Definition of Done)
- 0 kemunculan popup/dialog bawaan browser (lert, confirm, prompt) di seluruh codebase src/.
- 
pm run build lulus tanpa error.
- 
pm run test:audit lulus 136/136 test.
