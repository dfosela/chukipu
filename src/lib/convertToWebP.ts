export interface ConvertToWebPOptions {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
}

/**
 * Convierte un File de imagen a WebP usando el Canvas API del navegador.
 * Si el navegador no soporta output WebP o ocurre cualquier error,
 * devuelve el archivo original sin lanzar excepción.
 */
export async function convertToWebP(
    file: File,
    options: ConvertToWebPOptions = {}
): Promise<File> {
    const { quality = 0.85, maxWidth, maxHeight } = options;

    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            let { width, height } = img;

            if (maxWidth && width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            if (maxHeight && height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob || !blob.type.includes('webp')) {
                        // Fallback: browser no soporta output WebP
                        resolve(file);
                        return;
                    }

                    const baseName = file.name.replace(/\.[^/.]+$/, '');
                    resolve(new File([blob], `${baseName}.webp`, { type: 'image/webp' }));
                },
                'image/webp',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
        };

        img.src = objectUrl;
    });
}
