'use client';

import styles from './page.module.css';

const languages = [
    { id: 'es', name: 'Español', active: true },
    { id: 'en', name: 'English', active: false },
    { id: 'fr', name: 'Français', active: false },
    { id: 'it', name: 'Italiano', active: false },
    { id: 'pt', name: 'Português', active: false },
];

export default function IdiomaPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.headerBtn} onClick={() => window.history.back()} aria-label="Atrás">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 className={styles.pageTitle}>Idioma</h1>
                <div className={styles.spacer40} />
            </header>

            <div className={`page hide-scrollbar ${styles.pageContent}`}>
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>IDIOMA DE LA APLICACIÓN</h3>

                    <div className={styles.languageList}>
                        {languages.map(lang => (
                            <button key={lang.id} className={styles.languageBtn}>
                                <span className={`${styles.languageName} ${lang.active ? styles.activeName : ''}`}>
                                    {lang.name}
                                </span>
                                {lang.active && (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.checkIcon}>
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
