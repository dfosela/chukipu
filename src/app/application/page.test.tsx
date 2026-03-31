import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from './page';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseGetList } from '@/lib/firebaseMethods';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
    }),
}));

// Mock matchMedia to simulate standalone PWA mode so the page renders
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock Contexts
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: () => ({
        theme: 'light',
    }),
}));

// Mock Components
vi.mock('@/components/BottomNav/BottomNav', () => ({
    default: () => <div data-testid="bottom-nav">BottomNav</div>,
}));

// Mock next/image
vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => {
        // eslint-disable-next-line @next/next/no-img-element
        return <img {...props} alt={props.alt as string} />;
    },
}));

// Mock Firebase Methods
vi.mock('@/lib/firebaseMethods', () => ({
    firebaseGetList: vi.fn(),
}));

// Mock Firebase database (used for unread notifications badge)
vi.mock('@/lib/firebase', () => ({
    db: {},
    auth: {},
}));

vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    onValue: vi.fn((_ref, cb) => { cb({ val: () => null }); return vi.fn(); }),
}));

describe('HomePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            loading: false,
        } as ReturnType<typeof useAuth>);
        vi.mocked(firebaseGetList).mockResolvedValue([]);
    });

    it('renders the empty state when no authenticated user is present', () => {
        render(<HomePage />);
        expect(screen.getByText('Empieza tu historia')).toBeInTheDocument();
        expect(screen.getByText('Crea tu primer Chukipu y añade planes para que aparezcan aquí cada día.')).toBeInTheDocument();
    });

    it('renders loading state when authLoading is true', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            loading: true,
        } as ReturnType<typeof useAuth>);
        render(<HomePage />);
        expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('renders plans if a user is logged in and has plans', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'user123' },
            loading: false,
        } as ReturnType<typeof useAuth>);

        vi.mocked(firebaseGetList).mockImplementation(async (collection: string) => {
            if (collection === 'users') {
                return [];
            }
            if (collection === 'chukipus') {
                return [{ id: 'chuki1', name: 'Test Chukipu', createdBy: 'user123' }];
            }
            if (collection === 'plans') {
                return [{
                    id: 'plan1',
                    chukipuId: 'chuki1',
                    title: 'Movie Night',
                    category: 'Cartelera',
                    createdBy: 'user123',
                    createdAt: Date.now(),
                }];
            }
            return [];
        });

        render(<HomePage />);

        // Wait for the plan to appear
        const planTitles = await screen.findAllByText('Movie Night');
        expect(planTitles[0]).toBeInTheDocument();
    });

    it('renders like count badge when likesCount > 0 on the next plan card', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'user123' },
            loading: false,
        } as ReturnType<typeof useAuth>);

        vi.mocked(firebaseGetList).mockImplementation(async (collection: string) => {
            if (collection === 'users') return [];
            if (collection === 'chukipus') {
                return [{ id: 'chuki1', name: 'Test Chukipu', createdBy: 'user123', members: ['user123'] }];
            }
            if (collection === 'plans') {
                return [{
                    id: 'plan1',
                    chukipuId: 'chuki1',
                    title: 'Liked Plan',
                    category: 'Cartelera',
                    createdBy: 'user123',
                    createdAt: Date.now(),
                    likesCount: 42,
                    likes: ['otherUser', 'anotherUser'],
                    completed: false,
                }];
            }
            return [];
        });

        render(<HomePage />);

        // The like badge should display the count (using a unique number)
        const likeCountElements = await screen.findAllByText('42');
        expect(likeCountElements.length).toBeGreaterThan(0);
    });

    it('like display in home feed is NOT a button with click handler (display-only)', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'user123' },
            loading: false,
        } as ReturnType<typeof useAuth>);

        vi.mocked(firebaseGetList).mockImplementation(async (collection: string) => {
            if (collection === 'users') return [];
            if (collection === 'chukipus') {
                return [{ id: 'chuki1', name: 'Test Chukipu', createdBy: 'user123', members: ['user123'] }];
            }
            if (collection === 'plans') {
                return [{
                    id: 'plan1',
                    chukipuId: 'chuki1',
                    title: 'Display Plan With Likes',
                    category: 'Cartelera',
                    createdBy: 'user123',
                    createdAt: Date.now(),
                    likesCount: 77,
                    likes: ['u1', 'u2'],
                    completed: false,
                }];
            }
            return [];
        });

        render(<HomePage />);

        await screen.findAllByText('Display Plan With Likes');

        // The like badge span should exist (unique count)
        const likeCountSpans = screen.getAllByText('77');
        expect(likeCountSpans.length).toBeGreaterThan(0);
        // All occurrences should be inside a non-button container (display-only)
        likeCountSpans.forEach(span => {
            const badgeParent = span.closest('button');
            expect(badgeParent).toBeNull();
        });
    });

    it('does not render like badge when likesCount is 0 or undefined', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'user123' },
            loading: false,
        } as ReturnType<typeof useAuth>);

        vi.mocked(firebaseGetList).mockImplementation(async (collection: string) => {
            if (collection === 'users') return [];
            if (collection === 'chukipus') {
                return [{ id: 'chuki1', name: 'Test Chukipu', createdBy: 'user123', members: ['user123'] }];
            }
            if (collection === 'plans') {
                return [{
                    id: 'plan1',
                    chukipuId: 'chuki1',
                    title: 'Zero Likes Unique Title 999',
                    category: 'Cartelera',
                    createdBy: 'user123',
                    createdAt: Date.now(),
                    likesCount: 0,
                    completed: false,
                }];
            }
            return [];
        });

        render(<HomePage />);

        await screen.findAllByText('Zero Likes Unique Title 999');

        // The like badge (planLikeBadge div) should not be rendered at all when likesCount is 0
        const allSpans = document.querySelectorAll('span');
        // Check that none of the spans contain "0" as like count
        const zeroSpans = Array.from(allSpans).filter(s => s.textContent === '0');
        expect(zeroSpans.length).toBe(0);
    });

    it('recommended plans from private profiles the user follows DO appear', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'user123' },
            loading: false,
        } as ReturnType<typeof useAuth>);

        const usersData = [
            { id: 'user123', isPrivate: false, following: ['privateUser1'] },
            { id: 'privateUser1', isPrivate: true },
        ];
        const chukipusData = [{ id: 'chuki2', name: 'Private Chukipu', createdBy: 'privateUser1', members: ['privateUser1'] }];
        const plansData = [{
            id: 'plan2', chukipuId: 'chuki2',
            title: 'Plan From Followed Private User',
            category: 'Viaje', createdBy: 'privateUser1',
            createdAt: Date.now(), completed: false,
        }];

        vi.mocked(firebaseGetList).mockImplementation(async (collection: string, filter?: (item: unknown) => boolean) => {
            let results: unknown[] = [];
            if (collection === 'users') results = usersData;
            else if (collection === 'chukipus') results = chukipusData;
            else if (collection === 'plans') results = plansData;
            return filter ? results.filter(filter) : results;
        });

        render(<HomePage />);
        const found = await screen.findAllByText('Plan From Followed Private User');
        expect(found.length).toBeGreaterThan(0);
    });

    it('recommended plans from private profiles the user does NOT follow do NOT appear', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'user123' },
            loading: false,
        } as ReturnType<typeof useAuth>);

        const usersData = [
            { id: 'user123', isPrivate: false, following: [] },
            { id: 'privateUser2', isPrivate: true },
        ];
        const chukipusData = [{ id: 'chuki3', name: 'Private Chukipu 2', createdBy: 'privateUser2', members: ['privateUser2'] }];
        const plansData = [{
            id: 'plan3', chukipuId: 'chuki3',
            title: 'Plan From Unfollowed Private User',
            category: 'Viaje', createdBy: 'privateUser2',
            createdAt: Date.now(), completed: false,
        }];

        vi.mocked(firebaseGetList).mockImplementation(async (collection: string, filter?: (item: unknown) => boolean) => {
            let results: unknown[] = [];
            if (collection === 'users') results = usersData;
            else if (collection === 'chukipus') results = chukipusData;
            else if (collection === 'plans') results = plansData;
            return filter ? results.filter(filter) : results;
        });

        await act(async () => {
            render(<HomePage />);
            await new Promise(r => setTimeout(r, 200));
        });
        expect(screen.queryByText('Plan From Unfollowed Private User')).toBeNull();
    });

    it('plans from chukipus the user is member of do NOT appear in recommended', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'user123' },
            loading: false,
        } as ReturnType<typeof useAuth>);

        const usersData = [{ id: 'user123', isPrivate: false, following: [] }];
        const chukipusData = [{ id: 'myChuki', name: 'My Chukipu', createdBy: 'otherUser', members: ['user123', 'otherUser'] }];
        const plansData = [{
            id: 'plan4', chukipuId: 'myChuki',
            title: 'Plan From My Own Chukipu',
            category: 'Fiesta', createdBy: 'otherUser',
            createdAt: Date.now(), completed: false,
        }];

        vi.mocked(firebaseGetList).mockImplementation(async (collection: string, filter?: (item: unknown) => boolean) => {
            let results: unknown[] = [];
            if (collection === 'users') results = usersData;
            else if (collection === 'chukipus') results = chukipusData;
            else if (collection === 'plans') results = plansData;
            return filter ? results.filter(filter) : results;
        });

        render(<HomePage />);
        // Plan appears in user's own feed (user is a member of the chukipu)
        await screen.findByText('Plan From My Own Chukipu');
        // But the recommended section should not render at all
        expect(screen.queryByText('Planes recomendados')).toBeNull();
    });
});
