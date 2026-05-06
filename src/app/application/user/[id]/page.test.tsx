import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { Suspense } from 'react';
import UserProfilePage from './page';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseGet, firebaseUpdate, firebaseBatchUpdate } from '@/lib/firebaseMethods';

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
        back: vi.fn(),
    }),
}));

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: () => ({ theme: 'light' }),
}));

vi.mock('@/components/BottomNav/BottomNav', () => ({
    default: () => <div data-testid="bottom-nav">BottomNav</div>,
}));

vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => {
        // eslint-disable-next-line @next/next/no-img-element
        return <img {...props} alt={props.alt as string} />;
    },
}));

vi.mock('@/lib/firebaseMethods', () => ({
    firebaseGet: vi.fn(),
    firebaseGetList: vi.fn(),
    firebaseUpdate: vi.fn(),
    firebaseBatchUpdate: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
    db: {},
    auth: {},
}));

vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    onValue: vi.fn((_ref, cb) => {
        cb({ exists: () => false, val: () => null });
        return vi.fn();
    }),
    get: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
    sendNotification: vi.fn(),
}));

const mockProfileData = {
    id: 'otherUser',
    displayName: 'Ana García',
    username: 'anagarcia',
    bio: 'Me encantan los planes',
    avatar: '',
    isPrivate: false,
    savedChukipus: [],
    followers: [],
    following: [],
    followersCount: 10,
    followingCount: 5,
    chukipusCount: 3,
    plansCreated: 8,
    plansCompleted: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

const mockMyProfile = {
    id: 'currentUser',
    displayName: 'Juan Doe',
    username: 'juandoe',
    bio: '',
    avatar: '',
    isPrivate: false,
    savedChukipus: [],
    followers: [],
    following: [],
    followersCount: 0,
    followingCount: 0,
    chukipusCount: 0,
    plansCreated: 0,
    plansCompleted: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

function renderWithSuspense(ui: React.ReactElement) {
    return render(
        <Suspense fallback={<div>Loading...</div>}>
            {ui}
        </Suspense>
    );
}

describe('UserProfilePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPush.mockClear();
        mockReplace.mockClear();

        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'currentUser' },
            profile: mockMyProfile,
            loading: false,
            refreshProfile: vi.fn(),
        } as ReturnType<typeof useAuth>);

        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path === 'users/otherUser') return { ...mockProfileData };
            if (path === 'users/currentUser') return { ...mockMyProfile };
            return null;
        });

        vi.mocked(firebaseUpdate).mockResolvedValue(undefined);
        vi.mocked(firebaseBatchUpdate).mockResolvedValue(undefined);
    });

    it('renders profile data (username, displayName, follower/following counts) — if this fails, profile info is broken', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        expect(await screen.findByText('anagarcia')).toBeInTheDocument();
        expect(await screen.findByText('Ana García')).toBeInTheDocument();
        expect(await screen.findByText('10')).toBeInTheDocument();
        expect(await screen.findByText('5')).toBeInTheDocument();
    });

    it('shows "Seguir" button when not following — if this fails, follow button is missing', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        expect(await screen.findByText('Seguir')).toBeInTheDocument();
    });

    it('shows "Siguiendo" button when already following — if this fails, following state is not shown', async () => {
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path === 'users/otherUser') return { ...mockProfileData };
            if (path === 'users/currentUser') return { ...mockMyProfile, following: ['otherUser'] };
            return null;
        });

        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Ana García');

        const followButton = (await screen.findAllByText('Siguiendo')).find(
            el => el.tagName === 'BUTTON' && el.textContent === 'Siguiendo'
        );
        expect(followButton).toBeDefined();
    });

    it('clicking "Seguir" changes button to "Siguiendo" — if this fails, follow action does not update the UI', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Seguir');

        await act(async () => {
            fireEvent.click(screen.getByText('Seguir'));
        });

        await waitFor(() => {
            const followButton = screen.getAllByText('Siguiendo').find(
                el => el.tagName === 'BUTTON' && el.textContent === 'Siguiendo'
            );
            expect(followButton).toBeDefined();
        });
    });

    it('follow action writes own following and other followers correctly — if this fails, follow writes wrong data to Firebase', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Seguir');

        await act(async () => {
            fireEvent.click(screen.getByText('Seguir'));
        });

        await waitFor(() => {
            // Current user's following is written with firebaseUpdate (includes updatedAt — own record)
            expect(firebaseUpdate).toHaveBeenCalledWith(
                'users/currentUser',
                expect.objectContaining({ following: ['otherUser'], followingCount: 1 })
            );
            // Other user's followers is written with firebaseBatchUpdate (no updatedAt — avoids permission error)
            expect(firebaseBatchUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    'users/otherUser/followers': ['currentUser'],
                    'users/otherUser/followersCount': 1,
                })
            );
        });
    });

    it('shows error message when follow fails — if this fails, errors are silently swallowed', async () => {
        vi.mocked(firebaseUpdate).mockRejectedValue(new Error('PERMISSION_DENIED'));
        vi.mocked(firebaseBatchUpdate).mockRejectedValue(new Error('PERMISSION_DENIED'));

        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Seguir');

        await act(async () => {
            fireEvent.click(screen.getByText('Seguir'));
        });

        await waitFor(() => {
            expect(screen.getByText(/No se pudo completar la acción/)).toBeInTheDocument();
        });

        // Button should still say "Seguir" (not stuck in loading or changed to Siguiendo)
        expect(screen.getByText('Seguir')).toBeInTheDocument();
    });

    it('Seguidores count button navigates to followers page — if this fails, followers nav is broken', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Ana García');

        const segBtn = screen.getAllByRole('button').find(btn => btn.textContent?.includes('Seguidores'));
        expect(segBtn).toBeDefined();
        fireEvent.click(segBtn!);

        expect(mockPush).toHaveBeenCalledWith('/application/user/otherUser/followers');
    });

    it('Siguiendo count button navigates to following page — if this fails, following nav is broken', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Ana García');

        const siguiendoBtn = screen.getAllByRole('button').find(btn => btn.textContent?.includes('Siguiendo'));
        expect(siguiendoBtn).toBeDefined();
        fireEvent.click(siguiendoBtn!);

        expect(mockPush).toHaveBeenCalledWith('/application/user/otherUser/following');
    });

    it('redirects to own profile page if viewing own profile — if this fails, self-view redirect is broken', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'currentUser' })} />);
        });

        await waitFor(() => {
            expect(mockReplace).toHaveBeenCalledWith('/application/profile');
        });
    });

    it('shows empty plans grid when user has no plans — if this fails, empty state UI is broken', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Ana García');
        expect(await screen.findByText('Sin planes publicados')).toBeInTheDocument();
    });
});
