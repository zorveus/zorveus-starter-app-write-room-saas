export type Plan = 'plus' | 'plus_ultra';
export const planNames: Record<Plan, string> = { plus: 'Plus', plus_ultra: 'Plus Ultra' };
export interface Customer { account: 'a' | 'b' | 'c'; name: string; plan: Plan }
export interface Config { ready: boolean; issues: string[]; demoSignIn: boolean; base: boolean; customer: Customer | null }
export interface Allowance {
  remaining: string | null; capAmount: string | null; currency: string | null;
  period: string | null; periodEnd: string | null; creditMode: string | null; overrunPolicy: string | null;
}
export interface ActivityItem {
  id: string; type: string; label: string; amount: string; currency: string; status: string;
  createdAt: string; model: string | null; chargedUnits: string | null; activityId: string | null;
}
export interface ActivityPage { items: ActivityItem[]; nextCursor: string | null; hasMore: boolean }
export interface Rewrite { text: string; activityId: string; completionId: string; finishReason: string | null }
export interface ApiError { message: string; code: string; status: number }
