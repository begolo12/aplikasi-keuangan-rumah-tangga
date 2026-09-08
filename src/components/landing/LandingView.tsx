'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Wallet, 
  ChartPieSlice, 
  Sparkle, 
  ShieldCheck, 
  UsersThree,
  Clock,
  ArrowRight,
  Star
} from '@phosphor-icons/react';

export function LandingView() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-teal-50">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-lg border-b border-emerald-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Wallet size={32} weight="fill" className="text-emerald-600" />
              <span className="text-xl font-bold text-emerald-900">KasKeluarga</span>
            </div>
            <div className="flex items-center gap-4 sm:gap-8">
              <Link href="#fitur" className="hidden sm:inline-block text-gray-600 hover:text-emerald-600 transition-colors text-sm font-medium">Fitur</Link>
              <Link href="#harga" className="hidden sm:inline-block text-gray-600 hover:text-emerald-600 transition-colors text-sm font-medium">Harga</Link>
              <Link href="/login" className="px-5 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all shadow-xs">
                Masuk
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight tracking-tight">
            Kelola Keuangan{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
              Keluarga
            </span>{' '}
            Jadi Lebih Mudah
          </h1>
          <p className="text-base sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Aplikasi manajemen keuangan rumah tangga terlengkap dengan fitur AI-powered budgeting, multi-currency support, dan tracking subscription otomatis. PWA-ready untuk Android, iOS, Windows & macOS.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register" 
              className="px-8 py-3.5 sm:py-4 bg-emerald-600 text-white rounded-full font-semibold text-base sm:text-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Mulai Gratis
              <ArrowRight size={20} weight="bold" />
            </Link>
            <Link 
              href="/login" 
              className="px-8 py-3.5 sm:py-4 bg-white text-emerald-600 border-2 border-emerald-600 rounded-full font-semibold text-base sm:text-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
            >
              Masuk ke Aplikasi
            </Link>
          </div>
          
          {/* Trust Badges */}
          <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-6 opacity-75">
            <span className="text-xs sm:text-sm text-gray-500 font-medium">Dipercaya oleh ribuan keluarga di Indonesia</span>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} weight="fill" className="text-amber-400" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="fitur" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white border-t border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Semua Fitur yang Anda Butuhkan</h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">Dari tracking pengeluaran hingga perencanaan dana darurat, kami punya semua alat untuk kesuksesan finansial keluarga Anda.</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[
              { icon: Wallet, title: "Multi-Wallet", desc: "Kelola dompet digital, rekening bank, e-wallet dalam satu platform terpadu." },
              { icon: ChartPieSlice, title: "AI Budgeting", desc: "Rekomendasi budget cerdas dengan template 50/30/20 dan zero-based budgeting." },
              { icon: Sparkle, title: "Subscription Tracker", desc: "Lacak Netflix, Spotify, dan langganan lain dengan reminder H-7/H-1." },
              { icon: Clock, title: "Tagihan Rutin", desc: "Auto-reminder tagihan jatuh tempo + pembayaran 1-klik." },
              { icon: UsersThree, title: "Family Sharing", desc: "Kolaborasi real-time suami-istri dengan kontrol akses granular." },
              { icon: ShieldCheck, title: "Data Enkripsi", desc: "JWT authentication, backup JSON aman, dan kontrol isolasi data per akun." },
            ].map((feature, idx) => (
              <div key={idx} className="group p-6 sm:p-8 bg-gradient-to-br from-emerald-50/60 to-teal-50/60 rounded-3xl border border-emerald-100/50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <feature.icon size={44} weight="fill" className="text-emerald-600 mb-4" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Stats Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { number: "10K+", label: "Pengguna Terdaftar" },
              { number: "1M+", label: "Transaksi Tercatat" },
              { number: "99.9%", label: "Uptime Sistem" },
              { number: "4.9/5", label: "Kepuasan Pengguna" },
            ].map((stat, idx) => (
              <div key={idx} className="p-4">
                <div className="text-3xl sm:text-5xl font-extrabold mb-1 tracking-tight">{stat.number}</div>
                <div className="text-emerald-100 text-xs sm:text-base font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="harga" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Pilihan Paket Sederhana</h2>
          <p className="text-base sm:text-lg text-gray-600 mb-12">Mulai secara mandiri atau gunakan fitur kolaborasi bersama pasangan.</p>

          <div className="grid md:grid-cols-2 gap-8 text-left">
            {/* Free Plan */}
            <div className="p-8 bg-white border border-border rounded-3xl shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  Gratis Selamanya
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Personal</h3>
                <div className="text-4xl font-extrabold text-gray-900">Rp 0</div>
                <p className="text-sm text-gray-600">Cocok untuk pencatatan keuangan pribadi dan rumah tangga dasar.</p>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  <li className="flex items-center gap-2">✓ Dompet & Rekening Tak Terbatas</li>
                  <li className="flex items-center gap-2">✓ Anggaran Bulanan & Rollover</li>
                  <li className="flex items-center gap-2">✓ Tagihan Rutin & Pengingat</li>
                  <li className="flex items-center gap-2">✓ Ekspor / Impor JSON Mandiri</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3 text-center bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors block"
              >
                Mulai Gratis
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 bg-white border-2 border-emerald-600 rounded-3xl shadow-lg space-y-6 flex flex-col justify-between relative">
              <div className="absolute -top-3 right-8 bg-emerald-600 text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Populer
              </div>
              <div className="space-y-4">
                <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  Keluarga Bersama
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Family Pro</h3>
                <div className="text-4xl font-extrabold text-emerald-600">Rp 29.000 <span className="text-base font-normal text-gray-500">/ bln</span></div>
                <p className="text-sm text-gray-600">Solusi lengkap untuk kolaborasi keluarga dengan kecerdasan AI.</p>
                <ul className="space-y-2.5 text-sm text-gray-700">
                  <li className="flex items-center gap-2">✓ Semua Fitur Personal</li>
                  <li className="flex items-center gap-2">✓ Multi-User Household Bersama Pasangan</li>
                  <li className="flex items-center gap-2">✓ Smart Receipt Scanner (DeepSeek AI)</li>
                  <li className="flex items-center gap-2">✓ Sinkronisasi Kurs Multi-Currency</li>
                  <li className="flex items-center gap-2">✓ Kalender Keuangan & Ekspor iCal</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3 text-center bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors block shadow-md"
              >
                Coba 14 Hari Gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Siap Mengatur Keuangan Keluarga?</h2>
          <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">Bergabung bersama ribuan keluarga yang sudah mengelola keuangan lebih tenang dengan KasKeluarga.</p>
          <div>
            <Link 
              href="/register" 
              className="inline-flex px-10 py-4 bg-emerald-600 text-white rounded-full font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5"
            >
              Mulai Sekarang - Gratis
            </Link>
          </div>
          <p className="text-xs text-gray-500">Tidak perlu kartu kredit • Data terenkripsi aman • PWA offline-first</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={28} weight="fill" className="text-emerald-400" />
              <span className="text-lg font-bold">KasKeluarga</span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">Aplikasi manajemen keuangan rumah tangga modern untuk keluarga Indonesia yang cerdas.</p>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-3">Produk</h4>
            <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
              <li><Link href="#fitur" className="hover:text-emerald-400">Fitur</Link></li>
              <li><Link href="#harga" className="hover:text-emerald-400">Harga</Link></li>
              <li><Link href="/login" className="hover:text-emerald-400">Masuk</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-3">Dukungan</h4>
            <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
              <li><Link href="/login" className="hover:text-emerald-400">Bantuan</Link></li>
              <li><Link href="/api/health" className="hover:text-emerald-400">Status Server</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-sm mb-3">Keamanan</h4>
            <ul className="space-y-2 text-gray-400 text-xs sm:text-sm">
              <li className="text-gray-400">HttpOnly JWT Cookies</li>
              <li className="text-gray-400">Isolated Multi-Tenant DB</li>
              <li className="text-gray-400">PWA Client-side Cache</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-gray-500 text-xs">
          © 2026 KasKeluarga. Hak cipta dilindungi.
        </div>
      </footer>
    </div>
  );
}
