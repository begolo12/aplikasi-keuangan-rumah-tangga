# Plan: Audit Flow & Rencana Perbaikan KasKeluarga

- Tanggal: 2026-09-03
- Status: done

## Keputusan Brainstorm (2026-09-03)
- Batch dieksekusi: 1 + 2 + 3 + 4 (semua disetujui user).
- Saldo shared: gabung jadi satu total (pribadi + dompet bersama yang bisa diakses).
- Jual aset: catat gain saja (selisih jual minus nilai buku), bukan full income.

## Tujuan

Audit end-to-end seluruh flow aplikasi (transaksi-dompet, hutang-tagihan-anggaran,
aset-goal-household-laporan, auth-PWA-pengaturan) untuk menemukan kejanggalan dan
kekurangan, lalu menyepakati prioritas perbaikan bersama user sebelum eksekusi.

Metode: 4 scout audit paralel (read-only) + verifikasi manual klaim kritis di kode.
Dua temuan prioritas 1 sudah dikonfirmasi langsung di source (lihat P1-A, P1-B).

## Temuan Terkonfirmasi (FAKTA, ada bukti file:line)

### P1 — Salah hitung angka uang (perbaiki dulu)

- [ ] **P1-A Double-count cicilan di dashboard (TERKONFIRMASI)**.
  Query debts di `src/app/api/dashboard/bootstrap/route.ts:175-205` TIDAK memilih
  `active_bills_count`, tapi loop `route.ts:350-373` membacanya (hasil selalu 0,
  `hasActiveBill` selalu false). Akibat: cicilan KPR dihitung DUA kali di
  safe-to-spend (sekali via `totalBillsPendingAmount`, sekali via `totalPayableDue`).
  Pembanding yang benar ada di `src/app/api/reports/monthly/route.ts:105-116`
  (punya subquery `active_bills_count`). Komentar `bootstrap:342-344` mengklaim
  "tidak dihitung ganda" padahal kodenya tidak memenuhi klaim itu.
- [ ] **P1-B Total saldo abaikan dompet bersama (TERKONFIRMASI)**.
  `bootstrap/route.ts:119` (`SUM(balance) WHERE user_id=$1`) vs daftar dompet
  `bootstrap/route.ts:28-34` (menyertakan `is_shared` household). Akibat bagi
  anggota household: total saldo + safe-to-spend understated, daftar dompet tidak
  cocok dengan totalnya.
- [ ] **P1-C Laporan bulanan vs tahunan/CSV tidak konsisten (dari audit)**.
  `reports/monthly/route.ts` filter `t.user_id=$1` saja, sementara yearly/category/
  export-csv + bootstrap memakai filter shared-wallet. Akibat: anggota household
  melihat angka bulanan kecil tapi tahunan besar; agregat keluarga bisa terhitung
  2-3x bila digabung manual.

### P2 — Jalur bayar & relasi yang asimetris

- [ ] **P2-A Dua jalur bayar hutang tidak simetris**: `bills/[id]/pay` menolak
  duplikat periode (error), `debts/[id]/pay` silent-skip `bill_payments` tapi tetap
  potong kas + tambah `paid_amount`. Bayar bulan yang sama via dua jalur = expense
  dan `paid_amount` ganda.
- [ ] **P2-B Hapus tidak jurnal-balik**: `DELETE bills` menghapus `bill_payments`
  tanpa koreksi `debts.paid_amount` (menggantung); `DELETE debts` meninggalkan
  transaksi kas (saldo tidak kembali). `PUT` ubah total tanpa sentuh histori.
- [ ] **P2-C Izin dompet bersama tidak seragam**: transaksi mengizinkan shared,
  tapi rekonsiliasi + PUT/DELETE wallet + jual aset + kontribusi goal
  (`WHERE user_id`) menolaknya. Anggota bisa mencatat di dompet bersama tapi 404
  saat rekonsiliasi/ubah, dan tidak bisa menerima hasil jual/iuran goal di dompet
  bersama (UX buntu).
