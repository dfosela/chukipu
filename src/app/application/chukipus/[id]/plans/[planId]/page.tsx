'use client';

import { useState, use, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';
import {
    firebaseGet,
    firebaseUpdate,
    firebaseGetList,
    firebasePushId,
    firebaseBatchUpdate,
    firebaseRemove,
    uploadFile,
    deleteFile,
} from '@/lib/firebaseMethods';
import { useAuth } from '@/contexts/AuthContext';
import { Plan, PlanMedia } from '@/types/firestore';
import BottomNav from '@/components/BottomNav/BottomNav';

const categoryColors: Record<string, string> = {
    Película: '#e8749a',
    Viaje: '#5b86e5',
    Comida: '#ff7f50',
    Escapada: '#52c788',
    Deporte: '#5b86e5',
    Cena: '#f5a623',
    'Cocina en casa': '#ff7f50',
    Gaming: '#a78bfa',
    'Juego de mesa': '#f5a623',
    Cultura: '#f5a623',
    Lectura: '#52c788',
};

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora mismo';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
}

export default function PlanDetailPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
    const { id: chukipuId, planId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get('from'); // 'explore' | 'home' | null
    const backDestination = from === 'explore'
        ? '/application/explore'
        : from === 'home'
            ? '/application'
            : `/application/chukipus/${chukipuId}`;
    const { user, profile } = useAuth();

    const [plan, setPlan] = useState<Plan | null>(null);
    const [media, setMedia] = useState<PlanMedia[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isPinning, setIsPinning] = useState(false);
    const [toast, setToast] = useState<{ message: string; onUndo?: () => void } | null>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((message: string, onUndo?: () => void) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ message, onUndo });
        toastTimerRef.current = setTimeout(() => setToast(null), 4000);
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function load() {
            try {
                const planData = await firebaseGet<Plan>(`plans/${planId}`);
                if (planData) {
                    setPlan(planData);
                    // Check if current user is a member of this chukipu
                    const chukipuData = await firebaseGet<{ members?: string[] | Record<string, boolean> }>(`chukipus/${chukipuId}`);
                    if (chukipuData && user) {
                        const members = chukipuData.members;
                        if (Array.isArray(members)) {
                            setIsMember(members.includes(user.uid));
                        } else if (members && typeof members === 'object') {
                            setIsMember(Boolean(members[user.uid]));
                        }
                    }
                    const mediaList = await firebaseGetList<PlanMedia>(
                        `planMedia/${planId}`,
                        undefined,
                        'createdAt',
                        'desc'
                    );
                    setMedia(mediaList);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [planId, chukipuId, user]);

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.push(backDestination)} aria-label="Volver">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1 className={styles.headerTitle}>Cargando...</h1>
                    <div className={styles.spacer38} />
                </div>
                <BottomNav />
            </div>
        );
    }

    if (!plan) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.push(backDestination)} aria-label="Volver">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1 className={styles.headerTitle}>Plan no encontrado</h1>
                    <div className={styles.spacer38} />
                </div>
                <BottomNav />
            </div>
        );
    }

    const isCreator = user?.uid === plan.createdBy;
    const catColor = categoryColors[plan.category] ?? 'var(--brand-primary)';
    const isLiked = !!user && (plan.likes || []).includes(user.uid);
    const likeCount = plan.likesCount || 0;

    const handleTogglePin = async () => {
        if (!isMember || isPinning) return;
        setIsPinning(true);
        const newVal = !plan.showInProfile;
        setPlan(prev => prev ? { ...prev, showInProfile: newVal } : prev);
        try {
            await firebaseUpdate(`plans/${planId}`, { showInProfile: newVal });
        } catch (err) {
            console.error(err);
            setPlan(prev => prev ? { ...prev, showInProfile: !newVal } : prev);
        } finally {
            setIsPinning(false);
        }
    };

    const handleToggleCompleted = async () => {
        if (!isMember) return;
        const newVal = !plan.completed;
        setPlan(prev => prev ? { ...prev, completed: newVal } : prev);
        try {
            await firebaseUpdate(`plans/${planId}`, { completed: newVal });
        } catch (err) {
            console.error(err);
            setPlan(prev => prev ? { ...prev, completed: !newVal } : prev);
        }
    };

    const handleToggleLike = async () => {
        if (!isMember) return;
        const currentLikes = plan.likes || [];
        const isLiked = currentLikes.includes(user.uid);
        const newLikes = isLiked
            ? currentLikes.filter(uid => uid !== user.uid)
            : [...currentLikes, user.uid];
        const newCount = newLikes.length;
        setPlan(prev => prev ? { ...prev, likes: newLikes, likesCount: newCount } : prev);
        try {
            await firebaseUpdate(`plans/${planId}`, { likes: newLikes, likesCount: newCount });
        } catch (err) {
            console.error(err);
            setPlan(prev => prev ? { ...prev, likes: currentLikes, likesCount: currentLikes.length } : prev);
        }
    };

    const handleDeleteMedia = async (item: PlanMedia) => {
        if (item.uploadedBy !== user?.uid) return;

        // Optimistic remove immediately — no confirm dialog
        setMedia(prev => prev.filter(m => m.id !== item.id));

        let undone = false;

        showToast(
            item.type === 'video' ? 'Video eliminado' : 'Foto eliminada',
            () => {
                undone = true;
                setMedia(prev => [item, ...prev].sort((a, b) => b.createdAt - a.createdAt));
                setToast(null);
            }
        );

        // Wait for undo window (4s) then commit
        await new Promise(res => setTimeout(res, 4200));
        if (undone) return;

        try {
            await firebaseRemove(`planMedia/${planId}/${item.id}`);
            await deleteFile(item.url);
        } catch (err) {
            console.error('Error deleting media:', err);
            // Revert on failure even after undo window
            setMedia(prev => [item, ...prev].sort((a, b) => b.createdAt - a.createdAt));
            showToast('Error al eliminar. Inténtalo de nuevo.');
        }
    };

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length || !user || isUploading || !isMember) return;

        setIsUploading(true);
        try {
            const newItems: PlanMedia[] = [];
            for (const file of files) {
                const mediaId = firebasePushId(`planMedia/${planId}`);
                const isVideo = file.type.startsWith('video/');
                const url = await uploadFile(file, `planMedia/${planId}`, mediaId);

                const mediaItem: Omit<PlanMedia, 'id'> = {
                    planId,
                    url,
                    type: isVideo ? 'video' : 'photo',
                    uploadedBy: user.uid,
                    uploaderName: profile?.displayName || profile?.username || 'Usuario',
                    uploaderAvatar: profile?.avatar || '',
                    createdAt: Date.now(),
                };

                await firebaseBatchUpdate({
                    [`planMedia/${planId}/${mediaId}`]: mediaItem,
                });

                newItems.push({ id: mediaId, ...mediaItem });
            }
            // Prepend newest-first
            setMedia(prev => [...newItems.reverse(), ...prev]);
        } catch (err) {
            console.error('Error uploading media:', err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };


    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.push(backDestination)} aria-label="Volver">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>

                <h1 className={styles.headerTitle}>{plan.title}</h1>

                <div className={styles.headerActions}>
                    {isMember && (
                        <button
                            className={`${styles.pinBtn} ${plan.showInProfile ? styles.pinBtnActive : ''}`}
                            onClick={handleTogglePin}
                            aria-label={plan.showInProfile ? 'Quitar del perfil' : 'Fijar en el perfil'}
                            title={plan.showInProfile ? 'Quitar del perfil' : 'Fijar en el perfil'}
                            disabled={isPinning}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill={plan.showInProfile ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="17" x2="12" y2="22" />
                                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                            </svg>
                        </button>
                    )}
                    {isCreator && (
                        <button
                            className={styles.editHeaderBtn}
                            onClick={() => router.push(`/application/chukipus/${chukipuId}/plans/${planId}/edit`)}
                            aria-label="Editar plan"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </button>
                    )}
                    {!isMember && (
                        <button
                            className={styles.editHeaderBtn}
                            onClick={() => router.push(`/application/chukipus/${chukipuId}`)}
                            aria-label="Ver chukipu"
                            title="Ver chukipu"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className={`page hide-scrollbar ${styles.pageContent}`}>
                {/* Plan Info Card */}
                <div className={styles.infoCard}>
                    {/* Category + status row */}
                    <div className={styles.infoTopRow}>
                        <span
                            className={styles.categoryBadge}
                            style={{ '--cat-color': catColor } as React.CSSProperties}
                        >
                            {plan.category}
                        </span>
                        <button
                            className={`${styles.statusBadge} ${plan.completed ? styles.statusDone : styles.statusPending}`}
                            onClick={isMember ? handleToggleCompleted : undefined}
                            style={!isMember ? { cursor: 'default' } : undefined}
                        >
                            {plan.completed ? (
                                <>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Completado
                                </>
                            ) : (
                                <>
                                    <div className={styles.pendingDot} />
                                    Pendiente
                                </>
                            )}
                        </button>
                        <button
                            className={`${styles.likeBtn} ${isLiked ? styles.likeBtnLiked : ''}`}
                            onClick={handleToggleLike}
                            aria-label={isLiked ? 'Quitar like' : 'Dar like'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            {likeCount > 0 && <span>{likeCount}</span>}
                        </button>
                    </div>

                    {/* Detail rows */}
                    <div className={styles.infoRows}>
                        {plan.genre && (
                            <div className={styles.infoRow}>
                                <svg className={styles.infoIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                <span className={styles.infoText}>{plan.genre}</span>
                            </div>
                        )}
                        {plan.duration && (
                            <div className={styles.infoRow}>
                                <svg className={styles.infoIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                </svg>
                                <span className={styles.infoText}>{plan.duration}</span>
                            </div>
                        )}
                        {plan.location && (
                            <div className={styles.infoRow}>
                                <svg className={styles.infoIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                                </svg>
                                <span className={styles.infoText}>{plan.location}</span>
                            </div>
                        )}
                        {plan.date && (
                            <div className={styles.infoRow}>
                                <svg className={styles.infoIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                <span className={styles.infoText}>{formatDate(plan.date)}</span>
                            </div>
                        )}
                        {plan.dateEnd && plan.date && (
                            <div className={styles.infoRow}>
                                <svg className={styles.infoIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                                </svg>
                                <span className={styles.infoText}>{formatDate(plan.dateEnd)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Media Feed Section */}
                <div className={styles.feedSection}>
                    <div className={styles.feedHeader}>
                        <h2 className={styles.feedTitle}>Fotos y videos</h2>
                        {isMember && (
                            <label className={styles.addMediaBtn} htmlFor="mediaInput">
                                {isUploading ? (
                                    <div className={styles.uploadSpinner} />
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        Añadir
                                    </>
                                )}
                            </label>
                        )}
                        <input
                            id="mediaInput"
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleMediaUpload}
                            className={styles.hidden}
                            disabled={isUploading || !isMember}
                        />
                    </div>

                    {media.length === 0 ? (
                        <div className={styles.emptyFeed}>
                            <div className={styles.emptyFeedIcon}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                            </div>
                            <p className={styles.emptyFeedText}>Aún no hay fotos ni videos</p>
                            <p className={styles.emptyFeedSub}>Añade el primer recuerdo de este plan</p>
                        </div>
                    ) : (
                        <div className={styles.mediaGrid}>
                            {media.map((item) => (
                                <div key={item.id} className={styles.mediaItem}>
                                    <div className={styles.mediaAssetWrap} style={{ position: 'relative' }}>
                                        {item.type === 'video' ? (
                                            <video
                                                src={item.url}
                                                className={styles.mediaAsset}
                                                controls
                                                playsInline
                                            />
                                        ) : (
                                            <Image
                                                src={item.url}
                                                alt="Foto del plan"
                                                className={styles.mediaAsset}
                                                fill
                                                style={{ objectFit: 'cover' }}
                                            />
                                        )}
                                        {item.uploadedBy === user?.uid && (
                                            <button
                                                className={styles.mediaDeleteBtn}
                                                onClick={() => handleDeleteMedia(item)}
                                                aria-label="Eliminar"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    <div className={styles.mediaFooter}>
                                        {item.uploaderAvatar ? (
                                            <Image src={item.uploaderAvatar} alt={item.uploaderName} className={styles.mediaAvatar} width={24} height={24} style={{ objectFit: 'cover' }} />
                                        ) : (
                                            <div className={styles.mediaAvatarPlaceholder}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                                </svg>
                                            </div>
                                        )}
                                        <span className={styles.mediaUploaderName}>{item.uploaderName}</span>
                                        <span className={styles.mediaTime}>{timeAgo(item.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <BottomNav />

            {/* Toast */}
            {toast && (
                <div className={styles.toast}>
                    <span className={styles.toastMsg}>{toast.message}</span>
                    {toast.onUndo && (
                        <button className={styles.toastUndo} onClick={toast.onUndo}>Deshacer</button>
                    )}
                </div>
            )}
        </div>
    );
}
