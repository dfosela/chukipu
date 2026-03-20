'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import Image from 'next/image';
import BottomNav from '@/components/BottomNav/BottomNav';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseGetList } from '@/lib/firebaseMethods';
import { Chukipu, Plan, PlanMedia } from '@/types/firestore';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

interface PinnedPlanGroup {
    planId: string;
    chukipuId: string;
    planTitle: string;
    media: PlanMedia[];
}

/** Renders a collage appropriate for the number of media items. */
function PlanCollage({ group, onClick }: { group: PinnedPlanGroup; onClick: () => void }) {
    const photos = group.media.filter(m => m.type === 'photo');
    const all = group.media;
    const count = all.length;

    if (count === 0) {
        // Plan pinned but no media yet – show a branded placeholder
        return (
            <button className={styles.gridItem} onClick={onClick}>
                <div className={styles.collage1}>
                    <div className={styles.gridPlaceholder}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <line x1="12" y1="17" x2="12" y2="22" />
                            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                        </svg>
                        <span className={styles.gridTitle}>{group.planTitle}</span>
                    </div>
                </div>
            </button>
        );
    }

    // Helper: first real photo url, fallback to first item url
    const firstPhoto = (photos[0] ?? all[0]).url;
    const secondPhoto = (photos[1] ?? all[1])?.url;
    const thirdPhoto = (photos[2] ?? all[2])?.url;
    const fourthPhoto = (photos[3] ?? all[3])?.url;
    const extra = count > 4 ? count - 4 : 0;

    if (count === 1) {
        return (
            <button className={styles.gridItem} onClick={onClick}>
                <div className={styles.collage1} style={{ position: 'relative' }}>
                    <Image src={firstPhoto!} alt="" className={styles.colImg} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} />
                </div>
            </button>
        );
    }

    if (count === 2) {
        return (
            <button className={styles.gridItem} onClick={onClick}>
                <div className={styles.collage2}>
                    <div style={{ position: 'relative', flex: 1 }}><Image src={firstPhoto!} alt="" className={styles.colImg} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} /></div>
                    <div style={{ position: 'relative', flex: 1 }}><Image src={secondPhoto!} alt="" className={styles.colImg} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} /></div>
                </div>
            </button>
        );
    }

    if (count === 3) {
        return (
            <button className={styles.gridItem} onClick={onClick}>
                <div className={styles.collage3}>
                    <div style={{ position: 'relative', flex: 2 }}><Image src={firstPhoto!} alt="" className={`${styles.colImg} ${styles.colBig}`} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} /></div>
                    <div className={styles.colStack}>
                        <div style={{ position: 'relative', flex: 1 }}><Image src={secondPhoto!} alt="" className={styles.colImg} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} /></div>
                        <div style={{ position: 'relative', flex: 1 }}><Image src={thirdPhoto!} alt="" className={styles.colImg} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} /></div>
                    </div>
                </div>
            </button>
        );
    }

    // 4+ photos
    return (
        <button className={styles.gridItem} onClick={onClick}>
            <div className={styles.collage4}>
                <div style={{ position: 'relative' }}><Image src={firstPhoto!} alt="" className={styles.colImg} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} /></div>
                <div style={{ position: 'relative' }}><Image src={secondPhoto!} alt="" className={styles.colImg} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} /></div>
                <div style={{ position: 'relative' }}><Image src={thirdPhoto!} alt="" className={styles.colImg} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} /></div>
                <div className={styles.colImgWrap} style={{ position: 'relative' }}>
                    <Image src={fourthPhoto!} alt="" className={styles.colImg} fill sizes="(max-width: 768px) 100vw, 430px" style={{ objectFit: 'cover' }} />
                    {extra > 0 && (
                        <div className={styles.colOverlay}>+{extra}</div>
                    )}
                </div>
            </div>
        </button>
    );
}

