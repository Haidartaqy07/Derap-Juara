'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Peserta } from '@/types';
import { Vote, Save } from 'lucide-react';

type PesertaWithVoting = Peserta & { voting?: number };

export default function VotingTab({ eventId }: { eventId: string }) {
  const [peserta, setPeserta] = useState<PesertaWithVoting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [eventId]);

  async function load() {
    const supabase = createClient();
    const { data: pst } = await supabase
      .from('peserta')
      .select('*')
      .eq('event_id', eventId)
      .order('nomor_urut');

    const { data: vt } = await supabase.from('voting').select('*');

    const combined = (pst || []).map((p) => {
      const v = vt?.find((x) => x.peserta_id === p.id);
      return { ...p, voting: v?.voting_pasukan_favorit ?? 0 };
    });

    setPeserta(combined);

    const draftMap: Record<string, number> = {};
    combined.forEach((p) => {
      draftMap[p.id] = p.voting ?? 0;
    });
    setDrafts(draftMap);
    setLoading(false);
  }

  async function handleSave(pesertaId: string) {
    const supabase = createClient();
    const nilai = drafts[pesertaId] ?? 0;
    const { error } = await supabase
      .from('voting')
      .upsert({ peserta_id: pesertaId, voting_pasukan_favorit: nilai });

    if (error) {
      alert('Gagal: ' + error.message);
    } else {
      setSavedId(pesertaId);
      setTimeout(() => setSavedId(null), 1500);
      await load();
    }
  }

  if (loading) return <p className="text-slate-600">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-2">
          <Vote className="h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">Voting Pasukan Favorit</p>
            <p className="mt-1 text-blue-800">
              Input jumlah voting Instagram untuk masing-masing peserta. Nilai ini berkontribusi
              5% pada Skor Juara Umum (dinormalisasi terhadap peserta dengan voting tertinggi).
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">No Urut</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
                Nama Regu
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
                Jumlah Voting
              </th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {peserta.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  Belum ada peserta
                </td>
              </tr>
            ) : (
              peserta.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-900">
                    #{p.nomor_urut}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">{p.nama_regu}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      value={drafts[p.id] ?? 0}
                      onChange={(e) =>
                        setDrafts({ ...drafts, [p.id]: parseInt(e.target.value) || 0 })
                      }
                      className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSave(p.id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        savedId === p.id
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {savedId === p.id ? 'Tersimpan' : 'Simpan'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
