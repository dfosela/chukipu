import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { Suspense } from 'react';
import ChukipuDetailPage from './page';
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
    });

    it('renders plan title and category — if this fails, plan cards are not rendering', async () => {
        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        expect(await screen.findByText('Movie Night')).toBeInTheDocument();
        expect(await screen.findByText('Cartelera')).toBeInTheDocument();
    });

    it('renders like button for all users (not just creators) — if this fails, non-creators cannot like', async () => {
        // user123 is NOT the creator (creator123 is)
        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');

        const likeBtn = screen.getByRole('button', { name: /dar like/i });
        expect(likeBtn).toBeInTheDocument();
    });

    it('clicking like button calls firebaseUpdate with correct path and data', async () => {
        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');

        const likeBtn = screen.getByRole('button', { name: /dar like/i });
        fireEvent.click(likeBtn);

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

    it('optimistic update: like count updates immediately in UI before Firebase responds', async () => {
        // Make firebaseUpdate slow so we can check the optimistic update
        vi.mocked(firebaseUpdate).mockImplementation(() => new Promise(res => setTimeout(res, 1000)));

        // Use a plan with 0 likes so after clicking it becomes 1
        const zeroLikesPlan = { ...mockPlan, likes: [], likesCount: 0 };
        vi.mocked(firebaseGetList).mockResolvedValue([zeroLikesPlan]);

        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');

        // Before liking: the like button should have no count badge
        const likeBtnBefore = screen.getByRole('button', { name: /dar like/i });
        const countSpanBefore = likeBtnBefore.querySelector('span');
        expect(countSpanBefore).toBeNull();

        fireEvent.click(likeBtnBefore);

        // Should immediately show count of 1 before Firebase resolves (optimistic update)
        await waitFor(() => {
            // The like button should now contain a span with "1"
            const likeBtnAfter = screen.getByRole('button', { name: /quitar like/i });
            const countSpanAfter = likeBtnAfter.querySelector('span');
            expect(countSpanAfter).not.toBeNull();
            expect(countSpanAfter?.textContent).toBe('1');
        });
    });

    it('clicking like on already-liked plan removes the like (toggle behavior)', async () => {
        const likedPlan = {
            ...mockPlan,
            likes: ['user123'],
            likesCount: 1,
        };
        vi.mocked(firebaseGetList).mockResolvedValue([likedPlan]);

        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');

        const unlikeBtn = screen.getByRole('button', { name: /quitar like/i });
        fireEvent.click(unlikeBtn);

        await waitFor(() => {
            expect(firebaseUpdate).toHaveBeenCalledWith(
                'plans/plan1',
                expect.objectContaining({
                    likes: [],
                    likesCount: 0,
                })
            );
        });
    });

    it('pin button renders for all members — if this fails, members cannot pin plans', async () => {
        // user123 is NOT the creator but IS a member
        const unpinnedPlan = { ...mockPlan, showInProfile: false };
        vi.mocked(firebaseGetList).mockResolvedValue([unpinnedPlan]);

        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');

        const pinBtn = screen.getByRole('button', { name: /fijar en el perfil/i });
        expect(pinBtn).toBeInTheDocument();
    });

    it('pin button does not render for non-members — if this fails, outsiders can pin plans', async () => {
        // outsider999 is not in the members list
        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'outsider999' },
            loading: false,
        } as ReturnType<typeof useAuth>);

        const unpinnedPlan = { ...mockPlan, showInProfile: false };
        vi.mocked(firebaseGetList).mockResolvedValue([unpinnedPlan]);

        await act(async () => {
            renderWithSuspense(<ChukipuDetailPage params={Promise.resolve({ id: 'chuki1' })} />);
        });

        await screen.findByText('Movie Night');

        const pinBtn = screen.queryByRole('button', { name: /fijar en el perfil/i });
        expect(pinBtn).toBeNull();
    });
});
