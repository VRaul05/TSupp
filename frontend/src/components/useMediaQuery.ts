import { useEffect, useState } from "react";

/** Punto de quiebre de la versión web (computadora). */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/** true si la pantalla cumple la media query; se actualiza al cambiar el tamaño. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY);
