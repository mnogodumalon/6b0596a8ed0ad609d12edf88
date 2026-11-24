import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6b059699c1cf09ae747a18d0';
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

export default function PublicFormStockarbeiten() {
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
          <h1 className="text-2xl font-bold text-foreground">Stockarbeiten — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="art">Art der Arbeit</Label>
            <Select
              value={lookupKey(fields.art) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, art: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="art"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="durchsicht">Durchsicht</SelectItem>
                <SelectItem value="varroabehandlung">Varroabehandlung</SelectItem>
                <SelectItem value="fuetterung">Fütterung</SelectItem>
                <SelectItem value="erweiterung">Erweiterung</SelectItem>
                <SelectItem value="schwarmkontrolle">Schwarmkontrolle</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zeitpunkt">Datum und Uhrzeit</Label>
            <Input
              id="zeitpunkt"
              type="datetime-local"
              step="60"
              value={fields.zeitpunkt ?? ''}
              onChange={e => setFields(f => ({ ...f, zeitpunkt: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="volksstaerke">Volksstärke</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.volksstaerke) === 'schwach'}
                onClick={() => setFields(f => ({ ...f, volksstaerke: (lookupKey(f.volksstaerke) === 'schwach' ? undefined : 'schwach') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.volksstaerke) === 'schwach'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Schwach
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.volksstaerke) === 'mittel'}
                onClick={() => setFields(f => ({ ...f, volksstaerke: (lookupKey(f.volksstaerke) === 'mittel' ? undefined : 'mittel') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.volksstaerke) === 'mittel'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Mittel
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.volksstaerke) === 'stark'}
                onClick={() => setFields(f => ({ ...f, volksstaerke: (lookupKey(f.volksstaerke) === 'stark' ? undefined : 'stark') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.volksstaerke) === 'stark'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Stark
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sanftmut">Sanftmut</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.sanftmut) === 'sehr_gut'}
                onClick={() => setFields(f => ({ ...f, sanftmut: (lookupKey(f.sanftmut) === 'sehr_gut' ? undefined : 'sehr_gut') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.sanftmut) === 'sehr_gut'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Sehr gut
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.sanftmut) === 'gut'}
                onClick={() => setFields(f => ({ ...f, sanftmut: (lookupKey(f.sanftmut) === 'gut' ? undefined : 'gut') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.sanftmut) === 'gut'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Gut
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.sanftmut) === 'maessig'}
                onClick={() => setFields(f => ({ ...f, sanftmut: (lookupKey(f.sanftmut) === 'maessig' ? undefined : 'maessig') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.sanftmut) === 'maessig'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Mäßig
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.sanftmut) === 'schlecht'}
                onClick={() => setFields(f => ({ ...f, sanftmut: (lookupKey(f.sanftmut) === 'schlecht' ? undefined : 'schlecht') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.sanftmut) === 'schlecht'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Schlecht
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brutbild">Brutbild</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.brutbild) === 'geschlossen'}
                onClick={() => setFields(f => ({ ...f, brutbild: (lookupKey(f.brutbild) === 'geschlossen' ? undefined : 'geschlossen') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.brutbild) === 'geschlossen'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Geschlossen
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.brutbild) === 'lueckenhaft'}
                onClick={() => setFields(f => ({ ...f, brutbild: (lookupKey(f.brutbild) === 'lueckenhaft' ? undefined : 'lueckenhaft') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.brutbild) === 'lueckenhaft'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Lückenhaft
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.brutbild) === 'buckelbrut'}
                onClick={() => setFields(f => ({ ...f, brutbild: (lookupKey(f.brutbild) === 'buckelbrut' ? undefined : 'buckelbrut') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.brutbild) === 'buckelbrut'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Buckelbrut
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.brutbild) === 'keine_brut'}
                onClick={() => setFields(f => ({ ...f, brutbild: (lookupKey(f.brutbild) === 'keine_brut' ? undefined : 'keine_brut') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.brutbild) === 'keine_brut'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Keine Brut
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="koenigin_gesehen">Königin gesehen</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="koenigin_gesehen"
                checked={!!fields.koenigin_gesehen}
                onCheckedChange={(v) => setFields(f => ({ ...f, koenigin_gesehen: !!v }))}
              />
              <Label htmlFor="koenigin_gesehen" className="font-normal">Königin gesehen</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stifte_gesehen">Stifte oder Eier gesehen</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="stifte_gesehen"
                checked={!!fields.stifte_gesehen}
                onCheckedChange={(v) => setFields(f => ({ ...f, stifte_gesehen: !!v }))}
              />
              <Label htmlFor="stifte_gesehen" className="font-normal">Stifte oder Eier gesehen</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="weiselzellen">Weiselzellen vorhanden</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="weiselzellen"
                checked={!!fields.weiselzellen}
                onCheckedChange={(v) => setFields(f => ({ ...f, weiselzellen: !!v }))}
              />
              <Label htmlFor="weiselzellen" className="font-normal">Weiselzellen vorhanden</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="varroabefall">Varroabefall (Milben pro Tag)</Label>
            <Input
              id="varroabefall"
              type="number"
              value={fields.varroabefall ?? ''}
              onChange={e => setFields(f => ({ ...f, varroabefall: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mittel">Mittel</Label>
            <Input
              id="mittel"
              value={fields.mittel ?? ''}
              onChange={e => setFields(f => ({ ...f, mittel: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dosierung">Dosierung</Label>
            <Input
              id="dosierung"
              value={fields.dosierung ?? ''}
              onChange={e => setFields(f => ({ ...f, dosierung: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="futtermenge">Futtermenge in kg</Label>
            <Input
              id="futtermenge"
              type="number"
              value={fields.futtermenge ?? ''}
              onChange={e => setFields(f => ({ ...f, futtermenge: e.target.value ? Number(e.target.value) : undefined }))}
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
