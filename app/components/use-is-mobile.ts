"use client";

import { useEffect, useState } from "react";

/** Breakpoint Ant Design `lg` : en dessous, l'interface passe en présentation mobile. */
const MOBILE_QUERY = "(max-width: 991.98px)";

/**
 * Indique si l'écran est en présentation mobile.
 *
 * Desktop-first : la valeur vaut `false` au rendu serveur et au premier rendu client
 * (aucun décalage d'hydratation), puis est mise à jour après montage. Le desktop n'est
 * donc jamais rendu en version mobile, même brièvement.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}
