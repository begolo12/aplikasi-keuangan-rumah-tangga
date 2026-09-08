# Plan: Jenis Tagihan Rutin "Transfer ke Amplop"

- Tanggal: 2026-09-02
- Status: done

## Tujuan
Menutup siklus "gaji masuk → amankan dulu": tagihan rutin tipe `transfer` otomatis
memindahkan nominal dari dompet sumber (mis. rekening gaji) ke dompet amplop
(penampung target tabungan) via auto-process atau tombol jalankan.

## Ruang Lingkup
- [ ] Migrasi idempoten: `recurring_bills.to_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL`
- [ ] `RecurringType` + `RecurringBill` + `recurringBillSchema`: tipe `transfer` wajib `wallet_id` & `to_wallet_id` berbeda
- [ ] `GET/POST /api/bills`, bootstrap bills query: kembalikan `to_wallet_id`/`to_wallet_name`
- [ ] `auto-process` & `bills/[id]/pay`: tipe transfer memindahkan saldo dua dompet + catat transaksi `transfer` (lock dua dompet)
- [ ] UI `BillsView`/`useBillForm`/`BillItem`: mode transfer (pilih dompet asal & tujuan), filter & badge

## File yang Disentuh
- `src/app/api/init/route.ts`, `scripts/run-db-migrations.ts`
- `src/lib/types.ts`, `src/lib/validations.ts`
- `src/app/api/bills/route.ts`, `src/app/api/bills/[id]/pay/route.ts`, `src/app/api/bills/auto-process/route.ts`
- `src/app/api/dashboard/bootstrap/route.ts` (bagian query bills)
- `src/components/bills/BillsView.tsx`, `useBillForm.ts`, `BillItem.tsx`

## Kriteria Selesai (Definition of Done)
- `npm run build` + `npm run test:audit` lulus (tambah assert schema transfer bill),
  auto-process transfer memindahkan saldo dua dompet dan tercatat sebagai transaksi transfer.
