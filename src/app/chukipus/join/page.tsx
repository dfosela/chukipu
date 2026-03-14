'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseGetList, firebaseBatchUpdate } from '@/lib/firebaseMethods';
import { Chukipu } from '@/types/firestore';
import { sendNotification } from '@/lib/notifications';

export default function UnirseChukipuPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const autoJoinTriggered = useRef(false);

    // Auto-join when arriving via shared link with ?code=XXXXXXXX
    useEffect(() => {
        const codeParam = searchParams.get('code');
        if (codeParam && user && !autoJoinTriggered.current) {
            autoJoinTriggered.current = true;
            setCode(codeParam.toUpperCase());
            // Trigger join after state update
            setTimeout(() => {
                joinWithCode(codeParam.toUpperCase());
            }, 0);
        }
    }, [searchParams, user]);

    const joinWithCode = async (joinCode: string) => {
        if (!joinCode.trim() || !user) return;
        setLoading(true);
        setError('');

        try {
            const chukipus = await firebaseGetList<Chukipu>(
                'chukipus',
                (c) => c.inviteCode === joinCode.trim()
            );

            if (chukipus.length === 0) {
                setError('Código no encontrado. Revísalo e inténtalo de nuevo.');
                setLoading(false);
                return;
            }

            const chukipu = chukipus[0];

            if (chukipu.members?.includes(user.uid)) {
                router.replace(`/chukipus/${chukipu.id}`);
                return;
            }

            const newMembers = [...(chukipu.members || []), user.uid];

            await firebaseBatchUpdate({
                [`chukipus/${chukipu.id}/members`]: newMembers,
                [`chukipus/${chukipu.id}/membersCount`]: newMembers.length,
                [`chukipus/${chukipu.id}/updatedAt`]: Date.now(),
            });

            if (chukipu.createdBy !== user.uid) {
                await sendNotification(chukipu.createdBy, {
                    type: 'join',
                    title: 'Nuevo miembro',
                    body: `${user.displayName || 'Alguien'} se ha unido a tu Chukipu "${chukipu.name}"`,
                    relatedId: chukipu.id,
                });
            }

            router.replace(`/chukipus/${chukipu.id}`);
        } catch (err) {
            console.error(err);
            setError('Ha ocurrido un error. Inténtalo de nuevo.');
            setLoading(false);
        }
    };

    const handleJoin = () => joinWithCode(code);

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className={styles.title}>Unirte a un Chukipu</h1>
                <div className={styles.spacer38} />
            </div>

            {/* Content */}
            <div className={styles.content}>
                {/* Icon */}
                <div className={styles.iconWrap}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                </div>

                <h2 className={styles.subtitle}>Introduce el código de invitación</h2>
                <p className={styles.hint}>Pídele el código a quien creó el Chukipu</p>

                {/* Code input */}
                <div className={styles.inputWrap}>
                    <input
                        type="text"
                        placeholder="XXXXXXXX"
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                        className={`${styles.input} ${styles.codeInput}`}
                        autoFocus
                        spellCheck={false}
                        onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    />
                </div>

                {error && <p className={styles.errorMsg}>{error}</p>}

                {/* Join button */}
                <button
                    className={styles.createBtn}
                    disabled={!code.trim() || loading}
                    onClick={handleJoin}
                >
                    {loading ? 'Buscando...' : 'Unirse'}
                </button>
            </div>
        </div>
    );
}