- [ ] **P2-D Goal dual-basis rapuh**: progres = saldo dompet bila `envelope`, tapi
  = SUM kontribusi bila bukan. Belanja langsung dari dompet penampung non-envelope
  menurunkan saldo tapi progres tetap (progres palsu). Binding dompet bisa direbut
  goal lain tanpa peringatan.
- [ ] **P2-E Jual aset gelembungkan income**: seluruh `selling_price` dicatat income
  (bukan gain saja) sehingga savings rate bulan jual meledak; cost basis hilang.
  `DELETE` aset meninggalkan transaksi + membiarkan tagihan pajak aktif.
- [ ] **P2-F Backup/restore putuskan relasi**: import membuang `household_id`,
  `linked_goal_id`, `asset_id`, `debt_id`, `transaction_id` kontribusi. Restore =
  keluar household diam-diam + progres goal tidak bisa direkonsiliasi.

### P3 — Notifikasi, sesi, dan hardening

- [ ] **P3-A Notifikasi ganda**: tagihan H-0/H-1 dikirim via ReminderScheduler lokal
  + cron web-push + insight `bill_tip` dengan tag berbeda (tidak dedup). Satu
  tagihan bisa memicu 2-3 pengingat.
- [ ] **P3-B Sesi kadaluarsa buntu**: `requireAuth` 401 tengah-sesi hanya jadi banner
  (`page.tsx`), tidak redirect ke login. Hanya `/api/auth/me` awal yang redirect.
- [ ] **P3-C Rate-limit timpang**: hanya login + reset yang dilimit; register,
  import/export, parse-receipt (biaya AI), subscribe tanpa limit. Login punya
  timing oracle (email tak-ada vs password-salah beda waktu).
- [ ] **P3-D Import destruktif tanpa pengaman server**: konfirmasi hanya di client,
  tanpa token RESET/rate-limit; duplikat `bill_payments` di-skip diam-diam,
  kategori tak dikenal jadi NULL.
- [ ] **P3-E Klaim offline melebihi realita**: SW `fetch` tanpa fallback cache
  (halaman offline = error), antrean offline hanya untuk create/update transaksi.

### Kekurangan (bukan bug, tapi flow belum lengkap)

- [ ] Tanpa peringatan overdraft/budget saat input expense (minus diizinkan diam-diam).
- [ ] Tanpa riwayat rekonsiliasi/audit trail; penyesuaian rekonsiliasi menggelembungkan
  ringkasan income/expense bulan itu (transaksi `category_id` NULL ikut summary).
- [ ] `admin_fee` income diabaikan diam-diam; fee transfer menguap dari pembukuan
  (tidak tercatat sebagai expense berkategori); UI hanya bisa input fee untuk transfer.
- [ ] Cicilan tidak menggerus budget (transaksi cicilan tanpa kategori).
- [ ] Tanpa cron auto-record tagihan (hanya tombol manual); piutang tidak pernah auto-bill.
- [ ] Tanpa alur "lunasi hutang dari hasil jual aset"; hutang `create_asset` tidak
  menyimpan `asset_id` balik (relasi hanya via notes).
- [ ] Tanpa reset selektif per-modul; tanpa unifikasi preferensi notifikasi server-side.

## Ruang Lingkup (usulan batch, BUTUH persetujuan user)

- [x] **Batch 1 — Angka benar**: P1-A (subquery `active_bills_count` di bootstrap
  `route.ts:186`), P1-B (total saldo sertakan shared, `route.ts:119` + monthly:33),
  P1-C (filter household disatukan di monthly income/expense/transfer/harian +
  nama dompet shared di export-CSV). Assert kontrak di `audit-self-test.ts:447-451`.
  Verifikasi: `test:audit` 148 passed, eslint 5 file bersih, 3 query dibuktikan jalan
  di live DB via probe read-only (dihapus). Catatan: `npm run build` crash di fase
  static-generation baik dengan maupun tanpa perubahan ini (isu toolchain/Node 24
  pre-existing, fase TypeScript lulus).
