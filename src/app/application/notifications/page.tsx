'use client';

import { useEffect, useState } from 'react';
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

    return new Date(timestamp).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
    });
}

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteStatuses, setInviteStatuses] = useState<Record<string, InviteStatus>>({});

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setLoading(false);
                return;
            }

            const notificationsRef = ref(db, `users/${user.uid}/notifications`);

            const unsubscribeDb = onValue(notificationsRef, async (snapshot) => {
                const data = snapshot.val();

                if (!data) {
                    setNotifications([]);
                    setLoading(false);
                    return;
                }

                const list: Notification[] = Object.entries(data).map(
                    ([key, value]) => ({
                        ...(value as Omit<Notification, 'id'>),
                        id: key,
                    })
                );

                list.sort((a, b) => b.createdAt - a.createdAt);
                setNotifications(list);
                setLoading(false);

                // Check invite statuses
                const inviteNotifs = list.filter(n => n.type === 'invite' && n.relatedId);
                if (inviteNotifs.length === 0) return;

                const chukipusSnap = await get(ref(db, 'chukipus'));
                const chukipusData = chukipusSnap.val() as Record<string, { inviteCode: string; members?: string[] | Record<string, boolean> }> | null;

                const statuses: Record<string, InviteStatus> = {};

                for (const notif of inviteNotifs) {
                    if (!chukipusData) {
                        statuses[notif.id] = 'deleted';
                        continue;
                    }

                    const chukipu = Object.values(chukipusData).find(
                        c => c.inviteCode === notif.relatedId
                    );

                    if (!chukipu) {
                        statuses[notif.id] = 'deleted';
                        continue;
                    }

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

    const handleNotificationClick = async (notif: Notification) => {
        if (notif.read) return;

        const user = auth.currentUser;
        if (!user) return;

        const notifRef = ref(db, `users/${user.uid}/notifications/${notif.id}`);
        await update(notifRef, { read: true });
    };

    const handleJoinInvite = async (notif: Notification) => {
        const user = auth.currentUser;
        if (!user) return;

        if (!notif.read) {
            const notifRef = ref(db, `users/${user.uid}/notifications/${notif.id}`);
            await update(notifRef, { read: true });
        }

        router.push(`/application/chukipus/join?code=${notif.relatedId}`);
    };

    const renderInviteButton = (notif: Notification) => {
        const status = inviteStatuses[notif.id];

        if (status === 'joined') {
            return (
                <button className={styles.joinBtn} disabled>
                    Unido
                </button>
            );
        }

        if (status === 'deleted') {
            return (
                <button className={styles.joinBtn} disabled>
                    No disponible
                </button>
            );
        }

        return (
            <button
                className={styles.joinBtn}
                onClick={(e) => { e.stopPropagation(); handleJoinInvite(notif); }}
            >
                Unirse
            </button>
        );
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <button
                    className={styles.backBtn}
                    onClick={() => router.back()}
                    aria-label="Volver"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 className={styles.title}>Notificaciones</h1>
            </header>

            {/* Content */}
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
                ) : (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={`${styles.notification} ${!notif.read ? styles.notificationUnread : ''}`}
                            onClick={() => handleNotificationClick(notif)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(notif)}
                        >
                            {/* Icon */}
                            <div className={styles.iconWrap}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                            </div>

                            {/* Text content */}
                            <div className={styles.content}>
                                <p className={styles.text}>
                                    <strong>{notif.title}</strong>
                                </p>
                                <p className={styles.text}>{notif.body}</p>
                                <span className={styles.time}>{formatDate(notif.createdAt)}</span>
                                {notif.type === 'invite' && notif.relatedId && renderInviteButton(notif)}
                            </div>

                            {/* Unread dot */}
                            {!notif.read && <div className={styles.unreadDot} />}
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
