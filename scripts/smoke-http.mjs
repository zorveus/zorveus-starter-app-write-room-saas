import assert from 'node:assert/strict';
const origin = `http://127.0.0.1:${process.env.PORT || 3000}`;
const initial = await fetch(`${origin}/api/config`);
assert.equal(initial.status, 200);
const config = await initial.json();
assert.equal((await fetch(origin)).status, 200);
assert.equal((await fetch(`${origin}/api/allowance`)).status, 401);
if (!config.demoSignIn) {
  assert.equal((await fetch(`${origin}/api/session`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ account: 'a' }) })).status, 403);
  console.log('PASS HTTP page, public config, unauthenticated reads, and production demo-sign-in denial.');
} else {
  for (const account of ['a', 'b']) {
    const login = await fetch(`${origin}/api/session`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ account }) });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const session = await (await fetch(`${origin}/api/config`, { headers: { Cookie: cookie } })).json();
    assert.equal(session.customer.account, account);
    assert.equal(session.customer.plan, account === 'a' ? 'plus' : 'plus_ultra');
    if (!config.ready) {
      const denied = await fetch(`${origin}/api/rewrite`, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'A setup check. This must not generate text.' }) });
      assert.equal(denied.status, 503);
    }
    await fetch(`${origin}/api/logout`, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal((await fetch(`${origin}/api/allowance`, { headers: { Cookie: cookie } })).status, 401);
  }
  const forbidden = await fetch(`${origin}/api/session`, { method: 'POST', headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ account: 'a' }) });
  assert.equal(forbidden.status, 403);
  console.log('PASS HTTP page, safe setup, Plus and Plus Ultra sessions, logout, unauthenticated reads, and origin rejection. No customer reads or paid inference requested.');
}
