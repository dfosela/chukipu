import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { Suspense } from 'react';
import UserProfilePage from './page';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseGet, firebaseBatchUpdate } from '@/lib/firebaseMethods';

const mockPush = vi.fn();
const mockReplace = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
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

// Mock firebase/database - onValue calls callback synchronously with empty data
vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    onValue: vi.fn((_ref, cb) => {
        cb({ exists: () => false, val: () => null });
        return vi.fn();
    }),
    get: vi.fn(),
}));

// Mock notifications
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

        vi.mocked(firebaseBatchUpdate).mockResolvedValue(undefined);
    });

    it('renders profile data (username, displayName, follower/following counts) — if this fails, profile info is broken', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        expect(await screen.findByText('anagarcia')).toBeInTheDocument();
        expect(await screen.findByText('Ana García')).toBeInTheDocument();
        expect(await screen.findByText('10')).toBeInTheDocument(); // followersCount
        expect(await screen.findByText('5')).toBeInTheDocument();  // followingCount
    });

    it('Seguidores count button navigates to followers page — if this fails, followers nav is broken', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Ana García');

        const allButtons = screen.getAllByRole('button');
        const segBtn = allButtons.find(btn => btn.textContent?.includes('Seguidores'));
        expect(segBtn).toBeDefined();
        fireEvent.click(segBtn!);

        expect(mockPush).toHaveBeenCalledWith('/application/user/otherUser/followers');
    });

    it('Siguiendo count button navigates to following page — if this fails, following nav is broken', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Ana García');

        const allButtons = screen.getAllByRole('button');
        const siguiendoBtn = allButtons.find(btn => btn.textContent?.includes('Siguiendo'));
        expect(siguiendoBtn).toBeDefined();
        fireEvent.click(siguiendoBtn!);

        expect(mockPush).toHaveBeenCalledWith('/application/user/otherUser/following');
    });

    it('shows "Seguir" button when not following — if this fails, follow button is missing for unfollowed users', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Ana García');

        const followBtn = await screen.findByText('Seguir');
        expect(followBtn).toBeInTheDocument();
    });

    it('shows "Siguiendo" button when already following — if this fails, following state is not shown', async () => {
        const myProfileFollowing = { ...mockMyProfile, following: ['otherUser'] };
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path === 'users/otherUser') return { ...mockProfileData };
            if (path === 'users/currentUser') return myProfileFollowing;
            return null;
        });

        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Ana García');

        // The follow button specifically should say "Siguiendo" (not the stat label)
        // We find the follow button by its class structure: it is inside followBtnWrap
        // Use getAllByText and check at least one matches
        const siguiendoElements = await screen.findAllByText('Siguiendo');
        // At minimum one should be the follow button (not just a stat label)
        expect(siguiendoElements.length).toBeGreaterThan(0);
        // Find the actual follow button - it's a button directly inside followBtnWrap
        const followButton = siguiendoElements.find(el => {
            // The follow button's text is directly its text content
            return el.tagName === 'BUTTON' && el.textContent === 'Siguiendo';
        });
        expect(followButton).toBeDefined();
    });

    it('clicking follow button calls firebaseBatchUpdate — if this fails, follow action is broken', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Ana García');

        const followBtn = await screen.findByText('Seguir');
        await act(async () => {
            fireEvent.click(followBtn);
        });

        await waitFor(() => {
            expect(firebaseBatchUpdate).toHaveBeenCalled();
        });
    });

    it('redirects to own profile page if viewing own profile', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'currentUser' })} />);
        });

        await waitFor(() => {
            expect(mockReplace).toHaveBeenCalledWith('/application/profile');
        });
    });

    it('shows empty plans grid message when user has no plans', async () => {
        await act(async () => {
            renderWithSuspense(<UserProfilePage params={Promise.resolve({ id: 'otherUser' })} />);
        });

        await screen.findByText('Ana García');

        // The plans loading depends on onValue — our mock returns empty data
        expect(await screen.findByText('Sin planes publicados')).toBeInTheDocument();
    });
});
