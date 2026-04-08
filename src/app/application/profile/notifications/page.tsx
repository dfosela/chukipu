'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { requestPushPermission } from '@/lib/fcm';
import styles from './page.module.css';

export default function NotificacionesPage() {
    const [preferences, setPreferences] = useState({
        chukipusAlerts: true,
        groupMessages: true,
        newsletter: false,
    });
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'default';
    });
    const [requestingPush, setRequestingPush] = useState(false);
    const [pushDebug, setPushDebug] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!userId) return;

        const prefsRef = ref(db, `users/${userId}/preferences/notifications`);
        const unsubscribe = onValue(prefsRef, (snapshot) => {
            if (snapshot.exists()) {
                setPreferences((prev) => ({ ...prev, ...snapshot.val() }));
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching preferences:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const handleEnablePush = async () => {
        if (!userId || requestingPush) return;
        if (pushPermission === 'denied') return;
        setRequestingPush(true);
        setPushDebug('Registrando...');
        const result = await requestPushPermission(userId);
        if (result === 'granted') {
            setPushPermission('granted');
            setPushDebug('Token guardado correctamente');
        } else {
            setPushPermission(Notification.permission);
            setPushDebug(`Error: ${result}`);
        }
        setRequestingPush(false);
    };

    const handleToggle = async (key: keyof typeof preferences) => {
        if (!userId) return;

        const newValue = !preferences[key];
        setPreferences((prev) => ({ ...prev, [key]: newValue }));

        try {
            const prefsRef = ref(db, `users/${userId}/preferences/notifications`);
            await update(prefsRef, {
                [key]: newValue
            });
        } catch (error) {
            console.error("Error updating preference:", error);
            // Revert on error
            setPreferences((prev) => ({ ...prev, [key]: !newValue }));
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.headerBtn} onClick={() => window.history.back()} aria-label="Atrás">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 className={styles.pageTitle}>Notificaciones</h1>
                <div className={styles.spacer40} /> {/* Spacer */}
            </header>

            <div className={`page hide-scrollbar ${styles.pageContent}`}>
                {loading ? (
                    <div className={styles.centerState}>
                        <div className={styles.spinner} />
                    </div>
                ) : (
                    <>
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>NOTIFICACIONES DEL DISPOSITIVO</h3>
                            <div className={styles.settingItem}>
                                <div className={styles.settingTextWrap}>
                                    <span className={styles.settingLabel}>Notificaciones push</span>
                                    <span className={styles.settingValue}>
                                        {pushPermission === 'granted'
                                            ? 'Activadas'
                                            : pushPermission === 'denied'
                                                ? 'Bloqueadas — actívalas en ajustes del navegador'
                                                : 'Recibe avisos aunque la app esté cerrada'}
                                    </span>
                                </div>
                                {pushPermission !== 'granted' && (
                                    <button
                                        className={styles.enablePushBtn}
                                        onClick={handleEnablePush}
                                        disabled={pushPermission === 'denied' || requestingPush}
                                    >
                                        {requestingPush ? '...' : pushPermission === 'denied' ? 'Bloqueado' : 'Activar'}
                                    </button>
                                )}
                                {pushPermission === 'granted' && (
                                    <button
                                        className={styles.enablePushBtn}
                                        onClick={handleEnablePush}
                                        disabled={requestingPush}
                                    >
                                        {requestingPush ? '...' : 'Reactivar'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {pushDebug && (
                            <div style={{ margin: '0 var(--space-md) var(--space-md)', padding: '10px 14px', background: 'var(--card-bg)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                                {pushDebug}
                            </div>
                        )}

                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>PREFERENCIAS PUSH</h3>

                            <div className={styles.settingItem} onClick={() => handleToggle('chukipusAlerts')}>
                                <div className={styles.settingTextWrap}>
                                    <span className={styles.settingLabel}>Alertas de Chukipus</span>
                                    <span className={styles.settingValue}>Nuevos planes, invitaciones o cambios.</span>
                                </div>
                                <label className={styles.toggle} onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={preferences.chukipusAlerts}
                                        onChange={() => handleToggle('chukipusAlerts')}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>

                            <div className={styles.settingItem} onClick={() => handleToggle('groupMessages')}>
                                <div className={styles.settingTextWrap}>
                                    <span className={styles.settingLabel}>Mensajes de grupo</span>
                                    <span className={styles.settingValue}>Chat de planes y discusiones.</span>
                                </div>
                                <label className={styles.toggle} onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={preferences.groupMessages}
                                        onChange={() => handleToggle('groupMessages')}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>CORREO ELECTRÓNICO</h3>

                            <div className={styles.settingItem} onClick={() => handleToggle('newsletter')}>
                                <div className={styles.settingTextWrap}>
                                    <span className={styles.settingLabel}>Boletín mensual</span>
                                    <span className={styles.settingValue}>Novedades y trucos de Chukipu.</span>
                                </div>
                                <label className={styles.toggle} onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={preferences.newsletter}
                                        onChange={() => handleToggle('newsletter')}
                                    />
                                    <span className={styles.slider}></span>
                                </label>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
