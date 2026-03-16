'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { firebaseGet, firebaseUpdate, firebaseRemove, firebaseBatchUpdate, uploadFile } from '@/lib/firebaseMethods';
import { useAuth } from '@/contexts/AuthContext';
import { Plan } from '@/types/firestore';

const GENRES = [
    'Acción', 'Comedia', 'Drama', 'Terror',
    'Ciencia ficción', 'Romance', 'Animación', 'Thriller',
    'Documental', 'Fantasía', 'Musical', 'Aventura',
];

export default function EditPlanPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
    const { id: chukipuId, planId } = use(params);
    const router = useRouter();
    const { user } = useAuth();

    const [plan, setPlan] = useState<Plan | null>(null);
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('');
    const [duration, setDuration] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        async function fetchPlan() {
            try {
                const data = await firebaseGet<Plan>(`plans/${planId}`);
                if (data) {
                    // Only the creator can edit
                    if (user && data.createdBy !== user.uid) {
                        router.replace(`/application/chukipus/${chukipuId}/plans/${planId}`);
                        return;
                    }
                    setPlan(data);
                    setTitle(data.title);
                    setGenre(data.genre || '');
                    setDuration(data.duration || '');
                    setLocation(data.location || '');
                    setDate(data.date || '');
                    setDateEnd(data.dateEnd || '');
                    if (data.image) setImagePreview(data.image);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchPlan();
    }, [chukipuId, planId, user, router]);

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1 className={styles.title}>Cargando...</h1>
                    <div className={styles.spacer38} />
                </div>
            </div>
        );
    }

    if (!plan) {
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
                    <p className={styles.notFoundText}>Plan no encontrado.</p>
                </div>
            </div>
        );
    }

    const handleSave = async () => {
        if (!title.trim() || isSaving) return;
        setIsSaving(true);

        try {
            const updates: Record<string, unknown> = {
                title: title.trim(),
                genre,
                duration: duration.trim(),
                location: location.trim(),
                date,
                dateEnd,
            };

            if (imageFile) {
                updates.image = await uploadFile(imageFile, 'plans', planId);
            }

            await firebaseUpdate(`plans/${planId}`, updates);
            router.back();
        } catch (err) {
            console.error('Error saving plan:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Seguro que quieres eliminar este plan?')) return;

        try {
            const chukipuSnap = await firebaseGet<{ planCount?: number }>(`chukipus/${chukipuId}`);
            const currentCount = chukipuSnap?.planCount || 1;

            await firebaseBatchUpdate({
                [`plans/${planId}`]: null,
                [`chukipus/${chukipuId}/planCount`]: Math.max(0, currentCount - 1),
            });

            // Also remove all media for this plan
            await firebaseRemove(`planMedia/${planId}`);

            router.push(`/application/chukipus/${chukipuId}`);
        } catch (err) {
            console.error('Error deleting plan:', err);
        }
    };

    const handleToggleCompleted = async () => {
        try {
            await firebaseUpdate(`plans/${planId}`, {
                completed: !plan.completed,
            });
            setPlan({ ...plan, completed: !plan.completed });
        } catch (err) {
            console.error('Error toggling plan:', err);
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
                <h1 className={styles.title}>Editar Plan</h1>
                <div className={styles.spacer38} />
            </div>

            {/* Content */}
            <div className={styles.content}>
                {/* Completed toggle */}
                <button
                    className={`${styles.completedToggle} ${plan.completed ? styles.completedActive : ''}`}
                    onClick={handleToggleCompleted}
                >
                    <div className={styles.completedCheck}>
                        {plan.completed && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </div>
                    {plan.completed ? 'Completado' : 'Marcar como completado'}
                </button>

                {/* Photo Upload (cover image) */}
                <div className={styles.photoSection}>
                    <div className={styles.photoPreviewWrap}>
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className={styles.photoPreview} />
                        ) : (
                            <div className={styles.photoPlaceholder}>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
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
                    <span className={styles.photoHint}>Imagen de portada {imagePreview ? '(cambiar)' : '(opcional)'}</span>
                </div>

                {/* Title */}
                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Título</label>
                    <div className={styles.inputWrap}>
                        <input
                            type="text"
                            placeholder="Título del plan"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className={styles.input}
                            maxLength={60}
                        />
                        {title && (
                            <span className={styles.charCount}>{title.length}/60</span>
                        )}
                    </div>
                </div>

                {/* Genre chips */}
                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Género <span className={styles.optional}>(opcional)</span></label>
                    <div className={styles.chipsWrap}>
                        {GENRES.map(g => (
                            <button
                                key={g}
                                type="button"
                                className={`${styles.chip} ${genre === g ? styles.chipSelected : ''}`}
                                onClick={() => setGenre(genre === g ? '' : g)}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Duration */}
                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Duración <span className={styles.optional}>(opcional)</span></label>
                    <input
                        type="text"
                        placeholder="Ej: 2h 15min"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                        className={styles.input}
                        maxLength={20}
                    />
                </div>

                {/* Location */}
                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Lugar <span className={styles.optional}>(opcional)</span></label>
                    <input
                        type="text"
                        placeholder="Ej: Cine, Casa, Netflix..."
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className={styles.input}
                        maxLength={40}
                    />
                </div>

                {/* Date */}
                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Fecha y hora <span className={styles.optional}>(opcional)</span></label>
                    <input
                        type="datetime-local"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className={styles.input}
                    />
                </div>

                {/* End date */}
                {date && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Fecha de fin <span className={styles.optional}>(opcional, si dura más de 1 día)</span></label>
                        <input
                            type="datetime-local"
                            value={dateEnd}
                            onChange={e => setDateEnd(e.target.value)}
                            className={styles.input}
                            min={date}
                        />
                    </div>
                )}

                {/* Save button */}
                <button
                    className={styles.saveBtn}
                    disabled={!title.trim() || isSaving}
                    onClick={handleSave}
                >
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>

                {/* Delete button */}
                <button className={styles.deleteBtn} onClick={handleDelete}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Eliminar plan
                </button>
            </div>
        </div>
    );
}
