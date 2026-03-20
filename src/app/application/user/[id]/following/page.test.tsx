import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { Suspense } from 'react';
import UserFollowingPage from './page';
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
        // eslint-disable-next-line @next/next/no-img-element
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
    followers: [],
    following: ['following1', 'following2'],
    bio: '',
    avatar: '',
};

const mockFollowing1 = {
    id: 'following1',
    displayName: 'Following One',
    username: 'followingone',
    avatar: '',
    bio: '',
    followers: [],
    following: [],
};

const mockFollowing2 = {
    id: 'following2',
    displayName: 'Following Two',
    username: 'followingtwo',
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

describe('UserFollowingPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPush.mockClear();
    });

    it('renders list of following users — if this fails, following list is not displayed', async () => {
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path === 'users/targetUser') return mockUserData;
            if (path === 'users/following1') return mockFollowing1;
            if (path === 'users/following2') return mockFollowing2;
            return null;
        });

        await act(async () => {
            renderWithSuspense(<UserFollowingPage params={Promise.resolve({ id: 'targetUser' })} />);
        });

        expect(await screen.findByText('Following One')).toBeInTheDocument();
        expect(await screen.findByText('Following Two')).toBeInTheDocument();
    });

    it('each following item navigates to their profile when clicked — if this fails, following navigation is broken', async () => {
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path === 'users/targetUser') return mockUserData;
            if (path === 'users/following1') return mockFollowing1;
            if (path === 'users/following2') return mockFollowing2;
            return null;
        });

        await act(async () => {
            renderWithSuspense(<UserFollowingPage params={Promise.resolve({ id: 'targetUser' })} />);
        });

        await screen.findByText('Following One');

        const followingBtn = screen.getByRole('button', { name: /following one/i });
        fireEvent.click(followingBtn);

        expect(mockPush).toHaveBeenCalledWith('/application/user/following1');
    });

    it('shows empty state when not following anyone — if this fails, empty following state is broken', async () => {
        vi.mocked(firebaseGet).mockResolvedValue({
            ...mockUserData,
            following: [],
        });

        await act(async () => {
            renderWithSuspense(<UserFollowingPage params={Promise.resolve({ id: 'targetUser' })} />);
        });

        expect(await screen.findByText('No sigue a nadie')).toBeInTheDocument();
        expect(await screen.findByText('Este usuario aún no sigue a nadie.')).toBeInTheDocument();
    });

    it('does not render any "Dejar de seguir" button (page is read-only) — if this fails, unwanted action buttons appeared', async () => {
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path === 'users/targetUser') return mockUserData;
            if (path === 'users/following1') return mockFollowing1;
            if (path === 'users/following2') return mockFollowing2;
            return null;
        });

        await act(async () => {
            renderWithSuspense(<UserFollowingPage params={Promise.resolve({ id: 'targetUser' })} />);
        });

        await screen.findByText('Following One');

        const dejarBtn = screen.queryByRole('button', { name: /dejar de seguir/i });
        expect(dejarBtn).toBeNull();
    });

    it('shows header with username — if this fails, page title is missing', async () => {
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path === 'users/targetUser') return mockUserData;
            if (path === 'users/following1') return mockFollowing1;
            return null;
        });

        await act(async () => {
            renderWithSuspense(<UserFollowingPage params={Promise.resolve({ id: 'targetUser' })} />);
        });

        expect(await screen.findByText('@targetuser')).toBeInTheDocument();
    });
});
