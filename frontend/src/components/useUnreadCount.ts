import { useEffect, useState } from "react";
import { unreadCount } from "../services/notificationService";

/** Número de notificaciones sin leer; se actualiza al marcarlas como leídas. */
export function useUnreadCount() {
  const [count, setCount] = useState(() => unreadCount());

  useEffect(() => {
    const update = () => setCount(unreadCount());
    window.addEventListener("notifications-changed", update);
    window.addEventListener("storage", update); // por si hay otra pestaña abierta
    return () => {
      window.removeEventListener("notifications-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return count;
}
