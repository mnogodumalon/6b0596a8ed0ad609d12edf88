import type { Bienenvoelker, Honigernten, Stockarbeiten } from './app';

export type EnrichedBienenvoelker = Bienenvoelker & {
  standortName: string;
};

export type EnrichedStockarbeiten = Stockarbeiten & {
  volkName: string;
};

export type EnrichedHonigernten = Honigernten & {
  volkName: string;
};
