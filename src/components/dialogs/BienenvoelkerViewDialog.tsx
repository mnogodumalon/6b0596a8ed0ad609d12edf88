import type { Bienenvoelker, Standorte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface BienenvoelkerViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Bienenvoelker | null;
  onEdit: (record: Bienenvoelker) => void;
  standorteList: Standorte[];
}

export function BienenvoelkerViewDialog({ open, onClose, record, onEdit, standorteList }: BienenvoelkerViewDialogProps) {
  function getStandorteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return standorteList.find(r => r.record_id === id)?.fields.bezeichnung ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bienenvölker anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Volksnummer</Label>
            <p className="text-sm">{record.fields.volksnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name des Volkes</Label>
            <p className="text-sm">{record.fields.volksname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Standort</Label>
            <p className="text-sm">{getStandorteDisplayName(record.fields.standort)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rasse</Label>
            <Badge variant="secondary">{record.fields.rasse?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beutentyp</Label>
            <Badge variant="secondary">{record.fields.beutentyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aufstellungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.aufstellungsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Baujahr der Königin</Label>
            <p className="text-sm">{record.fields.koenigin_baujahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Farbmarkierung</Label>
            <Badge variant="secondary">{record.fields.koenigin_markierung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Herkunft der Königin</Label>
            <p className="text-sm">{record.fields.koenigin_herkunft ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkung ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}