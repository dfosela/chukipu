'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseGet, firebaseUpdate } from '@/lib/firebaseMethods';
import { UserProfile } from '@/types/firestore';

export default function SiguiendoPage() {
    const router = useRouter();
    const { profile, user } = useAuth();
    const [following, setFollowing] = useState<UserProfile[]>([]);
    const [unfollowing, setUnfollowing] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchFollowing() {
            if (!profile) {
                setLoading(false);
                return;
            }
            try {
                const ids = profile.following || [];
                const users: UserProfile[] = [];
                for (const uid of ids) {
                    const u = await firebaseGet<UserProfile>(`users/${uid}`);
                    if (u) users.push(u);
                }
                setFollowing(users);
            } catch (err) {
                console.error('Error fetching following:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchFollowing();
    }, [profile]);

    const handleUnfollow = async (targetId: string) => {
        if (!user || unfollowing) return;
        setUnfollowing(targetId);

        try {
            const myFollowing = (profile?.following || []).filter(id => id !== targetId);
            await firebaseUpdate(`users/${user.uid}`, {
                following: myFollowing,
                followingCount: Math.max(0, myFollowing.length),
            });

            const targetProfile = await firebaseGet<UserProfile>(`users/${targetId}`);
            if (targetProfile) {
                const theirFollowers = (targetProfile.followers || []).filter(id => id !== user.uid);
                await firebaseUpdate(`users/${targetId}`, {
                    followers: theirFollowers,
                    followersCount: Math.max(0, theirFollowers.length),
                });
            }

            setFollowing(prev => prev.filter(u => u.id !== targetId));
        } catch (err) {
            console.error('Error unfollowing:', err);
        } finally {
            setUnfollowing(null);
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
                <h1 className={styles.title}>Siguiendo</h1>
                <div className={styles.spacer38} />
            </div>

            <div className={styles.list}>
                {loading ? (
                    <p className={styles.empty}>Cargando...</p>
                ) : following.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="19" y1="8" x2="19" y2="14" />
                                <line x1="22" y1="11" x2="16" y2="11" />
                            </svg>
                        </div>
                        <p className={styles.emptyTitle}>No sigues a nadie</p>
                        <p className={styles.emptyDesc}>Busca personas y empieza a seguirlas.</p>
                    </div>
                ) : (
                    following.map((u, i) => (
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
                                onClick={() => handleUnfollow(u.id)}
                                disabled={unfollowing === u.id}
                            >
                                {unfollowing === u.id ? '...' : 'Dejar de seguir'}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
