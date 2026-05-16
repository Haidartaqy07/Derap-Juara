'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, UserPlus, Trash2 } from 'lucide-react';

type JudgeWithProfile = {
  user_id: string;
  tipe_juri: 'juri1' | 'juri2' | 'juri3';
  profiles: { username: string; role: string } | null;
};

export default function JuriTab({ eventId }: { eventId: string }) {
  const [judges, setJudges] = useState<JudgeWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [tipeJuri, setTipeJuri] = useState<'juri1' | 'juri2' | 'juri3'>('juri1');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
  }, [eventId]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('event_judges')
      .select('user_id, tipe_juri, profiles(username, role)')
      .eq('event_id', eventId);
    setJudges((data as any) || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    // Panggil API route untuk buat user (perlu service role key)
    const res = await fetch('/api/admin/create-judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username, tipeJuri, eventId }),
    });

    const result = await res.json();
    if (!res.ok) {
      alert('Gagal: ' + (result.error || 'Unknown error'));
    } else {
      setShowForm(false);
      setEmail('');
      setPassword('');
      setUsername('');
      await load();
    }
    setCreating(false);
  }

  async function handleRemove(userId: string) {
    if (!confirm('Hapus juri dari event ini? (Akun user tetap ada di sistem)')) return;
    const supabase = createClient();
    await supabase.from('event_judges').delete().eq('event_id', eventId).eq('user_id', userId);
    await load();
  }

  const tipeFilled = new Set(judges.map((j) => j.tipe_juri));

  if (loading) return <p className="text-slate-600">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Setiap event butuh 3 juri: Juri1 & Juri2 (PBB), Juri3 (Variasi Formasi)
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Buat Juri Baru
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-slate-900">Buat Akun Juri</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nama tampilan"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tipe Juri</label>
              <select
                required
                value={tipeJuri}
                onChange={(e) => setTipeJuri(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="juri1" disabled={tipeFilled.has('juri1')}>
                  Juri 1 (PBB) {tipeFilled.has('juri1') && '— sudah ada'}
                </option>
                <option value="juri2" disabled={tipeFilled.has('juri2')}>
                  Juri 2 (PBB) {tipeFilled.has('juri2') && '— sudah ada'}
                </option>
                <option value="juri3" disabled={tipeFilled.has('juri3')}>
                  Juri 3 (Variasi Formasi) {tipeFilled.has('juri3') && '— sudah ada'}
                </option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email Login</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="juri1@paskibra.local"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                required
                type="text"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Min 6 karakter"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Membuat...' : 'Buat & Tugaskan'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {(['juri1', 'juri2', 'juri3'] as const).map((tipe) => {
          const j = judges.find((x) => x.tipe_juri === tipe);
          return (
            <div key={tipe} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {tipe === 'juri3' ? 'Juri 3 (Variasi Formasi)' : `${tipe === 'juri1' ? 'Juri 1' : 'Juri 2'} (PBB)`}
              </p>
              {j ? (
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{j.profiles?.username}</p>
                    <p className="text-xs text-green-600">Aktif</p>
                  </div>
                  <button
                    onClick={() => handleRemove(j.user_id)}
                    className="rounded p-1.5 text-red-600 hover:bg-red-50"
                    aria-label="Hapus"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-400">Belum ditugaskan</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
