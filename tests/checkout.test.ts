import { describe, expect, it, vi } from 'vitest';
import { createDemoCheckout } from '../server/demo-checkout';
import { createApi } from '../server/api';
import { readConfig } from '../server/config';
import { createBilling, type Billing } from '../server/zorveus';

function fixture() {
  const billing: Billing = {
    grantCredits: vi.fn<Billing['grantCredits']>().mockResolvedValue(undefined),
    allowance: vi.fn(), activity: vi.fn(), rewrite: vi.fn(),
  };
  return { billing, checkout: createDemoCheckout(billing) };
}
describe('demo checkout', () => {
  it('grants the server-priced pack only after confirmation and deduplicates confirmation', async () => {
    const { checkout, billing } = fixture();
    const order = checkout.create('fixture-customer', 'small');
    expect(order).toMatchObject({ credits: '500', priceUsd: '5', status: 'pending' });
    expect(billing.grantCredits).not.toHaveBeenCalled();
    await expect(checkout.confirm('another-customer', order.id, 'paid')).rejects.toMatchObject({ status: 404 });
    expect(billing.grantCredits).not.toHaveBeenCalled();
    expect((await checkout.confirm('fixture-customer', order.id, 'paid')).status).toBe('fulfilled');
    await checkout.confirm('fixture-customer', order.id, 'paid');
    expect(billing.grantCredits).toHaveBeenCalledExactlyOnceWith('fixture-customer', '5', order.id);
  });
  it('does not grant on decline, invalid packs or invalid payment outcomes', async () => {
    const { checkout, billing } = fixture();
    expect(() => checkout.create('fixture', 'free-unlimited')).toThrow('Choose a credit pack.');
    const order = checkout.create('fixture', 'medium');
    await expect(checkout.confirm('fixture', order.id, 'unverified')).rejects.toMatchObject({ status: 400 });
    expect((await checkout.confirm('fixture', order.id, 'declined')).status).toBe('declined');
    await checkout.confirm('fixture', order.id, 'paid');
    expect(billing.grantCredits).not.toHaveBeenCalled();
  });
  it('retries an uncertain grant with the same reference and prevents simultaneous grants', async () => {
    const { checkout, billing } = fixture();
    let reject!: (error: Error) => void;
    vi.mocked(billing.grantCredits).mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    const order = checkout.create('fixture', 'large');
    const pending = checkout.confirm('fixture', order.id, 'paid');
    await expect(checkout.confirm('fixture', order.id, 'paid')).rejects.toMatchObject({ status: 409 });
    reject(new Error('uncertain response'));
    await expect(pending).rejects.toThrow('uncertain response');
    await expect(checkout.confirm('fixture', order.id, 'declined')).rejects.toMatchObject({ code: 'confirmation_started' });
    expect((await checkout.confirm('fixture', order.id, 'paid')).status).toBe('fulfilled');
    expect(vi.mocked(billing.grantCredits).mock.calls).toEqual([['fixture', '25', order.id], ['fixture', '25', order.id]]);
  });
  it('binds checkout to the session, ignores supplied amounts and disables it in production', async () => {
    const { billing } = fixture();
    const config = readConfig({ ZORVEUS_APP_ID: 'app_fixture', ZORVEUS_SERVICE_KEY: 'service_fixture', ZORVEUS_PLUS_INFERENCE_KEY: 'plus_fixture', ZORVEUS_PLUS_ULTRA_INFERENCE_KEY: 'ultra_fixture' });
    for (const development of [true, false]) {
      const api = createApi(config, billing, development);
      const req = (path: string, body: unknown, cookie = '', origin = 'http://localhost') => api(new Request(`http://localhost/api/${path}`, { method: 'POST', headers: { Origin: origin, Cookie: cookie }, body: JSON.stringify(body) }));
      expect((await req('demo-checkout', { packId: 'small' })).status).toBe(401);
      // Production never exposes sign-in or a payment route to unauthenticated users.
      if (!development) { expect((await req('session', { account: 'a' })).status).toBe(403); continue; }
      const login = await req('session', { account: 'a' });
      const cookie = login.headers.get('set-cookie')!.split(';')[0];
      expect((await req('demo-checkout', { packId: 'small' }, cookie, 'https://other.test')).status).toBe(403);
      const order = await (await req('demo-checkout', { packId: 'small', amount: '0', credits: '999999', externalUserId: 'other' }, cookie)).json();
      await req('demo-checkout/confirm', { orderId: order.id, outcome: 'paid', amount: '0', externalUserId: 'other' }, cookie);
      expect(billing.grantCredits).toHaveBeenCalledWith('write-room-demo-a', '5', order.id);
    }
  });
  it('sends an idempotent USD grant at the fixed pack rate through the service client', async () => {
    const calls: { url: string; body: any }[] = [];
    const transport = vi.fn<typeof fetch>(async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      return Response.json({ product_user: { external_user_id: 'fixture' }, credit_grant: { credit_grant_id: 'grant_fixture' }, credit_summary: { available_credits: '5' } });
    });
    const config = readConfig({ ZORVEUS_APP_ID: 'app_fixture', ZORVEUS_SERVICE_KEY: 'service_fixture', ZORVEUS_PLUS_INFERENCE_KEY: 'plus_fixture', ZORVEUS_PLUS_ULTRA_INFERENCE_KEY: 'ultra_fixture' });
    await createBilling(config, transport).grantCredits('fixture', '5', 'demo_fixture');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/product-users/by-external-id/credit-grants');
    expect(calls[0].body).toMatchObject({ app_id: 'app_fixture', external_user_id: 'fixture', amount: '5', credit_units_per_usd: '100', currency: 'USD', source: 'purchase', external_reference: 'write-room:demo_fixture', metadata: { demo_payment: true } });
  });
});
