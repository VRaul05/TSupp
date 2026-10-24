import type { TicketFile } from './tickets';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_TICKET_ATTACHMENTS = 5;
export const ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.pdf,.txt,.log,.docx';

const databaseName = 'pugstic-attachments';
const storeName = 'files';
const mimeTypes: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf',
  txt: 'text/plain', log: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

type StoredAttachment = { id: string; ticketId: string; metadata: TicketFile; blob: Blob };
export class AttachmentValidationError extends Error {
  code: 'invalidType' | 'tooLarge' | 'tooMany';
  fileName: string;

  constructor(code: 'invalidType' | 'tooLarge' | 'tooMany', fileName = '') {
    super(code);
    this.code = code;
    this.fileName = fileName;
    this.name = 'AttachmentValidationError';
  }
}

function extension(name: string) { return name.split('.').pop()?.toLowerCase() ?? ''; }

export function validateAttachmentSelection(files: readonly File[], currentCount: number) {
  if (currentCount + files.length > MAX_TICKET_ATTACHMENTS) throw new AttachmentValidationError('tooMany');
  for (const file of files) {
    const ext = extension(file.name);
    const expectedMime = mimeTypes[ext];
    const mime = file.type.toLowerCase().split(';')[0].trim();
    // Algunos sistemas no informan MIME o usan uno genérico. El servidor deberá
    // comprobar el contenido real y analizar malware antes de admitir archivos.
    const genericMime = !mime || mime === 'application/octet-stream';
    const compatibleMime = mime === expectedMime || (ext === 'log' && mime === 'text/x-log') ||
      (ext === 'docx' && (mime === 'application/zip' || mime === 'application/x-zip-compressed'));
    if (!expectedMime || (!genericMime && !compatibleMime)) throw new AttachmentValidationError('invalidType', file.name);
    if (file.size > MAX_ATTACHMENT_BYTES) throw new AttachmentValidationError('tooLarge', file.name);
  }
}

export function formatAttachmentSize(bytes: number) {
  const units = bytes >= 1024 * 1024 ? { divisor: 1024 * 1024, label: 'MB' } : bytes >= 1024 ? { divisor: 1024, label: 'KB' } : { divisor: 1, label: 'B' };
  return `${new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(bytes / units.divisor)} ${units.label}`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const request = indexedDB.open(databaseName, 1);
    let rejected = false;
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(storeName, { keyPath: 'id' });
      store.createIndex('ticketId', 'ticketId', { unique: false });
    };
    request.onerror = () => reject(request.error ?? new Error('Attachment database could not be opened'));
    request.onblocked = () => { rejected = true; reject(new Error('Attachment database blocked')); };
    request.onsuccess = () => {
      if (rejected) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

/** Conserva metadatos y contenido juntos, incluso si localStorage está lleno. */
export async function getTicketAttachmentMetadata(ticketId: string): Promise<TicketFile[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).index('ticketId').getAll(ticketId);
    let metadata: TicketFile[] = [];
    request.onsuccess = () => { metadata = (request.result as StoredAttachment[]).map(record => record.metadata); };
    transaction.oncomplete = () => { database.close(); resolve(metadata); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error('Attachment read failed')); };
    transaction.onerror = () => { /* onabort comunica el fallo una sola vez. */ };
  });
}

/** Guarda todo el lote de manera atómica; no registra archivos si falla el almacenamiento. */
export async function saveTicketAttachments(ticketId: string, files: readonly File[], currentFiles: readonly TicketFile[], ignoredStoredIds: readonly string[] = []): Promise<TicketFile[]> {
  validateAttachmentSelection(files, currentFiles.length);
  const metadata: TicketFile[] = files.map(file => ({
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name, size: formatAttachmentSize(file.size), sizeBytes: file.size, mimeType: mimeTypes[extension(file.name)],
  }));
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const existing = store.index('ticketId').getAllKeys(ticketId);
    let validationError: AttachmentValidationError | undefined;
    existing.onsuccess = () => {
      // La comprobación dentro de la transacción incluye adjuntos de otra pestaña.
      const ids = new Set(existing.result.map(String).filter(id => !ignoredStoredIds.includes(id)));
      currentFiles.forEach((file, index) => ids.add(file.id ?? `legacy-${index}`));
      if (ids.size + files.length > MAX_TICKET_ATTACHMENTS) {
        validationError = new AttachmentValidationError('tooMany');
        transaction.abort();
        return;
      }
      files.forEach((file, index) => store.add({
        id: metadata[index].id!, ticketId, metadata: metadata[index],
        blob: new Blob([file], { type: metadata[index].mimeType }),
      } satisfies StoredAttachment));
    };
    transaction.oncomplete = () => { database.close(); resolve(metadata); };
    transaction.onabort = () => { database.close(); reject(validationError ?? transaction.error ?? new Error('Attachment storage failed')); };
    transaction.onerror = () => { /* La transacción se aborta y no deja un lote parcial. */ };
  });
}

export async function readTicketAttachment(ticketId: string, fileId: string): Promise<Blob | undefined> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(fileId);
    let blob: Blob | undefined;
    request.onsuccess = () => {
      const record = request.result as StoredAttachment | undefined;
      if (record?.ticketId === ticketId && record.blob instanceof Blob) blob = record.blob;
    };
    transaction.oncomplete = () => { database.close(); resolve(blob); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error('Attachment read failed')); };
    transaction.onerror = () => { /* onabort comunica el fallo. */ };
  });
}

/** Las evidencias privadas de una nota nunca se mezclan con los adjuntos públicos. */
export const noteAttachmentOwner = (ticketId: string, entryId: string) => `note:${ticketId}:${entryId}`;

export async function removeAttachmentOwner(ownerId: string): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.index('ticketId').getAllKeys(ownerId);
    request.onsuccess = () => { request.result.forEach(key => store.delete(key)); };
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error('Attachment removal failed')); };
  });
}

/** Elimina un adjunto únicamente si pertenece al ámbito solicitado. */
export async function removeStoredAttachment(ownerId: string, fileId: string): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.get(fileId);
    request.onsuccess = () => {
      const record = request.result as StoredAttachment | undefined;
      if (record?.ticketId === ownerId) store.delete(fileId);
    };
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error('Attachment removal failed')); };
  });
}
