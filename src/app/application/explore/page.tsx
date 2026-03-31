'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import BottomNav from '@/components/BottomNav/BottomNav';
import { firebaseGetList } from '@/lib/firebaseMethods';
import { useAuth } from '@/contexts/AuthContext';
import { Chukipu, Plan, UserProfile } from '@/types/firestore';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

interface FeedPlan extends Plan {
    chukipuName: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'Cartelera': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" /></svg>,
    'Viaje': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>,
    'Fiesta': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path d="M5 3l.5 1.5L7 5l-1.5.5L5 7l-.5-1.5L3 5l1.5-.5z" /><path d="M19 16l.5 1.5L21 18l-1.5.5L19 20l-.5-1.5L17 18l1.5-.5z" /></svg>,
    'Escapada': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l9-9 9 9" /><path d="M7 14l5-5 5 5" /><line x1="12" y1="3" x2="12" y2="9" /></svg>,
    'Deporte': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z" /><path d="M2 12h20" /></svg>,
    'Salida': <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    'Actividad': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    'En casa': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
    'Cultura': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22" /><line x1="6" y1="18" x2="6" y2="11" /><line x1="10" y1="18" x2="10" y2="11" /><line x1="14" y1="18" x2="14" y2="11" /><line x1="18" y1="18" x2="18" y2="11" /><polygon points="12 2 20 8 4 8" /><rect x="2" y="18" width="20" height="4" /></svg>,
    'Otro': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="8" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="16" cy="12" r="1" fill="currentColor" /></svg>,
};

const categoryColors: Record<string, string> = {
    'Cartelera': '#e8749a',
    Viaje: '#5b86e5',
    Fiesta: '#e8749a',
    Escapada: '#52c788',
    Deporte: '#5b86e5',
    Salida: '#a78bfa',
    Actividad: '#f5a623',
    'En casa': '#5b86e5',
    Cultura: '#f5a623',
    Otro: '#94a3b8',
};

