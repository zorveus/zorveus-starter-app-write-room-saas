// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreditCheckout } from '../src/CreditCheckout';

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('credit purchase interface', () => {
  it('requires confirmation and shows a receipt only after credits are fulfilled', async () => {
    const fulfilled = vi.fn(); const close = vi.fn();
    const order = { id: 'demo_fixture', packId: 'medium', credits: '1000', priceUsd: '10', status: 'pending' };
    const fetcher = vi.fn(async (_input: unknown, init?: RequestInit) => Response.json({ ...order, status: JSON.parse(String(init?.body)).outcome === 'paid' ? 'fulfilled' : 'pending' }));
    vi.stubGlobal('fetch', fetcher);
    render(<CreditCheckout name="Fixture Customer" onClose={close} onFulfilled={fulfilled} />);
    expect(fetcher).not.toHaveBeenCalled();
    expect(screen.getByText(/No real payment is collected/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('button', { name: 'Simulate payment' });
    expect(fulfilled).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Simulate payment' }));
    await screen.findByText('A little more room.');
    expect(fulfilled).toHaveBeenCalledTimes(1);
    expect(screen.getByText('1000.00 credits added for Fixture Customer.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to writing' }));
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('keeps the same order on a grant failure and allows a safe retry', async () => {
    const order = { id: 'demo_retry_fixture', credits: '1000', priceUsd: '10', status: 'pending' };
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(order))
      .mockResolvedValueOnce(Response.json({ error: { message: 'Retry this checkout.', code: 'credit_grant_unconfirmed', status: 502 } }, { status: 502 }))
      .mockResolvedValueOnce(Response.json({ ...order, status: 'fulfilled' }));
    vi.stubGlobal('fetch', fetcher);
    render(<CreditCheckout name="Fixture Customer" onClose={vi.fn()} onFulfilled={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Simulate payment' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Retry same checkout' }));
    await waitFor(() => expect(screen.getByText('A little more room.')).toBeTruthy());
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ orderId: order.id, outcome: 'paid' });
    expect(fetcher.mock.calls[2][1].body).toBe(fetcher.mock.calls[1][1].body);
  });
});
