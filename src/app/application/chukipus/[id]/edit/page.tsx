'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';
import { firebaseGet, firebaseGetList, firebaseUpdate, firebaseRemove, uploadFile } from '@/lib/firebaseMethods';
import { useAuth } from '@/contexts/AuthContext';
import { Chukipu, Plan } from '@/types/firestore';

export default function EditChukipuPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { user } = useAuth();
    const [chukipu, setChukipu] = useState<Chukipu | null>(null);
    const [name, setName] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function fetchChukipu() {
            try {
                const data = await firebaseGet<Chukipu>(`chukipus/${id}`);
                if (data) {
                    setChukipu(data);
                    setName(data.name);
                    setImagePreview(data.image);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchChukipu();
    }, [id]);

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1 className={styles.title}>Cargando</h1>
                    <div className={styles.spacer38} />
                </div>
            </div>
        );
    }

    if (!chukipu) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1 className={styles.title}>Error</h1>
                    <div className={styles.spacer38} />
                </div>
                <div className={styles.content}>
                    <p>Chukipu no encontrado.</p>
                </div>
            </div>
        );
    }

    const handleSave = async () => {
        if (!name.trim() || isSaving) return;
        setIsSaving(true);

        try {
            const updates: Record<string, unknown> = {
                name: name.trim()
            };

            if (imageFile) {
                updates.image = await uploadFile(imageFile, 'chukipus', id);
            }

            await firebaseUpdate(`chukipus/${id}`, updates);
            router.back();
        } catch (err) {
            console.error('Error saving Chukipu:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Seguro que quieres eliminar este Chukipu?')) return;

        try {
            const plans = await firebaseGetList<Plan>('plans', (p) => p.chukipuId === id);
            await Promise.all(plans.map(async (plan) => {
                await firebaseRemove(`planMedia/${plan.id}`);
                await firebaseRemove(`plans/${plan.id}`);
            }));

            await firebaseRemove(`chukipus/${id}`);

            if (user) {
                const userSnap = await firebaseGet<{ chukipusCount?: number }>(`users/${user.uid}`);
                const currentCount = userSnap?.chukipusCount || 1;
                await firebaseUpdate(`users/${user.uid}`, { chukipusCount: Math.max(0, currentCount - 1) });
            }
            router.push('/application/chukipus');
        } catch (err) {
            console.error('Error deleting Chukipu:', err);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className={styles.title}>Editar Chukipu</h1>
                <div className={styles.spacer38} />
            </div>

            {/* Content */}
            <div className={styles.content}>

                {/* Photo Upload */}
                <div className={styles.photoSection}>
                    <div className={styles.photoPreviewWrap}>
                        {imagePreview ? (
                            <Image src={imagePreview} alt="Preview" className={styles.photoPreview} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} />
                        ) : (
                            <div className={styles.photoPlaceholder}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                            </div>
                        )}
                        <label className={styles.photoUploadBtn}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className={styles.hidden}
                            />
                        </label>
                    </div>
                    <span className={styles.photoHint}>Cambiar foto de portada</span>
                </div>

                {/* Input */}
                <div className={styles.inputWrap}>
                    <label className={styles.inputLabel}>Nombre del Chukipu</label>
                    <input
                        type="text"
                        placeholder="Ej: Aventuras de verano"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className={styles.input}
                        maxLength={40}
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                    />
                    {name && (
                        <span className={styles.charCount}>{name.length}/40</span>
                    )}
                </div>



                {/* Save button */}
                <button
                    className={styles.saveBtn}
                    disabled={!name.trim() || isSaving}
                    onClick={handleSave}
                >
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>

                {/* Delete button */}
                <button
                    className={styles.deleteBtn}
                    onClick={handleDelete}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Eliminar Chukipu
                </button>
            </div>
        </div>
    );
}
