'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, update, get } from 'firebase/database';
import { auth, db } from '@/lib/firebase';
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

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteStatuses, setInviteStatuses] = useState<Record<string, InviteStatus>>({});
    const [showAll, setShowAll] = useState(false);
    const markedReadRef = useRef(false);

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

                // Mark all unread as read on first load
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

                // Check invite statuses
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

    const handleJoinInvite = async (notif: Notification) => {
        const user = auth.currentUser;
        if (!user) return;
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

    // Group notifications
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
                ) : notifications.length === 0 ? (
                    <div className={styles.centerState}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <p className={styles.centerText}>No tienes notificaciones</p>
                    </div>
                ) : hasRecent ? (
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
                ) : (
                    // No today/yesterday — show older directly
                    <>
                        <p className={styles.sectionLabel}>Anteriores</p>
                        {olderNotifs.map(renderNotif)}
                    </>
                )}
            </main>
        </div>
    );
}
