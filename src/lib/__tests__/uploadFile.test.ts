import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted garantiza que estas variables existen ANTES de que vi.mock sea hoisted
const { mockGetDownloadURL, mockUploadBytes, mockDeleteObject, mockStorageRef } = vi.hoisted(() => ({
    mockGetDownloadURL: vi.fn(),
    mockUploadBytes: vi.fn(),
    mockDeleteObject: vi.fn(),
    mockStorageRef: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
    db: {},
    storage: {},
}));

vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    push: vi.fn(() => ({ key: 'mock-key' })),
}));

vi.mock('firebase/storage', () => ({
    ref: mockStorageRef,
    uploadBytes: mockUploadBytes,
    getDownloadURL: mockGetDownloadURL,
    deleteObject: mockDeleteObject,
}));

vi.mock('@/lib/convertToWebP', () => ({
    convertToWebP: vi.fn(async (file: File) => file),
}));

import { uploadFile, deleteFile } from '@/lib/firebaseMethods';
import { convertToWebP } from '@/lib/convertToWebP';

// ── Tests de uploadFile ───────────────────────────────────────────────────────

describe('uploadFile — Firebase Storage', () => {
    const FAKE_URL = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/avatars%2Ffile.webp?alt=media&token=abc';

    beforeEach(() => {
        vi.clearAllMocks();
        mockStorageRef.mockReturnValue({ fullPath: 'mocked/ref' });
        mockUploadBytes.mockResolvedValue(undefined);
        mockGetDownloadURL.mockResolvedValue(FAKE_URL);
    });

    it('devuelve la URL de descarga de Firebase Storage', async () => {
        const file = new File(['content'], 'foto.jpg', { type: 'image/jpeg' });
        const result = await uploadFile(file, 'avatars', 'user123');

        expect(result).toBe(FAKE_URL);
        expect(mockUploadBytes).toHaveBeenCalledOnce();
        expect(mockGetDownloadURL).toHaveBeenCalledOnce();
    });

    it('construye la ruta con folder y fileName personalizados', async () => {
        const file = new File(['content'], 'cover.jpg', { type: 'image/jpeg' });
        await uploadFile(file, 'plans', 'plan-001');

        const refPath = mockStorageRef.mock.calls[0][1] as string;
        expect(refPath).toMatch(/^plans\/plan-001\./);
    });

    it('genera nombre aleatorio cuando no se proporciona fileName', async () => {
        const file = new File(['content'], 'foto.jpg', { type: 'image/jpeg' });
        await uploadFile(file, 'uploads');

        const refPath = mockStorageRef.mock.calls[0][1] as string;
        expect(refPath).toMatch(/^uploads\/\d+-[a-z0-9]+\./);
    });

    it('llama a convertToWebP antes de subir', async () => {
        const file = new File(['content'], 'foto.jpg', { type: 'image/jpeg' });
        await uploadFile(file, 'avatars');

        expect(convertToWebP).toHaveBeenCalledWith(file);
    });

    it('integración WebP: entrada JPG → convertToWebP devuelve WebP → upload recibe WebP', async () => {
        const originalFile = new File(['jpg-data'], 'foto.jpg', { type: 'image/jpeg' });
        const webpFile = new File(['webp-data'], 'foto.webp', { type: 'image/webp' });

        (convertToWebP as ReturnType<typeof vi.fn>).mockResolvedValueOnce(webpFile);

        await uploadFile(originalFile, 'avatars');

        const [, uploadedFile] = mockUploadBytes.mock.calls[0];
        expect(uploadedFile).toBe(webpFile);
        expect(uploadedFile.type).toBe('image/webp');
    });

    it('fallback: si convertToWebP devuelve el original, sube el original', async () => {
        const file = new File(['content'], 'foto.jpg', { type: 'image/jpeg' });
        (convertToWebP as ReturnType<typeof vi.fn>).mockResolvedValueOnce(file);

        await uploadFile(file, 'uploads');

        const [, uploadedFile] = mockUploadBytes.mock.calls[0];
        expect(uploadedFile).toBe(file);
    });

    it('propaga el error si uploadBytes falla', async () => {
        mockUploadBytes.mockRejectedValueOnce(new Error('Storage unavailable'));
        const file = new File(['content'], 'foto.jpg', { type: 'image/jpeg' });

        await expect(uploadFile(file, 'uploads')).rejects.toThrow('Storage unavailable');
    });
});

// ── Tests de deleteFile ───────────────────────────────────────────────────────

describe('deleteFile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStorageRef.mockReturnValue({ fullPath: 'mocked/ref' });
        mockDeleteObject.mockResolvedValue(undefined);
    });

    it('elimina el objeto dada una URL de Firebase Storage válida', async () => {
        const url = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/planMedia%2Fabc%2Ffile.webp?alt=media&token=xyz';
        await deleteFile(url);

        expect(mockDeleteObject).toHaveBeenCalledOnce();
        const refPath = mockStorageRef.mock.calls[0][1] as string;
        expect(refPath).toBe('planMedia/abc/file.webp');
    });

    it('ignora silenciosamente URLs que no son de Firebase Storage', async () => {
        const url = 'https://pub-abc.r2.dev/planMedia/old-file.jpg';
        await deleteFile(url);

        expect(mockDeleteObject).not.toHaveBeenCalled();
    });

    it('propaga el error si deleteObject falla', async () => {
        mockDeleteObject.mockRejectedValueOnce(new Error('Not found'));
        const url = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/file.webp?alt=media';

        await expect(deleteFile(url)).rejects.toThrow('Not found');
    });
});
