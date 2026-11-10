import { describe, expect, it, vi } from 'vitest';
import { ZorveusError } from '@zorveus/sdk';
import { createApi } from '../server/api';
import { readConfig } from '../server/config';
import type { Billing } from '../server/zorveus';

const environment = {
  ZORVEUS_APP_ID: 'app_test', ZORVEUS_SERVICE_KEY: 'service-secret-sentinel', ZORVEUS_PLUS_INFERENCE_KEY: 'plus-secret-sentinel', ZORVEUS_PLUS_ULTRA_INFERENCE_KEY: 'ultra-secret-sentinel',
};
const balance = { remaining: '0', capAmount: '10', currency: 'USD', period: 'monthly', periodEnd: null, creditMode: 'enforce', overrunPolicy: 'limit_output' };
const page = { items: [], nextCursor: null, hasMore: false };
function fixture(development = true) {
  const billing = {
    allowance: vi.fn<Billing['allowance']>().mockResolvedValue(balance),
    activity: vi.fn<Billing['activity']>().mockResolvedValue(page),
    rewrite: vi.fn<Billing['rewrite']>().mockImplementation(async (_id, _text, activityId) => ({ text: 'Clearer text.', activityId, completionId: 'completion_test', finishReason: 'stop' })),
  };
  const api = createApi(readConfig(environment), billing, development);
  const call = (path: string, options: { cookie?: string; body?: unknown; origin?: string } = {}) => api(new Request(`http://localhost:3000/api/${path}`, {
    method: options.body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Origin: options.origin ?? 'http://localhost:3000', ...(options.cookie ? { Cookie: options.cookie } : {}) },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  }));
  const login = async (account: string) => {
    const response = await call('session', { body: { account } });
    return response.headers.get('set-cookie')!.split(';')[0];
  };
  return { billing, api, call, login };
}

