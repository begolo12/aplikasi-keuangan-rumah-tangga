# Plan: Upgrade Batch 2 — AssetModal AmountInput & Reports Timeout Polish

- Tanggal: 2026-08-30
- Status: done

## Tujuan
Menyempurnakan sisa input mentah di `AssetModal` agar 100% pakai `AmountInput` premium (konsisten dengan dompet/transaksi), serta menambah ketahanan `ReportsView` terhadap fetch histori yang menggantung. Setelah batch 1, semua input transaksi/dompet sudah terbaik; batch 2 menutup gap di aset & laporan.

## Ruang Lingkup
- [x] **A1 — AssetModal migrasi AmountInput**
  - Import `AmountInput` di `AssetModal.tsx`.
  - State `purchasePrice`, `currentValue`, `salvageValue` ubah dari `string` → `number`. Inisialisasi `Number(initialData?.purchase_price) || 0`.
  - Ganti 3 input `type="number"` mentah untuk harga beli / taksiran pasar / residu menjadi `<AmountInput>`.
  - `taxAmount` & `maintenanceAmount` ganti input mentah menjadi `<AmountInput>` (hapus `type="number"`).
  - Sesuaikan `priceNum = purchasePrice`, `marketNum = currentValue >0 ? currentValue : priceNum`, `salvageNum = salvageValue`.

- [x] **A2 — ReportsView timeout & polish**
  - History 4 bulan tambahkan timeout 8 detik per request via `Promise.race([fetch, timeout(8000)])` → fallback `null` (sudah `.catch(()=>null)`).

- [x] **A3 — Minor polish**
  - `usefulLifeYears` min-h naik 40px→44px untuk tap target konsisten.

## File yang Disentuh
- `src/components/assets/AssetModal.tsx`
- `src/components/reports/ReportsView.tsx`

## Kriteria Selesai
- `npm run build` lulus, `lint` 0, `test` 171 lulus.
- Verifikasi manual: (a) AssetModal harga beli/taksiran/residu via AmountInput dengan preset & format Rupiah; (b) submit aset baru 24jt/20jt/2jt berhasil & depresiasi benar; (c) pajak & servis via AmountInput; (d) ReportsView history tetap tampil meski satu request timeout.

## Risiko & Mitigasi
- Migrasi string→number: inisialisasi 0 tidak trigger required false — handler cek `priceNum <=0`.
- AmountInput allowNegative tidak perlu untuk aset (harga >0) — default false.
