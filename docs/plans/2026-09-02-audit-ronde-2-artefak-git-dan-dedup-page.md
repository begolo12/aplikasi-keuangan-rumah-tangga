# Plan: Perbaikan Hasil Audit Ronde 2 (Artefak Git & Dedup page.tsx)

- Tanggal: 2026-09-02
- Status: done

## Tujuan
Menindaklanjuti audit ponytail ronde 2: keluarkan artefak sesi tooling dari git dan
hapus duplikasi logika persistensi tab di `page.tsx`.

## Ruang Lingkup
- [ ] `git rm --cached .zcode/plans/plan-sess_*.md` + tambah `.zcode/` ke `.gitignore` (tanpa commit)
- [ ] Ekstrak `readSavedTab()` modul-level; `getInitialTab()` memakainya (hapus duplikasi fallback 3 lapis)
- [ ] Ekstrak `persistTab()` untuk penulisan sessionStorage+localStorage (dipakai di handleTabChange & handlePopState)
- [ ] Banner `deleteError` dirender sekali di atas view switcher (sebelumnya 2 salinan JSX identik)

## File yang Disentuh
- `.gitignore`
- `src/app/page.tsx`

## Kriteria Selesai (Definition of Done)
- `npm run build` lulus; perilaku restore-tab dan back-button tidak berubah.
