import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { Suspense } from 'react';
import EditPlanPage from './page';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseGet, firebaseBatchUpdate, firebaseRemove } from '@/lib/firebaseMethods';

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();
// Stable object — if recreated every render, useEffect([..., router]) loops forever
const mockRouter = { push: mockPush, replace: mockReplace, back: mockBack };

vi.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: () => ({ theme: 'light' }),
}));

vi.mock('@/lib/firebaseMethods', () => ({
    firebaseGet: vi.fn(),
    firebaseUpdate: vi.fn(),
    firebaseRemove: vi.fn(),
    firebaseBatchUpdate: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }));

vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    get: vi.fn(() => Promise.resolve({
        exists: () => true,
        val: () => ({ user123: true }),
    })),
}));

const mockPlan = {
    id: 'plan1',
    chukipuId: 'chuki1',
    title: 'Cena italiana',
    description: '',
    image: '',
    category: 'Comida',
    genre: '',
    duration: '',
    location: 'Roma',
    date: '',
    dateEnd: '',
    completed: false,
    createdBy: 'user123',
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

function renderWithSuspense(ui: React.ReactElement) {
    return render(<Suspense fallback={<div>Loading...</div>}>{ui}</Suspense>);
}

async function openDeleteDialog() {
    // "Eliminar plan" opens the confirmation dialog
    const deleteBtn = await screen.findByText('Eliminar plan');
    await act(async () => { fireEvent.click(deleteBtn); });
    // Wait for dialog
    await screen.findByText('¿Eliminar plan?');
    // Click the "Eliminar" button inside the dialog
    const confirmBtn = screen.getByText('Eliminar');
    await act(async () => { fireEvent.click(confirmBtn); });
}

describe('EditPlanPage — delete', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useAuth).mockReturnValue({
            user: { uid: 'user123' },
            profile: null,
            loading: false,
        } as ReturnType<typeof useAuth>);

        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path.startsWith('plans/')) return { ...mockPlan };
            if (path.startsWith('chukipus/')) return { id: 'chuki1', planCount: 5 };
            return null;
        });

        vi.mocked(firebaseBatchUpdate).mockResolvedValue(undefined);
        vi.mocked(firebaseRemove).mockResolvedValue(undefined);
    });

    it('deleting a plan decrements planCount on the chukipu — if this fails, plan counter will not update', async () => {
        await act(async () => {
            renderWithSuspense(<EditPlanPage params={Promise.resolve({ id: 'chuki1', planId: 'plan1' })} />);
        });

        await openDeleteDialog();

        await waitFor(() => {
            expect(firebaseBatchUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    'plans/plan1': null,
                    'chukipus/chuki1/planCount': 4,
                })
            );
        });
    });

    it('planCount never goes below 0 — if this fails, counter can go negative', async () => {
        vi.mocked(firebaseGet).mockImplementation(async (path: string) => {
            if (path.startsWith('plans/')) return { ...mockPlan };
            if (path.startsWith('chukipus/')) return { id: 'chuki1', planCount: 0 };
            return null;
        });

        await act(async () => {
            renderWithSuspense(<EditPlanPage params={Promise.resolve({ id: 'chuki1', planId: 'plan1' })} />);
        });

        await openDeleteDialog();

        await waitFor(() => {
            expect(firebaseBatchUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    'chukipus/chuki1/planCount': 0,
                })
            );
        });
    });

    it('planMedia is removed after deleting a plan — if this fails, orphaned media stays in Firebase', async () => {
        await act(async () => {
            renderWithSuspense(<EditPlanPage params={Promise.resolve({ id: 'chuki1', planId: 'plan1' })} />);
        });

        await openDeleteDialog();

        await waitFor(() => {
            expect(firebaseRemove).toHaveBeenCalledWith('planMedia/plan1');
        });
    });
});
