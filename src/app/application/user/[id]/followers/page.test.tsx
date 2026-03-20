import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { Suspense } from 'react';
import UserFollowersPage from './page';
import { firebaseGet } from '@/lib/firebaseMethods';

const mockPush = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: vi.fn(),
        back: vi.fn(),
    }),
}));

// Mock next/image
vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => {
        return <img {...props} alt={props.alt as string} />;
    },
}));

// Mock Firebase Methods
vi.mock('@/lib/firebaseMethods', () => ({
    firebaseGet: vi.fn(),
}));

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
    db: {},
    auth: {},
}));

const mockUserData = {
    id: 'targetUser',
    username: 'targetuser',
    displayName: 'Target User',
    followers: ['follower1', 'follower2'],
    following: [],
    bio: '',
    avatar: '',
};

const mockFollower1 = {
    id: 'follower1',
    displayName: 'Follower One',
    username: 'followerone',
    avatar: '',
    bio: '',
    followers: [],
    following: [],
};

const mockFollower2 = {
    id: 'follower2',
    displayName: 'Follower Two',
    username: 'followertwo',
    avatar: '',
    bio: '',
    followers: [],
    following: [],
};

function renderWithSuspense(ui: React.ReactElement) {
    return render(
        <Suspense fallback={<div>Loading...</div>}>
            {ui}
        </Suspense>
    );
}

describe('UserFollowersPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPush.mockClear();
    });

    it('renders list of followers — if this fails, followers are not displayed', async () => {
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path === 'users/targetUser') return mockUserData;
            if (path === 'users/follower1') return mockFollower1;
            if (path === 'users/follower2') return mockFollower2;
            return null;
        });

        await act(async () => {
            renderWithSuspense(<UserFollowersPage params={Promise.resolve({ id: 'targetUser' })} />);
        });

        expect(await screen.findByText('Follower One')).toBeInTheDocument();
        expect(await screen.findByText('Follower Two')).toBeInTheDocument();
    });

    it('each follower item navigates to their profile when clicked — if this fails, follower navigation is broken', async () => {
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path === 'users/targetUser') return mockUserData;
            if (path === 'users/follower1') return mockFollower1;
            if (path === 'users/follower2') return mockFollower2;
            return null;
        });

        await act(async () => {
            renderWithSuspense(<UserFollowersPage params={Promise.resolve({ id: 'targetUser' })} />);
        });

        await screen.findByText('Follower One');

        const followerBtn = screen.getByRole('button', { name: /follower one/i });
        fireEvent.click(followerBtn);

        expect(mockPush).toHaveBeenCalledWith('/application/user/follower1');
    });

    it('shows empty state when no followers — if this fails, empty followers state is broken', async () => {
        vi.mocked(firebaseGet).mockResolvedValue({
            ...mockUserData,
            followers: [],
        });

        await act(async () => {
            renderWithSuspense(<UserFollowersPage params={Promise.resolve({ id: 'targetUser' })} />);
        });

        expect(await screen.findByText('Sin seguidores')).toBeInTheDocument();
        expect(await screen.findByText('Aún nadie sigue a este usuario.')).toBeInTheDocument();
    });

    it('does not render any "Quitar" button (page is read-only) — if this fails, unwanted action buttons appeared', async () => {
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path === 'users/targetUser') return mockUserData;
            if (path === 'users/follower1') return mockFollower1;
            if (path === 'users/follower2') return mockFollower2;
            return null;
        });

        await act(async () => {
            renderWithSuspense(<UserFollowersPage params={Promise.resolve({ id: 'targetUser' })} />);
        });

        await screen.findByText('Follower One');

        const quitarBtn = screen.queryByRole('button', { name: /quitar/i });
        expect(quitarBtn).toBeNull();
    });

    it('shows header with username — if this fails, page title is missing', async () => {
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path === 'users/targetUser') return mockUserData;
            if (path === 'users/follower1') return mockFollower1;
            return null;
        });

        await act(async () => {
            renderWithSuspense(<UserFollowersPage params={Promise.resolve({ id: 'targetUser' })} />);
        });

        expect(await screen.findByText('@targetuser')).toBeInTheDocument();
    });
});
