import { render, screen } from '@testing-library/react';
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
                    category: 'Película',
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
});
