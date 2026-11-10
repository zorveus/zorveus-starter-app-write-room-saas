import { describe, expect, it, vi } from 'vitest';
import { createBilling } from '../server/zorveus';
import { createApi } from '../server/api';
import { readConfig } from '../server/config';
import { quantity } from '../src/format';
import manifest from '../zorveus.json';

const config = readConfig({ ZORVEUS_APP_ID: 'app_fixture', ZORVEUS_SERVICE_KEY: 'service_fixture', ZORVEUS_PLUS_INFERENCE_KEY: 'plus_fixture', ZORVEUS_PLUS_ULTRA_INFERENCE_KEY: 'ultra_fixture', ZORVEUS_API_BASE_URL: 'http://localhost:8000', ZORVEUS_GATEWAY_URL: 'http://localhost:4000/v1' });
function transport() {
  const calls: { url: URL; headers: Headers; body: any }[] = [];
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    calls.push({ url, headers: new Headers(init?.headers), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.pathname.endsWith('/chat/completions')) return Response.json({ id: 'completion_fixture', choices: [{ message: { content: 'Rewritten.' }, finish_reason: 'stop' }] });
    if (url.pathname.endsWith('/activity')) return Response.json({ items: [{ id: 'usage_fixture', type: 'usage', label: 'Rewrote text', amount: '-0.0001', currency: 'USD', status: 'completed', created_at: '2026-11-09T12:00:00Z', model: 'openai/gpt-4o-mini', charged_credit_units: '0.010000000000000000123', usage_metadata: { activity_id: 'business_fixture' }, base_allowance_charge_amount: null, credit_allocations: [] }], has_more: true, next_cursor: 'opaque+/=', limit: 10 });
    return Response.json({ app_id: 'app_fixture', external_user_id: url.searchParams.get('external_user_id'), allowance: { remaining_credit_units: '999.9999999999999999999', cap_amount: '10', currency: 'USD', period: 'monthly' }, credits: { remaining_credit_units: '2' } });
  });
  return { fetcher, calls };
}
describe('public SDK integration', () => {
  it('uses the paired endpoints, direct Plus key and explicit read-upsert header', async () => {
    const { fetcher, calls } = transport();
    const billing = createBilling(config, fetcher);
    const allowance = await billing.allowance('customer_a', 'plus');
    expect(allowance.remaining).toBe('999.9999999999999999999');
    expect(calls[0].url.origin).toBe('http://localhost:8000');
    expect(calls[0].headers.get('x-zorveus-inference-key')).toBe('plus_fixture');
    expect(calls[0].headers.has('x-zorveus-key-alias')).toBe(false);
    expect(calls[0].headers.get('x-zorveus-upsert-product-user')).toBe('true');
    await billing.rewrite('customer_a', 'Original.', 'business_fixture', 'plus');
    expect(calls[1].url.href).toBe('http://localhost:4000/v1/chat/completions');
    expect(calls[1].body.model).toBe('gemini/gemini-3.5-flash-lite');
    expect(calls[1].body.metadata).not.toHaveProperty('key_alias');
    expect(calls[1].body.metadata).toMatchObject({ external_user_id: 'customer_a', usage_metadata: { activity_id: 'business_fixture', activity_label: 'Rewrote text' } });
    const page = await billing.activity('customer_a', 'opaque+/=');
    expect(page.items[0].chargedUnits).toBe('0.010000000000000000123');
    expect(page.items[0].amount).toBe('-0.0001');
    expect(page.nextCursor).toBe('opaque+/=');
    expect(calls[2].url.searchParams.get('cursor')).toBe('opaque+/=');
    expect(calls[2].headers.get('x-zorveus-upsert-product-user')).toBe('false');
    for (const call of [calls[0], calls[2]]) expect(call.url.searchParams.get('external_user_id')).toBe('customer_a');
  });
  it('does not fall back to production when only one local endpoint is supplied', () => {
    const invalid = readConfig({ ZORVEUS_API_BASE_URL: 'http://localhost:8000' });
    expect(invalid.gatewayURL).toBe('');
    expect(invalid.ready).toBe(false);
  });
  it('rejects invalid or credential-bearing endpoints without exposing their values', () => {
    const invalid = readConfig({ ZORVEUS_API_BASE_URL: 'https://user:secret@example.com', ZORVEUS_GATEWAY_URL: 'http://remote.test/v1' });
    expect(invalid.ready).toBe(false);
    expect(invalid.issues.join(' ')).not.toContain('secret');
  });
  it('does not automatically retry a failed generation transport', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('timeout'));
    await expect(createBilling(config, fetcher).rewrite('customer_a', 'Draft', 'business_fixture', 'plus')).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
describe('decimal presentation and bundled defaults', () => {
  it.each([[null, 'Unavailable'], [undefined, 'Unavailable'], ['', 'Unavailable'], ['0', '0'], ['0.000000000000', '0'], ['12345678901234567890.000000000000123400', '12345678901234567890.0000000000001234'], ['-0.0000000000000000001', '-0.0000000000000000001']])('formats %s without losing precision', (value, expected) => expect(quantity(value)).toBe(expected));
  it('defines Plus and Plus Ultra with read scope and no embedded credentials', () => {
    expect(manifest.app.creditUnitsPerUsd).toBe('100');
    expect(manifest.keys.plus).toMatchObject({ name: 'Plus', creditMode: 'enforce', overrunPolicy: 'limit_output', cap: { amount: '10', currency: 'USD', period: 'monthly' } });
    expect(manifest.keys.plus_ultra).toMatchObject({ name: 'Plus Ultra', creditMode: 'enforce', overrunPolicy: 'limit_output', cap: { amount: '30', currency: 'USD', period: 'monthly' } });
    expect(Object.keys(manifest.keys)).toEqual(['plus', 'plus_ultra']);
    expect(manifest).not.toHaveProperty('routingKeys');
    expect(manifest.serviceKeys.customers.scopes).toEqual(['product_users:read', 'product_users:write']);
    expect(manifest.app.allowedModels.some(model => model === '*' || model === config.model)).toBe(true);
    expect(JSON.stringify(manifest)).not.toMatch(/"(?:apiKey|credential)"|zrv_/);
  });
});

describe('direct plan keys', () => {
  it('keeps each plan’s direct credential isolated on concurrent generation and allowance calls', async () => {
    const { fetcher, calls } = transport();
    const billing = createBilling(config, fetcher);
    await Promise.all([
      billing.allowance('customer_plus', 'plus'),
      billing.allowance('customer_ultra', 'plus_ultra'),
      billing.rewrite('customer_plus', 'Plus draft', 'rewrite_plus', 'plus'),
      billing.rewrite('customer_ultra', 'Ultra draft', 'rewrite_ultra', 'plus_ultra'),
    ]);
    for (const [id, alias] of [['customer_plus', 'plus'], ['customer_ultra', 'plus_ultra']]) {
      const read = calls.find(call => call.url.searchParams.get('external_user_id') === id)!;
      expect(read.headers.get('x-zorveus-inference-key')).toBe(alias === 'plus' ? 'plus_fixture' : 'ultra_fixture');
      expect(read.headers.has('x-zorveus-key-alias')).toBe(false);
      const generation = calls.find(call => call.body?.metadata?.external_user_id === id)!;
      expect(generation.headers.get('authorization')).toBe(alias === 'plus' ? 'Bearer plus_fixture' : 'Bearer ultra_fixture');
      expect(generation.body.metadata).not.toHaveProperty('key_alias');
    }
  });
  it('rejects an unsupported server plan before calling Zorveus', async () => {
    const { fetcher } = transport();
    const billing = createBilling(config, fetcher);
    // Simulate an invalid value reaching the typed server boundary.
    await expect(billing.allowance('customer', 'unknown' as any)).rejects.toThrow('Unknown server plan');
    await expect(billing.rewrite('customer', 'Draft', 'rewrite_invalid', 'unknown' as any)).rejects.toThrow('Unknown server plan');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

it('uses the authenticated customer’s direct key through the SDK and preserves a controlled plan denial', async () => {
  const requests: { alias: string; customer: string; kind: string }[] = [];
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    if (url.pathname.endsWith('/chat/completions')) {
      const body = JSON.parse(String(init?.body));
      const authorization = headers.get('authorization');
      expect(['Bearer plus_fixture', 'Bearer ultra_fixture']).toContain(authorization);
      const alias = authorization === 'Bearer plus_fixture' ? 'plus' : 'plus_ultra';
      expect(body.metadata).not.toHaveProperty('key_alias');
      requests.push({ alias, customer: body.metadata.external_user_id, kind: 'rewrite' });
      if (body.messages[1].content === 'Controlled denial') return Response.json({ error: { code: 'zorveus_product_user_allowance_insufficient', message: 'Fixture allowance exhausted' } }, { status: 403 });
      return Response.json({ id: `completion_${alias}`, choices: [{ message: { content: `Output for ${alias}` }, finish_reason: 'stop' }] });
    }
    expect(headers.has('x-zorveus-key-alias')).toBe(false);
    const selectedKey = headers.get('x-zorveus-inference-key');
    expect(['plus_fixture', 'ultra_fixture']).toContain(selectedKey);
    const alias = selectedKey === 'plus_fixture' ? 'plus' : 'plus_ultra';
    const customer = url.searchParams.get('external_user_id')!;
    requests.push({ alias, customer, kind: 'allowance' });
    return Response.json({ app_id: config.appId, external_user_id: customer, allowance: { cap_amount: alias === 'plus' ? '10' : '30', remaining_credit_units: alias === 'plus' ? '999' : '2999', currency: 'USD', period: 'monthly' } });
  });
  const api = createApi(config, createBilling(config, fetcher), true);
  const call = (path: string, cookie?: string, body?: unknown) => api(new Request(`http://localhost/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Origin: 'http://localhost', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
  for (const [account, alias, customer] of [['a', 'plus', 'write-room-demo-a'], ['b', 'plus_ultra', 'write-room-demo-b']]) {
    const login = await call('session', undefined, { account });
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const allowance = await (await call('allowance?keyAlias=forged', cookie)).json();
    expect(allowance.capAmount).toBe(alias === 'plus' ? '10' : '30');
    const output = await (await call('rewrite', cookie, { text: 'Draft', plan: 'forged', keyAlias: 'forged' })).json();
    expect(output.text).toBe(`Output for ${alias}`);
    expect(requests.filter(request => request.customer === customer).map(request => request.alias)).toEqual([alias, alias]);
    if (account === 'b') {
      const denial = await call('rewrite', cookie, { text: 'Controlled denial', plan: 'plus', keyAlias: 'plus' });
      expect(denial.status).toBe(403);
      expect((await denial.json()).error.code).toBe('zorveus_product_user_allowance_insufficient');
      expect(requests.at(-1)).toEqual({ alias: 'plus_ultra', customer, kind: 'rewrite' });
    }
  }
  expect(requests.filter(request => request.kind === 'rewrite')).toHaveLength(3);
});

it('requires both distinct direct keys and does not reuse the previous shared credential', () => {
  const missingUltra = readConfig({ ZORVEUS_APP_ID: 'app', ZORVEUS_SERVICE_KEY: 'service', ZORVEUS_PLUS_INFERENCE_KEY: 'plus', ZORVEUS_INFERENCE_KEY: 'old_shared_key' });
  expect(missingUltra.ready).toBe(false);
  expect(missingUltra.issues.join(' ')).toContain('ZORVEUS_PLUS_ULTRA_INFERENCE_KEY');
  expect(missingUltra.inferenceKeys.plus_ultra).toBe('');
  const duplicate = readConfig({ ZORVEUS_APP_ID: 'app', ZORVEUS_SERVICE_KEY: 'service', ZORVEUS_PLUS_INFERENCE_KEY: 'same_secret', ZORVEUS_PLUS_ULTRA_INFERENCE_KEY: 'same_secret' });
  expect(duplicate.ready).toBe(false);
  expect(duplicate.issues.join(' ')).toContain('different direct inference keys');
  expect(duplicate.issues.join(' ')).not.toContain('same_secret');
});
