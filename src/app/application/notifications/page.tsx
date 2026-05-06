'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, update, get } from 'firebase/database';
import { auth, db } from '@/lib/firebase';
import { firebaseGet, firebaseUpdate, firebaseBatchUpdate } from '@/lib/firebaseMethods';
import { sendNotification } from '@/lib/notifications';
import { UserProfile } from '@/types/firestore';
import styles from './page.module.css';

interface Notification {
    id: string;
    title: string;
    body: string;
    read: boolean;
    type: string;
    relatedId: string;
    createdAt: number;
}

interface FollowRequest {
    uid: string;
    displayName: string;
    username: string;
    avatar: string;
}

type InviteStatus = 'available' | 'joined' | 'deleted';

function formatDate(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return new Date(timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function dayStart(offsetDays = 0): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - offsetDays);
    return d.getTime();
}

const toArray = (val: string[] | Record<string, string> | null | undefined): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return Object.values(val);
};

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
    const [processingUid, setProcessingUid] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [inviteStatuses, setInviteStatuses] = useState<Record<string, InviteStatus>>({});
    const [showAll, setShowAll] = useState(false);
    const markedReadRef = useRef(false);

    // Listen to notifications
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) { setLoading(false); return; }

            const notificationsRef = ref(db, `users/${user.uid}/notifications`);

            const unsubscribeDb = onValue(notificationsRef, async (snapshot) => {
                const data = snapshot.val();

                if (!data) {
                    setNotifications([]);
                    setLoading(false);
                    return;
                }

                const list: Notification[] = Object.entries(data).map(
                    ([key, value]) => ({ ...(value as Omit<Notification, 'id'>), id: key })
                );
                list.sort((a, b) => b.createdAt - a.createdAt);
                setNotifications(list);
                setLoading(false);

                if (!markedReadRef.current) {
                    markedReadRef.current = true;
                    const unread = list.filter(n => !n.read);
                    if (unread.length > 0) {
                        const updates: Record<string, boolean> = {};
                        for (const n of unread) {
                            updates[`users/${user.uid}/notifications/${n.id}/read`] = true;
                        }
                        await update(ref(db), updates);
                    }
                }

                const inviteNotifs = list.filter(n => n.type === 'invite' && n.relatedId);
                if (inviteNotifs.length === 0) return;

                const chukipusSnap = await get(ref(db, 'chukipus'));
                const chukipusData = chukipusSnap.val() as Record<string, { inviteCode: string; members?: string[] | Record<string, boolean> }> | null;
                const statuses: Record<string, InviteStatus> = {};

                for (const notif of inviteNotifs) {
                    if (!chukipusData) { statuses[notif.id] = 'deleted'; continue; }
                    const chukipu = Object.values(chukipusData).find(c => c.inviteCode === notif.relatedId);
                    if (!chukipu) { statuses[notif.id] = 'deleted'; continue; }
                    const members = chukipu.members;
                    const isMember = Array.isArray(members)
                        ? members.includes(user.uid)
                        : members ? Object.keys(members).includes(user.uid) : false;
                    statuses[notif.id] = isMember ? 'joined' : 'available';
                }
                setInviteStatuses(statuses);
            });

            return () => unsubscribeDb();
        });

        return () => unsubscribeAuth();
    }, []);

    // Listen to follow requests in realtime
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) return;

            const requestsRef = ref(db, `users/${user.uid}/followRequests`);
            const unsubscribeDb = onValue(requestsRef, async (snapshot) => {
                const val = snapshot.val();
                const uids = [...new Set(toArray(val))];

                if (uids.length === 0) {
                    setFollowRequests([]);
                    return;
                }

                const profiles = await Promise.all(
                    uids.map(uid => firebaseGet<UserProfile>(`users/${uid}`))
                );

                const requests: FollowRequest[] = profiles
                    .filter(Boolean)
                    .map(p => ({
                        uid: p!.id,
                        displayName: p!.displayName || p!.username || 'Usuario',
                        username: p!.username,
                        avatar: p!.avatar,
                    }));

                setFollowRequests(requests);
            });

            return () => unsubscribeDb();
        });

        return () => unsubscribeAuth();
    }, []);

    const handleAccept = async (request: FollowRequest) => {
        const user = auth.currentUser;
        if (!user || processingUid) return;
        setProcessingUid(request.uid);

        try {
            const [myData, theirData] = await Promise.all([
                firebaseGet<UserProfile>(`users/${user.uid}`),
                firebaseGet<UserProfile>(`users/${request.uid}`),
            ]);
            if (!myData || !theirData) return;

            const myRequests = toArray(myData.followRequests).filter(uid => uid !== request.uid);
            const myFollowers = [...new Set([...toArray(myData.followers), request.uid])];
            const theirFollowing = [...new Set([...toArray(theirData.following), user.uid])];

            // Own record: remove request, add follower
            await firebaseUpdate(`users/${user.uid}`, {
                followRequests: myRequests,
                followers: myFollowers,
                followersCount: myFollowers.length,
            });

            // Requester's record: add to their following (no updatedAt — avoids permission error)
            await firebaseBatchUpdate({
                [`users/${request.uid}/following`]: theirFollowing,
                [`users/${request.uid}/followingCount`]: theirFollowing.length,
            });

            // Notify the requester
            await sendNotification(request.uid, {
                type: 'follow',
                title: 'Solicitud aceptada',
                body: `${myData.displayName || myData.username} ha aceptado tu solicitud y ahora te sigue`,
                relatedId: user.uid,
            });
        } catch (err) {
            console.error('Error aceptando solicitud:', err);
        } finally {
            setProcessingUid(null);
        }
    };

    const handleReject = async (request: FollowRequest) => {
        const user = auth.currentUser;
        if (!user || processingUid) return;
        setProcessingUid(request.uid);

        try {
            const myData = await firebaseGet<UserProfile>(`users/${user.uid}`);
            if (!myData) return;

            const myRequests = toArray(myData.followRequests).filter(uid => uid !== request.uid);
            await firebaseUpdate(`users/${user.uid}`, { followRequests: myRequests });
        } catch (err) {
            console.error('Error rechazando solicitud:', err);
        } finally {
            setProcessingUid(null);
        }
    };

    const handleJoinInvite = async (notif: Notification) => {
        if (!auth.currentUser) return;
        router.push(`/application/chukipus/join?code=${notif.relatedId}`);
    };

    const renderInviteButton = (notif: Notification) => {
        const status = inviteStatuses[notif.id];
        if (status === 'joined') return <button className={styles.joinBtn} disabled>Unido</button>;
        if (status === 'deleted') return <button className={styles.joinBtn} disabled>No disponible</button>;
        return (
            <button className={styles.joinBtn} onClick={(e) => { e.stopPropagation(); handleJoinInvite(notif); }}>
                Unirse
            </button>
        );
    };

    const renderNotif = (notif: Notification) => (
        <div key={notif.id} className={styles.notification} role="button" tabIndex={0}>
            <div className={styles.iconWrap}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
            </div>
            <div className={styles.content}>
                <p className={styles.text}><strong>{notif.title}</strong></p>
                <p className={styles.text}>{notif.body}</p>
                <span className={styles.time}>{formatDate(notif.createdAt)}</span>
                {notif.type === 'invite' && notif.relatedId && renderInviteButton(notif)}
            </div>
        </div>
    );

    const todayStart = dayStart(0);
    const yesterdayStart = dayStart(1);

    const todayNotifs = notifications.filter(n => n.createdAt >= todayStart);
    const yesterdayNotifs = notifications.filter(n => n.createdAt >= yesterdayStart && n.createdAt < todayStart);
    const olderNotifs = notifications.filter(n => n.createdAt < yesterdayStart);
    const hasRecent = todayNotifs.length > 0 || yesterdayNotifs.length > 0;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                </button>
                <h1 className={styles.title}>Notificaciones</h1>
            </header>

            <main className={`${styles.list} page hide-scrollbar`}>
                {loading ? (
                    <div className={styles.centerState}>
                        <div className={styles.spinner} />
                        <p className={styles.centerText}>Cargando notificaciones…</p>
                    </div>
                ) : (
                    <>
                        {/* Follow requests section */}
                        {followRequests.length > 0 && (
                            <div className={styles.requestsSection}>
                                <p className={styles.sectionLabel}>Solicitudes de seguimiento</p>
                                {followRequests.map(req => (
                                    <div key={req.uid} className={styles.requestCard}>
                                        <button
                                            className={styles.requestAvatar}
                                            onClick={() => router.push(`/application/user/${req.uid}`)}
                                        >
                                            {req.avatar ? (
                                                <Image src={req.avatar} alt={req.displayName} width={44} height={44} className={styles.avatarImg} style={{ objectFit: 'cover' }} />
                                            ) : (
                                                <div className={styles.avatarPlaceholder}>
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                        <div className={styles.requestInfo}>
                                            <span className={styles.requestName}>{req.displayName}</span>
                                            <span className={styles.requestUsername}>@{req.username}</span>
                                        </div>
                                        <div className={styles.requestActions}>
                                            <button
                                                className={styles.acceptBtn}
                                                onClick={() => handleAccept(req)}
                                                disabled={processingUid === req.uid}
                                            >
                                                {processingUid === req.uid ? '…' : 'Aceptar'}
                                            </button>
                                            <button
                                                className={styles.rejectBtn}
                                                onClick={() => handleReject(req)}
                                                disabled={processingUid === req.uid}
                                            >
                                                Rechazar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Regular notifications */}
                        {notifications.length === 0 && followRequests.length === 0 ? (
                            <div className={styles.centerState}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                                <p className={styles.centerText}>No tienes notificaciones</p>
                            </div>
                        ) : notifications.length > 0 && hasRecent ? (
                            <>
                                {todayNotifs.length > 0 && (
                                    <>
                                        <p className={styles.sectionLabel}>Hoy</p>
                                        {todayNotifs.map(renderNotif)}
                                    </>
                                )}
                                {yesterdayNotifs.length > 0 && (
                                    <>
                                        <p className={styles.sectionLabel}>Ayer</p>
                                        {yesterdayNotifs.map(renderNotif)}
                                    </>
                                )}
                                {olderNotifs.length > 0 && (
                                    showAll ? (
                                        <>
                                            <p className={styles.sectionLabel}>Anteriores</p>
                                            {olderNotifs.map(renderNotif)}
                                        </>
                                    ) : (
                                        <button className={styles.showAllBtn} onClick={() => setShowAll(true)}>
                                            Ver todas ({olderNotifs.length} más)
                                        </button>
                                    )
                                )}
                            </>
                        ) : notifications.length > 0 ? (
                            <>
                                <p className={styles.sectionLabel}>Anteriores</p>
                                {olderNotifs.map(renderNotif)}
                            </>
                        ) : null}
                    </>
                )}
            </main>
        </div>
    );
}
