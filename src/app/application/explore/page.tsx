'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import BottomNav from '@/components/BottomNav/BottomNav';
import { firebaseGetList, firebaseGet, firebaseUpdate, firebaseBatchUpdate } from '@/lib/firebaseMethods';
import { useAuth } from '@/contexts/AuthContext';
import { Chukipu, Plan, UserProfile } from '@/types/firestore';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';

interface FeedPlan extends Plan {
    chukipuName: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'Película': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" /></svg>,
    'Viaje': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /><circle cx="12" cy="10" r="3" /></svg>,
    'Comida': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>,
    'Escapada': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l9-9 9 9" /><path d="M7 14l5-5 5 5" /><line x1="12" y1="3" x2="12" y2="9" /></svg>,
    'Deporte': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z" /><path d="M2 12h20" /></svg>,
    'Cena': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="15" x2="12" y2="21" /><path d="M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" /><path d="M9 5l3 3 3-3" /></svg>,
    'Cocina en casa': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3C7 3 3 7.5 3 12h18c0-4.5-4-9-9-9z" /><rect x="2" y="12" width="20" height="4" rx="1" /><path d="M6 16v4" /><path d="M18 16v4" /></svg>,
    'Gaming': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="11" x2="10" y2="11" /><line x1="8" y1="9" x2="8" y2="13" /><line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" /><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" /></svg>,
    'Juego de mesa': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="9" r="1.5" fill="currentColor" stroke="none" /><circle cx="9" cy="15" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="15" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></svg>,
    'Cultura': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22" /><line x1="6" y1="18" x2="6" y2="11" /><line x1="10" y1="18" x2="10" y2="11" /><line x1="14" y1="18" x2="14" y2="11" /><line x1="18" y1="18" x2="18" y2="11" /><polygon points="12 2 20 8 4 8" /><rect x="2" y="18" width="20" height="4" /></svg>,
    'Lectura': <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
};

const categoryColors: Record<string, string> = {
    'Película': '#e8749a',
    Viaje: '#5b86e5',
    Comida: '#ff7f50',
    Escapada: '#52c788',
    Deporte: '#5b86e5',
    Cena: '#f5a623',
    'Cocina en casa': '#ff7f50',
    Gaming: '#a78bfa',
    'Juego de mesa': '#f5a623',
    Cultura: '#f5a623',
    Lectura: '#52c788',
};

