'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function NuevoChukipuSelectPage() {
    const router = useRouter();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className={styles.title}>Nuevo Chukipu</h1>
                <div className={styles.spacer38} />
            </div>

            <div className={styles.content}>
                <h2 className={styles.subtitle}>¿Qué tipo de Chukipu quieres crear?</h2>
                <p className={styles.hint}>Elige el tipo de espacio que mejor se adapta a lo que necesitas</p>

                <div className={styles.typeGrid}>
                    <button
                        className={styles.typeCard}
                        onClick={() => router.push('/application/chukipus/new/create')}
                    >
                        <div className={styles.typeCardIconWrap}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h3 className={styles.typeCardTitle}>Compartido</h3>
                        <p className={styles.typeCardDesc}>
                            Invita a quien quieras. Todos los miembros pueden ver y añadir planes juntos.
                        </p>
                    </button>

                    <button
                        className={styles.typeCard}
                        onClick={() => router.push('/application/chukipus/new/create?private=1')}
                    >
                        <div className={`${styles.typeCardIconWrap} ${styles.typeCardIconPrivate}`}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                        <h3 className={styles.typeCardTitle}>Solo para ti</h3>
                        <p className={styles.typeCardDesc}>
                            Solo tú puedes ver este Chukipu y sus planes. Perfecto para ideas personales o deseos secretos.
                        </p>
                    </button>
                </div>
            </div>
        </div>
    );
}
