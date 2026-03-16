'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import BottomNav from '@/components/BottomNav/BottomNav';
import { firebaseGetList } from '@/lib/firebaseMethods';
import { useAuth } from '@/contexts/AuthContext';
import { Chukipu, Plan, UserProfile } from '@/types/firestore';
import { useTheme } from '@/contexts/ThemeContext';

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

function formatPlanDate(dateStr: string, dateEndStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  let result = d.toLocaleDateString('es-ES', opts) + ' · ' + d.toLocaleTimeString('es-ES', timeOpts);
  if (dateEndStr) {
    const de = new Date(dateEndStr);
    result += ' - ' + de.toLocaleDateString('es-ES', opts);
  }
  return result;
}

function getNextPlan(plans: FeedPlan[]): FeedPlan | null {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 86400000;

  // Plans with dates, not completed
  const upcoming = plans
    .filter(p => p.date && !p.completed)
    .map(p => ({ ...p, dateMs: new Date(p.date).getTime() }));

  // First: plan happening today
  const todayPlan = upcoming.find(p => p.dateMs >= todayStart && p.dateMs < todayEnd);
  if (todayPlan) return todayPlan;

  // Next: nearest future plan
  const futurePlans = upcoming
    .filter(p => p.dateMs >= now.getTime())
    .sort((a, b) => a.dateMs - b.dateMs);
  if (futurePlans.length > 0) return futurePlans[0];

  // Fallback: most recently created incomplete plan
  const incomplete = plans.filter(p => !p.completed).sort((a, b) => b.createdAt - a.createdAt);
  return incomplete[0] || null;
}

const BATCH_SIZE = 6;

