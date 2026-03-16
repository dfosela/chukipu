import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertToWebP } from '@/lib/convertToWebP';

// Capturamos createElement ANTES de cualquier mock para evitar recursión
const origCreateElement = document.createElement.bind(document);

// ── Tipos internos del mock ───────────────────────────────────────────────────

interface MockImg {
    src: string;
    onload: ((e: Event) => void) | null;
    onerror: ((e: Event) => void) | null;
    width: number;
    height: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCanvasMock(outputBlobType: string) {
    return {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
        toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
            const blob = outputBlobType
                ? new Blob(['img-data'], { type: outputBlobType })
                : null;
            cb(blob);
        }),
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('convertToWebP', () => {
    let mockImg: MockImg;

    beforeEach(() => {
        vi.restoreAllMocks();

        mockImg = { src: '', onload: null, onerror: null, width: 0, height: 0 };

        // Mock del constructor Image (debe ser una clase/function para poder usarse con `new`)
        vi.stubGlobal('Image', class { constructor() { return mockImg; } });

        URL.createObjectURL = vi.fn().mockReturnValue('blob:fake-url');
        URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    function setupCanvas(outputBlobType: string) {
        const canvasMock = makeCanvasMock(outputBlobType);
        vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
            if (tag === 'canvas') return canvasMock as unknown as HTMLCanvasElement;
            return origCreateElement(tag); // sin recursión
        });
        return canvasMock;
    }

    function resolveImage(width = 200, height = 150) {
        mockImg.width = width;
        mockImg.height = height;
        mockImg.onload?.(new Event('load'));
    }

    it('devuelve un File WebP con extensión .webp cuando el canvas soporta WebP', async () => {
        setupCanvas('image/webp');

        const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
        const promise = convertToWebP(file);
        resolveImage();
        const result = await promise;

        expect(result.name).toBe('photo.webp');
        expect(result.type).toBe('image/webp');
    });

    it('preserva el nombre original cambiando solo la extensión', async () => {
        setupCanvas('image/webp');

        const file = new File(['data'], 'mi-foto-bonita.png', { type: 'image/png' });
        const promise = convertToWebP(file);
        resolveImage();
        const result = await promise;

        expect(result.name).toBe('mi-foto-bonita.webp');
    });

    it('fallback: devuelve el archivo original si canvas no genera WebP', async () => {
        setupCanvas('image/jpeg'); // browser que no soporta output WebP

        const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
        const promise = convertToWebP(file);
        resolveImage();
        const result = await promise;

        expect(result).toBe(file);
    });

    it('fallback: devuelve el archivo original si canvas.toBlob devuelve null', async () => {
        setupCanvas(''); // null blob

        const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
        const promise = convertToWebP(file);
        resolveImage();
        const result = await promise;

        expect(result).toBe(file);
    });

    it('fallback: devuelve el archivo original si ocurre un error de carga', async () => {
        const file = new File(['data'], 'broken.jpg', { type: 'image/jpeg' });
        const promise = convertToWebP(file);
        mockImg.onerror?.(new Event('error'));
        const result = await promise;

        expect(result).toBe(file);
    });

    it('no toca archivos que no son imágenes (ej. vídeo)', async () => {
        const file = new File(['data'], 'video.mp4', { type: 'video/mp4' });
        const result = await convertToWebP(file);
        expect(result).toBe(file);
    });

    it('aplica maxWidth reduciendo proporcionalmente (400×300 → maxWidth 100 → 100×75)', async () => {
        let capturedWidth = 0;
        let capturedHeight = 0;
        const canvasMock = {
            get width() { return capturedWidth; },
            set width(v: number) { capturedWidth = v; },
            get height() { return capturedHeight; },
            set height(v: number) { capturedHeight = v; },
            getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
            toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
                cb(new Blob(['data'], { type: 'image/webp' }));
            }),
        };
        vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
            if (tag === 'canvas') return canvasMock as unknown as HTMLCanvasElement;
            return origCreateElement(tag);
        });

        const file = new File(['data'], 'big.jpg', { type: 'image/jpeg' });
        const promise = convertToWebP(file, { maxWidth: 100 });
        resolveImage(400, 300); // 4:3 ratio
        await promise;

        expect(capturedWidth).toBe(100);
        expect(capturedHeight).toBe(75);
    });

    it('usa quality 0.85 por defecto (pasada a toBlob)', async () => {
        const canvasMock = makeCanvasMock('image/webp');
        vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
            if (tag === 'canvas') return canvasMock as unknown as HTMLCanvasElement;
            return origCreateElement(tag);
        });

        const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
        const promise = convertToWebP(file);
        resolveImage();
        await promise;

        expect(canvasMock.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.85);
    });
});
