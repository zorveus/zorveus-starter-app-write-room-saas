// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../src/App';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const allowance = { remaining: '0', capAmount: '10', currency: 'USD', period: 'monthly', creditMode: 'enforce', overrunPolicy: 'limit_output', periodEnd: null };
function fixture(options: { configured?: boolean; denied?: boolean } = {}) {
  let current = 'a';
  let failRefresh = false;
  const fetcher = vi.fn(async (input: string, init?: RequestInit) => {
    const path = input.replace('/api/', '');
    if (path === 'config') return Response.json({ ready: options.configured ?? true, issues: options.configured === false ? ['Set ZORVEUS_APP_ID on the server, then restart the app.'] : [], demoSignIn: true, base: false, customer: { account: current, name: current === 'a' ? 'Alex Morgan' : 'Sam Rivera', plan: current === 'a' ? 'plus' : 'plus_ultra' } });
    if (path === 'session') { current = JSON.parse(init!.body as string).account; return Response.json({ customer: { account: current, name: current === 'a' ? 'Alex Morgan' : 'Sam Rivera', plan: current === 'a' ? 'plus' : 'plus_ultra' } }); }
    if (path === 'rewrite') {
      if (options.denied) return Response.json({ error: { message: 'Your AI allowance cannot cover this request.', code: 'zorveus_product_user_allowance_insufficient', status: 403 }, activityId: 'rewrite_denied' }, { status: 403 });
      failRefresh = true;
      return Response.json({ text: 'The completed rewrite stays readable.', activityId: 'rewrite_fixture', completionId: 'completion_fixture', finishReason: 'stop' });
    }
    if (failRefresh) return Response.json({ error: { message: 'Refresh service unavailable.', code: 'unavailable', status: 503 } }, { status: 503 });
    if (path === 'allowance') return Response.json({ ...allowance, remaining: current === 'a' ? '0' : '12.34567890123456789' });
    return Response.json({ items: [], hasMore: false, nextCursor: null });
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}
describe('writing workspace', () => {
  it('shows zero honestly and preserves generated text after independent billing refresh failures', async () => {
    fixture(); render(<App />);
    await screen.findByText('A clearer draft. Same voice.');
    await waitFor(() => expect(document.querySelector('.credit-number')?.textContent).toBe('0.00'));
    fireEvent.change(screen.getByLabelText('Your draft'), { target: { value: 'A rough draft.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rewrite text' }));
    await screen.findByText('The completed rewrite stays readable.');
    await screen.findByText(/Allowance unavailable/);
    expect(screen.getByText('The completed rewrite stays readable.')).toBeTruthy();
    expect(screen.getByText(/Activity unavailable/)).toBeTruthy();
  });
  it('switches customers without retaining output, allowance, or Activity from the previous customer', async () => {
    fixture(); render(<App />);
    await screen.findByText('A clearer draft. Same voice.');
    await waitFor(() => expect(document.querySelector('.credit-number')?.textContent).toBe('0.00'));
    fireEvent.change(screen.getByLabelText('Your draft'), { target: { value: 'Only customer A wrote this.' } });
    fireEvent.change(screen.getByLabelText('Demo account'), { target: { value: 'b' } });
    await waitFor(() => expect((screen.getByLabelText('Demo account') as HTMLSelectElement).value).toBe('b'));
    await waitFor(() => expect(document.querySelector('.credit-number')?.textContent).toBe('12.35'));
    expect((screen.getByLabelText('Your draft') as HTMLTextAreaElement).value).toBe('');
    expect(screen.getByText('Plus Ultra')).toBeTruthy();
  });
  it('disables generation when configuration is missing', async () => {
    const fetcher = fixture({ configured: false }); render(<App />);
    await screen.findByText('Connect Zorveus to enable rewrites');
    fireEvent.change(screen.getByLabelText('Your draft'), { target: { value: 'A draft.' } });
    expect((screen.getByRole('button', { name: 'Rewrite text' }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetcher.mock.calls.some(([path]) => path.includes('allowance'))).toBe(false);
  });
  it('shows allowance denial and preserves its API code', async () => {
    fixture({ denied: true }); render(<App />);
    await screen.findByText('A clearer draft. Same voice.');
    fireEvent.change(screen.getByLabelText('Your draft'), { target: { value: 'A draft.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rewrite text' }));
    await screen.findByText(/Your AI allowance cannot cover this request.*zorveus_product_user_allowance_insufficient/);
  });
});

describe('editor interactions', () => {
  it('inserts a sample without generating and supports clearing and restoring the draft', async () => {
    const fetcher = fixture(); render(<App />);
    await screen.findByText('A clearer draft. Same voice.');
    fireEvent.click(screen.getByRole('button', { name: 'Try a sample' }));
    const draft = screen.getByLabelText('Your draft') as HTMLTextAreaElement;
    expect(draft.value).toContain('onboarding process');
    expect(fetcher.mock.calls.some(([path]) => path === '/api/rewrite')).toBe(false);
    const sample = draft.value;
    fireEvent.click(screen.getByRole('button', { name: 'Clear draft' }));
    expect(draft.value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Restore draft' }));
    expect(draft.value).toBe(sample);
    expect(document.activeElement).toBe(draft);
  });
  it('preserves the draft through focus mode and exits with Escape', async () => {
    fixture(); render(<App />);
    await screen.findByText('A clearer draft. Same voice.');
    fireEvent.change(screen.getByLabelText('Your draft'), { target: { value: 'Keep these words.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Focus mode' }));
    expect(screen.getByRole('button', { name: 'Exit focus' }).getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.workspace.is-focused')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Focus mode' }).getAttribute('aria-pressed')).toBe('false');
    expect((screen.getByLabelText('Your draft') as HTMLTextAreaElement).value).toBe('Keep these words.');
  });
  it('sends one chargeable request for repeated shortcut presses while a rewrite is pending', async () => {
    const fetcher = fixture();
    const fallback = fetcher.getMockImplementation()!;
    let resolveRewrite!: (response: Response) => void;
    fetcher.mockImplementation((path, init) => path === '/api/rewrite' ? new Promise(resolve => { resolveRewrite = resolve; }) : fallback(path, init));
    render(<App />);
    await screen.findByText('A clearer draft. Same voice.');
    const draft = screen.getByLabelText('Your draft');
    fireEvent.change(draft, { target: { value: 'My draft.' } });
    fireEvent.keyDown(draft, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(draft, { key: 'Enter', metaKey: true });
    expect(fetcher.mock.calls.filter(([path]) => path === '/api/rewrite')).toHaveLength(1);
    expect(screen.getByText('Finding the right words…')).toBeTruthy();
    resolveRewrite(Response.json({ text: 'Finished.', activityId: 'rewrite_keyboard', completionId: 'completion_keyboard', finishReason: 'stop' }));
    await screen.findByText('Finished.');
  });
  it('uses a completed rewrite as the next draft only on an explicit action', async () => {
    const fetcher = fixture(); render(<App />);
    await screen.findByText('A clearer draft. Same voice.');
    const draft = screen.getByLabelText('Your draft') as HTMLTextAreaElement;
    fireEvent.change(draft, { target: { value: 'Original words.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rewrite text' }));
    await screen.findByText('The completed rewrite stays readable.');
    expect(draft.value).toBe('Original words.');
    fireEvent.click(screen.getByRole('button', { name: 'Use as draft' }));
    expect(draft.value).toBe('The completed rewrite stays readable.');
    expect(document.activeElement).toBe(draft);
    expect(fetcher.mock.calls.filter(([path]) => path === '/api/rewrite')).toHaveLength(1);
  });
  it('copies the rewrite and displays inline confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    fixture(); render(<App />);
    await screen.findByText('A clearer draft. Same voice.');
    fireEvent.change(screen.getByLabelText('Your draft'), { target: { value: 'Original.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rewrite text' }));
    await screen.findByText('The completed rewrite stays readable.');
    fireEvent.click(screen.getByRole('button', { name: 'Copy text' }));
    await screen.findByRole('button', { name: 'Copied' });
    expect(writeText).toHaveBeenCalledWith('The completed rewrite stays readable.');
  });
});
