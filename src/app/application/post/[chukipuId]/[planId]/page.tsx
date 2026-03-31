'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseGetList, firebaseGet, firebaseUpdate, firebaseCreate } from '@/lib/firebaseMethods';
import { Plan, PlanComment, UserProfile, Chukipu } from '@/types/firestore';

export default function PublicacionPage({ params }: { params: Promise<{ chukipuId: string; planId: string }> }) {
    const { chukipuId, planId } = use(params);
    const router = useRouter();
    const { profile, user } = useAuth();

    const [plan, setPlan] = useState<Plan | null>(null);
    const [chukipu, setChukipu] = useState<Chukipu | null>(null);
    const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null);
    const [comments, setComments] = useState<PlanComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const [loading, setLoading] = useState(true);
    const commentInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const [planData, chukipuData] = await Promise.all([
                    firebaseGet<Plan>(`plans/${planId}`),
                    firebaseGet<Chukipu>(`chukipus/${chukipuId}`),
                ]);

                setPlan(planData);
                setChukipu(chukipuData);

                if (planData) {
                    const [fetchedComments, creator] = await Promise.all([
                        firebaseGetList<PlanComment>(
                            `plans/${planId}/comments`,
                            undefined,
                            'createdAt',
                            'asc'
                        ),
                        planData.createdBy
                            ? firebaseGet<UserProfile>(`users/${planData.createdBy}`)
                            : Promise.resolve(null),
                    ]);

                    setComments(fetchedComments);
                    setCreatorProfile(creator);
                }
            } catch (err) {
                console.error('Error fetching publication:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [chukipuId, planId]);

    const handleLike = async () => {
        if (!user || !plan) return;
        const likes = plan.likes || [];
        const isLiked = likes.includes(user.uid);
        const newLikes = isLiked
            ? likes.filter(uid => uid !== user.uid)
            : [...likes, user.uid];

        try {
            await firebaseUpdate(`plans/${planId}`, {
                likes: newLikes,
                likesCount: newLikes.length,
            });
            setPlan({ ...plan, likes: newLikes, likesCount: newLikes.length });
        } catch (err) {
            console.error('Error toggling like:', err);
        }
    };

    const handleSendComment = async () => {
        if (!user || !profile || !plan || !newComment.trim() || sendingComment) return;
        setSendingComment(true);
        try {
            const commentData = {
                userId: user.uid,
                userName: profile.displayName,
                userAvatar: profile.avatar || '',
                text: newComment.trim(),
            };
            const created = await firebaseCreate<Record<string, unknown>>(
                `plans/${planId}/comments`,
                commentData
            );
            setComments(prev => [...prev, { ...commentData, id: created.id, createdAt: Date.now() }]);
            setNewComment('');
        } catch (err) {
            console.error('Error sending comment:', err);
        } finally {
            setSendingComment(false);
        }
    };

    const handleShare = async () => {
        if (!plan) return;
        const url = `${window.location.origin}/post/${chukipuId}/${planId}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: plan.title, url });
            } catch { /* user cancelled */ }
        } else {
            await navigator.clipboard.writeText(url);
            alert('Enlace copiado');
        }
    };

    const formatTimeAgo = (ts: number) => {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'ahora';
        if (mins < 60) return `${mins}min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d`;
        const weeks = Math.floor(days / 7);
        return `${weeks}sem`;
    };

    const liked = user && plan ? (plan.likes || []).includes(user.uid) : false;

    if (loading) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                    </button>
                    <h1 className={styles.headerTitle}>Publicación</h1>
                    <div className={styles.spacer40} />
                </header>
                <div className={styles.loadingWrap}>
                    <div className={styles.spinner} />
                </div>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                    </button>
                    <h1 className={styles.headerTitle}>Publicación</h1>
                    <div className={styles.spacer40} />
                </header>
                <div className={styles.emptyState}>
                    <p>Publicación no encontrada</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
                <h1 className={styles.headerTitle}>Publicación</h1>
                <div className={styles.spacer40} />
            </header>

            <div className={`page hide-scrollbar ${styles.content}`}>
                {/* Post Header — user info */}
                <div className={styles.postHeader}>
                    <div className={styles.postUser}>
                        <Image
                            src={creatorProfile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${creatorProfile?.displayName || 'U'}`}
                            alt=""
                            className={styles.postUserAvatar}
                            width={40}
                            height={40}
                            style={{ objectFit: 'cover' }}
                        />
                        <div className={styles.postUserInfo}>
                            <span className={styles.postUsername}>{creatorProfile?.username || 'usuario'}</span>
                            <span className={styles.postLocation}>
                                {plan.location || chukipu?.name || ''}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Image */}
                <div className={styles.imageWrap}>
                    {plan.image ? (
                        <Image src={plan.image} alt={plan.title} className={styles.postImage} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} />
                    ) : (
                        <div className={styles.imagePlaceholder}>
                            <span className={styles.placeholderCategory}>{plan.category || ''}</span>
                            <span className={styles.placeholderTitle}>{plan.title}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <div className={styles.actionsLeft}>
                        <button className={styles.actionBtn} onClick={handleLike} aria-label="Me gusta">
                            {liked ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                            )}
                        </button>
                        <button className={styles.actionBtn} onClick={() => commentInputRef.current?.focus()} aria-label="Comentar">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </button>
                        <button className={styles.actionBtn} onClick={handleShare} aria-label="Compartir">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Likes count */}
                {(plan.likesCount || 0) > 0 && (
                    <div className={styles.likes}>
                        <span className={styles.likesCount}>
                            {plan.likesCount} {plan.likesCount === 1 ? 'Me gusta' : 'Me gusta'}
                        </span>
                    </div>
                )}

                {/* Caption */}
                <div className={styles.caption}>
                    <span className={styles.captionUsername}>{creatorProfile?.username || 'usuario'}</span>
                    {' '}
                    <span className={styles.captionText}>
                        {plan.title}
                        {plan.description ? ` — ${plan.description}` : ''}
                    </span>
                </div>

                {/* Comments */}
                {comments.length > 0 && (
                    <div className={styles.commentsSection}>
                        {comments.map(comment => (
                            <div key={comment.id} className={styles.commentItem}>
                                <Image
                                    src={comment.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.userName}`}
                                    alt=""
                                    className={styles.commentAvatar}
                                    width={32}
                                    height={32}
                                    style={{ objectFit: 'cover' }}
                                />
                                <div className={styles.commentBody}>
                                    <span className={styles.commentUser}>{comment.userName}</span>
                                    {' '}
                                    <span className={styles.commentText}>{comment.text}</span>
                                    <span className={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Timestamp */}
                <div className={styles.timestamp}>
                    {formatTimeAgo(plan.createdAt)}
                </div>

                {/* Comment input */}
                <div className={styles.commentInputWrap}>
                    <Image
                        src={profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.displayName || 'U'}`}
                        alt=""
                        className={styles.commentInputAvatar}
                        width={32}
                        height={32}
                        style={{ objectFit: 'cover' }}
                    />
                    <input
                        ref={commentInputRef}
                        type="text"
                        className={styles.commentInput}
                        placeholder="Añade un comentario..."
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                    />
                    {newComment.trim() && (
                        <button
                            className={styles.commentSendBtn}
                            onClick={handleSendComment}
                            disabled={sendingComment}
                        >
                            Publicar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
