import { Zorveus, ZorveusServiceClient } from "@zorveus/sdk";
import type { ServerConfig } from "./config.js";
import type { ActivityPage, Allowance, Rewrite, Plan } from "../src/types.js";

export interface Billing {
  grantCredits(externalUserId: string, amountUsd: string, orderId: string): Promise<void>;
  allowance(externalUserId: string, plan: Plan): Promise<Allowance>;
  activity(externalUserId: string, cursor?: string): Promise<ActivityPage>;
  rewrite(
    externalUserId: string,
    text: string,
    activityId: string,
    plan: Plan,
  ): Promise<Rewrite>;
}

export function createBilling(
  config: ServerConfig,
  transport: typeof fetch = fetch,
): Billing {
  const inferenceClient = (apiKey: string) =>
    new Zorveus({
      apiKey,
      baseURL: config.apiBaseURL,
      gatewayBaseURL: config.gatewayURL,
      fetch: transport,
      maxRetries: 0,
      timeout: 60_000,
    });
  const inferenceClients: Record<Plan, Zorveus> = {
    plus: inferenceClient(config.inferenceKeys.plus),
    plus_ultra: inferenceClient(config.inferenceKeys.plus_ultra),
  };
  function directKeyFor(plan: Plan) {
    if (plan !== "plus" && plan !== "plus_ultra")
      throw new TypeError("Unknown server plan.");
    const key = config.inferenceKeys[plan];
    if (!key)
      throw new TypeError("Missing direct inference key for the server plan.");
    return key;
  }

  const service = new ZorveusServiceClient({
    apiKey: config.serviceKey,
    baseURL: config.apiBaseURL,
    fetch: transport,
    maxRetries: 1,
    timeout: 15_000,
  });
  const identity = (externalUserId: string) => ({
    appId: config.appId,
    externalUserId,
  });
  return {

    // Grant credits to a user after a purchase. E.g a Stripe webhook can call this endpoint to grant credits after a successful payment.
    async grantCredits(externalUserId, amountUsd, orderId) {
      await service.productUsers.grantCreditByExternalId({
        ...identity(externalUserId),
        externalReference: `write-room:${orderId}`,
        amount: amountUsd,
        currency: 'USD',
        creditUnitsPerUsd: '100',
        source: 'purchase',
        reason: 'Demo credit purchase',
        metadata: { demo_payment: true, order_id: orderId },
      }, { maxRetries: 0 });
    },
    // Get user allowance
    async allowance(externalUserId, plan) {
      // Deliberate first-read creation. A preflight must use upsertIfMissing: false.
      const user = await service.productUsers.getByExternalId({
        ...identity(externalUserId),
        inferenceKey: directKeyFor(plan),
        upsertIfMissing: true,
      });
      const a = user.allowance;
      return {
        remaining: a?.remaining_credit_units ?? null,
        capAmount: a?.cap_amount ?? null,
        currency: a?.currency ?? null,
        period: a?.period ?? null,
        periodEnd: a?.period_end ?? null,
        creditMode: a?.credit_mode ?? null,
        overrunPolicy: a?.overrun_policy ?? null,
      };
    },

    // Activity history function
    async activity(externalUserId, cursor) {
      const page = await service.productUsers.listActivityByExternalId({
        ...identity(externalUserId),
        cursor,
        limit: 10,
        upsertIfMissing: false,
      });
      return {
        items: page.items.map((item) => ({
          id: item.id,
          type: item.type,
          label: item.label,
          amount: item.amount,
          currency: item.currency,
          status: item.status,
          createdAt: item.created_at,
          model: item.type === "usage" ? item.model : null,
          chargedUnits:
            item.type === "usage" ? (item.charged_credit_units ?? null) : null,
          activityId: item.type === "usage"
            ? (typeof item.usage_metadata?.activity_id === "string" ? item.usage_metadata.activity_id : null)
            : (typeof item.metadata?.order_id === "string" ? item.metadata.order_id : null),
        })),
        nextCursor: page.next_cursor,
        hasMore: page.has_more,
      };
    },

    // AI rewrite function
    async rewrite(externalUserId, text, activityId, plan) {
      directKeyFor(plan);
      const completion = await inferenceClients[plan].chat.completions.create(
        {
          model: config.model,
          max_tokens: 700,
          messages: [
            {
              role: "system",
              content:
                "Rewrite the supplied text for clarity and concision. Preserve its meaning, facts, and voice. Do not invent facts. Return only the rewritten text.",
            },
            { role: "user", content: text },
          ],
          zorveusMetadata: {
            externalUserId,
            usageMetadata: {
              activity_id: activityId,
              activity_label: "Rewrote text",
            },
          },
        },
        { maxRetries: 0 },
      );
      const choice = completion.choices[0];

      if (!choice?.message.content) throw new Error("empty_completion");
      return {
        text: choice.message.content,
        activityId,
        completionId: completion.id,
        finishReason: choice.finish_reason,
      };
    },
  };
}
