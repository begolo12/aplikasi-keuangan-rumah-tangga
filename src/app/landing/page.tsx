import { LandingView } from '@/components/landing/LandingView';

export const metadata = {
  title: 'KasKeluarga - Aplikasi Keuangan Rumah Tangga',
  description: 'Pencatatan keuangan rumah tangga mandiri: pos kas, anggaran bulanan, tagihan rutin, dan kolaborasi keluarga.',
};

export default function LandingPageRoute() {
  return <LandingView />;
}
