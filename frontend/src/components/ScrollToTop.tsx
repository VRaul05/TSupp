import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Al cambiar de pantalla, regresa la vista al inicio de la página. */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
