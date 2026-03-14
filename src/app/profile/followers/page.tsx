'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseGet, firebaseUpdate } from '@/lib/firebaseMethods';
import { UserProfile } from '@/types/firestore';

export default function SeguidoresPage() {
    const router = useRouter();
    const { profile, user } = useAuth();
    const [followers, setFollowers] = useState<UserProfile[]>([]);
    const [removing, setRemoving] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchFollowers() {
            if (!profile) {
                setLoading(false);
                return;
            }
            try {
                const ids = profile.followers || [];
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
    }, [profile]);

    const handleRemoveFollower = async (followerId: string) => {
        if (!user || removing) return;
        setRemoving(followerId);

        try {
            const myFollowers = (profile?.followers || []).filter(id => id !== followerId);
            await firebaseUpdate(`users/${user.uid}`, {
                followers: myFollowers,
                followersCount: Math.max(0, myFollowers.length),
            });

            const followerProfile = await firebaseGet<UserProfile>(`users/${followerId}`);
            if (followerProfile) {
                const theirFollowing = (followerProfile.following || []).filter(id => id !== user.uid);
                await firebaseUpdate(`users/${followerId}`, {
                    following: theirFollowing,
                    followingCount: Math.max(0, theirFollowing.length),
                });
            }

            setFollowers(prev => prev.filter(u => u.id !== followerId));
        } catch (err) {
            console.error('Error removing follower:', err);
        } finally {
            setRemoving(null);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className={styles.title}>Seguidores</h1>
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
                        <p className={styles.emptyDesc}>Cuando alguien te siga, aparecerá aquí.</p>
                    </div>
                ) : (
                    followers.map((u, i) => (
                        <div key={u.id} className={styles.userItem} style={{ '--delay': `${i * 0.04}s` } as React.CSSProperties}>
                            <img
                                src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.displayName}`}
                                alt={u.displayName}
                                className={styles.userAvatar}
                            />
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>{u.displayName}</span>
                                <span className={styles.userUsername}>@{u.username}</span>
                            </div>
                            <button
                                className={styles.removeBtn}
                                onClick={() => handleRemoveFollower(u.id)}
                                disabled={removing === u.id}
                            >
                                {removing === u.id ? '...' : 'Quitar'}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
