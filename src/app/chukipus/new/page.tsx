'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { firebaseGet, firebaseBatchUpdate, firebasePushId, uploadFile } from '@/lib/firebaseMethods';
import { useAuth } from '@/contexts/AuthContext';

function generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function NuevoChukipuPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!name.trim() || !user) return;
        setIsCreating(true);

        try {
            const chukipuId = firebasePushId('chukipus');

            let imageUrl = '';
            if (imageFile) {
                imageUrl = await uploadFile(imageFile, 'chukipus', chukipuId);
            }

            const userSnap = await firebaseGet<{ chukipusCount?: number }>(`users/${user.uid}`);
            const currentCount = userSnap?.chukipusCount || 0;

            await firebaseBatchUpdate({
                [`chukipus/${chukipuId}`]: {
                    name: name.trim(),
                    image: imageUrl,
                    createdBy: user.uid,
                    members: [user.uid],
                    inviteCode: generateInviteCode(),
                    ratingAverage: 0,
                    ratingCount: 0,
                    membersCount: 1,
                    planCount: 0,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
                [`users/${user.uid}/chukipusCount`]: currentCount + 1,
            });

            router.push(`/chukipus/${chukipuId}`);
        } catch (err) {
            console.error('Error creating Chukipu:', err);
        } finally {
            setIsCreating(false);
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
                <h1 className={styles.title}>Nuevo Chukipu</h1>
                <div className={styles.spacer38} />
            </div>

            {/* Content */}
            <div className={styles.content}>
                {/* Photo Upload */}
                <div className={styles.photoSection}>
                    <div className={styles.photoPreviewWrap}>
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className={styles.photoPreview} />
                        ) : (
                            <div className={styles.photoPlaceholder}>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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
                    <span className={styles.photoHint}>Añadir foto de portada (opcional)</span>
                </div>

                <h2 className={styles.subtitle}>Dale un nombre a vuestro espacio</h2>
                <p className={styles.hint}>Puede ser algo especial entre vosotros</p>

                {/* Input */}
                <div className={styles.inputWrap}>
                    <input
                        type="text"
                        placeholder="Ej: Aventuras de verano"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className={styles.input}
                        autoFocus
                        maxLength={40}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    />
                    {name && (
                        <span className={styles.charCount}>{name.length}/40</span>
                    )}
                </div>



                {/* Create button */}
                <button
                    className={styles.createBtn}
                    disabled={!name.trim() || isCreating}
                    onClick={handleCreate}
                >
                    {isCreating ? 'Creando...' : 'Crear Chukipu'}
                </button>
            </div>
        </div>
    );
}
