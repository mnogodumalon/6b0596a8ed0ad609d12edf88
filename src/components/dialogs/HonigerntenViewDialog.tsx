import type { Honigernten, Bienenvoelker } from '@/types/app';
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

interface HonigerntenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Honigernten | null;
  onEdit: (record: Honigernten) => void;
  bienenvoelkerList: Bienenvoelker[];
}

export function HonigerntenViewDialog({ open, onClose, record, onEdit, bienenvoelkerList }: HonigerntenViewDialogProps) {
  function getBienenvoelkerDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return bienenvoelkerList.find(r => r.record_id === id)?.fields.volksnummer ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Honigernten anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Volk</Label>
            <p className="text-sm">{getBienenvoelkerDisplayName(record.fields.volk)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Erntedatum</Label>
            <p className="text-sm">{formatDate(record.fields.erntedatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Honigsorte</Label>
            <Badge variant="secondary">{record.fields.honigsorte?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Menge in kg</Label>
            <p className="text-sm">{record.fields.menge_kg ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Wassergehalt in %</Label>
            <p className="text-sm">{record.fields.wassergehalt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anzahl abgefüllter Gläser</Label>
            <p className="text-sm">{record.fields.anzahl_glaeser ?? '—'}</p>
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