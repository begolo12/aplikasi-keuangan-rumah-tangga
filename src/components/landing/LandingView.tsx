'use client';

import React from 'react';
import Link from 'next/link';
import {
  Wallet,
  Vault,
  Receipt,
  UsersThree,
  ShieldCheck,
  DeviceMobile,
  ArrowRight,
  Database,
  LockKey,
  Check,
} from '@phosphor-icons/react';

export function LandingView() {
  return (
    <div className="min-h-dvh bg-background text-text selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-surface border-b border-border shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary text-primary-fg flex items-center justify-center shadow-xs">
                <Wallet size={20} weight="duotone" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-text">KasKeluarga</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-6">
              <Link href="#fitur" className="hidden sm:inline-block text-text-muted hover:text-text transition-colors text-sm font-semibold">
                Fitur
              </Link>
              <Link href="#mode" className="hidden sm:inline-block text-text-muted hover:text-text transition-colors text-sm font-semibold">
                Mode Pemakaian
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-text text-sm font-bold transition-all"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-fg text-sm font-bold transition-all shadow-xs"
              >
                Daftar Akun
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
            <ShieldCheck size={16} weight="fill" />
            <span>Pencatatan Keuangan Mandiri & Bebas Iklan</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-text">
            Buku Kas Rumah Tangga yang <span className="text-primary">Rapi &amp; Tenang</span>
          </h1>

          <p className="text-base sm:text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
            Monitor saldo dompet, pos anggaran belanja bulanan, tagihan rutin, serta evaluasi dana darurat secara transparan tanpa pelacakan data pribadi.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/register"
              className="px-7 py-3.5 bg-primary hover:bg-primary-hover text-primary-fg rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Mulai Buka Kas Keluarga</span>
              <ArrowRight size={18} weight="bold" />
            </Link>
            <Link
              href="/login"
              className="px-7 py-3.5 bg-surface hover:bg-surface-2 border border-border text-text rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2"
            >
              Masuk ke Aplikasi
            </Link>
          </div>
        </div>
      </section>

      {/* Core Highlights */}
      <section id="fitur" className="py-16 px-4 sm:px-6 border-t border-border/80 bg-surface/50">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
              Fondasi Finansial Rumah Tangga
            </h2>
            <p className="text-sm text-text-muted">
              Fitur dirancang sesuai kebutuhan nyata pengeluaran dapur, tagihan berkala, hingga target masa depan.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-6 bg-surface border border-border rounded-2xl space-y-3 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Wallet size={24} weight="duotone" />
              </div>
              <h3 className="text-base font-bold text-text">Multi-Pos Kas & Rekening</h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Pisahkan dana tunai harian, tabungan bank, dan e-wallet. Dilengkapi rekonsiliasi saldo riil dan dukungan saldo minus/kartu kredit.
              </p>
            </div>

            <div className="p-6 bg-surface border border-border rounded-2xl space-y-3 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Vault size={24} weight="duotone" />
              </div>
              <h3 className="text-base font-bold text-text">Anggaran Bulanan Berjalan</h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Kendalikan pos belanja dengan limit bulanan, sisa kuota harian (Safe-to-Spend), serta rollover sisa anggaran ke bulan berikutnya.
              </p>
            </div>

            <div className="p-6 bg-surface border border-border rounded-2xl space-y-3 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Receipt size={24} weight="duotone" />
              </div>
              <h3 className="text-base font-bold text-text">Tagihan & Cicilan Rutin</h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Jadwal jatuh tempo listrik, air, internet, KPR, dan langganan berulang dengan pencatatan otomatis saat jatuh tempo tiba.
              </p>
            </div>

            <div className="p-6 bg-surface border border-border rounded-2xl space-y-3 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UsersThree size={24} weight="duotone" />
              </div>
              <h3 className="text-base font-bold text-text">Kas Keluarga Bersama</h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Bagikan pos kas tertentu bersama pasangan. Transaksi tercatat transparan dengan nama pencatat tanpa merusak privasi pos pribadi.
              </p>
            </div>

            <div className="p-6 bg-surface border border-border rounded-2xl space-y-3 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <DeviceMobile size={24} weight="duotone" />
              </div>
              <h3 className="text-base font-bold text-text">PWA Siap Pakai Offline</h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Pasang langsung di homescreen HP atau desktop. Tetap dapat mencatat saat offline di pasar atau toko tanpa koneksi internet.
              </p>
            </div>

            <div className="p-6 bg-surface border border-border rounded-2xl space-y-3 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Database size={24} weight="duotone" />
              </div>
              <h3 className="text-base font-bold text-text">Kedaulatan Data Penuh</h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Ekspor dan impor data pembukuan keluarga dalam format JSON dan CSV kapan saja. Data milik Anda seutuhnya tanpa sistem sewa berbayar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Real Architecture & Security Section (Replaces Fake Numbers) */}
      <section className="py-16 px-4 sm:px-6 bg-surface-2/60 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
              Keamanan & Keandalan Sistem
            </h2>
            <p className="text-sm text-text-muted">
              Standar rekayasa perangkat lunak untuk menjaga integritas pembukuan kas.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            <div className="p-5 bg-surface border border-border rounded-2xl space-y-2 text-center sm:text-left">
              <div className="w-9 h-9 rounded-xl bg-income/10 text-income flex items-center justify-center mb-3 mx-auto sm:mx-0">
                <LockKey size={20} weight="duotone" />
              </div>
              <h4 className="font-bold text-sm text-text">Autentikasi Aman</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Sesi JWT terlindung cookie httpOnly dengan token versioning untuk pembatalan login global.
              </p>
            </div>

            <div className="p-5 bg-surface border border-border rounded-2xl space-y-2 text-center sm:text-left">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 mx-auto sm:mx-0">
                <Database size={20} weight="duotone" />
              </div>
              <h4 className="font-bold text-sm text-text">Integritas Buku Besar</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Transaksi atomik SQL dan row-locking mencegah selisih saldo kas atau race condition saat transfer.
              </p>
            </div>

            <div className="p-5 bg-surface border border-border rounded-2xl space-y-2 text-center sm:text-left">
              <div className="w-9 h-9 rounded-xl bg-transfer/10 text-transfer flex items-center justify-center mb-3 mx-auto sm:mx-0">
                <ShieldCheck size={20} weight="duotone" />
              </div>
              <h4 className="font-bold text-sm text-text">Privasi Tanpa Iklan</h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Bebas tracker iklan dan pihak ketiga. Seluruh catatan keuangan disimpan rapi dan terisolasi per akun.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Modes Section (Replaces Fake SaaS Pricing) */}
      <section id="mode" className="py-16 sm:py-20 px-4 sm:px-6 border-t border-border">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight">
              Pilihan Mode Penggunaan
            </h2>
            <p className="text-sm text-text-muted">
              Gunakan untuk pembukuan mandiri atau ajak pasangan berkolaborasi mengelola rumah tangga bersama.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Mode 1: Mandiri */}
            <div className="p-7 bg-surface border border-border rounded-3xl space-y-6 flex flex-col justify-between shadow-2xs">
              <div className="space-y-4">
                <div className="inline-block px-3 py-1 bg-surface-2 border border-border text-text-muted text-xs font-bold rounded-xl">
                  Penggunaan Mandiri
                </div>
                <h3 className="text-xl font-bold text-text">Buku Kas Pribadi</h3>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                  Ideal untuk individu yang ingin mendisiplinkan pengeluaran bulanan, menabung rutin, dan melacak arus kas harian.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-text">
                  <li className="flex items-center gap-2">
                    <Check size={16} weight="bold" className="text-income shrink-0" />
                    <span>Pos kas & rekening tidak terbatas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} weight="bold" className="text-income shrink-0" />
                    <span>Anggaran bulanan dengan batas harian</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} weight="bold" className="text-income shrink-0" />
                    <span>Pencatatan hutang piutang & cicilan KPR</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} weight="bold" className="text-income shrink-0" />
                    <span>PWA offline-ready di Android / iOS / PC</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3 text-center bg-surface-2 hover:bg-surface-3 border border-border text-text font-bold text-sm rounded-xl transition-all block"
              >
                Mulai Mode Mandiri
              </Link>
            </div>

            {/* Mode 2: Keluarga Bersama */}
            <div className="p-7 bg-surface border-2 border-primary/40 rounded-3xl space-y-6 flex flex-col justify-between shadow-xs relative">
              <div className="space-y-4">
                <div className="inline-block px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-xl">
                  Kolaborasi Pasangan
                </div>
                <h3 className="text-xl font-bold text-text">Kas Keluarga Bersama</h3>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                  Solusi ideal suami-istri untuk membagi tanggungan kebutuhan dapur, uang sekolah, dan cicilan bersama.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-text">
                  <li className="flex items-center gap-2">
                    <Check size={16} weight="bold" className="text-primary shrink-0" />
                    <span>Semua fitur mode mandiri</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} weight="bold" className="text-primary shrink-0" />
                    <span>Berbagi pos dompet bersama via kode undangan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} weight="bold" className="text-primary shrink-0" />
                    <span>Jejak nama pencatat pada setiap transaksi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={16} weight="bold" className="text-primary shrink-0" />
                    <span>Laporan ringkasan kontribusi kas rumah tangga</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3 text-center bg-primary hover:bg-primary-hover text-primary-fg font-bold text-sm rounded-xl transition-all block shadow-xs"
              >
                Mulai Kelola Keluarga
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-border py-10 px-4 sm:px-6 text-text-muted text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-primary text-primary-fg flex items-center justify-center">
              <Wallet size={14} weight="duotone" />
            </div>
            <span className="font-extrabold text-text">KasKeluarga</span>
            <span className="text-border">|</span>
            <span>Aplikasi Keuangan Rumah Tangga</span>
          </div>

          <div className="flex items-center gap-5 font-semibold">
            <Link href="/login" className="hover:text-text transition-colors">Masuk</Link>
            <Link href="/register" className="hover:text-text transition-colors">Daftar</Link>
            <Link href="/api/health" className="hover:text-text transition-colors">Status API</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
