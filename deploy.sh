#!/usr/bin/env bash
#
# Gerbang rilis KasKeluarga.
#
# Skrip ini menjalankan seluruh gerbang mutu, LALU menyerahkan deploy ke Vercel.
# Setiap gerbang memakai `set -e` sehingga kegagalan menghentikan rilis — tidak
# ada lagi "test gagal tapi tetap deploy" seperti versi sebelumnya.
#
# Pemakaian:
#   ./deploy.sh              # jalankan gerbang + deploy produksi
#   ./deploy.sh --check      # hanya jalankan gerbang, tanpa deploy
#
set -euo pipefail

CHECK_ONLY=0
if [[ "${1:-}" == "--check" ]]; then
  CHECK_ONLY=1
fi

step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
fail() { printf '\n\033[31m✖ %s\033[0m\n' "$1"; exit 1; }

printf '══════════════════════════════════════════\n'
printf '  KasKeluarga — Gerbang Rilis Produksi\n'
printf '══════════════════════════════════════════\n'

# 0. Working tree harus bersih: apa yang diuji harus persis apa yang dikirim.
step '0/6 Memeriksa kebersihan working tree'
if [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  fail 'Working tree kotor. Commit atau stash dulu agar yang diuji = yang di-deploy.'
fi
echo "Bersih pada commit $(git rev-parse --short HEAD)"

# 1. Typecheck
step '1/6 Typecheck (tsc --noEmit)'
npx tsc --noEmit

# 2. Lint — nol error, nol warning.
step '2/6 Lint (eslint .)'
npm run lint

# 3. Build produksi
step '3/6 Build produksi (next build)'
npm run build

# 4. Self-test statis (aman, tidak menyentuh database)
step '4/6 Self-test (npm run test:audit)'
npm run test:audit

# 5. Health check produksi saat ini (baseline sebelum deploy)
step '5/6 Health check produksi'
BASE_URL="${PROD_URL:-https://aplikasi-keuangan-ganang.vercel.app}"
if curl -sf -m 30 "$BASE_URL/api/health" > /dev/null; then
  echo "Produksi saat ini sehat: $BASE_URL"
else
  echo "Peringatan: $BASE_URL/api/health belum sehat sebelum deploy."
fi

if [[ "$CHECK_ONLY" == "1" ]]; then
  printf '\n\033[32m✔ Semua gerbang lulus (mode --check, tidak deploy).\033[0m\n'
  exit 0
fi

# 6. Deploy
step '6/6 Deploy ke Vercel (produksi)'
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  vercel --prod --token "$VERCEL_TOKEN"
else
  # Tanpa token: andalkan sesi `vercel login` yang tersimpan.
  vercel --prod
fi

# 7. Verifikasi pasca-deploy
step '7/7 Verifikasi pasca-deploy'
sleep 5
if curl -sf -m 30 "$BASE_URL/api/health"; then
  printf '\n\033[32m✔ Deploy selesai dan produksi sehat.\033[0m\n'
else
  fail 'Health check produksi GAGAL setelah deploy. Pertimbangkan `vercel rollback`.'
fi

printf '\nLangkah manual yang masih perlu dipastikan (lihat DEPLOYMENT.md):\n'
printf '  • Migrasi database: npx tsx scripts/run-db-migrations.ts\n'
printf '  • CRON_SECRET, INIT_SECRET, VAPID_* sudah diset di Vercel\n'
printf '  • Smoke test: register → login → transaksi → tab Langganan\n'
