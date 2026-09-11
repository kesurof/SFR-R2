"use client";

import { useEffect, useRef, useState } from "react";

/**
 * `useState` dont la valeur est persistée dans `sessionStorage` sous `key`.
 *
 * La valeur est réhydratée depuis le stockage dans un effet **post-montage**
 * (le premier rendu client reste identique au rendu serveur → pas de mismatch
 * d'hydratation), puis réécrite à chaque changement. Elle survit donc à un
 * remount provoqué par une server action (`revalidatePath` + `redirect`) ou par
 * un changement d'onglet.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* stockage indisponible : on garde la valeur par défaut */
    }
    hydrated.current = true;
  }, [key]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* stockage indisponible */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