describe('trusted customer routes', () => {
  it('keeps configuration read-only, secret-free, and generation disabled when incomplete', async () => {
    const billing = fixture().billing;
    const api = createApi(readConfig({}), billing, true);
    const response = await api(new Request('http://localhost/api/config'));
    const data = await response.json();
    expect(data.ready).toBe(false);
    expect(data.issues.join(' ')).toContain('ZORVEUS_SERVICE_KEY');
    expect(billing.allowance).not.toHaveBeenCalled();
    const signIn = await api(new Request('http://localhost/api/session', { method: 'POST', headers: { Origin: 'http://localhost' }, body: JSON.stringify({ account: 'a' }) }));
    const denied = await api(new Request('http://localhost/api/rewrite', { method: 'POST', headers: { Origin: 'http://localhost', Cookie: signIn.headers.get('set-cookie')! }, body: JSON.stringify({ text: 'Hi' }) }));
    expect(denied.status).toBe(503);
    expect(billing.rewrite).not.toHaveBeenCalled();
  });
  it('requires server-generated sessions and rejects forged cookies', async () => {
    const { call, billing } = fixture();
    for (const path of ['allowance', 'activity']) expect((await call(path, { cookie: 'write_room_session=a' })).status).toBe(401);
    expect(billing.allowance).not.toHaveBeenCalled();
  });
  it('assigns Plus and Plus Ultra on the server and isolates all three operations', async () => {
    const { call, login, billing } = fixture();
    for (const [account, id, plan] of [['a', 'write-room-demo-a', 'plus'], ['b', 'write-room-demo-b', 'plus_ultra']]) {
      const cookie = await login(account);
      const config = await (await call('config', { cookie })).json();
      expect(config.customer.plan).toBe(plan);
      expect((await call('allowance?externalUserId=other&plan=premium&inferenceKey=other&keyAlias=other', { cookie })).status).toBe(200);
      expect(billing.allowance).toHaveBeenLastCalledWith(id, plan);
      await call('activity?externalUserId=other&cursor=opaque%2F%2B%3D', { cookie });
      expect(billing.activity).toHaveBeenLastCalledWith(id, 'opaque/+=');
      const result = await (await call('rewrite', { cookie, body: { text: 'My draft', externalUserId: 'other', plan: 'premium', model: 'other', inferenceKey: 'other', allowance: '999', keyAlias: plan === 'plus' ? 'plus_ultra' : 'plus' } })).json();
      expect(billing.rewrite).toHaveBeenLastCalledWith(id, 'My draft', result.activityId, plan);
      expect(result.activityId).toMatch(/^rewrite_/);
      expect(JSON.stringify(result)).not.toContain('secret-sentinel');
    }
  });
  it('invalidates the old session when switching customers and logging out', async () => {
    const { call, login } = fixture();
    const cookie = await login('a');
    const switched = await call('session', { cookie, body: { account: 'b' } });
    expect((await call('allowance', { cookie })).status).toBe(401);
    const nextCookie = switched.headers.get('set-cookie')!.split(';')[0];
    await call('logout', { cookie: nextCookie, body: {} });
    expect((await call('allowance', { cookie: nextCookie })).status).toBe(401);
  });
  it('disables demo sign-in outside development', async () => {
    expect((await fixture(false).call('session', { body: { account: 'a' } })).status).toBe(403);
  });
  it('rejects cross-origin mutations and invalid text before any inference', async () => {
    const { call, login, billing } = fixture();
    expect((await call('session', { body: { account: 'a' }, origin: 'https://other.test' })).status).toBe(403);
    const cookie = await login('a');
    for (const text of ['', ' ', 'x'.repeat(6001), 42, null]) expect((await call('rewrite', { cookie, body: { text } })).status).toBe(400);
    expect(billing.rewrite).not.toHaveBeenCalled();
  });
  it('preserves allowance denial codes without leaking upstream text, headers, or credentials', async () => {
    const { call, login, billing } = fixture();
    billing.rewrite.mockRejectedValue(new ZorveusError('secret-sentinel', { status: 403, code: 'zorveus_product_user_allowance_insufficient', rawBody: environment, headers: { authorization: 'secret-sentinel' } }));
    const response = await call('rewrite', { cookie: await login('a'), body: { text: 'Draft' } });
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error.code).toBe('zorveus_product_user_allowance_insufficient');
    expect(data.error.message).toContain('allowance');
    expect(data.activityId).toMatch(/^rewrite_/);
    expect(JSON.stringify(data)).not.toContain('secret-sentinel');
    expect(billing.rewrite).toHaveBeenCalledTimes(1);
  });
  it('preserves independent service failures and permits a later manual read', async () => {
    const { call, login, billing } = fixture();
    const cookie = await login('a');
    billing.allowance.mockRejectedValueOnce(new ZorveusError('denied', { status: 403, code: 'permission_denied' }));
    expect((await call('allowance', { cookie })).status).toBe(403);
    expect((await call('activity', { cookie })).status).toBe(200);
    expect((await (await call('allowance', { cookie })).json()).remaining).toBe('0');
  });
  it('does not retry ambiguous generation results and prevents concurrent rewrites', async () => {
    const { call, login, billing } = fixture();
    const cookie = await login('a');
    let reject!: (reason: unknown) => void;
    billing.rewrite.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    const first = call('rewrite', { cookie, body: { text: 'Draft' } });
    await vi.waitFor(() => expect(billing.rewrite).toHaveBeenCalledTimes(1));
    expect((await call('rewrite', { cookie, body: { text: 'Draft' } })).status).toBe(409);
    reject(new Error('timeout'));
    expect((await first).status).toBe(502);
    expect(billing.rewrite).toHaveBeenCalledTimes(1);
  });
});

it('explains organization funding rejection separately from customer allowance exhaustion', async () => {
  const { call, login, billing } = fixture();
  billing.rewrite.mockRejectedValue(new ZorveusError('private upstream details', { status: 402, code: 'zorveus_reservation_insufficient_balance' }));
  const response = await call('rewrite', { cookie: await login('a'), body: { text: 'Draft' } });
  const data = await response.json();
  expect(response.status).toBe(402);
  expect(data.error.code).toBe('zorveus_reservation_insufficient_balance');
  expect(data.error.message).toContain('organization has insufficient funded balance');
  expect(data.error.message).toContain('Customer plan credits do not fund the organization');
  expect(JSON.stringify(data)).not.toContain('private upstream details');
  expect(billing.rewrite).toHaveBeenCalledTimes(1);
});
