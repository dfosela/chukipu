import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { Suspense } from 'react';
import ChukipuDetailPage from './page';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseGet, firebaseGetList, firebaseUpdate, firebaseBatchUpdate } from '@/lib/firebaseMethods';

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
}));

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
    db: {},
    auth: {},
}));

// Mock firebase/database - onValue calls callback synchronously with members data
vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    onValue: vi.fn((_ref, cb) => {
        cb({ exists: () => true, val: () => ({ user123: true, creator123: true }) });
        return vi.fn();
    }),
    get: vi.fn(),
}));

const mockChukipu = {
    id: 'chuki1',
    name: 'Test Chukipu',
    createdBy: 'creator123',
    members: ['creator123', 'user123'],
    planCount: 2,
    image: '',
    inviteCode: 'abc123',
    ratingAverage: 0,
    ratingCount: 0,
    membersCount: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

const mockPlan = {
    id: 'plan1',
    chukipuId: 'chuki1',
    title: 'Movie Night',
    description: 'Watch a great film',
    category: 'Cartelera',
    createdBy: 'creator123',
    completed: false,
    pinnedBy: {},
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

function renderWithSuspense(ui: React.ReactElement) {
    return render(
        <Suspense fallback={<div>Loading...</div>}>
            {ui}
        </Suspense>
    );
}

describe('ChukipuDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'user123' },
            loading: false,
        } as ReturnType<typeof useAuth>);
        vi.mocked(firebaseGet).mockResolvedValue(mockChukipu as ReturnType<typeof mockChukipu>);
        vi.mocked(firebaseGetList).mockResolvedValue([mockPlan]);
        vi.mocked(firebaseUpdate).mockResolvedValue(undefined);
        vi.mocked(firebaseBatchUpdate).mockResolvedValue(undefined);
    });

    it('renders plan title and category', async () => {
        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        expect(await screen.findByText('Movie Night')).toBeInTheDocument();
        expect(await screen.findByText('Cartelera')).toBeInTheDocument();
    });

    it('renders like button for non-creators', async () => {
        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');
        expect(screen.getByRole('button', { name: /dar like/i })).toBeInTheDocument();
    });

    it('clicking like calls firebaseUpdate with correct data', async () => {
        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');
        fireEvent.click(screen.getByRole('button', { name: /dar like/i }));

        await waitFor(() => {
            expect(firebaseUpdate).toHaveBeenCalledWith(
                'plans/plan1',
                expect.objectContaining({
                    likes: expect.arrayContaining(['user123']),
                    likesCount: 1,
                })
            );
        });
    });

    it('optimistic update: like count shows immediately before Firebase responds', async () => {
        vi.mocked(firebaseUpdate).mockImplementation(() => new Promise(res => setTimeout(res, 1000)));
        vi.mocked(firebaseGetList).mockResolvedValue([{ ...mockPlan, likes: [], likesCount: 0 }]);

        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');
        fireEvent.click(screen.getByRole('button', { name: /dar like/i }));

        await waitFor(() => {
            const unlikeBtn = screen.getByRole('button', { name: /quitar like/i });
            expect(unlikeBtn.querySelector('span')?.textContent).toBe('1');
        });
    });

    it('clicking like on already-liked plan removes the like', async () => {
        vi.mocked(firebaseGetList).mockResolvedValue([{ ...mockPlan, likes: ['user123'], likesCount: 1 }]);

        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');
        fireEvent.click(screen.getByRole('button', { name: /quitar like/i }));

        await waitFor(() => {
            expect(firebaseUpdate).toHaveBeenCalledWith(
                'plans/plan1',
                expect.objectContaining({ likes: [], likesCount: 0 })
            );
        });
    });

    it('pin button renders for members and uses pinnedBy per-user logic', async () => {
        vi.mocked(firebaseGetList).mockResolvedValue([{ ...mockPlan, pinnedBy: {} }]);

        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');
        expect(screen.getByRole('button', { name: /fijar en el perfil/i })).toBeInTheDocument();
    });

    it('clicking pin calls firebaseBatchUpdate with pinnedBy path', async () => {
        vi.mocked(firebaseGetList).mockResolvedValue([{ ...mockPlan, pinnedBy: {} }]);

        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');
        fireEvent.click(screen.getByRole('button', { name: /fijar en el perfil/i }));

        await waitFor(() => {
            expect(firebaseBatchUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    'plans/plan1/pinnedBy/user123': true,
                })
            );
        });
    });

    it('clicking unpin calls firebaseBatchUpdate with null to remove pin', async () => {
        vi.mocked(firebaseGetList).mockResolvedValue([{ ...mockPlan, pinnedBy: { user123: true } }]);

        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');
        fireEvent.click(screen.getByRole('button', { name: /quitar del perfil/i }));

        await waitFor(() => {
            expect(firebaseBatchUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    'plans/plan1/pinnedBy/user123': null,
                })
            );
        });
    });

    it('pin button not visible for non-members', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'outsider999' },
            loading: false,
        } as ReturnType<typeof useAuth>);

        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');
        expect(screen.queryByRole('button', { name: /fijar en el perfil/i })).toBeNull();
    });

    it('private chukipu is hidden for non-creators', async () => {
        const privateChukipu = { ...mockChukipu, isPrivate: true, createdBy: 'creator123' };
        vi.mocked(firebaseGet).mockResolvedValue(privateChukipu);
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'outsider999' },
            loading: false,
        } as ReturnType<typeof useAuth>);

        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await waitFor(() => {
            expect(screen.queryByText('Movie Night')).toBeNull();
        });
    });

    it('invite button hidden for private chukipus', async () => {
        // creator123 is the creator, so they can see the private chukipu
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'creator123' },
            loading: false,
        } as ReturnType<typeof useAuth>);
        const privateChukipu = { ...mockChukipu, isPrivate: true };
        vi.mocked(firebaseGet).mockResolvedValue(privateChukipu);

        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');
        expect(screen.queryByRole('button', { name: /invitar/i })).toBeNull();
    });
});
