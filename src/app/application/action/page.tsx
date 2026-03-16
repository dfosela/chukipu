'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function ActionPage() {
    const router = useRouter();

    return (
        <div className={styles.container}>
            {/* Header / Cancel */}
            <header className={styles.header}>
                <button
                    className={styles.closeBtn}
                    onClick={() => router.back()}
                    aria-label="Cerrar"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </header>

            <div className={styles.content}>
                <div className={styles.logoWrap}>
                    <svg className={styles.logo} viewBox="0 0 24 24" fill="var(--brand-primary)" stroke="none">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                </div>

                <h1 className={styles.title}>¿Qué quieres hacer?</h1>
                <p className={styles.subtitle}>Elige una opción para comenzar</p>

                <div className={styles.actions}>
                    <button
                        className={styles.actionCard}
                        onClick={() => router.push('/application/chukipus/new')}
                    >
                        <div className={styles.iconBoxPink}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </div>
                        <div className={styles.cardTextContent}>
                            <h2 className={styles.cardTitle}>Crear Chukipu</h2>
                            <p className={styles.cardDesc}>Empieza algo nuevo ahora mismo y comparte con otros.</p>
                        </div>
                    </button>

                    <button
                        className={styles.actionCard}
                        onClick={() => router.push('/application/chukipus/join')}
                    >
                        <div className={styles.iconBoxDark}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <div className={styles.cardTextContent}>
                            <h2 className={styles.cardTitle}>Unirse a Chukipu</h2>
                            <p className={styles.cardDesc}>Entra a una sesión existente mediante un código o enlace.</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
