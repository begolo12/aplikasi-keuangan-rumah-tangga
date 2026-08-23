'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/Button';
import { Eye, EyeSlash, Lock, Envelope, User, UsersThree } from '@phosphor-icons/react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [familyName, setFamilyName] = useState('Keluarga Bahagia');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, family_name: familyName }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pendaftaran gagal.');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Buat Akun Baru"
      subtitle="Mulai pembukuan keuangan rumah tangga yang rapi dan terencana."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-text-muted">Nama Lengkap</label>
          <div className="relative flex items-center">
            <User size={20} className="absolute left-3.5 text-text-muted select-none" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Irvan Ganang"
              className="w-full h-12 pl-11 pr-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-text-muted">Nama Keluarga / Rumah Tangga</label>
          <div className="relative flex items-center">
            <UsersThree size={20} className="absolute left-3.5 text-text-muted select-none" />
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Contoh: Keluarga Ganang"
              className="w-full h-12 pl-11 pr-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-text-muted">Email</label>
          <div className="relative flex items-center">
            <Envelope size={20} className="absolute left-3.5 text-text-muted select-none" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full h-12 pl-11 pr-4 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-text-muted">Kata Sandi (Min. 6 Karakter)</label>
          <div className="relative flex items-center">
            <Lock size={20} className="absolute left-3.5 text-text-muted select-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 pl-11 pr-11 bg-background border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-text-muted/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 p-1 text-text-muted hover:text-text"
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
          Daftar & Mulai
        </Button>

        <div className="text-center pt-4 border-t border-border mt-6">
          <p className="text-xs text-text-muted">
            Sudah memiliki akun?{' '}
            <Link href="/login" className="font-bold text-primary hover:underline">
              Masuk di Sini
            </Link>
          </p>
        </div>
      </form>
    </AuthCard>
  );
}
