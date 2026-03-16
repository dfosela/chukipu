'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseUpdate } from '@/lib/firebaseMethods';
import { useRouter } from 'next/navigation';

export default function PrivacidadPage() {
    const router = useRouter();
    const { user, profile, refreshProfile } = useAuth();
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile) {
            setIsPrivate(profile.isPrivate || false);
        }
    }, [profile]);

    const handleTogglePrivacy = async (checked: boolean) => {
        if (!user) return;
        setIsPrivate(checked);
        setLoading(true);
        try {
            await firebaseUpdate(`users/${user.uid}`, { isPrivate: checked });
            await refreshProfile();
        } catch (err) {
            console.error('Error updating privacy', err);
            // Revert on error
            setIsPrivate(!checked);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.headerBtn} onClick={() => router.back()} aria-label="Atrás">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 className={styles.pageTitle}>Privacidad</h1>
                <div className={styles.spacer40} />
            </header>

            <div className={`page hide-scrollbar ${styles.pageContent}`}>
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>VISIBILIDAD</h3>

                    <div className={styles.settingItem}>
                        <div className={styles.settingTextWrap}>
                            <span className={styles.settingLabel}>Cuenta Privada</span>
                            <span className={styles.settingValue}>Si está activo, solo tus seguidores podrán ver tus planes y Chukipus creados.</span>
                        </div>
                        <label className={styles.toggle}>
                            <input
                                type="checkbox"
                                checked={isPrivate}
                                onChange={(e) => handleTogglePrivacy(e.target.checked)}
                                disabled={loading}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>INTERACCIONES</h3>

                    <button className={styles.actionBtn}>
                        <div className={styles.actionTextWrap}>
                            <span className={styles.actionLabel}>Usuarios bloqueados</span>
                            <span className={styles.actionValue}>Gestiona los perfiles que has bloqueado.</span>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.actionIcon}>
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>ZONA PELIGROSA</h3>

                    <button className={styles.dangerBtn}>
                        Eliminar cuenta
                    </button>
                    <p className={styles.dangerText}>
                        Esta acción es irreversible. Se borrarán todos tus Chukipus, tu perfil y tus conexiones para siempre.
                    </p>
                </div>
            </div>
        </div>
    );
}
