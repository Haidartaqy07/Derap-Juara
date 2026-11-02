'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, LoaderCircle, Trash2, Upload } from 'lucide-react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function EventPosterUpload({
  value,
  onChange,
  onUploadingChange,
}: {
  value: string;
  onChange: (imageUrl: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Pilih gambar berformat JPG, PNG, atau WebP.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Ukuran gambar maksimal 5 MB.');
      return;
    }

    setError('');
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/upload-event-image', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Gagal mengunggah gambar.');
      onChange(result.imageUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Gagal mengunggah gambar.');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-slate-700">Poster event</span>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            {uploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          </span>
          <p className="mt-2 text-xs font-semibold text-slate-700">
            {uploading ? 'Mengunggah poster...' : 'Pilih poster dari perangkat'}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">JPG, PNG, atau WebP · maks. 5 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void handleFileChange(event)}
            className="sr-only"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-950 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60"
          >
            <Upload className="h-3.5 w-3.5" />
            {value ? 'Ganti gambar' : 'Unggah gambar'}
          </button>
        </div>

        <div className="relative flex min-h-36 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
          {value ? (
            <>
              <Image
                src={value}
                alt="Pratinjau poster event"
                fill
                unoptimized
                sizes="180px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => onChange('')}
                aria-label="Hapus poster"
                className="absolute right-2 top-2 z-10 rounded-lg bg-white/95 p-2 text-red-600 shadow transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="px-3 text-center text-xs text-slate-400">
              <ImagePlus className="mx-auto mb-2 h-6 w-6" />
              Pratinjau poster
            </div>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
