'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const CATEGORIES: { name: string; slug: string; icon: React.ReactNode }[] = [
    {
        name: 'Cartelera', slug: 'cartelera',
        icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" /></svg>,
    },
    {
        name: 'Viajes', slug: 'viajes',
        icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>,
    },
    {
        name: 'Fiesta', slug: 'fiesta',
        icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M5 3l.5 1.5L7 5l-1.5.5L5 7l-.5-1.5L3 5l1.5-.5z" /><path d="M19 16l.5 1.5L21 18l-1.5.5L19 20l-.5-1.5L17 18l1.5-.5z" /></svg>,
    },
    {
        name: 'Escapadas', slug: 'escapadas',
        icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l9-9 9 9" /><path d="M7 14l5-5 5 5" /><line x1="12" y1="3" x2="12" y2="9" /></svg>,
    },
    {
        name: 'Deportes', slug: 'deportes',
        icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z" /><path d="M2 12h20" /></svg>,
    },
    {
        name: 'Salidas', slug: 'salidas',
        icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    },
    {
        name: 'Actividades', slug: 'actividades',
        icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    },
    {
        name: 'En casa', slug: 'en-casa',
        icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    },
    {
        name: 'Cultura', slug: 'cultura',
        icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22" /><line x1="6" y1="18" x2="6" y2="11" /><line x1="10" y1="18" x2="10" y2="11" /><line x1="14" y1="18" x2="14" y2="11" /><line x1="18" y1="18" x2="18" y2="11" /><polygon points="12 2 20 8 4 8" /><rect x="2" y="18" width="20" height="4" /></svg>,
    },
];

export default function SelectCategoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className={styles.title}>Nuevo Plan</h1>
                <div className={styles.spacer38} />
            </div>

            {/* Content */}
            <div className={styles.content}>
                <h2 className={styles.subtitle}>¿Qué queréis hacer?</h2>
                <p className={styles.hint}>Elige una categoría para vuestro plan</p>

                <div className={styles.grid}>
                    {CATEGORIES.map((cat, i) => (
                        <button
                            key={cat.slug}
                            className={styles.categoryCard}
                            style={{ '--delay': `${i * 0.04}s` } as React.CSSProperties}
                            onClick={() => router.push(`/application/chukipus/${id}/plans/new?categoria=${cat.slug}`)}
                        >
                            <div className={styles.categoryIconWrap}>
                                {cat.icon}
                            </div>
                            <span className={styles.categoryName}>{cat.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
