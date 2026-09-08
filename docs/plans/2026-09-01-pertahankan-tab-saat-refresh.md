# Plan: Pertahankan Tab Aktif Saat Refresh

- Tanggal: 2026-09-01
- Status: done
- Revisi: 2026-09-01 — fix hydration SSR

## Tujuan
Saat ini refresh (F5) selalu kembali ke Beranda meski user sedang di tab lain (mis. Anggaran). Harapan: refresh mengembalikan ke halaman yang sama.

## Keputusan Desain
- Simpan tab aktif terakhir di `sessionStorage` (`kaskeluarga-active-tab`) setiap kali user berpindah tab.
- State awal `activeTab` dibaca dari sessionStorage (divalidasi terhadap daftar NavTab; fallback Beranda).
- `replaceState` awal memakai tab tersimpan (bukan hardcode 'dashboard') agar perilaku tombol back tetap konsisten.
- sessionStorage dipilih (bukan localStorage/hash): per-perangkat & per-sesi, tanpa mengubah URL.

## Revisi Hydration (2026-09-01)
- **Root cause**: `getInitialTab()` dipanggil di `useState` lazy initializer. Saat SSR `window` undefined → selalu `dashboard`. Saat hydration React mempertahankan state server (`dashboard`) sehingga `sessionStorage` tidak pernah dibaca → refresh selalu balik Home.
- **Fix**: Pertahankan `getInitialTab()` untuk fallback, tapi tambah efek mount `useEffect(() => { read sessionStorage; setActiveTab/tabHistory + replaceState })` dengan guard `hasRestoredTabRef`. `tabHistory` init dari `getInitialTab()` agar sinkron. Hapus `replaceState` unconditional dari efek `popstate` (sudah ditangani efek restore). Build tetap `lint` 0 error, 5 warnings (pre-existing + 1 hydration-safe).

## Ruang Lingkup
- [x] Helper `getInitialTab()` + validasi daftar tab.
- [x] Simpan tab saat `handleTabChange`.
- [x] Ganti hardcode 'dashboard' pada replaceState awal.
- [x] Fix hydration: efek mount restore + guard `hasRestoredTabRef`.

## File yang Disentuh
- `src/app/page.tsx`

## Kriteria Selesai
1. Refresh di tab mana pun kembali ke tab tersebut.
2. `npm run lint` & `npm run build` lulus.
