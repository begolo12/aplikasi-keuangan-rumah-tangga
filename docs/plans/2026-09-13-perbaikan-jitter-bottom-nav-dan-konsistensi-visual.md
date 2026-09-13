# Plan: Perbaikan Jitter Bottom Nav Mobile & Konsistensi Visual Menyeluruh

- Tanggal: 2026-09-13
- Status: done

## Tujuan
Menghilangkan goyangan/jitter pada bottom navigation saat scroll di perangkat mobile, dan merapikan konsistensi visual aplikasi sesuai arah desain `DESIGN.md` ("Klasik Rumah").

Dua masalah utama yang ditemukan:

1. **Jitter bottom nav**: dipicu tinggi viewport `100vh`, efek `backdrop-blur` besar pada elemen `fixed`/`sticky`, dan tidak adanya `overscroll-behavior`.
2. **Kelas CSS mati**: banyak kelas ditulis dengan sintaks Tailwind v4, padahal proyek memakai Tailwind v3.4.17. Kelas tersebut tidak pernah ter-render sehingga bayangan/opacity/blur yang dirancang tidak muncul.

## Ruang Lingkup
- [x] Ganti seluruh `min-h-screen` (100vh) menjadi `min-h-dvh` dan `height: 100vh` menjadi `100dvh`
- [x] Hilangkan `backdrop-blur` pada bottom nav; turunkan blur pada header sticky (12px → 4px)
- [x] Tambahkan `overscroll-behavior-y: none` pada root
- [x] Definisikan token Tailwind yang hilang (`shadow-2xs`, `shadow-xs`, `backdrop-blur-xs`) di `tailwind.config.ts`
- [x] Ganti kelas `animate-in fade-in zoom-in-95` pada SidebarNav dengan animasi lokal yang sudah ada
- [x] Batasi paksaan `min-height/min-width: 44px` global iOS agar tidak merusak tombol ikon kecil
- [x] Ganti warna hardcoded (`emerald-*`, `red-*`, `blue-*`, `purple-*`, gradient ungu) dengan token semantik
- [x] Naikkan seluruh tap target 36px → 44px pada kontrol mobile
- [x] Kurangi bayangan berlebihan pada elemen non-mengambang
- [x] Pindahkan warna acara keuangan dari hex hardcoded ke CSS variable semantik (ikut dark mode)
- [x] Perbaiki bug template literal rusak pada `BudgetRecommendationCard.tsx` (persentase tidak pernah terhitung)
- [x] Verifikasi `npm run lint`, `npm run build`, `npm test`

## File yang Disentuh
- `tailwind.config.ts`
- `src/app/globals.css`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/TopHeader.tsx`
- `src/components/layout/SidebarNav.tsx`
- `src/components/dashboard/BalanceHeader.tsx`
- `src/components/dashboard/WalletScroller.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/ThemeToggle.tsx`
- `src/components/ui/CategoryIcon.tsx`
- `src/components/assets/AssetsView.tsx`
- `src/components/budget/BudgetView.tsx`
- `src/components/budget/BudgetRecommendationCard.tsx`
- `src/components/budget/BudgetTemplateSelectorModal.tsx`
- `src/components/calendar/CalendarView.tsx`
- `src/components/events/EventModal.tsx`
- `src/components/household/HouseholdView.tsx`
- `src/components/reports/ColdMoneyCard.tsx`
- `src/components/subscriptions/SubscriptionsView.tsx`
- `src/components/pwa/ReminderScheduler.tsx`
- `src/components/wallets/WalletsView.tsx`
- `src/components/bills/BillsView.tsx`
- `src/components/debts/DebtsView.tsx`
- `src/components/debts/DebtItem.tsx`
- `src/components/landing/LandingView.tsx`
- `src/app/layout.tsx`
- `src/app/not-found.tsx`
- `src/components/auth/AuthCard.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Bottom nav tidak bergoyang saat scroll cepat di viewport mobile (diuji Chrome DevTools mode perangkat + perangkat nyata).
2. Semua kelas bayangan/blur/opacity yang dirancang benar-benar ter-render (dibuktikan lewat pencarian di CSS hasil build).
3. Tidak ada warna di luar palet `DESIGN.md` pada komponen yang disentuh.
4. `npm run lint` bersih, `npm run build` lulus, `npm test` 100% lulus.
5. Plan doc berstatus `done` dan tercatat di `changelog.md`.
