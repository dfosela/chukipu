'use client';

import { usePathname, useRouter } from 'next/navigation';
import styles from './BottomNav.module.css';

const navItems = [
    {
        label: 'Inicio',
        path: '/',
        icon: (active: boolean) => (
            <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" className={styles.navIcon}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
    },
    {
        label: 'Explorar',
        path: '/explore',
        icon: (active: boolean) => (
            <svg viewBox="0 0 24 24" fill={active ? 'none' : 'none'} stroke="currentColor" className={styles.navIcon}>
                <circle cx="11" cy="11" r="8" strokeLinecap="round" />
                <path strokeLinecap="round" d="m21 21-4.35-4.35" />
                {active && <circle cx="11" cy="11" r="3" fill="currentColor" opacity="0.5" />}
            </svg>
        ),
    },
    {
        label: 'Acción',
        path: '/action',
        isMain: true,
        icon: (active: boolean) => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.navMainIcon} strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
        ),
    },
    {
        label: 'Chukipus',
        path: '/chukipus',
        icon: (active: boolean) => (
            <svg viewBox="0 0 24 24" fill={active ? 'none' : 'none'} stroke="currentColor" className={styles.navIcon}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
                {active && <path strokeLinecap="round" strokeLinejoin="round" fill="currentColor" opacity="0.25" d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />}
            </svg>
        ),
    },
    {
        label: 'Perfil',
        path: '/profile',
        icon: (active: boolean) => (
            <svg viewBox="0 0 24 24" fill={active ? 'none' : 'none'} stroke="currentColor" className={styles.navIcon}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeWidth="2" stroke={active ? 'currentColor' : 'gray'} fill={active ? 'gray' : 'none'} />
            </svg>
        ),
    },
];

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <nav className={styles.nav}>
            {navItems.map((item) => {
                const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
                // @ts-ignore
                const isMain = item.isMain;

                return (
                    <button
                        key={item.path}
                        className={`${styles.navItem} ${isActive ? styles.active : ''} ${isMain ? styles.navItemMain : ''}`}
                        onClick={() => router.push(item.path)}
                        aria-label={item.label}
                    >
                        <div className={styles.activeBackground} />
                        <div className={styles.iconWrapper}>
                            {item.icon(isActive)}
                            <div className={styles.activeDot} />
                        </div>
                        <span className={styles.navLabel}>{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