export default function HomePage() {
  const [allPlans, setAllPlans] = useState<FeedPlan[]>([]);
  const [recommendedPlansByCategory, setRecommendedPlansByCategory] = useState<Record<string, FeedPlan[]>>({});
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const [headerVisible, setHeaderVisible] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const userChukis = await firebaseGetList<Chukipu>(
          'chukipus',
          (c) => c.members?.includes(user.uid),
          'updatedAt',
          'desc'
        );

        const chukipuIds = userChukis.map(c => c.id);
        const chukipuMap = Object.fromEntries(userChukis.map(c => [c.id, c.name]));

        const allPlans = await firebaseGetList<Plan>(
          'plans',
          (p) => chukipuIds.includes(p.chukipuId),
          'createdAt',
          'desc'
        );

        const feedPlans: FeedPlan[] = allPlans.map(plan => ({
          ...plan,
          chukipuName: chukipuMap[plan.chukipuId] || '',
        }));

        // Sort by date (dated plans first, then by createdAt)
        feedPlans.sort((a, b) => {
          if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
          if (a.date) return -1;
          if (b.date) return 1;
          return b.createdAt - a.createdAt;
        });

        setAllPlans(feedPlans);

        // Fetch recommended
        const allUsers = await firebaseGetList<UserProfile>('users');
        const privateUserIds = new Set(allUsers.filter(u => u.isPrivate).map(u => u.id));

        const allChukipus = await firebaseGetList<Chukipu>('chukipus');
        const publicChukipusMap = new Map(
          allChukipus
            .filter(c => !privateUserIds.has(c.createdBy))
            .map(c => [c.id, c.name])
        );

        const allGlobalPlans = await firebaseGetList<Plan>(
          'plans',
          (p) => publicChukipusMap.has(p.chukipuId) && p.createdBy !== user.uid && !p.completed && p.showInProfile !== false,
          'createdAt',
          'desc'
        );

        const categorizedPlans: Record<string, FeedPlan[]> = {};
        for (const p of allGlobalPlans) {
          const cat = p.category || 'Otros';
          if (!categorizedPlans[cat]) categorizedPlans[cat] = [];
          categorizedPlans[cat].push({
            ...p,
            chukipuName: publicChukipusMap.get(p.chukipuId) || ''
          });
        }
        setRecommendedPlansByCategory(categorizedPlans);

      } catch (err) {
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchPlans();
    }
  }, [user, authLoading]);

  // Scroll direction → show/hide header
  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const onScroll = () => {
      const current = el.scrollTop;
      const delta = current - lastScrollY.current;
      if (current < 10) {
        setHeaderVisible(true);
      } else if (delta > 4) {
        setHeaderVisible(false);
      } else if (delta < -4) {
        setHeaderVisible(true);
      }
      lastScrollY.current = current;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + BATCH_SIZE, allPlans.length));
  }, [allPlans.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const nextPlan = getNextPlan(allPlans);
  const feedPlans = allPlans
    .filter(p => p.id !== nextPlan?.id)
    .slice(0, visibleCount);
  const isEmpty = allPlans.length === 0;
  const hasRecommended = Object.keys(recommendedPlansByCategory).length > 0;

  const isToday = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={`${styles.header} ${headerVisible ? '' : styles.headerHidden}`}>
        <div className={styles.headerLogoWrap}>
          <div className={styles.headerLogoCenter}>
            {theme === 'dark' ? (
              <img src="/logos/chukipu-logo-pink.png" alt="Chukipu" className={styles.navMainIcon} />
            ) : (
              <img src="/logos/chukipu-logo-brown.png" alt="Chukipu" className={styles.navMainIcon} />
            )}
          </div>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.notificationBtn}
            onClick={() => router.push('/application/notifications')}
            aria-label="Notificaciones"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className={styles.notificationBadge}></span>
          </button>
        </div>
      </header>

      {/* Page Body */}
      <main className={`${styles.main} ${isEmpty && !hasRecommended && !loading ? styles.mainEmpty : ''}`}>
        {loading || authLoading ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyDesc}>Cargando...</p>
          </div>
        ) : isEmpty && !hasRecommended ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Empieza tu historia</h2>
            <p className={styles.emptyDesc}>Crea tu primer Chukipu y añade planes para que aparezcan aquí cada día.</p>
            <button className={`btn btn-primary ${styles.emptyBtn}`} onClick={() => router.push('/application/chukipus/new')}>
              Crear Chukipu
            </button>
          </div>
        ) : (
          <div ref={feedRef} className={`${styles.feedWrapper} page hide-scrollbar`}>

            {isEmpty && (
              <div className={styles.emptyState} style={{ padding: '32px 16px' }}>
                <div className={styles.emptyIcon}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <h2 className={styles.emptyTitle}>Aún no tienes planes</h2>
                <p className={styles.emptyDesc}>Descubre planes recomendados más abajo o crea el tuyo.</p>
                <button className={`btn btn-primary ${styles.emptyBtn}`} onClick={() => router.push('/application/chukipus/new')}>
                  Crear Chukipu
                </button>
              </div>
            )}

            {/* Next plan highlight */}
            {!isEmpty && nextPlan && (
              <>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>
                      {nextPlan.date && isToday(nextPlan.date) ? 'Tu plan de hoy' : 'Tu próximo plan'}
                    </h2>
                    <p className={styles.sectionSub}>{nextPlan.chukipuName}</p>
                  </div>
                  <span className={styles.dateBadge}>
                    {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <div className={styles.nextPlanCard}
                  onClick={() => router.push(`/application/chukipus/${nextPlan.chukipuId}/plans/${nextPlan.id}`)}
                >
                  <div className={styles.nextPlanImageWrap}>
                    {nextPlan.image ? (
                      <img src={nextPlan.image} alt={nextPlan.title} className={styles.nextPlanImage} />
                    ) : (
                      <div className={styles.nextPlanPlaceholder} style={{ '--cat-bg': `${categoryColors[nextPlan.category] || '#e8749a'}20` } as React.CSSProperties}>
                        {CATEGORY_ICONS[nextPlan.category] ? (
                          <div style={{ color: categoryColors[nextPlan.category] || '#e8749a', transform: 'scale(1.6)', display: 'flex' }}>
                            {CATEGORY_ICONS[nextPlan.category]}
                          </div>
                        ) : (
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={categoryColors[nextPlan.category] || '#e8749a'} strokeWidth="1.5" strokeLinecap="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        )}
                      </div>
                    )}
                    <div className={styles.nextPlanOverlay} />
                    <div className={styles.nextPlanContent}>
                      <span className={styles.nextPlanCategory} style={{ '--cat-color': categoryColors[nextPlan.category] || '#e8749a' } as React.CSSProperties}>
                        {nextPlan.category.toUpperCase()}
                      </span>
                      <h3 className={styles.nextPlanTitle}>{nextPlan.title}</h3>
                      {nextPlan.date && (
                        <div className={styles.nextPlanDate}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>{formatPlanDate(nextPlan.date, nextPlan.dateEnd)}</span>
                        </div>
                      )}
                      {nextPlan.location && (
                        <div className={styles.nextPlanLocation}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{nextPlan.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Recommended section */}
            {hasRecommended && (
              <div className={styles.recommendedSection} style={{ marginTop: 24 }}>
                <div className={styles.sectionHeader} style={{ paddingBottom: 8 }}>
                  <div>
                    <h2 className={styles.sectionTitle}>Planes recomendados</h2>
                    <p className={styles.sectionSub}>Descubre nuevas ideas</p>
                  </div>
                </div>

                {Object.entries(recommendedPlansByCategory).map(([category, plans]) => {
                  if (plans.length === 0) return null;
                  return (
                    <div key={category}>
                      <div className={styles.recommendedCategoryHeader}>
                        <div className={styles.recommendedCategoryIcon}>
                          {CATEGORY_ICONS[category] || (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <circle cx="12" cy="12" r="10" />
                            </svg>
                          )}
                        </div>
                        {category}
                      </div>
                      <div className={styles.recommendedScrollContainer}>
                        {plans.map(plan => (
                          <div key={plan.id} className={styles.recommendedCardWrapper}>
                            <div className={styles.nextPlanCard} onClick={() => router.push(`/application/chukipus/${plan.chukipuId}/plans/${plan.id}`)}>
                              <div className={styles.nextPlanImageWrap} style={{ aspectRatio: '16/10' }}>
                                {plan.image ? (
                                  <img src={plan.image} alt={plan.title} className={styles.nextPlanImage} />
                                ) : (
                                  <div className={styles.nextPlanPlaceholder} style={{ '--cat-bg': `${categoryColors[plan.category] || '#e8749a'}20` } as React.CSSProperties}>
                                    {CATEGORY_ICONS[plan.category] ? (
                                      <span style={{ color: categoryColors[plan.category] || '#e8749a', display: 'flex', transform: 'scale(1.6)' }}>
                                        {CATEGORY_ICONS[plan.category]}
                                      </span>
                                    ) : (
                                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={categoryColors[plan.category] || '#e8749a'} strokeWidth="1.5" strokeLinecap="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                      </svg>
                                    )}
                                  </div>
                                )}
                                <div className={styles.nextPlanOverlay} />
                                <div className={styles.nextPlanContent} style={{ padding: 16 }}>
                                  <span className={styles.nextPlanCategory} style={{ '--cat-color': categoryColors[plan.category] || '#e8749a' } as React.CSSProperties}>
                                    {plan.category.toUpperCase()}
                                  </span>
                                  <h3 className={styles.nextPlanTitle} style={{ fontSize: 18 }}>{plan.title}</h3>
                                  {plan.date && (
                                    <div className={styles.nextPlanDate} style={{ fontSize: 13 }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                                      </svg>
                                      <span>{formatPlanDate(plan.date, plan.dateEnd)}</span>
                                    </div>
                                  )}
                                  {plan.location && (
                                    <div className={styles.nextPlanLocation} style={{ fontSize: 12 }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                                      </svg>
                                      <span>{plan.location}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
