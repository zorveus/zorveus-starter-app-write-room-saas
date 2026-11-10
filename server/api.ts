import { randomBytes, randomUUID } from 'node:crypto';
import { ZorveusError } from '@zorveus/sdk';
import type { ServerConfig } from './config.js';
import type { Billing } from './zorveus.js';
import type { Customer } from '../src/types.js';
import { CheckoutError, createDemoCheckout } from './demo-checkout.js';

const customers = {
  a: { account: 'a', name: 'Alex Morgan', plan: 'plus', externalId: 'write-room-demo-a' },
  b: { account: 'b', name: 'Sam Rivera', plan: 'plus_ultra', externalId: 'write-room-demo-b' },
  c: { account: 'c', name: 'Jordan Lee', plan: 'plus', externalId: 'write-room-demo-c' },
} as const;
type Account = keyof typeof customers;
const publicCustomer = (account: Account): Customer => {
  const { name, plan } = customers[account];
  return { account, name, plan };
};
function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}
const failure = (message: string, code: string, status: number, extra = {}) => json({ error: { message, code, status }, ...extra }, status);

// Never send provider error messages, raw bodies, headers, or configuration values to the browser.
function upstreamFailure(error: unknown, extra = {}) {
  const status = error instanceof ZorveusError ? error.status ?? 502 : 502;
  const candidate = error instanceof ZorveusError ? error.code : undefined;
  const code = candidate && /^[a-z][a-z0-9_]{0,79}$/.test(candidate) ? candidate : 'upstream_unavailable';
  const exhausted = code.includes('allowance_insufficient') || code.includes('credits_insufficient') || code.includes('cap_exceeded');
  const selectorInvalid = code.includes('selector');
  const organizationUnfunded = code === 'zorveus_reservation_insufficient_balance';
  const message = organizationUnfunded ? 'Your Zorveus organization has insufficient funded balance for this request. Add funding in Zorveus, then try again. Customer plan credits do not fund the organization.'
    : selectorInvalid ? 'The plan credential is invalid. Use the direct Plus and Plus Ultra keys from the manifest.'
    : exhausted ? 'Your AI allowance cannot cover this request. Refresh your allowance to check the current policy.'
    : status === 403 ? 'Zorveus denied access. Check the customer-read scope and selected app.'
    : status === 401 ? 'Zorveus could not authenticate the server. Check its credentials.'
    : status === 404 ? 'The customer or resource is unavailable. Refresh the allowance first to create a missing demo customer.'
    : 'Zorveus could not confirm this request. Refresh Activity before trying another rewrite. A charge may still be recorded.';
  return failure(message, code, status >= 400 && status <= 599 ? status : 502, extra);
}

export function createApi(config: ServerConfig, billing: Billing | null, development: boolean) {
  const checkout = billing ? createDemoCheckout(billing) : null;
  const sessions = new Map<string, { account: Account; expires: number }>();
  const generating = new Set<Account>();
  const cookieName = 'write_room_session';
  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (!['GET', 'POST'].includes(request.method)) return failure('Method not allowed.', 'method_not_allowed', 405);
    if (request.method === 'POST' && request.headers.get('origin') !== url.origin) return failure('Use the app in its own browser tab.', 'origin_denied', 403);
    const token = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    const session = token ? sessions.get(token) : undefined;
    const account = session && session.expires > Date.now() ? session.account : null;
    if (token && !account) sessions.delete(token);

    if (request.method === 'GET' && url.pathname === '/api/config') {
      return json({ ready: config.ready, issues: config.issues, demoSignIn: development, base: config.base, customer: account ? publicCustomer(account) : null });
    }
    if (request.method === 'POST' && url.pathname === '/api/session') {
      if (!development) return failure('Demo sign-in is disabled outside development. Connect production authentication on the server.', 'demo_disabled', 403);
      let body;
      try { body = await request.json(); } catch { return failure('Choose a demo account.', 'invalid_account', 400); }
      if (!body || (body.account !== 'a' && body.account !== 'b' && body.account !== 'c')) return failure('Choose a demo account.', 'invalid_account', 400);
      // Remove old and expired sessions. Demo sessions never leave this server process.
      if (token) sessions.delete(token);
      for (const [key, value] of sessions) if (value.expires <= Date.now()) sessions.delete(key);
      if (sessions.size >= 200) return failure('Too many demo sessions. Restart the local app.', 'session_limit', 429);
      const newToken = randomBytes(32).toString('hex');
      sessions.set(newToken, { account: body.account, expires: Date.now() + 8 * 60 * 60 * 1000 });
      return json({ customer: publicCustomer(body.account) }, 200, { 'Set-Cookie': `${cookieName}=${newToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${url.protocol === 'https:' ? '; Secure' : ''}` });
    }
    if (request.method === 'POST' && url.pathname === '/api/logout') {
      if (token) sessions.delete(token);
      return json({ ok: true }, 200, { 'Set-Cookie': `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` });
    }
    if (!account) return failure('Sign in with a demo account to continue.', 'unauthenticated', 401);
    if (!config.ready || !billing) return failure('Finish the server configuration shown in setup, then restart the app.', 'configuration_required', 503);
    // The session selects a trusted plan assignment. Browser identity, key, model, and plan inputs are never used.
    const customer = customers[account];
    if (request.method === 'POST' && ['/api/demo-checkout', '/api/demo-checkout/confirm'].includes(url.pathname)) {
      if (!development) return failure('Demo checkout is available only in development.', 'demo_disabled', 403);
      let body;
      try { body = await request.json(); } catch { return failure('Choose a credit pack.', 'invalid_checkout', 400); }
      try {
        const order = url.pathname === '/api/demo-checkout'
          ? checkout!.create(customer.externalId, body?.packId)
          : await checkout!.confirm(customer.externalId, body?.orderId, body?.outcome);
        return json(order);
      } catch (error) {
        if (error instanceof CheckoutError) return failure(error.message, error.code, error.status);
        const status = error instanceof ZorveusError ? error.status : undefined;
        return failure(status === 403
          ? 'The server service key needs product_users:write permission to add credits. Ask the demo owner to update it.'
          : 'Credits could not be confirmed. Retry this checkout to check the same purchase safely.', 'credit_grant_unconfirmed', status === 403 ? 403 : 502);
      }
    }
    if (request.method === 'GET' && url.pathname === '/api/allowance') {
      try { return json(await billing.allowance(customer.externalId, customer.plan)); }
      catch (error) { return upstreamFailure(error); }
    }
    if (request.method === 'GET' && url.pathname === '/api/activity') {
      const cursor = url.searchParams.get('cursor') ?? undefined;
      if (cursor && cursor.length > 8192) return failure('Refresh Activity to restart pagination.', 'invalid_cursor', 400);
      try { return json(await billing.activity(customer.externalId, cursor)); }
      catch (error) { return upstreamFailure(error); }
    }
    if (request.method === 'POST' && url.pathname === '/api/rewrite') {
      let body;
      try { body = await request.json(); } catch { return failure('Supply text to rewrite.', 'invalid_text', 400); }
      if (!body || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 6000) return failure('Enter between 1 and 6,000 characters.', 'invalid_text', 400);
      if (generating.has(account)) return failure('A rewrite is already in progress for this customer.', 'rewrite_in_progress', 409);
      const activityId = `rewrite_${randomUUID()}`;
      generating.add(account);
      try { return json(await billing.rewrite(customer.externalId, body.text.trim(), activityId, customer.plan)); }
      catch (error) { return upstreamFailure(error, { activityId }); }
      finally { generating.delete(account); }
    }
    return failure('Route not found.', 'not_found', 404);
  };
}
