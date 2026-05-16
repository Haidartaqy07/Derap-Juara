'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Peserta, UserRole } from '@/types';
import { ArrowLeft, Lock } from 'lucide-react';
import PenilaianPbbForm from '@/components/juri/penilaian-pbb-form';
import PenilaianVarforForm from '@/components/juri/penilaian-varfor-form';

export default function JuriPenilaianPage({
  params,
}: {
  params: Promise<{ id: string; pesertaId: string }>;
}) {
  const { id: eventId, pesertaId } = use(params);
  const router = useRouter();
  const [peserta, setPeserta] = useState<Peserta | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [penilaianId, setPenilaianId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [pesertaId]);

  async function init() {
    const supabase = createClient();

    // 1. Ambil user & role
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);

    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const userRole = prof?.role as UserRole;
    setRole(userRole);

    // 2. Ambil data peserta
    const { data: pst } = await supabase
      .from('peserta')
      .select('*')
      .eq('id', pesertaId)
      .single();
    if (!pst) {
      setError('Peserta tidak ditemukan');
      setLoading(false);
      return;
    }
    setPeserta(pst);

    // 3. Cek/buat row penilaian
    if (userRole === 'juri1' || userRole === 'juri2') {
      // Cek penilaian_pbb sudah ada?
      const { data: existing } = await supabase
        .from('penilaian_pbb')
        .select('id, is_submitted, is_locked')
        .eq('peserta_id', pesertaId)
        .eq('tipe_juri', userRole)
        .maybeSingle();

      if (existing) {
        setPenilaianId(existing.id);
        setIsSubmitted(existing.is_submitted);
        setIsLocked(existing.is_locked);
      } else {
        // Buat row baru
        const { data: created, error: createErr } = await supabase
          .from('penilaian_pbb')
          .insert({
            peserta_id: pesertaId,
            juri_id: user.id,
            tipe_juri: userRole,
            is_submitted: false,
            is_locked: false,
          })
          .select()
          .single();

        if (createErr || !created) {
          setError('Gagal membuat record penilaian: ' + (createErr?.message || ''));
          setLoading(false);
          return;
        }
        setPenilaianId(created.id);
      }
    } else if (userRole === 'juri3') {
      // Cek penilaian_varfor sudah ada?
      const { data: existing } = await supabase
        .from('penilaian_varfor')
        .select('id, is_submitted, is_locked')
        .eq('peserta_id', pesertaId)
        .maybeSingle();

      if (existing) {
        setPenilaianId(existing.id);
        setIsSubmitted(existing.is_submitted);
        setIsLocked(existing.is_locked);
      } else {
        const { data: created, error: createErr } = await supabase
          .from('penilaian_varfor')
          .insert({
            peserta_id: pesertaId,
            juri_id: user.id,
            is_submitted: false,
            is_locked: false,
          })
          .select()
          .single();

        if (createErr || !created) {
          setError('Gagal membuat record penilaian: ' + (createErr?.message || ''));
          setLoading(false);
          return;
        }
        setPenilaianId(created.id);
      }
    } else {
      setError('Role tidak diizinkan menilai');
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-slate-600">Memuat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
    );
  }

  if (!peserta || !penilaianId || !userId || !role) {
    return <div className="text-red-600">Data tidak lengkap</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/juri/events/${eventId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Peserta
        </Link>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 font-mono text-base font-bold text-slate-700">
            #{peserta.nomor_urut}
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{peserta.nama_regu}</h2>
            <p className="text-sm text-slate-600">
              {role === 'juri3' ? 'Penilaian Variasi Formasi' : 'Penilaian PBB'}
            </p>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">Penilaian Terkunci</p>
            <p className="mt-1 text-amber-800">
              Anda sudah submit nilai untuk peserta ini. Hubungi admin jika perlu revisi.
            </p>
          </div>
        </div>
      )}

      {(role === 'juri1' || role === 'juri2') && (
        <PenilaianPbbForm
          penilaianId={penilaianId}
          eventId={eventId}
          isLocked={isLocked}
          isSubmitted={isSubmitted}
          onSubmitted={() => {
            setIsSubmitted(true);
            setIsLocked(true);
          }}
        />
      )}

      {role === 'juri3' && (
        <PenilaianVarforForm
          penilaianId={penilaianId}
          isLocked={isLocked}
          isSubmitted={isSubmitted}
          onSubmitted={() => {
            setIsSubmitted(true);
            setIsLocked(true);
          }}
        />
      )}
    </div>
  );
}
