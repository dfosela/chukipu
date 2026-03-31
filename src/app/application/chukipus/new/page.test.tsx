import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React, { Suspense } from 'react';
import NewChukipuTypePage from './page';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, back: vi.fn() }),
}));

function renderWithSuspense(ui: React.ReactElement) {
    return render(
        <Suspense fallback={<div>Loading...</div>}>
            {ui}
        </Suspense>
    );
}

describe('NewChukipuTypePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders both type options', async () => {
        renderWithSuspense(<NewChukipuTypePage params={Promise.resolve({ id: 'chuki1' })} />);
        expect(await screen.findByText('Compartido')).toBeInTheDocument();
        expect(await screen.findByText('Solo para ti')).toBeInTheDocument();
    });

    it('clicking Compartido navigates to create without private flag', async () => {
        renderWithSuspense(<NewChukipuTypePage params={Promise.resolve({ id: 'chuki1' })} />);
        const btn = await screen.findByText('Compartido');
        fireEvent.click(btn.closest('button')!);
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/create'));
        expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('private=1'));
    });

    it('clicking Solo para ti navigates to create with private=1', async () => {
        renderWithSuspense(<NewChukipuTypePage params={Promise.resolve({ id: 'chuki1' })} />);
        const btn = await screen.findByText('Solo para ti');
        fireEvent.click(btn.closest('button')!);
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('private=1'));
    });
});
