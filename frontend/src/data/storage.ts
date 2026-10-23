const emptyStateVersion = '1';

// La migración elimina únicamente los registros precargados de la versión anterior.
// Los registros creados por el usuario se conservan en las mismas claves locales.
export function loadCollection<T extends { id: string }>(key: string, previousDemoIds: readonly string[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    const records = value.filter((record): record is T => Boolean(record && typeof record === 'object' && typeof record.id === 'string'));
    return localStorage.getItem(`${key}:empty-state-version`) === emptyStateVersion
      ? records
      : records.filter(record => !previousDemoIds.includes(record.id));
  } catch {
    return [];
  }
}

export function saveCollection<T>(key: string, records: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(records));
    localStorage.setItem(`${key}:empty-state-version`, emptyStateVersion);
  } catch {
    // Se puede seguir trabajando en memoria si el navegador no permite almacenamiento.
  }
}
