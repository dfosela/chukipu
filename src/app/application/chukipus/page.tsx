'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import BottomNav from '@/components/BottomNav/BottomNav';
import { useEffect } from 'react';
import Image from 'next/image';
import { firebaseGet, firebaseGetList } from '@/lib/firebaseMethods';
import { useAuth } from '@/contexts/AuthContext';
import { Chukipu } from '@/types/firestore';

export default function ChukipusPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [viewMode] = useState<'grid' | 'list'>('list');
    const [search, setSearch] = useState('');
    const [myChukipus, setMyChukipus] = useState<Chukipu[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchChukis() {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const data = await firebaseGetList<Chukipu>('chukipus', (c) => {
                    if (!c.members) return false;
                    if (Array.isArray(c.members)) return c.members.includes(user.uid);
                    return (c.members as Record<string, boolean>)[user.uid] === true;
                }, 'updatedAt', 'desc');
                setMyChukipus(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        if (!authLoading) fetchChukis();
    }, [user, authLoading]);

    const filteredChukipus = myChukipus.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.pageTitle}>Mis Chukipus</h1>
                    <p className={styles.pageSubtitle}>{loading ? "Cargando..." : `${myChukipus.length} espacios compartidos`}</p>
                </div>
            </header>

            {/* Content */}
            <div className={`page hide-scrollbar`}>
                {/* Search Bar */}
                <div className={styles.searchWrap}>
                    <div className={styles.searchBar}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.searchIcon}>
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="search"
                            placeholder="Buscar Chukipus..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>
                </div>
                {loading || authLoading ? (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyDesc}>Cargando...</p>
                    </div>
                ) : filteredChukipus.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </div>
                        <h2 className={styles.emptyTitle}>Sin Chukipus aún</h2>
                        <p className={styles.emptyDesc}>Crea tu primer espacio compartido y empieza a organizar planes.</p>
                    </div>
                ) : (
                    <div className={`${styles.grid} ${viewMode === 'list' ? styles.listView : ''}`}>
                        {filteredChukipus.map((c, idx) => (
                            <ChukipuCard
                                key={c.id}
                                chukipu={c}
                                listMode={viewMode === 'list'}
                                delay={idx * 0.08}
                                onClick={() => router.push(`/application/chukipus/${c.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>



            <BottomNav />
        </div>
    );
}

function ChukipuCard({
    chukipu, delay, onClick
}: {
    chukipu: Chukipu;
    listMode: boolean;
    delay: number;
    onClick: () => void;
}) {
    const memberUids = Array.isArray(chukipu.members)
        ? chukipu.members
        : chukipu.members ? Object.keys(chukipu.members as unknown as Record<string, boolean>).filter(k => (chukipu.members as unknown as Record<string, boolean>)[k]) : [];

    return (
        <div
            className={styles.card}
            style={{ '--delay': `${delay}s` } as React.CSSProperties}
            onClick={onClick}
        >
            <div className={styles.cardImage}>
                {chukipu.image && <Image src={chukipu.image} alt={chukipu.name} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} />}
                <div className={styles.cardOverlay} />
            </div>

            <div className={styles.cardContent}>
                <h3 className={styles.cardName}>{chukipu.name}</h3>

                <div className={styles.cardFooter}>
                    <div className={styles.footerLeft}>
                        <span className={styles.planBadge}>{chukipu.planCount} planes</span>

                        {memberUids.length > 0 && (
                            <div className={styles.membersGroup}>
                                {memberUids.slice(0, 3).map((uid, i) => (
                                    <div key={i} className={styles.memberAvatar}>
                                        <MemberAvatar uid={uid} />
                                    </div>
                                ))}
                                {memberUids.length > 3 && (
                                    <div className={styles.memberMore}>
                                        +{memberUids.length - 3}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className={styles.cardArrow}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MemberAvatar({ uid }: { uid: string }) {
    const [avatar, setAvatar] = useState<string | null>(null);
    const [initial, setInitial] = useState<string>('');

    useEffect(() => {
        let isMounted = true;
        async function fetchUser() {
            try {
                const u = await firebaseGet<{ avatar?: string, photoURL?: string, displayName?: string }>(`users/${uid}`);
                if (isMounted && u) {
                    if (u.avatar || u.photoURL) {
                        setAvatar(u.avatar || u.photoURL || null);
                    } else if (u.displayName) {
                        setInitial(u.displayName.charAt(0).toUpperCase());
                    }
                }
            } catch { }
        }
        fetchUser();
        return () => { isMounted = false; };
    }, [uid]);

    if (avatar) {
        return <Image src={avatar} alt="Miembro" width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    }

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '10px', fontWeight: 'bold' }}>
            {initial}
        </div>
    );
}
