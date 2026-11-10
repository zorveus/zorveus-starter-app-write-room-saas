import { randomUUID } from 'node:crypto';
import { creditPacks, type DemoOrder } from '../src/credit-packs.js';
import type { Billing } from './zorveus.js';

class CheckoutError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}
type Order = DemoOrder & { customer: string; expires: number; busy: boolean; attempted: boolean };
const publicOrder = ({ id, packId, credits, priceUsd, status }: Order): DemoOrder => ({ id, packId, credits, priceUsd, status });

// Deliberately in-memory and development-only. A real gateway needs persisted orders
// and a verified payment webhook before issuing a credit grant.
export function createDemoCheckout(billing: Billing) {
  const orders = new Map<string, Order>();
  return {
    create(customer: string, packId: unknown): DemoOrder {
      const pack = creditPacks.find(pack => pack.id === packId);
      if (!pack) throw new CheckoutError('invalid_pack', 'Choose a credit pack.', 400);
      for (const [id, order] of orders) if (order.expires < Date.now() && !order.busy) orders.delete(id);
      if (orders.size >= 200) throw new CheckoutError('checkout_limit', 'Too many demo orders. Try again later.', 429);
      const order: Order = { id: `demo_${randomUUID()}`, customer, packId: pack.id, credits: pack.credits, priceUsd: pack.priceUsd, status: 'pending', expires: Date.now() + 24 * 60 * 60 * 1000, busy: false, attempted: false };
      orders.set(order.id, order);
      return publicOrder(order);
    },
    async confirm(customer: string, orderId: unknown, outcome: unknown): Promise<DemoOrder> {
      const order = typeof orderId === 'string' ? orders.get(orderId) : undefined;
      if (!order || order.customer !== customer) throw new CheckoutError('order_not_found', 'This checkout is unavailable. Open a new checkout.', 404);
      if (outcome !== 'paid' && outcome !== 'declined') throw new CheckoutError('invalid_payment', 'Choose a demo payment outcome.', 400);
      if (order.status !== 'pending') return publicOrder(order);
      if (order.busy) throw new CheckoutError('checkout_in_progress', 'Credits are being confirmed. Retry this checkout shortly.', 409);
      if (order.expires < Date.now()) throw new CheckoutError('checkout_expired', 'This checkout has expired. Open a new checkout.', 410);
      if (outcome === 'declined') {
        if (order.attempted) throw new CheckoutError('confirmation_started', 'Payment confirmation has started. Retry this same checkout.', 409);
        order.status = 'declined'; return publicOrder(order);
      }
      order.busy = true; order.attempted = true;
      try {
        // Stable across retries, including an uncertain grant response.
        await billing.grantCredits(customer, order.priceUsd, order.id);
        order.status = 'fulfilled';
        return publicOrder(order);
      } finally { order.busy = false; }
    },
  };
}
export { CheckoutError };
