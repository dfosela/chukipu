import { ref, get, set, update, remove, push, DataSnapshot } from 'firebase/database';
import { db } from './firebase';

// ─── CRUD genérico ──────────────────────────────────────────

/**
 * Crea un nodo con ID auto-generado (push).
 * Devuelve { id, ...data } con timestamps.
 */
export async function firebaseCreate<T extends Record<string, unknown>>(
    path: string,
    data: T
): Promise<T & { id: string }> {
    const listRef = push(ref(db, path));
    const id = listRef.key!;
    const withTimestamps = { ...data, createdAt: Date.now(), updatedAt: Date.now() };
    await set(listRef, withTimestamps);
    return { id, ...withTimestamps } as T & { id: string };
}

/**
 * Crea/sobrescribe un nodo en una ruta exacta (con ID conocido).
 */
export async function firebaseSet<T extends Record<string, unknown>>(
    path: string,
    data: T
): Promise<void> {
    const withTimestamps = { ...data, createdAt: Date.now(), updatedAt: Date.now() };
    await set(ref(db, path), withTimestamps);
}

/**
 * Lee un nodo. Devuelve null si no existe.
 */
export async function firebaseGet<T>(path: string): Promise<(T & { id: string }) | null> {
    const snapshot = await get(ref(db, path));
    if (!snapshot.exists()) return null;
    const key = snapshot.key!;
    return { id: key, ...snapshot.val() } as T & { id: string };
}

/**
 * Lee todos los hijos de un nodo.
 * Devuelve un array con { id, ...data } por cada hijo.
 */
export async function firebaseGetList<T>(
    path: string,
    filter?: (item: T & { id: string }) => boolean,
    sortBy?: keyof T,
    sortOrder?: 'asc' | 'desc'
): Promise<(T & { id: string })[]> {
    const snapshot = await get(ref(db, path));
    if (!snapshot.exists()) return [];

    let items: (T & { id: string })[] = [];
    snapshot.forEach((child: DataSnapshot) => {
        items.push({ id: child.key!, ...child.val() });
    });

    if (filter) {
        items = items.filter(filter);
    }

    if (sortBy) {
        items.sort((a, b) => {
            const aVal = a[sortBy as keyof typeof a] as number;
            const bVal = b[sortBy as keyof typeof b] as number;
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        });
    }

    return items;
}

/**
 * Actualiza campos parciales en un nodo. Añade updatedAt automáticamente.
 */
export async function firebaseUpdate(
    path: string,
    data: Record<string, unknown>
): Promise<void> {
    await update(ref(db, path), { ...data, updatedAt: Date.now() });
}

/**
 * Multi-path update atómico (para actualizar varios nodos a la vez).
 * NO añade updatedAt automáticamente — lo incluyes tú donde lo necesites.
 */
export async function firebaseBatchUpdate(
    updates: Record<string, unknown>
): Promise<void> {
    await update(ref(db), updates);
}

/**
 * Elimina un nodo.
 */
export async function firebaseRemove(path: string): Promise<void> {
    await remove(ref(db, path));
}

/**
 * Comprueba si un nodo existe.
 */
export async function firebaseExists(path: string): Promise<boolean> {
    const snapshot = await get(ref(db, path));
    return snapshot.exists();
}

/**
 * Genera un ID sin escribir nada aún (útil para multi-path updates).
 */
export function firebasePushId(path: string): string {
    return push(ref(db, path)).key!;
}

// ─── Upload (Cloudflare R2) ─────────────────────────────────

export async function uploadFile(file: File, folder: string = 'uploads', fileName?: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    if (fileName) formData.append('fileName', fileName);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) {
        console.error('Upload error details:', data);
        throw new Error(data.error || 'Upload failed');
    }
    return data.url;
}
