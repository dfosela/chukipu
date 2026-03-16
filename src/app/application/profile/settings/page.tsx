'use client';

import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import { logoutUser } from '@/lib/auth';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';

const settings = [
    {
        label: 'Notificaciones', icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        ), path: '/application/profile/notifications'
    },
    {
        label: 'Privacidad', icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        ), path: '/application/profile/privacy'
    },
    {
        label: 'Idioma', icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
        ), value: 'Español', path: '/application/profile/language'
    },
    {
        label: 'Ayuda y soporte', icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        ), path: '/application/profile/help'
    },
];

export default function ConfiguracionPage() {
    const router = useRouter();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.headerBtn} onClick={() => router.back()} aria-label="Atrás">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 className={styles.pageTitle}>Configuración</h1>
                <ThemeToggle />
            </header>

            <div className={`page hide-scrollbar ${styles.pageContent}`}>
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>GENERAL</h3>
                    <div className={styles.settingsList}>
                        {settings.map((s) => (
                            <button
                                key={s.label}
                                className={styles.settingItem}
                                onClick={() => router.push(s.path)}
                            >
                                <div className={styles.settingIconWrap}>
                                    {s.icon}
                                </div>
                                <div className={styles.settingTextWrap}>
                                    <span className={styles.settingLabel}>{s.label}</span>
                                    {'value' in s && s.value && <span className={styles.settingValue}>{s.value}</span>}
                                </div>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.settingArrow}>
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.logoutWrap}>
                    <button className={styles.logoutBtn} onClick={async () => {
                        await logoutUser();
                        router.push('/landing');
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
