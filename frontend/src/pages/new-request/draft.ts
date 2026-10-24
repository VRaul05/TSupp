import type { RequestForm } from "./types";

/**
 * Borrador de la solicitud (versión web: botón "Guardar borrador").
 * Se guarda en este navegador, sin archivos (no se pueden guardar ahí).
 */
const KEY = "tsupp.requestDraft";

export type SavedDraft = Omit<RequestForm, "files"> & { savedAt: string };

export function saveDraft(form: RequestForm): SavedDraft {
  const { files: _files, ...rest } = form;
  void _files;
  const draft = { ...rest, savedAt: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* sin almacenamiento */
  }
  return draft;
}

export function loadDraft(): SavedDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedDraft) : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada */
  }
}
