'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserPlus, Trash2, UserCheck, Search, X } from 'lucide-react';

type JudgeWithProfile = {
  user_id: string;
  tipe_juri: 'juri1' | 'juri2' | 'juri3';
  profiles: { username: string; role: string } | null;
};

type ExistingJuri = {
  id: string;
  username: string;
};

type FormMode = 'create' | 'assign';

const TIPE_LABEL: Record<string, string> = {
  juri1: 'Juri 1 (PBB)',
  juri2: 'Juri 2 (PBB)',
  juri3: 'Juri 3 (Variasi Formasi)',
};

export default function JuriTab({ eventId }: { eventId: string }) {
  const [judges, setJudges] = useState<JudgeWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');

  // ── Form buat baru ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [tipeJuri, setTipeJuri] = useState<'juri1' | 'juri2' | 'juri3'>('juri1');
  const [creating, setCreating] = useState(false);

  // ── Form filter & tugaskan ──
  const [existingJuris, setExistingJuris] = useState<ExistingJuri[]>([]);
  const [filterQuery, setFilterQuery] = useState('');
  const [assignTipe, setAssignTipe] = useState<'juri1' | 'juri2' | 'juri3'>('juri1');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

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

  async function loadExistingJuris(currentJudges: JudgeWithProfile[]) {
    setLoadingExisting(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, username')
      .in('role', ['juri1', 'juri2', 'juri3'])
      .order('username');

    const assignedIds = new Set(currentJudges.map((j) => j.user_id));
    setExistingJuris((data || []).filter((j) => !assignedIds.has(j.id)));
    setLoadingExisting(false);
  }

  const tipeFilled = new Set(judges.map((j) => j.tipe_juri));
  const firstAvailableTipe =
    (['juri1', 'juri2', 'juri3'] as const).find((t) => !tipeFilled.has(t)) ?? 'juri1';
  const allTipeFilled = tipeFilled.size === 3;

  function openForm(mode: FormMode) {
    setShowForm(true);
    setFormMode(mode);
    setTipeJuri(firstAvailableTipe);
    setAssignTipe(firstAvailableTipe);
    setFilterQuery('');
    if (mode === 'assign') loadExistingJuris(judges);
  }

  function closeForm() {
    setShowForm(false);
    setEmail('');
    setPassword('');
    setUsername('');
    setFilterQuery('');
  }

  // ── Buat akun baru ──
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch('/api/admin/create-judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username, tipeJuri, eventId }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert('Gagal: ' + (result.error || 'Unknown error'));
    } else {
      closeForm();
      await load();
    }
    setCreating(false);
  }

  // ── Klik nama juri → langsung tugaskan ──
  async function handleAssign(juriId: string) {
    setAssigningId(juriId);
    const supabase = createClient();
    const { error } = await supabase.from('event_judges').insert({
      event_id: eventId,
      user_id: juriId,
      tipe_juri: assignTipe,
    });
    if (error) {
      alert('Gagal menugaskan: ' + error.message);
      setAssigningId(null);
    } else {
      closeForm();
      await load();
      setAssigningId(null);
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Hapus juri dari event ini? (Akun user tetap ada di sistem)')) return;
    const supabase = createClient();
    await supabase.from('event_judges').delete().eq('event_id', eventId).eq('user_id', userId);
    await load();
  }

  const filteredJuris = existingJuris.filter((j) =>
    j.username.toLowerCase().includes(filterQuery.toLowerCase()),
  );

  if (loading) return <p className="text-slate-600">Memuat...</p>;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Setiap event butuh 3 juri: Juri1 &amp; Juri2 (PBB), Juri3 (Variasi Formasi)
        </p>
        {!allTipeFilled && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openForm('assign')}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <UserCheck className="h-4 w-4" />
              Tugaskan yang Ada
            </button>
            <button
              onClick={() => openForm('create')}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4" />
              Buat Juri Baru
            </button>
          </div>
        )}
      </div>

      {/* ── Panel Form ── */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {/* Tab toggle */}
          <div className="mb-4 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setFormMode('create')}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                formMode === 'create'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Buat Akun Baru
            </button>
            <button
              type="button"
              onClick={() => {
                setFormMode('assign');
                loadExistingJuris(judges);
                setFilterQuery('');
              }}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                formMode === 'assign'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pilih dari Juri yang Ada
            </button>
          </div>

          {/* ── Buat Akun Baru ── */}
          {formMode === 'create' && (
            <form onSubmit={handleCreate}>
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
                    {(['juri1', 'juri2', 'juri3'] as const).map((t) => (
                      <option key={t} value={t} disabled={tipeFilled.has(t)}>
                        {TIPE_LABEL[t]} {tipeFilled.has(t) && '— sudah ada'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Email Login
                  </label>
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
                  onClick={closeForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* ── Filter & Tugaskan yang Ada ── */}
          {formMode === 'assign' && (
            <div className="space-y-3">
              {/* Pilih slot tipe juri */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tugaskan sebagai
                </label>
                <div className="flex gap-2">
                  {(['juri1', 'juri2', 'juri3'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={tipeFilled.has(t)}
                      onClick={() => setAssignTipe(t)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        assignTipe === t
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t === 'juri3' ? 'Juri 3' : t === 'juri1' ? 'Juri 1' : 'Juri 2'}
                      {tipeFilled.has(t) && (
                        <span className="ml-1 block text-xs font-normal text-slate-400">
                          (terisi)
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Cari nama juri..."
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-9 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                {filterQuery && (
                  <button
                    type="button"
                    onClick={() => setFilterQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Daftar hasil filter — klik = langsung tugaskan */}
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
                {loadingExisting ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-500">Memuat...</p>
                ) : filteredJuris.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400">
                    {existingJuris.length === 0
                      ? 'Tidak ada juri tersedia. Semua sudah ditugaskan atau belum ada akun.'
                      : `Tidak ada juri dengan nama "${filterQuery}"`}
                  </p>
                ) : (
                  filteredJuris.map((j, i) => (
                    <button
                      key={j.id}
                      type="button"
                      disabled={!!assigningId}
                      onClick={() => handleAssign(j.id)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-blue-50 disabled:opacity-60 ${
                        i !== 0 ? 'border-t border-slate-100' : ''
                      }`}
                    >
                      <span className="font-medium text-slate-900">{j.username}</span>
                      <span className="text-xs text-blue-600">
                        {assigningId === j.id
                          ? 'Menugaskan...'
                          : `→ ${TIPE_LABEL[assignTipe]}`}
                      </span>
                    </button>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Kartu Slot Juri ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(['juri1', 'juri2', 'juri3'] as const).map((tipe) => {
          const j = judges.find((x) => x.tipe_juri === tipe);
          return (
            <div key={tipe} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {TIPE_LABEL[tipe]}
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
                    aria-label="Hapus dari event"
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