export default function ExplorePage() {
    const router = useRouter();
    const { user } = useAuth();
    const [hasUnread, setHasUnread] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'chukipus' | 'personas'>('chukipus');
    const [activeFilter, setActiveFilter] = useState('Todos');
    const [expandedFilters, setExpandedFilters] = useState(false);
    const [publicChukipus, setPublicChukipus] = useState<Chukipu[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [usersLoaded, setUsersLoaded] = useState(false);
    const [rawPlans, setRawPlans] = useState<FeedPlan[]>([]);
    const [plansLoading, setPlansLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const notifRef = ref(db, `users/${user.uid}/notifications`);
        const unsub = onValue(notifRef, (snap) => {
            const data = snap.val();
            if (!data) { setHasUnread(false); return; }
            const unread = Object.values(data as Record<string, { read: boolean }>).some(n => !n.read);
            setHasUnread(unread);
        });
        return () => unsub();
    }, [user]);

    // Realtime listener: chukipus (needed to enrich plans with chukipu names)
    useEffect(() => {
        const chukipusRef = ref(db, 'chukipus');
        const unsubscribe = onValue(chukipusRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const arr: Chukipu[] = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                setPublicChukipus(arr);
            } else {
                setPublicChukipus([]);
            }
        }, (error) => {
            console.error(error);
        });
        return () => unsubscribe();
    }, []);

    // Fetch users once
    useEffect(() => {
        if (!usersLoaded) {
            firebaseGetList<UserProfile>('users')
                .then(data => { setAllUsers(data); setUsersLoaded(true); })
                .catch(console.error);
        }
    }, [usersLoaded]);

    // Realtime listener: plans (for discovery view)
    useEffect(() => {
        const plansRef = ref(db, 'plans');
        const unsubscribePlans = onValue(plansRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                // Plans are stored flat: plans/{planId}
                const allPlans: FeedPlan[] = Object.keys(data).map(planId => ({
                    id: planId,
                    chukipuName: '',
                    ...data[planId],
                }));
                setRawPlans(allPlans);
            } else {
                setRawPlans([]);
            }
            setPlansLoading(false);
        }, (error) => {
            console.error(error);
            setPlansLoading(false);
        });
        return () => unsubscribePlans();
    }, []);

    const filters = [
        'Todos', 'Cartelera', 'Viaje', 'Escapada', 'Deporte', 'Cultura',
        'Fiesta', 'Salida', 'Actividad', 'En casa', 'Otro'
    ];

    // Compute public plans grouped by category (for discovery carousels)
    const publicPlansByCategory = useMemo(() => {
        if (!usersLoaded || rawPlans.length === 0) return {};
        const privateUserIds = new Set(allUsers.filter(u => u.isPrivate).map(u => u.id));
        // Chukipus ocultos en explore: los "solo para ti" y los creados por usuarios con perfil privado
        const hiddenChukipuIds = new Set(
            publicChukipus
                .filter(c => c.isPrivate || privateUserIds.has(c.createdBy))
                .map(c => c.id)
        );
        const myChukipuIds = new Set(
            publicChukipus
                .filter(c => {
                    const members = c.members;
                    if (!members || !user) return false;
                    return Array.isArray(members) ? members.includes(user.uid) : (members as Record<string, boolean>)[user.uid] === true;
                })
                .map(c => c.id)
        );
        const chukipuNamesMap: Record<string, string> = Object.fromEntries(publicChukipus.map(c => [c.id, c.name]));

        const filtered = rawPlans
            .filter(plan =>
                !hiddenChukipuIds.has(plan.chukipuId) &&
                !myChukipuIds.has(plan.chukipuId) &&
                plan.category
            )
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(p => ({ ...p, chukipuName: chukipuNamesMap[p.chukipuId] || '' }));

        const grouped: Record<string, FeedPlan[]> = {};
        filtered.forEach(plan => {
            if (!grouped[plan.category]) grouped[plan.category] = [];
            grouped[plan.category].push(plan);
        });
        return grouped;
    }, [rawPlans, allUsers, publicChukipus, user, usersLoaded]);

    const filteredUsers = allUsers.filter(u => {
        if (!search.trim()) return true;
        const q = search.toLowerCase().replace(/^@/, '');
        return u.displayName?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
    }).filter(u => u.id !== user?.uid);

    const isSearchOrFilter = search.trim() !== '' || activeFilter !== 'Todos';

    // Flat list of all processed public plans (for search/filter mode)
    const allPublicPlansFlat = useMemo(
        () => Object.values(publicPlansByCategory).flat(),
        [publicPlansByCategory]
    );

    const filteredPlans = useMemo(() => {
        const q = search.toLowerCase().trim();
        return allPublicPlansFlat.filter(p => {
            const matchesSearch = !q || p.title?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
            const matchesFilter = activeFilter === 'Todos' || p.category === activeFilter;
            return matchesSearch && matchesFilter;
        });
    }, [allPublicPlansFlat, search, activeFilter]);

    const hasPublicPlans = !plansLoading && allPublicPlansFlat.length > 0;

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.pageTitle}>Explorar</h1>
                    <p className={styles.pageSubtitle}>Descubre planes del mundo</p>
                </div>
                <button className={styles.notificationBtn} onClick={() => router.push('/application/notifications')} aria-label="Notificaciones">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    {hasUnread && <span className={styles.notificationBadge}></span>}
                </button>
            </header>

            <div className={`page hide-scrollbar`}>
                {/* Search Bar */}
                <div className={styles.searchWrap}>
                    <div className={styles.searchBar}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.searchIcon}>
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="search"
                            placeholder={activeTab === 'chukipus' ? 'Buscar planes, chukipus...' : 'Buscar por nombre o @usuario...'}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className={styles.searchInput}
                        />
                        {search && (
                            <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="Borrar búsqueda">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabsWrap}>
                    <button className={`${styles.tab} ${activeTab === 'chukipus' ? styles.tabActive : ''}`} onClick={() => setActiveTab('chukipus')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        Planes
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'personas' ? styles.tabActive : ''}`} onClick={() => setActiveTab('personas')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        Personas
                    </button>
                </div>

                {activeTab === 'chukipus' ? (
                    <>
                        {/* Filters — always visible in chukipus tab */}
                        <div className={styles.filtersWrapper}>
                            <div className={styles.filtersTopRow}>
                                {filters.slice(0, 3).map(f => (
                                    <button
                                        key={f}
                                        className={`${styles.filterBtn} ${activeFilter === f ? styles.filterActive : ''}`}
                                        onClick={() => setActiveFilter(f)}
                                    >
                                        {f}
                                    </button>
                                ))}
                                <button
                                    className={`${styles.filterExpandBtn} ${expandedFilters ? styles.filterExpandBtnActive : ''}`}
                                    onClick={() => setExpandedFilters(!expandedFilters)}
                                    aria-label={expandedFilters ? 'Cerrar categorías' : 'Ver más categorías'}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        className={expandedFilters ? styles.filterChevronOpen : styles.filterChevronClosed}>
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </button>
                            </div>

                            {expandedFilters && (
                                <div className={styles.filtersExpanded}>
                                    {filters.slice(3).map(f => (
                                        <button
                                            key={f}
                                            className={`${styles.filterBtn} ${activeFilter === f ? styles.filterActive : ''}`}
                                            onClick={() => setActiveFilter(f)}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {isSearchOrFilter ? (
                            /* Search / filter mode: show matching plans */
                            <>
                                <div className={styles.sectionLabel}>
                                    <span>{plansLoading ? 'Cargando...' : `${filteredPlans.length} planes encontrados`}</span>
                                </div>
                                {filteredPlans.length === 0 && !plansLoading ? (
                                    <div className={styles.discoverEmpty}>
                                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={styles.discoverEmptyIcon}>
                                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                        </svg>
                                        <p className={styles.discoverEmptyText}>No se encontraron planes</p>
                                    </div>
                                ) : (
                                    <div className={styles.filterGrid}>
                                        {filteredPlans.map(plan => (
                                            <div
                                                key={plan.id}
                                                className={styles.explorePlanCard}
                                                onClick={() => router.push(`/application/chukipus/${plan.chukipuId}/plans/${plan.id}?from=explore`)}
                                            >
                                                <div
                                                    className={styles.explorePlanCardBg}
                                                    style={{ '--cat-color': categoryColors[plan.category] || '#e8749a', '--cat-bg': `${categoryColors[plan.category] || '#e8749a'}18` } as React.CSSProperties}
                                                >
                                                    <div className={styles.explorePlanCardIcon}>
                                                        {CATEGORY_ICONS[plan.category] || (
                                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                                                <circle cx="12" cy="12" r="10" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className={styles.explorePlanCardOverlay} />
                                                    <div className={styles.explorePlanCardContent}>
                                                        <span className={styles.explorePlanCardCategory}>
                                                            {plan.category.toUpperCase()}
                                                        </span>
                                                        <h3 className={styles.explorePlanCardTitle}>{plan.title}</h3>
                                                        {plan.chukipuName && (
                                                            <span className={styles.explorePlanCardSub}>{plan.chukipuName}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Discovery mode (Todos): carruseles por categoría */
                            plansLoading || !usersLoaded ? (
                                <div className={styles.discoverEmpty}>
                                    <p className={styles.discoverEmptyText}>Cargando...</p>
                                </div>
                            ) : !hasPublicPlans ? (
                                <div className={styles.discoverEmpty}>
                                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={styles.discoverEmptyIcon}>
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                    </svg>
                                    <p className={styles.discoverEmptyText}>Busca planes, chukipus o personas</p>
                                </div>
                            ) : (
                                <div className={styles.discoverWrapper}>
                                    {Object.keys(publicPlansByCategory)
                                        .filter(cat => cat !== '__raw__' && publicPlansByCategory[cat].length > 0)
                                        .map(category => (
                                            <div key={category} className={styles.exploreCategorySection}>
                                                <div className={styles.exploreCategoryHeader} style={{ '--cat-color': categoryColors[category] || '#e8749a' } as React.CSSProperties}>
                                                    <div className={styles.exploreCategoryIcon}>
                                                        {CATEGORY_ICONS[category] || (
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                                <circle cx="12" cy="12" r="10" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span className={styles.exploreCategoryName}>{category}</span>
                                                </div>
                                                <div className={styles.exploreScrollContainer}>
                                                    <span className={styles.scrollSpacer} />
                                                    {publicPlansByCategory[category].map(plan => (
                                                        <div
                                                            key={plan.id}
                                                            className={styles.explorePlanCard}
                                                            onClick={() => router.push(`/application/chukipus/${plan.chukipuId}/plans/${plan.id}?from=explore`)}
                                                        >
                                                            {/* Placeholder with category icon */}
                                                            <div
                                                                className={styles.explorePlanCardBg}
                                                                style={{ '--cat-color': categoryColors[plan.category] || '#e8749a', '--cat-bg': `${categoryColors[plan.category] || '#e8749a'}18` } as React.CSSProperties}
                                                            >
                                                                <div className={styles.explorePlanCardIcon}>
                                                                    {CATEGORY_ICONS[plan.category] || (
                                                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                                                            <circle cx="12" cy="12" r="10" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                                <div className={styles.explorePlanCardOverlay} />
                                                                <div className={styles.explorePlanCardContent}>
                                                                    <span
                                                                        className={styles.explorePlanCardCategory}
                                                                    >
                                                                        {plan.category.toUpperCase()}
                                                                    </span>
                                                                    <h3 className={styles.explorePlanCardTitle}>{plan.title}</h3>
                                                                    {plan.chukipuName && (
                                                                        <span className={styles.explorePlanCardSub}>{plan.chukipuName}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <span className={styles.scrollSpacer} />
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )
                        )}
                    </>
                ) : (
                    /* Personas tab */
                    <>
                        <div className={styles.sectionLabel}>
                            <span>{!usersLoaded ? 'Cargando...' : `${filteredUsers.length} personas`}</span>
                        </div>
                        <div className={styles.usersList}>
                            {filteredUsers.length === 0 && usersLoaded && (
                                <div className={styles.emptyUsers}>
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                                    </svg>
                                    <p>No se encontraron personas</p>
                                </div>
                            )}
                            {filteredUsers.map((u, idx) => (
                                <button
                                    key={u.id}
                                    className={styles.userCard}
                                    onClick={() => router.push(`/application/user/${u.id}`)}
                                    style={{ '--delay': `${idx * 0.04}s` } as React.CSSProperties}
                                >
                                    {u.avatar ? (
                                        <Image src={u.avatar} alt={u.displayName} className={styles.userCardAvatar} width={40} height={40} style={{ objectFit: 'cover' }} />
                                    ) : (
                                        <div className={styles.userCardAvatarPlaceholder}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className={styles.userCardInfo}>
                                        <span className={styles.userCardName}>{u.displayName}</span>
                                        <span className={styles.userCardUsername}>@{u.username}</span>
                                    </div>
                                    <div className={styles.userCardMeta}>
                                        <span className={styles.userCardStat}>{u.followersCount || 0}</span>
                                        <span className={styles.userCardStatLabel}>seguidores</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <BottomNav />
        </div>
    );
}

