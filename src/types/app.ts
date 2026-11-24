// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Standorte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    position?: GeoLocation; // { lat, long, info }
    trachtart?: LookupValue[];
    eigentuemer_vorname?: string;
    eigentuemer_nachname?: string;
    eigentuemer_telefon?: string;
    bemerkung?: string;
  };
}

export interface Bienenvoelker {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    volksnummer?: string;
    volksname?: string;
    standort?: string; // applookup -> URL zu 'Standorte' Record
    rasse?: LookupValue;
    beutentyp?: LookupValue;
    status?: LookupValue;
    aufstellungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    koenigin_baujahr?: number;
    koenigin_markierung?: LookupValue;
    koenigin_herkunft?: string;
    bemerkung?: string;
  };
}

export interface Stockarbeiten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    volk?: string; // applookup -> URL zu 'Bienenvoelker' Record
    art?: LookupValue;
    zeitpunkt?: string; // Format: YYYY-MM-DD oder ISO String
    volksstaerke?: LookupValue;
    sanftmut?: LookupValue;
    brutbild?: LookupValue;
    koenigin_gesehen?: boolean;
    stifte_gesehen?: boolean;
    weiselzellen?: boolean;
    varroabefall?: number;
    mittel?: string;
    dosierung?: string;
    futtermenge?: number;
    bemerkung?: string;
  };
}

export interface Honigernten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    volk?: string; // applookup -> URL zu 'Bienenvoelker' Record
    erntedatum?: string; // Format: YYYY-MM-DD oder ISO String
    honigsorte?: LookupValue;
    menge_kg?: number;
    wassergehalt?: number;
    anzahl_glaeser?: number;
    bemerkung?: string;
  };
}

export const APP_IDS = {
  STANDORTE: '6b059693de76fd8f858198ae',
  BIENENVOELKER: '6b0596986162709a126f2311',
  STOCKARBEITEN: '6b059699c1cf09ae747a18d0',
  HONIGERNTEN: '6b059699682988dcf7c091c5',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'standorte': {
    trachtart: [{ key: "obstbluete", label: "Obstblüte" }, { key: "raps", label: "Raps" }, { key: "loewenzahn", label: "Löwenzahn" }, { key: "akazie", label: "Akazie" }, { key: "linde", label: "Linde" }, { key: "waldtracht", label: "Waldtracht" }, { key: "kastanie", label: "Kastanie" }, { key: "sonnenblume", label: "Sonnenblume" }, { key: "heide", label: "Heide" }, { key: "wiesenblumen", label: "Wiesenblumen" }],
  },
  'bienenvoelker': {
    rasse: [{ key: "carnica", label: "Carnica" }, { key: "buckfast", label: "Buckfast" }, { key: "ligustica", label: "Ligustica" }, { key: "mellifera", label: "Mellifera" }, { key: "sonstige", label: "Sonstige" }],
    beutentyp: [{ key: "zander", label: "Zander" }, { key: "dadant", label: "Dadant" }, { key: "deutsch_normalmass", label: "Deutsch Normalmaß" }, { key: "langstroth", label: "Langstroth" }, { key: "kuntzsch", label: "Kuntzsch" }, { key: "sonstige", label: "Sonstige" }],
    status: [{ key: "aktiv", label: "Aktiv" }, { key: "aufgeloest", label: "Aufgelöst" }, { key: "vereinigt", label: "Vereinigt" }],
    koenigin_markierung: [{ key: "weiss", label: "Weiß (Jahr 1 oder 6)" }, { key: "gelb", label: "Gelb (Jahr 2 oder 7)" }, { key: "rot", label: "Rot (Jahr 3 oder 8)" }, { key: "gruen", label: "Grün (Jahr 4 oder 9)" }, { key: "blau", label: "Blau (Jahr 5 oder 0)" }, { key: "unmarkiert", label: "Unmarkiert" }],
  },
  'stockarbeiten': {
    art: [{ key: "durchsicht", label: "Durchsicht" }, { key: "varroabehandlung", label: "Varroabehandlung" }, { key: "fuetterung", label: "Fütterung" }, { key: "erweiterung", label: "Erweiterung" }, { key: "schwarmkontrolle", label: "Schwarmkontrolle" }, { key: "sonstiges", label: "Sonstiges" }],
    volksstaerke: [{ key: "schwach", label: "Schwach" }, { key: "mittel", label: "Mittel" }, { key: "stark", label: "Stark" }],
    sanftmut: [{ key: "sehr_gut", label: "Sehr gut" }, { key: "gut", label: "Gut" }, { key: "maessig", label: "Mäßig" }, { key: "schlecht", label: "Schlecht" }],
    brutbild: [{ key: "geschlossen", label: "Geschlossen" }, { key: "lueckenhaft", label: "Lückenhaft" }, { key: "buckelbrut", label: "Buckelbrut" }, { key: "keine_brut", label: "Keine Brut" }],
  },
  'honigernten': {
    honigsorte: [{ key: "raps", label: "Raps" }, { key: "akazie", label: "Akazie" }, { key: "linde", label: "Linde" }, { key: "fruehtracht", label: "Frühtracht" }, { key: "wald", label: "Wald" }, { key: "sommertracht", label: "Sommertracht" }, { key: "sonnenblume", label: "Sonnenblume" }, { key: "sonstige", label: "Sonstige" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'standorte': {
    'bezeichnung': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'position': 'geo',
    'trachtart': 'multiplelookup/checkbox',
    'eigentuemer_vorname': 'string/text',
    'eigentuemer_nachname': 'string/text',
    'eigentuemer_telefon': 'string/tel',
    'bemerkung': 'string/textarea',
  },
  'bienenvoelker': {
    'volksnummer': 'string/text',
    'volksname': 'string/text',
    'standort': 'applookup/select',
    'rasse': 'lookup/select',
    'beutentyp': 'lookup/select',
    'status': 'lookup/radio',
    'aufstellungsdatum': 'date/date',
    'koenigin_baujahr': 'number',
    'koenigin_markierung': 'lookup/select',
    'koenigin_herkunft': 'string/text',
    'bemerkung': 'string/textarea',
  },
  'stockarbeiten': {
    'volk': 'applookup/select',
    'art': 'lookup/select',
    'zeitpunkt': 'date/datetimeminute',
    'volksstaerke': 'lookup/radio',
    'sanftmut': 'lookup/radio',
    'brutbild': 'lookup/select',
    'koenigin_gesehen': 'bool',
    'stifte_gesehen': 'bool',
    'weiselzellen': 'bool',
    'varroabefall': 'number',
    'mittel': 'string/text',
    'dosierung': 'string/text',
    'futtermenge': 'number',
    'bemerkung': 'string/textarea',
  },
  'honigernten': {
    'volk': 'applookup/select',
    'erntedatum': 'date/date',
    'honigsorte': 'lookup/select',
    'menge_kg': 'number',
    'wassergehalt': 'number',
    'anzahl_glaeser': 'number',
    'bemerkung': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateStandorte = StripLookup<Standorte['fields']>;
export type CreateBienenvoelker = StripLookup<Bienenvoelker['fields']>;
export type CreateStockarbeiten = StripLookup<Stockarbeiten['fields']>;
export type CreateHonigernten = StripLookup<Honigernten['fields']>;