'use client';

import { useEffect, useState } from 'react';
import { Profile } from '@/types';
import { Pencil, Trash2, X, Check, KeyRound } from 'lucide-react';

type ProfileWithEmail = Profile & { email: string };

type Role = 'admin' | 'juri_1' | 'juri_2' | 'juri_3';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  juri_1: 'bg-blue-100 text-blue-700',
  juri_2: 'bg-teal-100 text-teal-700',
  juri_3: 'bg-orange-100 text-orange-700',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ProfileWithEmail[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<Role>('juri_1');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/get-users');
    const result = await res.json();
    setUsers(result.users || []);
    setLoading(false);
  }

  function startEdit(u: ProfileWithEmail) {
    setEditingId(u.id);
    setEditUsername(u.username);
    setEditEmail('');
    setEditPassword('');
    setEditRole((u.role as Role) ?? 'juri_1');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditUsername('');
    setEditEmail('');
    setEditPassword('');
    setEditRole('juri_1');
  }

  async function handleSaveEdit(u: ProfileWithEmail) {
    setSaving(true);
    const body: Record<string, string> = {
      userId: u.id,
      username: editUsername.trim(),
      role: editRole,
    };
    if (editEmail.trim()) body.email = editEmail.trim();
    if (editPassword.trim().length >= 6) body.password = editPassword.trim();

    const res = await fetch('/api/admin/update-user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    if (!res.ok) {
      alert('Gagal update: ' + (result.error || 'Unknown error'));
    } else {
      cancelEdit();
      await load();
    }
    setSaving(false);
  }

  async function handleDelete(u: ProfileWithEmail) {
    if (
      !confirm(
        `Hapus user "${u.username}"?\n\nAksi ini tidak bisa dibatalkan dan akan menghapus akun beserta seluruh data terkait dari sistem.`,
      )
    )
      return;

    setDeletingId(u.id);
    const res = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id }),
    });

    const result = await res.json();
    if (!res.ok) {
      alert('Gagal hapus: ' + (result.error || 'Unknown error'));
    } else {
      await load();
    }
    setDeletingId(null);
  }

  if (loading) return <p className="text-slate-600">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Semua User</h2>
        <p className="text-sm text-slate-600">User juri dibuat lewat tab Juri di dalam event</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Username</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Email</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Role</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Dibuat</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  Belum ada user
                </td>
              </tr>
            ) : (
              users.map((u) =>
                editingId === u.id ? (
                  /* ── Edit Row ── */
                  <tr key={u.id} className="bg-blue-50">
                    <td className="px-4 py-3" colSpan={3}>
                      <div className="flex flex-wrap gap-3">
                        {/* Username */}
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-slate-600">
                            Username
                          </label>
                          <input
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Username"
                          />
                        </div>

                        {/* Role */}
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-slate-600">
                            Role
                          </label>
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as Role)}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            <option value="juri_1">Juri 1</option>
                            <option value="juri_2">Juri 2</option>
                            <option value="juri_3">Juri 3</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>

                        {/* Email */}
                        <div>
                          <label className="mb-0.5 block text-xs font-medium text-slate-600">
                            Email baru
                            <span className="ml-1 font-normal text-slate-400">
                              (saat ini: {u.email || '—'})
                            </span>
                          </label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Kosongkan jika tidak diubah"
                          />
                        </div>

                        {/* Password */}
                        <div>
                          <label className="mb-0.5 flex items-center gap-1 text-xs font-medium text-slate-600">
                            <KeyRound className="h-3 w-3" />
                            Password baru
                            <span className="font-normal text-slate-400">(opsional)</span>
                          </label>
                          <input
                            type="text"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            minLength={6}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Min 6 karakter"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSaveEdit(u)}
                          disabled={saving || !editUsername.trim()}
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" />
                          {saving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <X className="h-3 w-3" />
                          Batal
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* ── Normal Row ── */
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{u.username}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          ROLE_COLORS[u.role] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(u.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      {u.role !== 'admin' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(u)}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                            title="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={deletingId === u.id}
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Hapus user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}