import type { IndikatorVarfor } from '@/types';
import { getLdwcItems, type LdwcRubric } from './ldwc-rubric';

function getGroup(component: 'variasi' | 'formasi' | 'dantonVarfor', itemId: number) {
  if (component === 'variasi') return itemId === 1 ? 'Opening Variasi' : 'Isi Variasi';
  if (component === 'dantonVarfor') return 'Danton Variasi & Formasi';
  if (itemId <= 10) return 'Buka Formasi';
  if (itemId <= 12) return 'Bentuk Formasi';
  if (itemId <= 14) return 'Tutup Formasi';
  return 'Tambahan Formasi';
}

export function getIndikatorVarfor(rubric: LdwcRubric): IndikatorVarfor[] {
  const items = getLdwcItems(rubric);
  return [...items.variasi, ...items.formasi, ...items.dantonVarfor].flatMap((item) => {
    if (
      item.component !== 'variasi' &&
      item.component !== 'formasi' &&
      item.component !== 'dantonVarfor'
    ) return [];
    return [{
      kode: `LDWC-${item.component}-${item.itemId}`,
      urutan: item.itemId,
      nama: item.name,
      kategori:
        item.component === 'dantonVarfor'
          ? 'danton'
          : item.component === 'variasi'
            ? 'variasi'
            : 'formasi',
      group: getGroup(item.component, item.itemId),
      max: item.max,
      levels: item.levels,
    }];
  });
}
