import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomePage from './page';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseGetList } from '@/lib/firebaseMethods';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
    }),
}));

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

describe('HomePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            user: null,
            loading: false,
        });
        (firebaseGetList as any).mockResolvedValue([]);
    });

    it('renders the empty state when no authenticated user is present', () => {
        render(<HomePage />);
        expect(screen.getByText('Empieza tu historia')).toBeInTheDocument();
        expect(screen.getByText('Crea tu primer Chukipu y añade planes para que aparezcan aquí cada día.')).toBeInTheDocument();
    });

    it('renders loading state when authLoading is true', () => {
        (useAuth as any).mockReturnValue({
            user: null,
            loading: true,
        });
        render(<HomePage />);
        expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('renders plans if a user is logged in and has plans', async () => {
        (useAuth as any).mockReturnValue({
            user: { uid: 'user123' },
            loading: false,
        });

        (firebaseGetList as any).mockImplementation(async (collection: string) => {
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