export default function ExplorePage() {
    const router = useRouter();
    const { user } = useAuth();
    const [saved, setSaved] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'chukipus' | 'personas'>('chukipus');
    const [activeFilter, setActiveFilter] = useState('Todos');
    const [expandedFilters, setExpandedFilters] = useState(false);
    const [userRatings, setUserRatings] = useState<Record<string, number>>({});
    const [publicChukipus, setPublicChukipus] = useState<Chukipu[]>([]);
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [usersLoaded, setUsersLoaded] = useState(false);
    const [publicPlansByCategory, setPublicPlansByCategory] = useState<Record<string, FeedPlan[]>>({});
    const [plansLoading, setPlansLoading] = useState(true);

    // Realtime listener: chukipus
    useEffect(() => {
        const chukipusRef = ref(db, 'chukipus');
        const unsubscribe = onValue(chukipusRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const arr: Chukipu[] = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                setPublicChukipus(arr.sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0)));
            } else {
                setPublicChukipus([]);
            }
            setLoading(false);
        }, (error) => {
            console.error(error);
            setLoading(false);
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
                // Flatten all plans from all chukipus
                const allPlans: FeedPlan[] = [];
                Object.keys(data).forEach(chukipuId => {
                    const chukipuPlans = data[chukipuId];
                    Object.keys(chukipuPlans).forEach(planId => {
                        allPlans.push({ id: planId, chukipuId, chukipuName: '', ...chukipuPlans[planId] });
                    });
                });
                // We'll filter against users once they're loaded — store raw plans
                setPublicPlansByCategory({ __raw__: allPlans });
            } else {
                setPublicPlansByCategory({});
            }
            setPlansLoading(false);
        }, (error) => {
            console.error(error);
            setPlansLoading(false);
        });
        return () => unsubscribePlans();
    }, []);

    // Once both users and raw plans are ready, compute the categorized map
    useEffect(() => {
        if (!usersLoaded) return;
        const raw = publicPlansByCategory['__raw__'];
        if (!raw) return;

        const privateUserIds = new Set(allUsers.filter(u => u.isPrivate).map(u => u.id));
        const chukipuNamesMap: Record<string, string> = {};
        publicChukipus.forEach(c => { chukipuNamesMap[c.id] = c.name; });

        const filtered: FeedPlan[] = raw.filter((plan: FeedPlan) =>
            !privateUserIds.has(plan.createdBy) &&
            plan.createdBy !== user?.uid &&
            !plan.completed &&
            plan.showInProfile !== false &&
            plan.category
        );

        // Sort newest first
        filtered.sort((a, b) => b.createdAt - a.createdAt);

        // Enrich with chukipu name
        filtered.forEach(p => { p.chukipuName = chukipuNamesMap[p.chukipuId] || ''; });

        // Group by category
        const grouped: Record<string, FeedPlan[]> = {};
        filtered.forEach(plan => {
            if (!grouped[plan.category]) grouped[plan.category] = [];
            grouped[plan.category].push(plan);
        });

        setPublicPlansByCategory(grouped);
    }, [usersLoaded, allUsers, publicChukipus, user, plansLoading]);

    const filters = [
        'Todos', 'Película', 'Viaje', 'Comida', 'Escapada', 'Deporte',
        'Cena', 'Cocina en casa', 'Gaming', 'Juego de mesa', 'Cultura', 'Lectura'
    ];

    const filteredChukipus = useMemo(() => {
        if (!usersLoaded) return [];
        return publicChukipus.filter(c => {
            const creator = allUsers.find(u => u.id === c.createdBy);
            const isCreatorPrivate = creator?.isPrivate === true;
            const matchesSearch = c.name ? c.name.toLowerCase().includes(search.toLowerCase()) : false;
            const matchesCategory = activeFilter === 'Todos' || c.category === activeFilter;
            return !isCreatorPrivate && matchesSearch && matchesCategory;
        });
    }, [publicChukipus, search, activeFilter, allUsers, usersLoaded]);

    const filteredUsers = allUsers.filter(u => {
        if (!search.trim()) return true;
        const q = search.toLowerCase().replace(/^@/, '');
        return u.displayName?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q);
    }).filter(u => u.id !== user?.uid);

    const isSearchOrFilter = search.trim() !== '' || activeFilter !== 'Todos';

    const hasPublicPlans = !plansLoading && Object.keys(publicPlansByCategory).filter(k => k !== '__raw__').some(k => publicPlansByCategory[k].length > 0);

    const toggleSave = async (id: string) => {
        if (!user) return;
        setSaved(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
        try {
            const userSnap = await firebaseGet<{ savedChukipus?: string[] }>(`users/${user.uid}`);
            const savedList = userSnap?.savedChukipus || [];
            if (!savedList.includes(id)) {
                savedList.push(id);
                await firebaseUpdate(`users/${user.uid}`, { savedChukipus: savedList });
            }
        } catch (error) { console.error(error); }
    };

    const handleRate = async (id: string, rating: number) => {
        if (!user) return;
        // eslint-disable-next-line react-hooks/purity
        const ratedAt = Date.now();
        setUserRatings(prev => ({ ...prev, [id]: rating }));
        try {
            const chukipu = await firebaseGet<Chukipu>(`chukipus/${id}`);
            if (!chukipu) return;
            const newRatingCount = (chukipu.ratingCount || 0) + 1;
            const newAverage = (((chukipu.ratingAverage || 0) * (chukipu.ratingCount || 0)) + rating) / newRatingCount;
            await firebaseBatchUpdate({
                [`chukipus/${id}/ratingAverage`]: newAverage,
                [`chukipus/${id}/ratingCount`]: newRatingCount,
                [`chukipus/${id}/ratings/${user.uid}`]: { rating, createdAt: ratedAt },
            });
        } catch (error) { console.error("Failed to rate", error); }
    };

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
                    <span className={styles.notificationBadge}></span>
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
                            /* Search / filter mode: show chukipu list */
                            <>
                                <div className={styles.sectionLabel}>
                                    <span>{loading ? 'Cargando...' : `${filteredChukipus.length} Chukipus encontrados`}</span>
                                </div>
                                <div className={styles.feed}>
                                    {filteredChukipus.map((chukipu, idx) => (
                                        <ExploreCard
                                            key={chukipu.id}
                                            chukipu={chukipu}
                                            saved={saved.has(chukipu.id) || (user?.uid ? chukipu.members?.includes(user.uid) : false)}
                                            onToggleSave={() => toggleSave(chukipu.id)}
                                            userRating={userRatings[chukipu.id] ?? 0}
                                            onRate={(r) => handleRate(chukipu.id, r)}
                                            delay={idx * 0.05}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            /* Discovery mode: category carousels */
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
                                                <div className={styles.exploreCategoryHeader}>
                                                    <div className={styles.exploreCategoryIcon} style={{ color: categoryColors[category] || '#e8749a' }}>
                                                        {CATEGORY_ICONS[category] || (
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                                <circle cx="12" cy="12" r="10" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <span className={styles.exploreCategoryName}>{category}</span>
                                                </div>
                                                <div className={styles.exploreScrollContainer}>
                                                    {publicPlansByCategory[category].map(plan => (
                                                        <div
                                                            key={plan.id}
                                                            className={styles.explorePlanCard}
                                                            onClick={() => router.push(`/application/chukipus/${plan.chukipuId}/plans/${plan.id}`)}
                                                        >
                                                            {/* Placeholder with category icon */}
                                                            <div
                                                                className={styles.explorePlanCardBg}
                                                                style={{ background: `${categoryColors[plan.category] || '#e8749a'}18` }}
                                                            >
                                                                <div className={styles.explorePlanCardIcon} style={{ color: categoryColors[plan.category] || '#e8749a' }}>
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
                                                                        style={{ color: categoryColors[plan.category] || '#e8749a' }}
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
                                        <img src={u.avatar} alt={u.displayName} className={styles.userCardAvatar} />
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

function ExploreCard({
    chukipu, saved, onToggleSave, userRating, onRate, delay
}: {
    chukipu: Chukipu;
    saved: boolean;
    onToggleSave: () => void;
    userRating: number;
    onRate: (r: number) => void;
    delay: number;
}) {
    const [hoveredStar, setHoveredStar] = useState(0);

    return (
        <div className={styles.card} style={{ '--delay': `${delay}s` } as React.CSSProperties}>
            {chukipu.image && <img src={chukipu.image} alt={chukipu.name} className={styles.cardImage} />}
            <div className={styles.cardOverlay} />
            <div className={styles.ratingBadge}>
                <span>{(chukipu.ratingAverage ?? 0).toFixed(1)}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#D4748C" stroke="none">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
            </div>
            <div className={styles.membersTag}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {(chukipu.membersCount ?? 0).toLocaleString()}
            </div>
            <div className={styles.cardContent}>
                <span className={styles.cardCategory}>{String(chukipu.planCount)} planes</span>
                <h3 className={styles.cardTitle}>{chukipu.name}</h3>
                <div className={styles.cardActions}>
                    <div className={styles.userStars}>
                        {[1, 2, 3, 4, 5].map(s => (
                            <button key={s} className={styles.starBtn}
                                onMouseEnter={() => setHoveredStar(s)}
                                onMouseLeave={() => setHoveredStar(0)}
                                onClick={() => onRate(s)}
                                aria-label={`Valorar ${s} corazones`}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24"
                                    fill={s <= (hoveredStar || userRating) ? '#D4748C' : 'rgba(255,255,255,0.2)'}
                                    stroke={s <= (hoveredStar || userRating) ? '#D4748C' : 'rgba(255,255,255,0.6)'}
                                    strokeWidth="1.5"
                                    style={{ transition: 'all 0.1s', transform: s <= (hoveredStar || userRating) ? 'scale(1.15)' : 'scale(1)' }}>
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                            </button>
                        ))}
                    </div>
                    <button
                        className={`${styles.addBtn} ${saved ? styles.addBtnSaved : ''}`}
                        onClick={onToggleSave}
                        aria-label={saved ? 'Quitar de Chukipu' : 'Añadir a Chukipu'}
                    >
                        {saved ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
