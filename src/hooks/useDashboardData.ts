import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Standorte, Bienenvoelker, Stockarbeiten, Honigernten } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [standorte, setStandorte] = useState<Standorte[]>([]);
  const [bienenvoelker, setBienenvoelker] = useState<Bienenvoelker[]>([]);
  const [stockarbeiten, setStockarbeiten] = useState<Stockarbeiten[]>([]);
  const [honigernten, setHonigernten] = useState<Honigernten[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [standorteData, bienenvoelkerData, stockarbeitenData, honigerntenData] = await Promise.all([
        LivingAppsService.getStandorte(),
        LivingAppsService.getBienenvoelker(),
        LivingAppsService.getStockarbeiten(),
        LivingAppsService.getHonigernten(),
      ]);
      setStandorte(standorteData);
      setBienenvoelker(bienenvoelkerData);
      setStockarbeiten(stockarbeitenData);
      setHonigernten(honigerntenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [standorteData, bienenvoelkerData, stockarbeitenData, honigerntenData] = await Promise.all([
          LivingAppsService.getStandorte(),
          LivingAppsService.getBienenvoelker(),
          LivingAppsService.getStockarbeiten(),
          LivingAppsService.getHonigernten(),
        ]);
        setStandorte(standorteData);
        setBienenvoelker(bienenvoelkerData);
        setStockarbeiten(stockarbeitenData);
        setHonigernten(honigerntenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const standorteMap = useMemo(() => {
    const m = new Map<string, Standorte>();
    standorte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [standorte]);

  const bienenvoelkerMap = useMemo(() => {
    const m = new Map<string, Bienenvoelker>();
    bienenvoelker.forEach(r => m.set(r.record_id, r));
    return m;
  }, [bienenvoelker]);

  return { standorte, setStandorte, bienenvoelker, setBienenvoelker, stockarbeiten, setStockarbeiten, honigernten, setHonigernten, loading, error, fetchAll, standorteMap, bienenvoelkerMap };
}