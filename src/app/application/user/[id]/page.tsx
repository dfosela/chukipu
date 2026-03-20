'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { firebaseGet, firebaseUpdate, firebaseBatchUpdate, firebaseGetList } from '@/lib/firebaseMethods';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, Chukipu, Plan } from '@/types/firestore';
import { sendNotification } from '@/lib/notifications';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

interface ProfilePlan extends Plan {
    chukipuName: string;
}

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { user, profile: myProfile, refreshProfile } = useAuth();

    const [profileData, setProfileData] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    const [plans, setPlans] = useState<ProfilePlan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);

    const isOwnProfile = user?.uid === id;

    // Redirect to own profile if viewing self
    useEffect(() => {
        if (isOwnProfile) {
            router.replace('/application/profile');
        }
    }, [isOwnProfile, router]);

    // Fetch user profile
    useEffect(() => {
        async function load() {
            try {
                const [data, myData] = await Promise.all([
                    firebaseGet<UserProfile>(`users/${id}`),
                    user ? firebaseGet<UserProfile>(`users/${user.uid}`) : null,
                ]);
                setProfileData(data);
                if (myData?.following?.includes(id)) {
                    setIsFollowing(true);
                }
                if (data?.followRequests?.includes(user?.uid || '')) {
                    setIsPending(true);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [id, user]);

    // Fetch user's plans in realtime
    useEffect(() => {
        let isMounted = true;
        if (loading || !profileData) return;

        // Fetch chukipus where target user is a member
        const chukipusRef = ref(db, 'chukipus');
        const unsubsChukis = onValue(chukipusRef, (snapshot) => {
            if (!snapshot.exists()) {
                setPlans([]);
                setLoadingPlans(false);
                return;
            }

            const chukipusData = snapshot.val();
            const chukipuIds: Set<string> = new Set();
            const chukipuMap: Record<string, string> = {};
            const imMemberOf: Set<string> = new Set();
            Object.entries(chukipusData).forEach(([chukiId, c]: [string, unknown]) => {
                const chukipuEntry = c as { name?: string; members?: string[] | Record<string, boolean> };
                if (chukipuEntry.members) {
                    const isTargetMember = Array.isArray(chukipuEntry.members) ? chukipuEntry.members.includes(id) : (chukipuEntry.members as Record<string, boolean>)[id] === true;
                    if (isTargetMember) {
                        chukipuIds.add(chukiId);
                        chukipuMap[chukiId] = chukipuEntry.name || '';

                        if (user) {
                            const amIMember = Array.isArray(chukipuEntry.members) ? chukipuEntry.members.includes(user.uid) : (chukipuEntry.members as Record<string, boolean>)[user.uid] === true;
                            if (amIMember) imMemberOf.add(chukiId);
                        }
                    }
                }
            });

            // Now listen to plans
            const plansRef = ref(db, 'plans');
            const unsubsPlans = onValue(plansRef, (plansSnap) => {
                if (!plansSnap.exists()) {
                    setPlans([]);
                    setLoadingPlans(false);
                    return;
                }

                const plansData = plansSnap.val();
                const allPlans: ProfilePlan[] = [];

                Object.entries(plansData).forEach(([planId, p]: [string, unknown]) => {
                    const planEntry = p as ProfilePlan;
                    if (chukipuIds.has(planEntry.chukipuId) && planEntry.createdBy === id && planEntry.showInProfile) {
                        // Check privacy visibility: if profile is not private, or we follow them, or we are member, or it's us
                        const isProfilePrivate = profileData?.isPrivate;
                        const weFollowThem = myProfile?.following?.includes(id);

                        if (!isProfilePrivate || weFollowThem || imMemberOf.has(planEntry.chukipuId) || isOwnProfile) {
                            allPlans.push({
                                ...planEntry,
                                id: planId,
                                chukipuName: chukipuMap[planEntry.chukipuId] || ''
                            });
                        }
                    }
                });

                allPlans.sort((a, b) => b.createdAt - a.createdAt);

                if (isMounted) {
                    setPlans(allPlans);
                    setLoadingPlans(false);
                }
            });

            return () => unsubsPlans();
        });

        return () => {
            isMounted = false;
            unsubsChukis();
        };

    }, [id, loading, profileData, isOwnProfile, user]);

    const handleFollow = async () => {
        if (!user || followLoading) return;
        setFollowLoading(true);

        try {
            const myData = await firebaseGet<UserProfile>(`users/${user.uid}`);
            const theirData = await firebaseGet<UserProfile>(`users/${id}`);
            if (!myData || !theirData) return;

            if (isFollowing) {
                // Unfollow
                const myFollowing = (myData.following || []).filter(uid => uid !== id);
                const theirFollowers = (theirData.followers || []).filter(uid => uid !== user.uid);

                await firebaseBatchUpdate({
                    [`users/${user.uid}/following`]: myFollowing,
                    [`users/${user.uid}/followingCount`]: myFollowing.length,
                    [`users/${user.uid}/updatedAt`]: Date.now(),
                    [`users/${id}/followers`]: theirFollowers,
                    [`users/${id}/followersCount`]: theirFollowers.length,
                    [`users/${id}/updatedAt`]: Date.now(),
                });

                setIsFollowing(false);
                setProfileData(prev => prev ? {
                    ...prev,
                    followers: theirFollowers,
                    followersCount: theirFollowers.length,
                } : prev);
            } else if (isPending) {
                // Cancel request
                const theirRequests = (theirData.followRequests || []).filter(uid => uid !== user.uid);
                await firebaseUpdate(`users/${id}`, {
                    followRequests: theirRequests,
                });
                setIsPending(false);
            } else {
                // Follow or Send Request
                if (theirData.isPrivate) {
                    const theirRequests = [...(theirData.followRequests || []), user.uid];
                    await firebaseUpdate(`users/${id}`, {
                        followRequests: theirRequests,
                    });
                    setIsPending(true);

                    // Send notification
                    await sendNotification(id, {
                        type: 'follow_request',
                        title: 'Solicitud de seguimiento',
                        body: `${myData.displayName} quiere seguirte`,
                        relatedId: user.uid,
                    });
                } else {
                    const myFollowing = [...(myData.following || []), id];
                    const theirFollowers = [...(theirData.followers || []), user.uid];

                    await firebaseBatchUpdate({
                        [`users/${user.uid}/following`]: myFollowing,
                        [`users/${user.uid}/followingCount`]: myFollowing.length,
                        [`users/${user.uid}/updatedAt`]: Date.now(),
                        [`users/${id}/followers`]: theirFollowers,
                        [`users/${id}/followersCount`]: theirFollowers.length,
                        [`users/${id}/updatedAt`]: Date.now(),
                    });

                    setIsFollowing(true);
                    setProfileData(prev => prev ? {
                        ...prev,
                        followers: theirFollowers,
                        followersCount: theirFollowers.length,
                    } : prev);

                    // Send notification
                    await sendNotification(id, {
                        type: 'follow',
                        title: 'Nuevo seguidor',
                        body: `${myData.displayName} ha empezado a seguirte`,
                        relatedId: user.uid,
                    });
                }
            }

            await refreshProfile();
        } catch (err) {
            console.error(err);
        } finally {
            setFollowLoading(false);
        }
    };



    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingWrap}>
                    <div className={styles.spinner} />
                </div>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className={styles.container}>
                <header className={styles.header}>
                    <button className={styles.headerBtn} onClick={() => router.back()} aria-label="Atrás">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                    <h1 className={styles.pageTitle}>Usuario</h1>
                    <div className={styles.spacer40} />
                </header>
                <div className={styles.emptyState}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    <p className={styles.emptyTitle}>Usuario no encontrado</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <button className={styles.headerBtn} onClick={() => router.back()} aria-label="Atrás">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 className={styles.pageTitle}>{profileData.username}</h1>
                <div className={styles.spacer40} />
            </header>

            <div className={`page hide-scrollbar ${styles.pageContent}`}>
                {/* Profile Header */}
                <div className={styles.profileHeader}>
                    <div className={styles.avatarWrap}>
                        {profileData.avatar ? (
                            <img
                                src={profileData.avatar}
                                alt={profileData.displayName || 'User'}
                                className={styles.avatarImg}
                            />
                        ) : (
                            <div className={styles.avatarPlaceholder}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                        )}
                    </div>

                    <div className={styles.profileInfo}>
                        <h2 className={styles.profileName}>{profileData.displayName || 'User'}</h2>
                        {profileData.bio && <p className={styles.profileBio}>{profileData.bio}</p>}
                    </div>

                    <div className={styles.statsRow}>
                        <button className={styles.statItem}>
                            <span className={styles.statValue}>{profileData.chukipusCount || 0}</span>
                            <span className={styles.statLabel}>Chukipus</span>
                        </button>
                        <div className={styles.divider}></div>
                        <button className={styles.statItem} onClick={() => router.push(`/application/user/${id}/followers`)}>
                            <span className={styles.statValue}>{profileData.followersCount || 0}</span>
                            <span className={styles.statLabel}>Seguidores</span>
                        </button>
                        <div className={styles.divider}></div>
                        <button className={styles.statItem} onClick={() => router.push(`/application/user/${id}/following`)}>
                            <span className={styles.statValue}>{profileData.followingCount || 0}</span>
                            <span className={styles.statLabel}>Siguiendo</span>
                        </button>
                    </div>
                </div>

                {/* Follow Button */}
                <div className={styles.followBtnWrap}>
                    <button
                        className={`${styles.followBtn} ${isFollowing ? styles.followBtnFollowing : isPending ? styles.followBtnPending : ''}`}
                        onClick={handleFollow}
                        disabled={followLoading}
                    >
                        {followLoading ? (
                            <div className={styles.btnSpinner} />
                        ) : isFollowing ? 'Siguiendo' : isPending ? 'Pendiente' : 'Seguir'}
                    </button>
                </div>

                {/* Tab bar */}
                <div className={styles.tabBar} />

                {/* Plans Grid (Private accounts check) */}
                <div className={styles.plansGrid}>
                    {profileData.isPrivate && !isFollowing && !isOwnProfile ? (
                        <div className={styles.emptyGrid}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <p>Esta cuenta es privada</p>
                            <span style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                Síguela para ver sus planes.
                            </span>
                        </div>
                    ) : loadingPlans ? (
                        <div className={styles.gridLoading}>
                            <div className={styles.spinner} />
                        </div>
                    ) : plans.length === 0 ? (
                        <div className={styles.emptyGrid}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                            <p>Sin planes publicados</p>
                        </div>
                    ) : (
                        plans.map((plan) => (
                            <button
                                key={plan.id}
                                className={styles.gridItem}
                                onClick={() => router.push(`/application/chukipus/${plan.chukipuId}/plans/${plan.id}`)}
                            >
                                {plan.image ? (
                                    <div className={styles.gridItemContent}>
                                        <img src={plan.image} alt={plan.title} className={styles.gridImg} />
                                        <span className={styles.gridTitle}>{plan.title}</span>
                                    </div>
                                ) : (
                                    <div className={styles.gridPlaceholder}>
                                        <span className={styles.gridCategory}>{plan.category || ''}</span>
                                        <span className={styles.gridTitle}>{plan.title}</span>
                                    </div>
                                )}
                                {plan.completed && (
                                    <div className={styles.completedBadge}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}
