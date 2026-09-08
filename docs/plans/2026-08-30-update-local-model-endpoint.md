# Plan: Update Konfigurasi Model DeepSeek Local Endpoint

- Tanggal: 2026-08-30
- Status: cancelled

## Tujuan
Mengubah nilai `DEEPSEEK_BASE_URL` dan `DEEPSEEK_MODEL` pada file lingkungan agar mengarah ke local endpoint `http://localhost:20128/v1` dengan model AI terbaru yang tersedia (`ag/gemini-3.6-flash-high`).

## Ruang Lingkup
- [x] Update `.env.local`
- [x] Update `.env.example`

## File yang Disentuh
- `.env.local`
- `.env.example`

## Kriteria Selesai (Definition of Done)
- Environment variable `DEEPSEEK_BASE_URL` terarah ke `http://localhost:20128/v1`
- Environment variable `DEEPSEEK_MODEL` terarah ke `ag/gemini-3.6-flash-high`
- Verifikasi `npm run build` lulus.
