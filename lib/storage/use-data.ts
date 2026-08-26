import { useCallback, useEffect, useState } from 'react';
import type { BrowserHomeData } from '../../types/domain';
import { readData, subscribeToData, updateData } from './repository';

export function useBrowserHomeData() {
  const [data, setData] = useState<BrowserHomeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void readData().then((next) => {
      setData(next);
      setError(null);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Browser Home could not read its local data.');
    });
  }, []);

  useEffect(() => {
    refresh();
    return subscribeToData(refresh);
  }, [refresh]);

  const mutate = useCallback(async (mutator: (current: BrowserHomeData) => BrowserHomeData) => {
    const next = await updateData(mutator);
    setData(next);
    return next;
  }, []);

  return { data, error, mutate, refresh };
}
