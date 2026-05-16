'use client';

import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type DialogVariant = 'confirm' | 'success' | 'warning';

type ConfirmDialogProps = {
  open: boolean;
  variant?: DialogVariant;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
};

/**
 * Dialog modal modern pengganti window.confirm() & window.alert().
 *
 * Mode pemakaian:
 * - variant 'confirm'  : ada tombol Batal + Konfirmasi (untuk konfirmasi aksi)
 * - variant 'warning'  : sama seperti confirm tapi warna oranye (untuk peringatan)
 * - variant 'success'  : hanya tombol OK (untuk notifikasi berhasil)
 */
export default function ConfirmDialog({
  open,
  variant = 'confirm',
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  const isSuccess = variant === 'success';
  const isWarning = variant === 'warning';

  const Icon = isSuccess ? CheckCircle2 : isWarning ? AlertTriangle : Info;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={!loading && onCancel ? onCancel : undefined}
      />

      {/* Kotak dialog */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Tombol close (hanya kalau ada onCancel & tidak loading) */}
        {onCancel && !loading && (
          <button
            onClick={onCancel}
            className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="p-6">
          {/* Ikon */}
          <div
            className={cn(
              'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full',
              isSuccess && 'bg-green-100',
              isWarning && 'bg-amber-100',
              variant === 'confirm' && 'bg-blue-100'
            )}
          >
            <Icon
              className={cn(
                'h-7 w-7',
                isSuccess && 'text-green-600',
                isWarning && 'text-amber-600',
                variant === 'confirm' && 'text-blue-600'
              )}
            />
          </div>

          {/* Judul & pesan */}
          <h3 className="text-center text-lg font-bold text-slate-900">{title}</h3>
          <p className="mt-2 whitespace-pre-line text-center text-sm text-slate-600">
            {message}
          </p>

          {/* Tombol aksi */}
          <div className="mt-6 flex gap-3">
            {!isSuccess && onCancel && (
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            )}
            <button
              onClick={onConfirm}
              disabled={loading}
              className={cn(
                'flex-1 rounded-xl px-4 py-2.5 font-semibold text-white shadow transition disabled:opacity-50',
                isSuccess && 'bg-green-600 hover:bg-green-700',
                isWarning && 'bg-amber-600 hover:bg-amber-700',
                variant === 'confirm' && 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {loading ? 'Memproses...' : isSuccess ? 'OK' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}