# Plan: Fase 4 — AI Receipt Learning

- Tanggal: 2026-09-01
- Status: done
- Induk: `docs/plans/2026-09-01-roadmap-improvement-aplikasi.md`

## Tujuan
Struk AI sudah ada; tingkatkan akurasinya seiring pemakaian dengan mempelajari pemetaan merchant → kategori dari kebiasaan user.

## Ruang Lingkup
- [ ] Migrasi: tabel `merchant_category_map` per user (merchant_name unik per user → category_id, hit correct_count / override_count).
- [ ] API `POST /api/ai/merchant-map`: simpan mapping saat user override kategori manual; endpoint GET opsional tidak dibutuhkan.
- [ ] Route `parse-receipt`: cek mapping dulu → bila match dengan confidence tinggi (correct_count >= 2 dan rasio benar ≥ 0.6), auto-set kategori tanpa perlu konfirmasi.
- [ ] `TransactionModal`: saat user mengubah kategori dan transaksi berasal dari struk AI dengan merchant, kirim mapping ke server.
- [ ] Validasi Zod untuk mapping.

## File yang Disentuh
- `src/app/api/init/route.ts` (migrasi tabel)
- `src/app/api/ai/parse-receipt/route.ts`
- `src/app/api/ai/merchant-map/route.ts` (baru)
- `src/components/transactions/TransactionModal.tsx`
- `src/lib/validations.ts`, `src/lib/types.ts`, `src/lib/apiFetch.ts`

## Kriteria Selesai (Definition of Done)
1. Override kategori pada struk tersimpan sebagai mapping; parse struk berikutnya dari merchant yang sama langsung mengusulkan kategori hasil belajar.
2. `npm run lint` dan `npm run build` lulus 0 error; `npm test` tanpa regresi.
3. Isolasi per user terjaga (mapping terikat user_id).
