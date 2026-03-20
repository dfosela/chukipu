import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { Suspense } from 'react';
import PlanDetailPage from './page';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseGet, firebaseGetList, firebaseUpdate } from '@/lib/firebaseMethods';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
    }),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: () => ({ theme: 'light' }),
}));

// Mock BottomNav
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
    firebaseGet: vi.fn(),
    firebaseGetList: vi.fn(),
    firebaseUpdate: vi.fn(),
    firebaseBatchUpdate: vi.fn(),
    firebaseCreate: vi.fn(),
    firebasePushId: vi.fn(),
    firebaseRemove: vi.fn(),
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
}));

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
    db: {},
    auth: {},
}));

// Mock firebase/database
vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    onValue: vi.fn((_ref, cb) => {
        cb({ val: () => null });
        return vi.fn();
    }),
    get: vi.fn(),
}));

// Mock notifications
vi.mock('@/lib/notifications', () => ({
    sendNotification: vi.fn(),
}));

const mockPlan = {
    id: 'plan1',
    chukipuId: 'chuki1',
    title: 'Road Trip',
    description: 'Fun road trip',
    category: 'Viaje',
    createdBy: 'creator123',
    completed: false,
    showInProfile: true,
    likes: [],
    likesCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    image: '',
    genre: '',
    duration: '',
    location: '',
    date: '',
    dateEnd: '',
};

const mockChukipu = {
    id: 'chuki1',
    members: { creator123: true, user123: true },
};

function renderWithSuspense(ui: React.ReactElement) {
    return render(
        <Suspense fallback={<div>Loading...</div>}>
            {ui}
        </Suspense>
    );
}

describe('PlanDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'user123' },
            profile: null,
            loading: false,
        } as ReturnType<typeof useAuth>);
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path.startsWith('plans/')) return mockPlan;
            if (path.startsWith('chukipus/')) return mockChukipu;
            return null;
        });
        vi.mocked(firebaseGetList).mockResolvedValue([]);
        vi.mocked(firebaseUpdate).mockResolvedValue(undefined);
    });

    it('renders plan title, category, and status — if this fails, plan info is not displayed', async () => {
        await act(async () => {
            renderWithSuspense(<PlanDetailPage params={Promise.resolve({ id: 'chuki1', planId: 'plan1' })} />);
        });

        expect(await screen.findByText('Road Trip')).toBeInTheDocument();
        expect(await screen.findByText('Viaje')).toBeInTheDocument();
        expect(await screen.findByText('Pendiente')).toBeInTheDocument();
    });

    it('renders like button in the info container — if this fails, like button is missing', async () => {
        await act(async () => {
            renderWithSuspense(<PlanDetailPage params={Promise.resolve({ id: 'chuki1', planId: 'plan1' })} />);
        });

        await screen.findByText('Road Trip');

        const likeBtn = screen.getByRole('button', { name: /dar like/i });
        expect(likeBtn).toBeInTheDocument();
    });

    it('clicking like button calls firebaseUpdate with correct data', async () => {
        await act(async () => {
            renderWithSuspense(<PlanDetailPage params={Promise.resolve({ id: 'chuki1', planId: 'plan1' })} />);
        });

        await screen.findByText('Road Trip');

        const likeBtn = screen.getByRole('button', { name: /dar like/i });
        fireEvent.click(likeBtn);

        await waitFor(() => {
            expect(firebaseUpdate).toHaveBeenCalledWith(
                'plans/plan1',
                expect.objectContaining({
                    likes: ['user123'],
                    likesCount: 1,
                })
            );
        });
    });

    it('shows empty heart when user has NOT liked the plan', async () => {
        await act(async () => {
            renderWithSuspense(<PlanDetailPage params={Promise.resolve({ id: 'chuki1', planId: 'plan1' })} />);
        });

        await screen.findByText('Road Trip');

        const likeBtn = screen.getByRole('button', { name: /dar like/i });
        // Empty heart: the SVG fill should be "none"
        const heartSvg = likeBtn.querySelector('svg');
        expect(heartSvg).not.toBeNull();
        expect(heartSvg?.getAttribute('fill')).toBe('none');
    });

    it('shows filled heart when user HAS liked the plan', async () => {
        const likedPlan = { ...mockPlan, likes: ['user123'], likesCount: 1 };
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path.startsWith('plans/')) return likedPlan;
            if (path.startsWith('chukipus/')) return mockChukipu;
            return null;
        });

        await act(async () => {
            renderWithSuspense(<PlanDetailPage params={Promise.resolve({ id: 'chuki1', planId: 'plan1' })} />);
        });

        await screen.findByText('Road Trip');

        const unlikeBtn = screen.getByRole('button', { name: /quitar like/i });
        const heartSvg = unlikeBtn.querySelector('svg');
        expect(heartSvg).not.toBeNull();
        expect(heartSvg?.getAttribute('fill')).toBe('currentColor');
    });

    it('renders completed status when plan is done', async () => {
        const completedPlan = { ...mockPlan, completed: true };
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path.startsWith('plans/')) return completedPlan;
            if (path.startsWith('chukipus/')) return mockChukipu;
            return null;
        });

        await act(async () => {
            renderWithSuspense(<PlanDetailPage params={Promise.resolve({ id: 'chuki1', planId: 'plan1' })} />);
        });

        expect(await screen.findByText('Completado')).toBeInTheDocument();
    });
});
