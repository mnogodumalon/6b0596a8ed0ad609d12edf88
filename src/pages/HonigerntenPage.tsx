import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Honigernten, Bienenvoelker } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconArrowsUpDown, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { HonigerntenDialog } from '@/components/dialogs/HonigerntenDialog';
import { HonigerntenViewDialog } from '@/components/dialogs/HonigerntenViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

export default function HonigerntenPage() {
  const [records, setRecords] = useState<Honigernten[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Honigernten | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Honigernten | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Honigernten | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [bienenvoelkerList, setBienenvoelkerList] = useState<Bienenvoelker[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, bienenvoelkerData] = await Promise.all([
        LivingAppsService.getHonigernten(),
        LivingAppsService.getBienenvoelker(),
      ]);
      setRecords(mainData);
      setBienenvoelkerList(bienenvoelkerData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: Honigernten['fields']) {
    await LivingAppsService.createHonigerntenEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: Honigernten['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateHonigerntenEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteHonigerntenEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getBienenvoelkerDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return bienenvoelkerList.find(r => r.record_id === id)?.fields.volksnummer ?? '—';
  }

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r.fields).some(v => {
      if (v == null) return false;
      if (Array.isArray(v)) return v.some(item => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
      if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
      return String(v).toLowerCase().includes(s);
    });
  });

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Honigernten"
      subtitle={`${records.length} Honigernten im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 rounded-full shadow-sm">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Honigernten suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('volk')}>
                <span className="inline-flex items-center gap-1">
                  Volk
                  {sortKey === 'volk' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('erntedatum')}>
                <span className="inline-flex items-center gap-1">
                  Erntedatum
                  {sortKey === 'erntedatum' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('honigsorte')}>
                <span className="inline-flex items-center gap-1">
                  Honigsorte
                  {sortKey === 'honigsorte' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('menge_kg')}>
                <span className="inline-flex items-center gap-1">
                  Menge in kg
                  {sortKey === 'menge_kg' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('wassergehalt')}>
                <span className="inline-flex items-center gap-1">
                  Wassergehalt in %
                  {sortKey === 'wassergehalt' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('anzahl_glaeser')}>
                <span className="inline-flex items-center gap-1">
                  Anzahl abgefüllter Gläser
                  {sortKey === 'anzahl_glaeser' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bemerkung')}>
                <span className="inline-flex items-center gap-1">
                  Bemerkung
                  {sortKey === 'bemerkung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewingRecord(record); }}>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getBienenvoelkerDisplayName(record.fields.volk)}</span></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.erntedatum)}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.honigsorte?.label ?? '—'}</span></TableCell>
                <TableCell>{record.fields.menge_kg ?? '—'}</TableCell>
                <TableCell>{record.fields.wassergehalt ?? '—'}</TableCell>
                <TableCell>{record.fields.anzahl_glaeser ?? '—'}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.bemerkung ?? '—'}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Honigernten. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <HonigerntenDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        bienenvoelkerList={bienenvoelkerList}
        enablePhotoScan={AI_PHOTO_SCAN['Honigernten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Honigernten']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Honigernten löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />

      <HonigerntenViewDialog
        open={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onEdit={(r) => { setViewingRecord(null); setEditingRecord(r); }}
        bienenvoelkerList={bienenvoelkerList}
      />
    </PageShell>
  );
}