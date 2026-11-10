// Public catalogue. Checkout always resolves prices and grants from this list on the server.
export const creditPacks = [
  { id: 'small', credits: '500', priceUsd: '5' },
  { id: 'medium', credits: '1000', priceUsd: '10' },
  { id: 'large', credits: '2500', priceUsd: '25' },
] as const;
export interface DemoOrder {
  id: string;
  packId: string;
  credits: string;
  priceUsd: string;
  status: 'pending' | 'fulfilled' | 'declined';
}
