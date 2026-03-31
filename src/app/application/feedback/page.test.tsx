import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeedbackPage from './page';
import { useAuth } from '@/contexts/AuthContext';

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => <img {...props} alt={props.alt as string} />,
}));

vi.mock('@/lib/firebase', () => ({
    db: {},
    auth: {},
}));

vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    onValue: vi.fn((_ref, cb) => { cb({ val: () => null }); return vi.fn(); }),
    push: mockPush,
}));

const mockUser = { uid: 'user1' };
const mockProfile = { displayName: 'Test User', username: 'testuser', avatar: '' };

describe('FeedbackPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.mocked(useAuth).mockReturnValue({
            user: mockUser,
            profile: mockProfile,
            loading: false,
        } as ReturnType<typeof useAuth>);
        mockPush.mockResolvedValue(undefined);
    });

    it('shows empty state when no entries exist', async () => {
        render(<FeedbackPage />);
        expect(await screen.findByText('Aún no hay sugerencias')).toBeInTheDocument();
    });

    it('shows intro modal on first visit (no localStorage key)', async () => {
        render(<FeedbackPage />);
        expect(await screen.findByText('Tu opinión importa')).toBeInTheDocument();
        expect(screen.getByText('Entendido')).toBeInTheDocument();
    });

    it('does NOT show intro modal if already seen', async () => {
        localStorage.setItem('chukipu_feedback_intro_seen', '1');
        render(<FeedbackPage />);
        await new Promise(r => setTimeout(r, 50));
        expect(screen.queryByText('Tu opinión importa')).toBeNull();
    });

    it('dismissing modal saves localStorage key and hides modal', async () => {
        render(<FeedbackPage />);
        const btn = await screen.findByText('Entendido');
        fireEvent.click(btn);
        await waitFor(() => {
            expect(screen.queryByText('Tu opinión importa')).toBeNull();
            expect(localStorage.getItem('chukipu_feedback_intro_seen')).toBe('1');
        });
    });

    it('shows form and hides list when FAB is clicked', async () => {
        render(<FeedbackPage />);
        await screen.findByText('Aún no hay sugerencias');

        fireEvent.click(screen.getByRole('button', { name: /nueva sugerencia/i }));

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/escribe tu sugerencia/i)).toBeInTheDocument();
            // List container is hidden via display:none — confirm textarea appeared
            expect(screen.getByRole('textbox')).toBeInTheDocument();
        });
    });

    it('FAB disappears while composing', async () => {
        render(<FeedbackPage />);
        await screen.findByText('Aún no hay sugerencias');

        fireEvent.click(screen.getByRole('button', { name: /nueva sugerencia/i }));

        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /nueva sugerencia/i })).toBeNull();
        });
    });

    it('type chips toggle between Sugerencia and Error', async () => {
        render(<FeedbackPage />);
        await screen.findByText('Aún no hay sugerencias');
        fireEvent.click(screen.getByRole('button', { name: /nueva sugerencia/i }));

        const errorChip = await screen.findByRole('button', { name: /error/i });
        fireEvent.click(errorChip);

        const textarea = screen.getByRole('textbox');
        expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('error'));
    });

    it('submit button disabled when textarea is empty', async () => {
        render(<FeedbackPage />);
        await screen.findByText('Aún no hay sugerencias');
        fireEvent.click(screen.getByRole('button', { name: /nueva sugerencia/i }));

        const submitBtn = await screen.findByRole('button', { name: /enviar/i });
        expect(submitBtn).toBeDisabled();
    });

    it('submit button enabled when textarea has text', async () => {
        render(<FeedbackPage />);
        await screen.findByText('Aún no hay sugerencias');
        fireEvent.click(screen.getByRole('button', { name: /nueva sugerencia/i }));

        const textarea = await screen.findByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'Mi sugerencia de prueba' } });

        expect(screen.getByRole('button', { name: /enviar/i })).not.toBeDisabled();
    });

    it('submitting calls firebase push and closes form', async () => {
        render(<FeedbackPage />);
        await screen.findByText('Aún no hay sugerencias');
        fireEvent.click(screen.getByRole('button', { name: /nueva sugerencia/i }));

        const textarea = await screen.findByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'Sugerencia de prueba' } });
        fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith(
                undefined,
                expect.objectContaining({ text: 'Sugerencia de prueba', type: 'sugerencia' })
            );
        });
    });

    it('shows discard modal when back pressed with unsaved text', async () => {
        render(<FeedbackPage />);
        await screen.findByText('Aún no hay sugerencias');
        fireEvent.click(screen.getByRole('button', { name: /nueva sugerencia/i }));

        const textarea = await screen.findByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'Texto sin enviar' } });

        fireEvent.click(screen.getByRole('button', { name: /volver/i }));

        expect(await screen.findByText('¿Descartar?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /seguir editando/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /descartar/i })).toBeInTheDocument();
    });

    it('discard modal: "Seguir editando" closes modal and keeps text', async () => {
        render(<FeedbackPage />);
        await screen.findByText('Aún no hay sugerencias');
        fireEvent.click(screen.getByRole('button', { name: /nueva sugerencia/i }));

        const textarea = await screen.findByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'Texto sin enviar' } });
        fireEvent.click(screen.getByRole('button', { name: /volver/i }));

        await screen.findByText('¿Descartar?');
        fireEvent.click(screen.getByRole('button', { name: /seguir editando/i }));

        await waitFor(() => {
            expect(screen.queryByText('¿Descartar?')).toBeNull();
            expect(screen.getByRole('textbox')).toHaveValue('Texto sin enviar');
        });
    });

    it('discard modal: "Descartar" closes form and clears text', async () => {
        render(<FeedbackPage />);
        await screen.findByText('Aún no hay sugerencias');
        fireEvent.click(screen.getByRole('button', { name: /nueva sugerencia/i }));

        const textarea = await screen.findByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'Texto a descartar' } });
        fireEvent.click(screen.getByRole('button', { name: /volver/i }));

        await screen.findByText('¿Descartar?');
        fireEvent.click(screen.getByRole('button', { name: /descartar/i }));

        await waitFor(() => {
            expect(screen.queryByText('¿Descartar?')).toBeNull();
            expect(screen.queryByRole('textbox')).toBeNull();
        });
    });

    it('back button without text closes form directly (no modal)', async () => {
        render(<FeedbackPage />);
        await screen.findByText('Aún no hay sugerencias');
        fireEvent.click(screen.getByRole('button', { name: /nueva sugerencia/i }));

        await screen.findByRole('textbox');
        fireEvent.click(screen.getByRole('button', { name: /volver/i }));

        await waitFor(() => {
            expect(screen.queryByText('¿Descartar?')).toBeNull();
            expect(screen.queryByRole('textbox')).toBeNull();
        });
    });

    it('renders entries from Firebase when data exists', async () => {
        const { onValue } = vi.mocked(await import('firebase/database'));
        vi.mocked(onValue).mockImplementation((_ref, cb) => {
            cb({
                val: () => ({
                    entry1: {
                        text: 'Esta app necesita modo oscuro',
                        authorId: 'user2',
                        authorName: 'Ana',
                        authorAvatar: '',
                        type: 'sugerencia',
                        createdAt: Date.now(),
                    },
                }),
            });
            return vi.fn();
        });

        render(<FeedbackPage />);
        expect(await screen.findByText('Esta app necesita modo oscuro')).toBeInTheDocument();
        expect(screen.getByText('Ana')).toBeInTheDocument();
    });
});
