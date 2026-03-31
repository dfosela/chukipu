'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ref, onValue, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { FeedbackEntry } from '@/types/firestore';
import styles from './page.module.css';

const INTRO_KEY = 'chukipu_feedback_intro_seen';

const TYPE_LABELS: Record<FeedbackEntry['type'], string> = {
    sugerencia: 'Sugerencia',
    bug: 'Error',
    feedback: 'Feedback',
};

const TYPE_COLORS: Record<FeedbackEntry['type'], string> = {
    sugerencia: '#5b86e5',
    bug: '#e8749a',
    feedback: '#52c788',
};

function formatDate(ts: number): string {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60_000);
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(diff / 86_400_000);
    if (m < 1) return 'Ahora mismo';
    if (m < 60) return `Hace ${m} min`;
    if (h < 24) return `Hace ${h} ${h === 1 ? 'hora' : 'horas'}`;
    if (d === 1) return 'Ayer';
    if (d < 7) return `Hace ${d} días`;
    return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function FeedbackPage() {
    const router = useRouter();
    const { user, profile: userProfile } = useAuth();

    const [entries, setEntries] = useState<FeedbackEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [text, setText] = useState('');
    const [type, setType] = useState<FeedbackEntry['type']>('sugerencia');
    const [submitting, setSubmitting] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const textRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !localStorage.getItem(INTRO_KEY)) {
            setShowModal(true);
        }
    }, []);

    useEffect(() => {
        const feedbackRef = ref(db, 'feedback');
        const unsub = onValue(feedbackRef, (snap) => {
            const data = snap.val();
            if (!data) { setEntries([]); setLoading(false); return; }
            const list: FeedbackEntry[] = Object.entries(data).map(
                ([key, val]) => ({ ...(val as Omit<FeedbackEntry, 'id'>), id: key })
            );
            list.sort((a, b) => b.createdAt - a.createdAt);
            setEntries(list);
            setLoading(false);
        }, () => {
            setEntries([]);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleCloseModal = () => {
        localStorage.setItem(INTRO_KEY, '1');
        setShowModal(false);
    };

    const handleBack = () => {
        if (showForm && text.trim()) {
            setShowDiscardModal(true);
        } else if (showForm) {
            setShowForm(false);
        } else {
            router.back();
        }
    };

    const handleConfirmDiscard = () => {
        setShowDiscardModal(false);
        setShowForm(false);
        setText('');
    };

    const handleSubmit = async () => {
        if (!text.trim() || !user || submitting) return;
        setSubmitting(true);
        try {
            await push(ref(db, 'feedback'), {
                text: text.trim(),
                authorId: user.uid,
                authorName: userProfile?.displayName || userProfile?.username || 'Usuario',
                authorAvatar: userProfile?.avatar || '',
                type,
                createdAt: Date.now(),
            });
            setText('');
            setShowForm(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={handleBack} aria-label="Volver">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <div className={styles.spacer} />
                {showForm && (
                    <button
                        className={styles.submitHeaderBtn}
                        onClick={handleSubmit}
                        disabled={!text.trim() || submitting}
                    >
                        {submitting ? 'Enviando...' : 'Enviar'}
                    </button>
                )}
            </header>

            {/* Discard confirmation modal */}
            {showDiscardModal && (
                <div className={styles.modalOverlay} onClick={() => setShowDiscardModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>¿Descartar?</h2>
                        <p className={styles.modalText}>
                            Tienes texto escrito. Si sales ahora, se perderá.
                        </p>
                        <div className={styles.discardActions}>
                            <button className={styles.discardKeepBtn} onClick={() => setShowDiscardModal(false)}>
                                Seguir editando
                            </button>
                            <button className={styles.discardConfirmBtn} onClick={handleConfirmDiscard}>
                                Descartar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Intro modal */}
            {showModal && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalIcon}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h2 className={styles.modalTitle}>Tu opinión importa</h2>
                        <p className={styles.modalText}>
                            Este es el espacio de la comunidad Chukipu. Aquí puedes compartir sugerencias o reportar errores.
                        </p>
                        <p className={styles.modalText}>
                            Todos los usuarios pueden ver y leer las aportaciones. ¡Ayúdanos a mejorar!
                        </p>
                        <button className={styles.modalBtn} onClick={handleCloseModal}>
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {/* New feedback form */}
            {showForm && (
                <div className={styles.formWrap}>
                    <div className={styles.typeRow}>
                        {(['sugerencia', 'bug'] as FeedbackEntry['type'][]).map(t => (
                            <button
                                key={t}
                                className={`${styles.typeChip} ${type === t ? styles.typeChipActive : ''}`}
                                style={{ '--type-color': TYPE_COLORS[t] } as React.CSSProperties}
                                onClick={() => setType(t)}
                            >
                                {TYPE_LABELS[t]}
                            </button>
                        ))}
                    </div>
                    <textarea
                        ref={textRef}
                        className={styles.textarea}
                        placeholder={type === 'bug' ? 'Describe el error que encontraste...' : 'Escribe tu sugerencia...'}
                        value={text}
                        onChange={e => {
                            setText(e.target.value);
                            const el = e.target;
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                        }}
                        maxLength={500}
                        rows={4}
                        autoFocus
                    />
                </div>
            )}

            {/* List */}
            <div className={`page hide-scrollbar ${styles.pageContent}${showForm ? ` ${styles.hidden}` : ''}`}>
                {loading ? (
                    <div className={styles.loadingWrap}>
                        <div className={styles.spinner} />
                    </div>
                ) : entries.length === 0 ? (
                    <div className={styles.empty}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIllustration}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <p>Aún no hay sugerencias</p>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {entries.map(entry => (
                            <div key={entry.id} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.authorRow}>
                                        {entry.authorAvatar ? (
                                            <Image src={entry.authorAvatar} alt={entry.authorName} width={32} height={32} className={styles.avatar} />
                                        ) : (
                                            <div className={styles.avatarPlaceholder}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className={styles.authorInfo}>
                                            <span className={styles.authorName}>{entry.authorName}</span>
                                            <span className={styles.date}>{formatDate(entry.createdAt)}</span>
                                        </div>
                                    </div>
                                    <span
                                        className={styles.typeBadge}
                                        style={{ '--type-color': TYPE_COLORS[entry.type] || TYPE_COLORS.sugerencia, '--type-bg': `${TYPE_COLORS[entry.type] || TYPE_COLORS.sugerencia}15`, '--type-border': `${TYPE_COLORS[entry.type] || TYPE_COLORS.sugerencia}40` } as React.CSSProperties}
                                    >
                                        {TYPE_LABELS[entry.type] || entry.type}
                                    </span>
                                </div>
                                <p className={styles.cardText}>{entry.text}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* FAB to open form */}
            {!showForm && (
                <button className={styles.fab} onClick={() => setShowForm(true)} aria-label="Nueva sugerencia">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </button>
            )}
        </div>
    );
}
