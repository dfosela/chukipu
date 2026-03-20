'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from '../../../profile/followers/page.module.css';
import { firebaseGet } from '@/lib/firebaseMethods';
import { UserProfile } from '@/types/firestore';

export default function UserFollowersPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [followers, setFollowers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');

    useEffect(() => {
        async function fetchFollowers() {
            try {
                const userData = await firebaseGet<UserProfile>(`users/${id}`);
                if (!userData) return;
                setUsername(userData.username || '');
                const ids = userData.followers || [];
                const users: UserProfile[] = [];
                for (const uid of ids) {
                    const u = await firebaseGet<UserProfile>(`users/${uid}`);
                    if (u) users.push(u);
                }
                setFollowers(users);
            } catch (err) {
                console.error('Error fetching followers:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchFollowers();
    }, [id]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className={styles.title}>{username ? `@${username}` : 'Seguidores'}</h1>
                <div className={styles.spacer38} />
            </div>

            <div className={styles.list}>
                {loading ? (
                    <p className={styles.empty}>Cargando...</p>
                ) : followers.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <p className={styles.emptyTitle}>Sin seguidores</p>
                        <p className={styles.emptyDesc}>Aún nadie sigue a este usuario.</p>
                    </div>
                ) : (
                    followers.map((u, i) => (
                        <div key={u.id} className={styles.userItem} style={{ '--delay': `${i * 0.04}s` } as React.CSSProperties}>
                            <button className={styles.userItemMain} onClick={() => router.push(`/application/user/${u.id}`)}>
                                <Image
                                    src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.displayName}`}
                                    alt={u.displayName}
                                    className={styles.userAvatar}
                                    width={40}
                                    height={40}
                                    style={{ objectFit: 'cover' }}
                                />
                                <div className={styles.userInfo}>
                                    <span className={styles.userName}>{u.displayName}</span>
                                    <span className={styles.userUsername}>@{u.username}</span>
                                </div>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
