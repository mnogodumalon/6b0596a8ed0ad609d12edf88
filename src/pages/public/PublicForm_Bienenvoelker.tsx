import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6b0596986162709a126f2311';
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

export default function PublicFormBienenvoelker() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

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
          <h1 className="text-2xl font-bold text-foreground">Bienenvölker — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="volksnummer">Volksnummer</Label>
            <Input
              id="volksnummer"
              value={fields.volksnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, volksnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="volksname">Name des Volkes</Label>
            <Input
              id="volksname"
              value={fields.volksname ?? ''}
              onChange={e => setFields(f => ({ ...f, volksname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rasse">Rasse</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.rasse) === 'carnica'}
                onClick={() => setFields(f => ({ ...f, rasse: (lookupKey(f.rasse) === 'carnica' ? undefined : 'carnica') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.rasse) === 'carnica'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Carnica
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.rasse) === 'buckfast'}
                onClick={() => setFields(f => ({ ...f, rasse: (lookupKey(f.rasse) === 'buckfast' ? undefined : 'buckfast') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.rasse) === 'buckfast'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Buckfast
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.rasse) === 'ligustica'}
                onClick={() => setFields(f => ({ ...f, rasse: (lookupKey(f.rasse) === 'ligustica' ? undefined : 'ligustica') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.rasse) === 'ligustica'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Ligustica
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.rasse) === 'mellifera'}
                onClick={() => setFields(f => ({ ...f, rasse: (lookupKey(f.rasse) === 'mellifera' ? undefined : 'mellifera') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.rasse) === 'mellifera'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Mellifera
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.rasse) === 'sonstige'}
                onClick={() => setFields(f => ({ ...f, rasse: (lookupKey(f.rasse) === 'sonstige' ? undefined : 'sonstige') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.rasse) === 'sonstige'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sonstige
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="beutentyp">Beutentyp</Label>
            <Select
              value={lookupKey(fields.beutentyp) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, beutentyp: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="beutentyp"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="zander">Zander</SelectItem>
                <SelectItem value="dadant">Dadant</SelectItem>
                <SelectItem value="deutsch_normalmass">Deutsch Normalmaß</SelectItem>
                <SelectItem value="langstroth">Langstroth</SelectItem>
                <SelectItem value="kuntzsch">Kuntzsch</SelectItem>
                <SelectItem value="sonstige">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'aktiv'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'aktiv' ? undefined : 'aktiv') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'aktiv'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Aktiv
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'aufgeloest'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'aufgeloest' ? undefined : 'aufgeloest') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'aufgeloest'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Aufgelöst
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.status) === 'vereinigt'}
                onClick={() => setFields(f => ({ ...f, status: (lookupKey(f.status) === 'vereinigt' ? undefined : 'vereinigt') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.status) === 'vereinigt'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Vereinigt
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aufstellungsdatum">Aufstellungsdatum</Label>
            <Input
              id="aufstellungsdatum"
              type="date"
              value={fields.aufstellungsdatum ?? ''}
              onChange={e => setFields(f => ({ ...f, aufstellungsdatum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="koenigin_baujahr">Baujahr der Königin</Label>
            <Input
              id="koenigin_baujahr"
              type="number"
              value={fields.koenigin_baujahr ?? ''}
              onChange={e => setFields(f => ({ ...f, koenigin_baujahr: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="koenigin_markierung">Farbmarkierung</Label>
            <Select
              value={lookupKey(fields.koenigin_markierung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, koenigin_markierung: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="koenigin_markierung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="weiss">Weiß (Jahr 1 oder 6)</SelectItem>
                <SelectItem value="gelb">Gelb (Jahr 2 oder 7)</SelectItem>
                <SelectItem value="rot">Rot (Jahr 3 oder 8)</SelectItem>
                <SelectItem value="gruen">Grün (Jahr 4 oder 9)</SelectItem>
                <SelectItem value="blau">Blau (Jahr 5 oder 0)</SelectItem>
                <SelectItem value="unmarkiert">Unmarkiert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="koenigin_herkunft">Herkunft der Königin</Label>
            <Input
              id="koenigin_herkunft"
              value={fields.koenigin_herkunft ?? ''}
              onChange={e => setFields(f => ({ ...f, koenigin_herkunft: e.target.value }))}
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
