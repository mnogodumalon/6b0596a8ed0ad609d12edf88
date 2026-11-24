import { useState, useEffect, useRef, useCallback } from 'react';
import type { Standorte } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconCrosshair, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { GeoMapPicker } from '@/components/GeoMapPicker';
import { lookupKeys } from '@/lib/formatters';

interface StandorteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Standorte['fields']) => Promise<void>;
  defaultValues?: Standorte['fields'];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function StandorteDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = true, enablePhotoLocation = true }: StandorteDialogProps) {
  const [fields, setFields] = useState<Partial<Standorte['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
      setGeoFromPhoto(false);
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'standorte');
      await onSubmit(clean as Standorte['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const [locating, setLocating] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const [geoFromPhoto, setGeoFromPhoto] = useState(false);
  const geoDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  async function geoLocate(fieldKey: string) {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      let info = '';
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        info = data.display_name ?? '';
      } catch {}
      setFields(f => ({ ...f, [fieldKey]: { lat: latitude, long: longitude, info } as any }));
      setGeoFromPhoto(false);
      setLocating(false);
    }, () => { setLocating(false); });
  }
  function handleMapMove(fieldKey: string, lat: number, lng: number) {
    setFields(f => ({ ...f, [fieldKey]: { ...((f as any)[fieldKey] ?? {}), lat, long: lng } }));
    clearTimeout(geoDebounceRef.current);
    geoDebounceRef.current = setTimeout(async () => {
      const info = await reverseGeocode(lat, lng);
      setFields(f => ({ ...f, [fieldKey]: { ...((f as any)[fieldKey] ?? {}), info } }));
    }, 600);
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "bezeichnung": string | null, // Bezeichnung\n  "strasse": string | null, // Straße\n  "hausnummer": string | null, // Hausnummer\n  "plz": string | null, // Postleitzahl\n  "ort": string | null, // Ort\n  "trachtart": LookupValue[] | null, // Trachtangebot (select one or more keys: "obstbluete" | "raps" | "loewenzahn" | "akazie" | "linde" | "waldtracht" | "kastanie" | "sonnenblume" | "heide" | "wiesenblumen") mapping: obstbluete=Obstblüte, raps=Raps, loewenzahn=Löwenzahn, akazie=Akazie, linde=Linde, waldtracht=Waldtracht, kastanie=Kastanie, sonnenblume=Sonnenblume, heide=Heide, wiesenblumen=Wiesenblumen\n  "eigentuemer_vorname": string | null, // Vorname\n  "eigentuemer_nachname": string | null, // Nachname\n  "eigentuemer_telefon": string | null, // Telefon\n  "bemerkung": string | null, // Bemerkung\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        for (const [k, v] of Object.entries(raw)) {
          if (v != null) merged[k] = v;
        }
        return merged as Partial<Standorte['fields']>;
      });
      if (gps) {
        setFields(f => ({ ...f, position: { lat: gps.latitude, long: gps.longitude, info: geoAddr } as any }));
        setGeoFromPhoto(true);
      }
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Standorte bearbeiten' : 'Standorte hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>
        {enablePhotoScan && (
          <details className="group border-b bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-3 text-sm font-medium hover:bg-muted/40 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <IconSparkles className="h-3.5 w-3.5 text-primary" />
              </span>
              <span className="flex-1">Mit Foto/Text füllen</span>
              <span className="text-xs text-muted-foreground">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</span>
              <IconChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-6 pb-4 pt-1 space-y-3">
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
            </div>
          </details>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bezeichnung">Bezeichnung</Label>
            <Input
              id="bezeichnung"
              value={fields.bezeichnung ?? ''}
              onChange={e => setFields(f => ({ ...f, bezeichnung: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="strasse">Straße</Label>
            <Input
              id="strasse"
              value={fields.strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, strasse: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hausnummer">Hausnummer</Label>
            <Input
              id="hausnummer"
              value={fields.hausnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, hausnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plz">Postleitzahl</Label>
            <Input
              id="plz"
              value={fields.plz ?? ''}
              onChange={e => setFields(f => ({ ...f, plz: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ort">Ort</Label>
            <Input
              id="ort"
              value={fields.ort ?? ''}
              onChange={e => setFields(f => ({ ...f, ort: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="position">Position auf der Karte</Label>
            <div className="space-y-3">
              <Button type="button" variant="outline" className="w-full" disabled={locating} onClick={() => geoLocate("position")}>
                {locating ? <IconLoader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <IconCrosshair className="h-4 w-4 mr-1.5" />}
                Aktuellen Standort verwenden
              </Button>
              {geoFromPhoto && fields.position && (
                <p className="text-xs text-primary italic">Standort aus Foto übernommen</p>
              )}
              {fields.position?.info && (
                <p className="text-sm text-muted-foreground break-words whitespace-normal">
                  {fields.position.info}
                </p>
              )}
              {fields.position?.lat != null && fields.position?.long != null && (
                <GeoMapPicker
                  lat={fields.position.lat}
                  lng={fields.position.long}
                  onChange={(lat, lng) => handleMapMove("position", lat, lng)}
                />
              )}
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" onClick={() => setShowCoords(v => !v)}>
                {showCoords ? 'Koordinaten verbergen' : 'Koordinaten anzeigen'}
                <IconChevronDown className={`h-3 w-3 transition-transform ${showCoords ? "rotate-180" : ""}`} />
              </button>
              {showCoords && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Breitengrad</Label>
                    <Input type="number" step="any"
                      value={fields.position?.lat ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFields(f => ({ ...f, position: { ...(f.position as any ?? {}), lat: v ? Number(v) : undefined } }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Längengrad</Label>
                    <Input type="number" step="any"
                      value={fields.position?.long ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFields(f => ({ ...f, position: { ...(f.position as any ?? {}), long: v ? Number(v) : undefined } }));
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trachtart">Trachtangebot</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="trachtart_obstbluete"
                  checked={lookupKeys(fields.trachtart).includes('obstbluete')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.trachtart);
                      const next = checked ? [...current, 'obstbluete'] : current.filter(k => k !== 'obstbluete');
                      return { ...f, trachtart: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="trachtart_obstbluete" className="font-normal">Obstblüte</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="trachtart_raps"
                  checked={lookupKeys(fields.trachtart).includes('raps')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.trachtart);
                      const next = checked ? [...current, 'raps'] : current.filter(k => k !== 'raps');
                      return { ...f, trachtart: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="trachtart_raps" className="font-normal">Raps</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="trachtart_loewenzahn"
                  checked={lookupKeys(fields.trachtart).includes('loewenzahn')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.trachtart);
                      const next = checked ? [...current, 'loewenzahn'] : current.filter(k => k !== 'loewenzahn');
                      return { ...f, trachtart: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="trachtart_loewenzahn" className="font-normal">Löwenzahn</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="trachtart_akazie"
                  checked={lookupKeys(fields.trachtart).includes('akazie')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.trachtart);
                      const next = checked ? [...current, 'akazie'] : current.filter(k => k !== 'akazie');
                      return { ...f, trachtart: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="trachtart_akazie" className="font-normal">Akazie</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="trachtart_linde"
                  checked={lookupKeys(fields.trachtart).includes('linde')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.trachtart);
                      const next = checked ? [...current, 'linde'] : current.filter(k => k !== 'linde');
                      return { ...f, trachtart: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="trachtart_linde" className="font-normal">Linde</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="trachtart_waldtracht"
                  checked={lookupKeys(fields.trachtart).includes('waldtracht')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.trachtart);
                      const next = checked ? [...current, 'waldtracht'] : current.filter(k => k !== 'waldtracht');
                      return { ...f, trachtart: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="trachtart_waldtracht" className="font-normal">Waldtracht</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="trachtart_kastanie"
                  checked={lookupKeys(fields.trachtart).includes('kastanie')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.trachtart);
                      const next = checked ? [...current, 'kastanie'] : current.filter(k => k !== 'kastanie');
                      return { ...f, trachtart: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="trachtart_kastanie" className="font-normal">Kastanie</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="trachtart_sonnenblume"
                  checked={lookupKeys(fields.trachtart).includes('sonnenblume')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.trachtart);
                      const next = checked ? [...current, 'sonnenblume'] : current.filter(k => k !== 'sonnenblume');
                      return { ...f, trachtart: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="trachtart_sonnenblume" className="font-normal">Sonnenblume</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="trachtart_heide"
                  checked={lookupKeys(fields.trachtart).includes('heide')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.trachtart);
                      const next = checked ? [...current, 'heide'] : current.filter(k => k !== 'heide');
                      return { ...f, trachtart: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="trachtart_heide" className="font-normal">Heide</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="trachtart_wiesenblumen"
                  checked={lookupKeys(fields.trachtart).includes('wiesenblumen')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.trachtart);
                      const next = checked ? [...current, 'wiesenblumen'] : current.filter(k => k !== 'wiesenblumen');
                      return { ...f, trachtart: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="trachtart_wiesenblumen" className="font-normal">Wiesenblumen</Label>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eigentuemer_vorname">Vorname</Label>
            <Input
              id="eigentuemer_vorname"
              value={fields.eigentuemer_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, eigentuemer_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eigentuemer_nachname">Nachname</Label>
            <Input
              id="eigentuemer_nachname"
              value={fields.eigentuemer_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, eigentuemer_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eigentuemer_telefon">Telefon</Label>
            <Input
              id="eigentuemer_telefon"
              value={fields.eigentuemer_telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, eigentuemer_telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bemerkung">Bemerkung</Label>
            <Textarea
              id="bemerkung"
              value={fields.bemerkung ?? ''}
              onChange={e => setFields(f => ({ ...f, bemerkung: e.target.value }))}
              rows={3}
            />
          </div>
          </div>
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}