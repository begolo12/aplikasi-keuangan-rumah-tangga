# Plan: Fase 5 — Dompet Envelope (Tujuan Tertaut)

- Tanggal: 2026-09-01
- Status: done
- Induk: `docs/plans/2026-09-01-roadmap-improvement-aplikasi.md`

## Tujuan
Menghubungkan dompet fisik dengan savings goal secara langsung: dompet amplop (envelope) menjadi penampung target, progres goal diambil dari saldo dompet, dan kontribusi tetap tercatat sebagai transfer kas nyata.

## Keputusan Desain
- Tipe dompet baru `envelope` ditambahkan ke CHECK constraint `wallets.type` (migrasi idempoten).
- Kolom `wallets.linked_goal_id` mengikat dompet ke goal; binding di-set otomatis saat goal dibuat/diubah dengan dompet penampung.
- Progres goal: bila dompet penampung bertipe `envelope`, `saved_amount` = saldo dompet; selain itu tetap SUM kontribusi (perilaku lama).
- Kontribusi goal sudah mencatat transfer nyata (fitur existing), jadi tidak diubah.

## Ruang Lingkup
- [ ] Migrasi: relaksasi CHECK `wallets_type_check` + kolom `linked_goal_id`.
- [ ] `walletSchema` menerima tipe `envelope`; opsi di form WalletsView.
- [ ] Goals POST/PUT: binding `linked_goal_id` dua arah (bersihkan binding lama).
- [ ] Query goals: progres dari saldo envelope.

## File yang Disentuh
- `src/app/api/init/route.ts`
- `src/lib/validations.ts`
- `src/components/wallets/WalletsView.tsx`
- `src/app/api/goals/route.ts`, `src/app/api/goals/[id]/route.ts`

## Kriteria Selesai (Definition of Done)
1. Dompet envelope bisa dibuat, ditautkan ke goal, dan progres goal mengikuti saldo dompet.
2. `npm run lint` & `npm run build` lulus; `npm test` tanpa regresi.
3. Isolasi user terjaga (binding hanya untuk dompet milik user).
