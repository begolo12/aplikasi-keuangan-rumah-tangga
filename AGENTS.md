# AGENTS.md — Aturan untuk AI Agent

Repo: **KasKeluarga** — aplikasi keuangan rumah tangga (Next.js 15 App Router + TypeScript + Tailwind + Neon Postgres + JWT auth). Bahasa UI & dokumentasi: **Indonesia**.

---

## 1. Alur Kerja Wajib: Plan → Docs → Changelog

Setiap pekerjaan yang lebih dari sekadar perbaikan tipografi/typo WAJIB melalui siklus berikut. Jangan pernah mulai implementasi sebelum plan tertulis.

### Langkah 1 — Buat Plan Doc (SEBELUM coding)

- Simpan plan di `docs/plans/<tanggal>-<nama-fitur>.md`
  - Contoh nama file: `2026-08-24-fitur-laporan-bulanan.md`
- Format minimal plan doc:

```markdown
# Plan: <Nama Fitur / Perubahan>

- Tanggal: YYYY-MM-DD
- Status: draft | running | done | cancelled

## Tujuan
Apa masalahnya, apa hasil akhir yang diinginkan.

## Ruang Lingkup
- [ ] Item pekerjaan 1
- [ ] Item pekerjaan 2

## File yang Disentuh
Daftar path file/folder yang akan dibuat/diubah.

## Kriteria Selesai (Definition of Done)
Syarat konkret agar plan dianggap selesai (build lulus, fitur jalan, dll).
```

- Update field `Status` saat plan mulai dikerjakan (`running`) dan setelah selesai (`done`).

### Langkah 2 — Eksekusi Plan

- Kerjakan sesuai ruang lingkup. Perubahan di luar scope harus dicatat di plan doc terlebih dahulu.
- Verifikasi sebelum klaim selesai: `npm run build` lulus, tidak ada error TypeScript baru.

### Langkah 3 — Catat ke Changelog (SETELAH plan selesai)

- Tambahkan entri BARU di bagian paling atas `changelog.md` (jangan menimpa entri lama).
- Format entri:

```markdown
## [YYYY-MM-DD] <Judul Plan>

**Plan**: `docs/plans/<nama-file-plan>.md`

### Berubah
- Ringkasan perubahan nyata yang dilakukan (file, fitur, perbaikan).

### Dampak
Catatan migrasi, breaking change, atau hal yang perlu diketahui user.
(Hapus bagian ini jika tidak ada.)
```

- Satu plan = satu entri changelog. Jangan gabung beberapa plan dalam satu entri.

---

## 2. Pengecualian

Tanpa plan doc boleh hanya jika:
- Fix typo, ubah komentar, atau perbaikan satu baris tanpa mengubah perilaku.
- User secara eksplisit meminta langsung tanpa plan.

Meski tanpa plan doc, **perubahan tetap dicatat** ke `changelog.md` sebagai entri ringkas.

---

## 3. Konteks Proyek

| Hal | Nilai |
|---|---|
| Dev server | `npm run dev` |
| Build check | `npm run build` |
| Lint | `npm run lint` |
| Test audit | `npm test` (`scripts/audit-self-test.ts`) |
| Node minimum | >= 22 |

### Struktur penting
- `src/` — kode aplikasi (App Router)
- `docs/plans/` — semua plan dokumen (WAJIB isi di sini)
- `changelog.md` — log eksekusi plan (WAJIB update setelah eksekusi)
- Database: Neon Serverless Postgres, init via `POST /api/init`
- Auth: JWT (`jose`) di httpOnly cookie + bcryptjs

### Aturan teknis tambahan
- Jangan commit `.env.local`, `env-*.json`, atau secret apa pun.
- Validasi input pakai Zod; query DB selalu filter by user id (data isolation multi-user).
- Saldo dompet bersifat strict-zero: larang transaksi/transfer yang membuat saldo minus.
