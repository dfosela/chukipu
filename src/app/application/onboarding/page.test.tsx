import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OnboardingPage from './page';
import { firebaseSet, firebaseGetList } from '@/lib/firebaseMethods';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/lib/firebaseMethods', () => ({
    firebaseSet: vi.fn(),
    firebaseGetList: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
    db: {},
    auth: {
        currentUser: {
            uid: 'user123',
            displayName: 'Ana García',
            photoURL: '',
        },
    },
}));

describe('OnboardingPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(firebaseSet).mockResolvedValue(undefined);
        vi.mocked(firebaseGetList).mockResolvedValue([]);
    });

    it('pre-fills display name from Google account — if this fails, the name field starts empty', async () => {
        await act(async () => { render(<OnboardingPage />); });
        const nameInput = screen.getByPlaceholderText('Tu nombre') as HTMLInputElement;
        expect(nameInput.value).toBe('Ana García');
    });

    it('renders name, username and bio fields', async () => {
        await act(async () => { render(<OnboardingPage />); });
        expect(screen.getByPlaceholderText('Tu nombre')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('tu_usuario')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Descripción (opcional)')).toBeInTheDocument();
    });

    it('shows validation error for invalid username format — if this fails, bad usernames can be saved', async () => {
        await act(async () => { render(<OnboardingPage />); });
        const usernameInput = screen.getByPlaceholderText('tu_usuario');
        fireEvent.change(usernameInput, { target: { value: 'AB' } });
        expect(await screen.findByText(/Solo letras minúsculas/)).toBeInTheDocument();
    });

    it('forces username to lowercase — if this fails, uppercase usernames can be entered', async () => {
        await act(async () => { render(<OnboardingPage />); });
        const usernameInput = screen.getByPlaceholderText('tu_usuario') as HTMLInputElement;
        fireEvent.change(usernameInput, { target: { value: 'AnaGarcia' } });
        expect(usernameInput.value).toBe('anagarcia');
    });

    it('shows error when username is already taken — if this fails, duplicate usernames are allowed', async () => {
        vi.mocked(firebaseGetList).mockResolvedValue([{ id: 'otherUser', username: 'anagarcia' }] as ReturnType<typeof firebaseGetList> extends Promise<infer T> ? T : never);

        await act(async () => { render(<OnboardingPage />); });

        fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
        fireEvent.change(screen.getByPlaceholderText('tu_usuario'), { target: { value: 'anagarcia' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /empezar/i }));
        });

        await waitFor(() => {
            expect(screen.getByText('Este usuario ya está en uso')).toBeInTheDocument();
        });
    });

    it('submit calls firebaseSet with correct profile data — if this fails, profile is not saved', async () => {
        await act(async () => { render(<OnboardingPage />); });

        fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana García' } });
        fireEvent.change(screen.getByPlaceholderText('tu_usuario'), { target: { value: 'anagarcia' } });
        fireEvent.change(screen.getByPlaceholderText('Descripción (opcional)'), { target: { value: 'Me encanta viajar' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /empezar/i }));
        });

        await waitFor(() => {
            expect(firebaseSet).toHaveBeenCalledWith(
                'users/user123',
                expect.objectContaining({
                    displayName: 'Ana García',
                    username: 'anagarcia',
                    bio: 'Me encanta viajar',
                })
            );
        });
    });

    it('redirects to /application after successful submit — if this fails, user stays on onboarding', async () => {
        await act(async () => { render(<OnboardingPage />); });

        fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
        fireEvent.change(screen.getByPlaceholderText('tu_usuario'), { target: { value: 'anagarcia' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /empezar/i }));
        });

        await waitFor(() => {
            expect(mockReplace).toHaveBeenCalledWith('/application');
        });
    });

    it('submit button disabled while username has validation error — if this fails, invalid form can be submitted', async () => {
        await act(async () => { render(<OnboardingPage />); });
        const usernameInput = screen.getByPlaceholderText('tu_usuario');
        fireEvent.change(usernameInput, { target: { value: 'ab' } }); // too short
        const btn = screen.getByRole('button', { name: /empezar/i });
        expect(btn).toBeDisabled();
    });

    it('bio is optional — submitting without bio still saves profile', async () => {
        await act(async () => { render(<OnboardingPage />); });

        fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } });
        fireEvent.change(screen.getByPlaceholderText('tu_usuario'), { target: { value: 'anagarcia' } });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /empezar/i }));
        });

        await waitFor(() => {
            expect(firebaseSet).toHaveBeenCalledWith(
                'users/user123',
                expect.objectContaining({ bio: '' })
            );
        });
    });
});
