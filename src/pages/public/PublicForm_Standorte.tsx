import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { IconChevronDown, IconCrosshair, IconLoader2 } from '@tabler/icons-react';
import { GeoMapPicker } from '@/components/GeoMapPicker';
import { lookupKeys } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6b059693de76fd8f858198ae';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormStandorte() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoFromPhoto, setGeoFromPhoto] = useState(false);
  const [showCoords, setShowCoords] = useState(false);

  function geoLocate(fieldKey: string) {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setFields(f => ({ ...f, [fieldKey]: { lat: pos.coords.latitude, long: pos.coords.longitude, info: '' } }));
        setLocating(false);
        setGeoFromPhoto(false);
      },
      () => setLocating(false)
    );
  }

  function handleMapMove(fieldKey: string, lat: number, lng: number) {
    setFields(f => ({ ...f, [fieldKey]: { ...(f[fieldKey] ?? {}), lat, long: lng } }));
  }

  void setGeoFromPhoto;

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Standorte — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="bezeichnung">Bezeichnung</Label>
            <Input
              id="bezeichnung"
              value={fields.bezeichnung ?? ''}
              onChange={e => setFields(f => ({ ...f, bezeichnung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strasse">Straße</Label>
            <Input
              id="strasse"
              value={fields.strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, strasse: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hausnummer">Hausnummer</Label>
            <Input
              id="hausnummer"
              value={fields.hausnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, hausnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plz">Postleitzahl</Label>
            <Input
              id="plz"
              value={fields.plz ?? ''}
              onChange={e => setFields(f => ({ ...f, plz: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ort">Ort</Label>
            <Input
              id="ort"
              value={fields.ort ?? ''}
              onChange={e => setFields(f => ({ ...f, ort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="eigentuemer_vorname">Vorname</Label>
            <Input
              id="eigentuemer_vorname"
              value={fields.eigentuemer_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, eigentuemer_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eigentuemer_nachname">Nachname</Label>
            <Input
              id="eigentuemer_nachname"
              value={fields.eigentuemer_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, eigentuemer_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eigentuemer_telefon">Telefon</Label>
            <Input
              id="eigentuemer_telefon"
              value={fields.eigentuemer_telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, eigentuemer_telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bemerkung">Bemerkung</Label>
            <Textarea
              id="bemerkung"
              value={fields.bemerkung ?? ''}
              onChange={e => setFields(f => ({ ...f, bemerkung: e.target.value }))}
              rows={3}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