- [x] **Batch 2 — Bayar & hapus konsisten**: P2-A (guard duplikat periode di
  `debts/[id]/pay` + `FOR UPDATE` baris tagihan di dua jalur bayar), P2-B (jurnal-balik
  `paid_amount` saat hapus tagihan + guard batas ledger di `debts` PUT; hapus hutang
  dibiarkan karena FK CASCADE + kas riil tetap), P2-E (jual catat laba/rugi vs nilai
  buku saja + copy modal jujur).
  Verifikasi: eslint 6 file bersih, `test:audit` 148 passed, tanpa migrasi DB.
- [x] **Batch 3 — Household & goal**: P2-C (aturan seragam: operasional shared-aware
  via `walletAccessCondition` di rekonsiliasi/kontribusi/jual; struktural owner-only +
  403 jelas), P2-D (tolak rebut binding antar-goal + progres non-envelope jujur via
  LEAST), P2-F (restore pertahankan is_shared/linked_goal/debt-bill-asset/transaction_id
  + skema backward-compat), report sadar transfer (kolom + UI).
  Verifikasi: eslint 11 file 0 error, `test:audit` 148 passed, tanpa migrasi baru
  (kolom yang dipakai sudah ada di skema).
- [x] **Batch 4 — Notifikasi & sesi**: P3-A (push cron per-tagihan dgn tag sama dgn
  reminder lokal sehingga menimpa), P3-B (redirect 401 global di apiFetch),
  P3-C (limit register/AI/subscribe + dummy bcrypt anti timing oracle),
  P3-D (limit import/export + pesan restore tampilkan hitungan),
  P3-E (halaman offline.html + fallback SW, cache v4).
  Verifikasi: eslint 9 file 0 error, `test:audit` 148 passed, tanpa migrasi DB.
- [x] **Batch 5 — Kekurangan flow**: peringatan overdraft/budget pre-submit (non-blokir),
  fee transfer/expense dibukukan sbg expense pendamping berkategori (tolak fee income
  & fee baru via edit), cicilan masuk budget (kategori opsional di form hutang +
  dipakai saat bayar), cron harian auto-record (`/api/bills/cron`, inti diekstrak ke
  `lib/billAutoProcess.ts`), lunasi hutang dari hasil jual (API + modal + daftar hutang).
  Verifikasi: tsc 0 error, eslint 0 error (7 warning pre-existing), `test:audit`
  151 passed, query cron dibuktikan jalan di live DB via probe read-only (dihapus).
## File yang Disentuh (perkiraan, dikunci saat batch disetujui)

- `src/app/api/dashboard/bootstrap/route.ts`
- `src/app/api/reports/monthly/route.ts`, `yearly/route.ts`, `category/route.ts`, `export-csv/route.ts`
- `src/app/api/debts/**`, `src/app/api/bills/**` (termasuk `auto-process`, `[id]/pay`)
- `src/app/api/assets/[id]/sell/route.ts`, `src/app/api/goals/**`, `src/app/api/households/report/route.ts`
- `src/app/api/backup/import/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/page.tsx`
- `src/components/pwa/ReminderScheduler.tsx`, `PushEnabler.tsx`, `public/sw.js`
- `scripts/audit-self-test.ts`

## Kriteria Selesai (Definition of Done)

- Batch yang disetujui user tereksekusi tanpa mengubah batch lain.
- `npm run build` lulus, `npm run test:audit` lulus (tambah assert untuk angka yang diperbaiki).
- Data isolation multi-user tetap terjaga (query selalu filter user/household id).
- Input divalidasi Zod; perubahan perilaku dicatat di `changelog.md` + status plan ini jadi `done`.