export default function ProfilePage() {
    const { profile, user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [groups, setGroups] = useState<PinnedPlanGroup[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(true);
    const [chukipusCount, setChukipusCount] = useState<number | null>(null);

    useEffect(() => {
        if (!user) {
            setChukipusCount(0);
            return;
        }

        const chukipusRef = ref(db, 'chukipus');
        const unsubscribe = onValue(chukipusRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                let count = 0;
                Object.values(data).forEach((c: unknown) => {
                    const chukipu = c as { members?: string[] | Record<string, boolean> };
                    if (chukipu.members) {
                        if (Array.isArray(chukipu.members)) {
                            if (chukipu.members.includes(user.uid)) count++;
                        } else if (typeof chukipu.members === 'object') {
                            if ((chukipu.members as Record<string, boolean>)[user.uid] === true) count++;
                        }
                    }
                });
                setChukipusCount(count);
            } else {
                setChukipusCount(0);
            }
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        async function fetchPinnedPlanMedia() {
            if (!user) { setLoadingMedia(false); return; }
            try {
                const userChukis = await firebaseGetList<Chukipu>(
                    'chukipus',
                    (c) => c.members?.includes(user.uid),
                    'updatedAt',
                    'desc'
                );
                const chukipuIds = userChukis.map(c => c.id);

                const pinnedPlans = await firebaseGetList<Plan>(
                    'plans',
                    (p) => chukipuIds.includes(p.chukipuId) && p.createdBy === user.uid && p.showInProfile === true,
                    'createdAt',
                    'desc'
                );

                const groupResults: PinnedPlanGroup[] = await Promise.all(
                    pinnedPlans.map(async (plan) => {
                        const media = await firebaseGetList<PlanMedia>(
                            `planMedia/${plan.id}`,
                            undefined,
                            'createdAt',
                            'desc'
                        );
                        return {
                            planId: plan.id,
                            chukipuId: plan.chukipuId,
                            planTitle: plan.title,
                            media,
                        };
                    })
                );

                setGroups(groupResults);
            } catch (err) {
                console.error('Error fetching profile media:', err);
            } finally {
                setLoadingMedia(false);
            }
        }

        if (!authLoading) fetchPinnedPlanMedia();
    }, [user, authLoading]);

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <button className={styles.headerBtn} onClick={() => router.back()} aria-label="Atrás">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
                <h1 className={styles.pageTitle}>{profile?.username || 'perfil'}</h1>
                <button className={styles.headerBtn} onClick={() => router.push('/application/profile/settings')} aria-label="Configuración">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
            </header>

            <div className={`page hide-scrollbar ${styles.pageContent}`}>
                {/* Profile header */}
                <div className={styles.profileHeader}>
                    <div className={styles.avatarWrap}>
                        {profile?.avatar ? (
                            <Image src={profile.avatar} alt={profile.displayName || 'User'} className={styles.avatarImg} width={80} height={80} style={{ objectFit: 'cover' }} />
                        ) : (
                            <div className={styles.avatarPlaceholder}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className={styles.profileInfo}>
                        <h2 className={styles.profileName}>{profile?.displayName || 'User'}</h2>
                        {profile?.bio && <p className={styles.profileBio}>{profile.bio}</p>}
                    </div>
                    <div className={styles.statsRow}>
                        <button className={styles.statItem}>
                            <span className={styles.statValue}>{chukipusCount === null ? '...' : chukipusCount}</span>
                            <span className={styles.statLabel}>Chukipus</span>
                        </button>
                        <div className={styles.divider} />
                        <button className={styles.statItem} onClick={() => router.push('/application/profile/followers')}>
                            <span className={styles.statValue}>{profile?.followersCount || 0}</span>
                            <span className={styles.statLabel}>Seguidores</span>
                        </button>
                        <div className={styles.divider} />
                        <button className={styles.statItem} onClick={() => router.push('/application/profile/following')}>
                            <span className={styles.statValue}>{profile?.followingCount || 0}</span>
                            <span className={styles.statLabel}>Siguiendo</span>
                        </button>
                    </div>
                </div>

                {/* Edit Profile */}
                <div className={styles.editBtnWrap}>
                    <button className={styles.editProfileBtn} onClick={() => router.push('/application/profile/edit')}>
                        Editar perfil
                    </button>
                </div>

                <div className={styles.tabBar} />

                {/* Collage Grid */}
                <div className={styles.plansGrid}>
                    {loadingMedia ? (
                        <div className={styles.gridLoading}>
                            <div className={styles.spinner} />
                        </div>
                    ) : groups.length === 0 ? (
                        <div className={styles.emptyGrid}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                <line x1="12" y1="17" x2="12" y2="22" />
                                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                            </svg>
                            <p>Fija un plan para ver sus fotos y videos aquí</p>
                        </div>
                    ) : (
                        groups.map((group) => (
                            <PlanCollage
                                key={group.planId}
                                group={group}
                                onClick={() => router.push(`/application/chukipus/${group.chukipuId}/plans/${group.planId}`)}
                            />
                        ))
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
