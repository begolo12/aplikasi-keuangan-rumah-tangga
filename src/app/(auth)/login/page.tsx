'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/Button';
import { apiFetch, endpoints } from '@/lib/apiFetch';
import { Eye, EyeSlash, Lock, Envelope } from '@phosphor-icons/react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await apiFetch(endpoints.authLogin, { method: 'POST', json: { email, password } });
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Selamat Datang Kembali"
      subtitle="Masuk untuk mengelola keuangan rumah tangga Anda."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="loginEmail" className="block text-xs font-semibold text-text-muted">Email</label>
          <div className="relative flex items-center">
            <Envelope size={20} className="absolute left-3.5 text-text-muted select-none" />
            <input
              type="email"
              id="loginEmail"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full h-12 pl-11 pr-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="loginPassword" className="block text-xs font-semibold text-text-muted">Kata Sandi</label>
          <div className="relative flex items-center">
            <Lock size={20} className="absolute left-3.5 text-text-muted select-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="loginPassword"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 pl-11 pr-12 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              className="absolute right-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-text"
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full mt-2 text-base font-bold shadow-md"
        >
          Masuk ke Akun
        </Button>

        <div className="text-center pt-4 border-t border-border mt-6">
          <p className="text-xs text-text-muted">
            Belum memiliki akun pembukuan?{' '}
            <Link href="/register" className="font-bold text-primary hover:underline">
              Daftar Sekarang
            </Link>
          </p>
        </div>
      </form>
    </AuthCard>
  );
}
