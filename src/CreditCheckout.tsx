import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { request, RequestError } from './api';
import { creditPacks, type DemoOrder } from './credit-packs';
import { quantity } from './format';

export function CreditCheckout({ name, onClose, onFulfilled }: { name: string; onClose(): void; onFulfilled(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [packId, setPackId] = useState<string>('medium');
  const [order, setOrder] = useState<DemoOrder>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const node = dialog.current!; node.showModal(); return () => node.close(); }, []);
  async function submit(outcome?: 'paid' | 'declined') {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await request<DemoOrder>(order ? 'demo-checkout/confirm' : 'demo-checkout', order ? { orderId: order.id, outcome } : { packId });
      setOrder(result);
      if (result.status === 'fulfilled') onFulfilled();
    } catch (e) { setError(e instanceof RequestError && e.detail.code === 'network_unavailable' ? 'Checkout could not be confirmed. Keep it open and retry the same checkout.' : e instanceof Error ? e.message : 'Checkout is unavailable. Try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const completed = order?.status === 'fulfilled';
  const declined = order?.status === 'declined';
  return createPortal(<dialog ref={dialog} className="credit-checkout" aria-labelledby="checkout-title" aria-describedby="checkout-note" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="checkout-content">
      <span className="checkout-demo">Demo checkout</span>
      <h2 id="checkout-title">{completed ? 'A little more room.' : declined ? 'Payment declined' : 'Keep the words flowing.'}</h2>
      <p id="checkout-note">{completed ? `${quantity(order.credits, 2)} credits added for ${name}.` : declined ? 'No credits were added. No money was charged.' : `Add credits for ${name}. No real payment is collected.`}</p>
      {!order && <fieldset className="credit-packs" disabled={busy}><legend className="sr-only">Choose a credit pack</legend>{creditPacks.map(pack => <label className={`credit-pack ${packId === pack.id ? 'is-selected' : ''}`} key={pack.id}>
        <input type="radio" name="credit-pack" value={pack.id} checked={packId === pack.id} onChange={() => setPackId(pack.id)} />
        <span><strong>{quantity(pack.credits)} credits</strong><small>One-time top-up</small></span><span className="pack-price">${quantity(pack.priceUsd, 2)}</span>
      </label>)}</fieldset>}
      {order && !completed && !declined && <div className="checkout-summary"><span>{quantity(order.credits)} credits</span><strong>${quantity(order.priceUsd, 2)} USD</strong></div>}
      {order && <p className="checkout-reference">Order <span>{order.id}</span></p>}
      {!completed && !declined && <p className="checkout-detail">This demo adds real credits to your AI allowance. It does not fund the organization wallet.</p>}
      {error && <p className="checkout-error" role="alert">{error}</p>}
      {completed && <p className="checkout-success" role="status">Credits added. Your balance and Activity are refreshing.</p>}
      <div className="checkout-actions">
        {completed || declined ? <button className="primary" onClick={onClose}>Back to writing</button> : <>
          <button className="primary" disabled={busy} onClick={() => void submit(order ? 'paid' : undefined)}>{busy ? 'Confirming…' : order ? error ? 'Retry same checkout' : 'Pay' : 'Continue'}</button>
          {order && !error && <button className="secondary" disabled={busy} onClick={() => void submit('declined')}>Decline</button>}
          <button className="text-button" disabled={busy} onClick={onClose}>Close</button>
        </>}
      </div>
    </div>
  </dialog>, document.body);
}
