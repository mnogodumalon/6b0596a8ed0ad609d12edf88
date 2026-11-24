import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBienenvoelker, enrichStockarbeiten, enrichHonigernten } from '@/lib/enrich';
import type { EnrichedBienenvoelker, EnrichedStockarbeiten, EnrichedHonigernten } from '@/types/enriched';
import type { Stockarbeiten, Honigernten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BienenvoelkerDialog } from '@/components/dialogs/BienenvoelkerDialog';
import { StockarbeitenDialog } from '@/components/dialogs/StockarbeitenDialog';
import { HonigerntenDialog } from '@/components/dialogs/HonigerntenDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconMapPin,
  IconDroplet, IconClipboardList, IconChevronRight, IconHexagon,
} from '@tabler/icons-react';

const APPGROUP_ID = '6b0596a8ed0ad609d12edf88';
const REPAIR_ENDPOINT = '/claude/build/repair';

const STATUS_COLORS: Record<string, string> = {
  aktiv: 'bg-emerald-100 text-emerald-700',
  aufgeloest: 'bg-red-100 text-red-700',
  vereinigt: 'bg-amber-100 text-amber-700',
};

export default function DashboardOverview() {
  const {
    standorte, bienenvoelker, stockarbeiten, honigernten,
    standorteMap, bienenvoelkerMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBienenvoelker = enrichBienenvoelker(bienenvoelker, { standorteMap });
  const enrichedStockarbeiten = enrichStockarbeiten(stockarbeiten, { bienenvoelkerMap });
  const enrichedHonigernten = enrichHonigernten(honigernten, { bienenvoelkerMap });

  const [selectedVolk, setSelectedVolk] = useState<EnrichedBienenvoelker | null>(null);
  const [volkDialog, setVolkDialog] = useState<{ open: boolean; record?: EnrichedBienenvoelker }>({ open: false });
  const [stockDialog, setStockDialog] = useState<{ open: boolean; record?: EnrichedStockarbeiten }>({ open: false });
  const [honigDialog, setHonigDialog] = useState<{ open: boolean; record?: EnrichedHonigernten }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'volk' | 'stock' | 'honig'; id: string } | null>(null);

  const volkStockarbeiten = useMemo(() =>
    selectedVolk ? enrichedStockarbeiten.filter(s => {
      const id = s.fields.volk?.split('/').pop();
      return id === selectedVolk.record_id;
    }).sort((a, b) => (b.fields.zeitpunkt ?? '').localeCompare(a.fields.zeitpunkt ?? ''))
    : [],
    [selectedVolk, enrichedStockarbeiten]
  );

  const volkHonigernten = useMemo(() =>
    selectedVolk ? enrichedHonigernten.filter(h => {
      const id = h.fields.volk?.split('/').pop();
      return id === selectedVolk.record_id;
    }).sort((a, b) => (b.fields.erntedatum ?? '').localeCompare(a.fields.erntedatum ?? ''))
    : [],
    [selectedVolk, enrichedHonigernten]
  );

  const totalHonig = useMemo(() =>
    honigernten.reduce((sum, h) => sum + (h.fields.menge_kg ?? 0), 0),
    [honigernten]
  );

  const aktiveVoelker = useMemo(() =>
    bienenvoelker.filter(v => v.fields.status?.key === 'aktiv' || !v.fields.status),
    [bienenvoelker]
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'volk') {
      await LivingAppsService.deleteBienenvoelkerEntry(deleteTarget.id);
      if (selectedVolk?.record_id === deleteTarget.id) setSelectedVolk(null);
    } else if (deleteTarget.type === 'stock') {
      await LivingAppsService.deleteStockarbeitenEntry(deleteTarget.id);
    } else {
      await LivingAppsService.deleteHonigerntenEntry(deleteTarget.id);
    }
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const displayVolk = selectedVolk
    ? enrichedBienenvoelker.find(v => v.record_id === selectedVolk.record_id) ?? selectedVolk
    : null;

  return (
    <div className="space-y-6">
      {/* KPI-Zeile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Bienenvölker"
          value={String(bienenvoelker.length)}
          description={`${aktiveVoelker.length} aktiv`}
          icon={<IconHexagon size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Standorte"
          value={String(standorte.length)}
          description="Gesamt"
          icon={<IconMapPin size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Stockarbeiten"
          value={String(stockarbeiten.length)}
          description="Einträge gesamt"
          icon={<IconClipboardList size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Honig gesamt"
          value={`${totalHonig.toFixed(1)} kg`}
          description={`${honigernten.length} Ernten`}
          icon={<IconDroplet size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Haupt-Workspace: Völker-Liste + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Völker-Liste */}
        <div className="lg:col-span-2 bg-card border rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <span className="font-semibold text-sm">Bienenvölker</span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setVolkDialog({ open: true })}>
              <IconPlus size={13} className="shrink-0" />
              Neues Volk
            </Button>
          </div>

          {enrichedBienenvoelker.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
              <IconHexagon size={36} stroke={1.5} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Noch keine Bienenvölker vorhanden.</p>
              <Button size="sm" variant="outline" onClick={() => setVolkDialog({ open: true })}>
                <IconPlus size={14} className="mr-1" />Volk anlegen
              </Button>
            </div>
          ) : (
            <div className="divide-y overflow-y-auto max-h-[480px]">
              {enrichedBienenvoelker.map(volk => {
                const isSelected = displayVolk?.record_id === volk.record_id;
                const statusKey = volk.fields.status?.key ?? 'aktiv';
                const statusLabel = volk.fields.status?.label ?? 'Aktiv';
                const colorClass = STATUS_COLORS[statusKey] ?? 'bg-gray-100 text-gray-600';
                return (
                  <button
                    key={volk.record_id}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-accent/50 ${isSelected ? 'bg-primary/8 border-l-2 border-primary' : ''}`}
                    onClick={() => setSelectedVolk(isSelected ? null : volk)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <IconHexagon size={18} className="text-amber-600" stroke={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {volk.fields.volksnummer && <span className="text-muted-foreground mr-1">#{volk.fields.volksnummer}</span>}
                          {volk.fields.volksname ?? 'Unbenannt'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colorClass}`}>{statusLabel}</span>
                        {volk.standortName && (
                          <span className="text-xs text-muted-foreground truncate">{volk.standortName}</span>
                        )}
                      </div>
                    </div>
                    <IconChevronRight size={14} className={`shrink-0 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail-Panel */}
        <div className="lg:col-span-3 space-y-4">
          {!displayVolk ? (
            <div className="bg-card border rounded-2xl flex flex-col items-center justify-center py-20 text-center gap-3">
              <IconHexagon size={48} stroke={1.5} className="text-muted-foreground/40" />
              <div>
                <p className="font-medium text-foreground">Kein Volk ausgewählt</p>
                <p className="text-sm text-muted-foreground mt-1">Wähle ein Volk aus der Liste um Details zu sehen</p>
              </div>
            </div>
          ) : (
            <>
              {/* Volk-Header */}
              <div className="bg-card border rounded-2xl p-4 flex flex-wrap gap-3 items-start">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <IconHexagon size={24} className="text-amber-600" stroke={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-base truncate">
                      {displayVolk.fields.volksname ?? 'Unbenannt'}
                      {displayVolk.fields.volksnummer && <span className="text-muted-foreground font-normal ml-1 text-sm">#{displayVolk.fields.volksnummer}</span>}
                    </h2>
                    {displayVolk.fields.status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[displayVolk.fields.status.key] ?? 'bg-gray-100 text-gray-600'}`}>
                        {displayVolk.fields.status.label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                    {displayVolk.standortName && <span className="flex items-center gap-1"><IconMapPin size={13} className="shrink-0" />{displayVolk.standortName}</span>}
                    {displayVolk.fields.rasse && <span>{displayVolk.fields.rasse.label}</span>}
                    {displayVolk.fields.beutentyp && <span>{displayVolk.fields.beutentyp.label}</span>}
                    {displayVolk.fields.aufstellungsdatum && <span>seit {formatDate(displayVolk.fields.aufstellungsdatum)}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => setVolkDialog({ open: true, record: displayVolk })}>
                    <IconPencil size={13} className="shrink-0" />Bearbeiten
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget({ type: 'volk', id: displayVolk.record_id })}>
                    <IconTrash size={13} className="shrink-0" />
                  </Button>
                </div>
              </div>

              {/* Stockarbeiten */}
              <div className="bg-card border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <span className="font-semibold text-sm flex items-center gap-2">
                    <IconClipboardList size={15} className="text-muted-foreground shrink-0" />
                    Stockarbeiten
                    <Badge variant="secondary" className="text-xs">{volkStockarbeiten.length}</Badge>
                  </span>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => setStockDialog({ open: true })}>
                    <IconPlus size={13} className="shrink-0" />Neu
                  </Button>
                </div>
                {volkStockarbeiten.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">Noch keine Stockarbeiten für dieses Volk.</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-64 overflow-y-auto">
                    {volkStockarbeiten.map(s => (
                      <div key={s.record_id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{s.fields.art?.label ?? 'Stockarbeit'}</span>
                            {s.fields.volksstaerke && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{s.fields.volksstaerke.label}</span>
                            )}
                            {s.fields.koenigin_gesehen && (
                              <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full">Königin gesehen</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {s.fields.zeitpunkt ? formatDate(s.fields.zeitpunkt) : '—'}
                            {s.fields.varroabefall != null && ` · Varroa: ${s.fields.varroabefall} Milben/Tag`}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => setStockDialog({ open: true, record: s })}>
                            <IconPencil size={13} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget({ type: 'stock', id: s.record_id })}>
                            <IconTrash size={13} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Honigernten */}
              <div className="bg-card border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <span className="font-semibold text-sm flex items-center gap-2">
                    <IconDroplet size={15} className="text-amber-500 shrink-0" />
                    Honigernten
                    <Badge variant="secondary" className="text-xs">{volkHonigernten.length}</Badge>
                  </span>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => setHonigDialog({ open: true })}>
                    <IconPlus size={13} className="shrink-0" />Neu
                  </Button>
                </div>
                {volkHonigernten.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">Noch keine Ernten für dieses Volk.</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-64 overflow-y-auto">
                    {volkHonigernten.map(h => (
                      <div key={h.record_id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{h.fields.honigsorte?.label ?? 'Ernte'}</span>
                            {h.fields.menge_kg != null && (
                              <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{h.fields.menge_kg} kg</span>
                            )}
                            {h.fields.anzahl_glaeser != null && (
                              <span className="text-xs text-muted-foreground">{h.fields.anzahl_glaeser} Gläser</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {h.fields.erntedatum ? formatDate(h.fields.erntedatum) : '—'}
                            {h.fields.wassergehalt != null && ` · Wassergehalt: ${h.fields.wassergehalt}%`}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => setHonigDialog({ open: true, record: h })}>
                            <IconPencil size={13} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget({ type: 'honig', id: h.record_id })}>
                            <IconTrash size={13} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialoge */}
      <BienenvoelkerDialog
        open={volkDialog.open}
        onClose={() => setVolkDialog({ open: false })}
        onSubmit={async (fields) => {
          if (volkDialog.record) {
            await LivingAppsService.updateBienenvoelkerEntry(volkDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createBienenvoelkerEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={volkDialog.record?.fields}
        standorteList={standorte}
        enablePhotoScan={AI_PHOTO_SCAN['Bienenvoelker']}
      />

      <StockarbeitenDialog
        open={stockDialog.open}
        onClose={() => setStockDialog({ open: false })}
        onSubmit={async (fields) => {
          if (stockDialog.record) {
            await LivingAppsService.updateStockarbeitenEntry(stockDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createStockarbeitenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={stockDialog.record
          ? stockDialog.record.fields
          : displayVolk
            ? { volk: createRecordUrl(APP_IDS.BIENENVOELKER, displayVolk.record_id) }
            : undefined
        }
        bienenvoelkerList={bienenvoelker}
        enablePhotoScan={AI_PHOTO_SCAN['Stockarbeiten']}
      />

      <HonigerntenDialog
        open={honigDialog.open}
        onClose={() => setHonigDialog({ open: false })}
        onSubmit={async (fields) => {
          if (honigDialog.record) {
            await LivingAppsService.updateHonigerntenEntry(honigDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createHonigerntenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={honigDialog.record
          ? honigDialog.record.fields
          : displayVolk
            ? { volk: createRecordUrl(APP_IDS.BIENENVOELKER, displayVolk.record_id) }
            : undefined
        }
        bienenvoelkerList={bienenvoelker}
        enablePhotoScan={AI_PHOTO_SCAN['Honigernten']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description="Dieser Eintrag wird unwiderruflich gelöscht."
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
        <Skeleton className="lg:col-span-3 h-80 rounded-2xl" />
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
