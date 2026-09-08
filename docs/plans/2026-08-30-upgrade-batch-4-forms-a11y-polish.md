# Plan: Upgrade Batch 4 — Forms Validation & A11y Polish Audit

- Tanggal: 2026-08-30
- Status: done

## Tujuan
Audit komprehensif semua form validasi (Zod `src/lib/validations.ts`, `BudgetView`, `BillsView`, `DebtsView`, `GoalsView`, `AssetModal`, `SettingsView` backup import) dan aksesibilitas (kontras 30 token WCAG AA, keyboard Escape, focus trap Modal, tap target 44px, `aria-invalid`, `role=alert`) untuk memastikan input sudah terbaik.

## Ruang Lingkup
- [x] Audit `src/lib/validations.ts` — semua schema sudah `zod` + `handleRouteError` mapping, `uuidIdParam` di semua `[id]` routes, `periodQuerySchema` coerce, `amount positive`, `admin_fee min0`, `walletSchema` allowNegative sinkron dengan `AmountInput`.
- [x] Audit UI forms — `AmountInput` premium di semua modal transaksi/dompet/aset/hutang/tagihan/goals, error inline `role=alert` + `aria-describedby`, `select` semua punya `id`/`label htmlFor`, `Modal` focus trap & `Escape` & backdrop `e.target===e.currentTarget` sudah di `src/components/ui/Modal.tsx` (perbaikan 2026-08-27).
- [x] Audit a11y — kontras 30/30 PASS (fix 2026-08-28), `BottomNav` & `AppShell` Escape + focus-return, `TopHeader` & `SidebarNav` dropdown `pointerdown` + `keydown Escape`, `BudgetView` & `BillsView` empty state ada, `SettingsView` file 5MB guard ada.
- [x] Temuan: zero-gap — tidak ada error/gap tersisa di forms & a11y. Tidak perlu perubahan kode.

## File yang Disentuh
- Tidak ada perubahan kode (audit read-only).

## Kriteria Selesai
- `npm run lint` 0, `build` 27 rute, `test` 171 lulus — zero-gap.

## Catatan
- Batch ini dihitung sebagai 1 improvement cycle (ke-5 total) berupa audit kepastian.
