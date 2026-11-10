# How customer billing works

The browser submits draft text. The server resolves a customer from its opaque, HttpOnly session cookie and reads its Plus or Plus Ultra assignment from trusted state. Selecting a demo account creates a server session; sending an arbitrary external ID, plan, model, key, or allowance in a request cannot alter this mapping.

`server/zorveus.ts` has three operations. `rewrite` uses the native `Zorveus` client with the direct key for the customer’s plan, the server's model, and the session customer's `externalUserId`. The server chooses `ZORVEUS_PLUS_INFERENCE_KEY` for Alex and `ZORVEUS_PLUS_ULTRA_INFERENCE_KEY` for Sam. No routing alias is sent. A server-created `activity_id` and the label `Rewrote text` go in `zorveusMetadata.usageMetadata`. The completion ID is preserved. The native completion response does not expose a saved usage event or a gateway request ID, so this example does not invent either.

`allowance` uses `ZorveusServiceClient.productUsers.getByExternalId` with the same external ID, app ID, and explicit `inferenceKey`. The service credential authorizes the read; the direct inference credential selects the same policy used for generation. Unsupported server plans are rejected before any SDK call. Missing or duplicated plan credentials block startup configuration. The server never falls back to another plan’s key. `upsertIfMissing: true` is deliberate. The reviewed backend checks read scope, ownership, and non-deleted app state before first-read creation. An existing disabled profile is not re-enabled by this operation.

`activity` calls the customer-scoped `listActivityByExternalId`. It fixes the app, customer, and limit on the server. Only the API's opaque cursor crosses the browser boundary. Customer identity and filters remain unchanged across pages. Refresh returns to the first page. The UI displays recorded customer charges rather than organization wholesale costs. It preserves labels, amounts, currencies, statuses, and historical charged units.

## Credit units and monetary amounts

At 100 credits per USD, Plus configures a $10 monthly allowance, or 1,000 credits. Plus Ultra configures $30, or 3,000 credits. That configuration is not a customer's current balance. The visible balance comes only from `allowance.remaining_credit_units`, which includes the selected policy's base allowance and applicable grants. Grant-only credit summaries would omit the base allowance.

All monetary and unit quantities stay decimal strings. `src/format.ts` uses the SDK's `formatDecimalString` and preserves significant fractional digits. Missing values display as unavailable. A true zero displays as zero. Activity's `charged_credit_units` comes from settlement allocations. The app does not multiply historical monetary charges by today's conversion rate.

## Generation and settlement

Generation returns output separately from usage reads. The app refreshes the allowance and Activity after a request. It makes at most two additional automatic refresh attempts at roughly 1.5 and 5 seconds. Service reads have one SDK retry; generation has none. Users can refresh manually.

A matching business activity ID confirms that an entry is present. The UI still displays that entry's actual status and amount. If no entry appears, the UI says pending confirmation. Absence does not establish that settlement is underway, that the request was free, or that a charge has completed. Failed provider requests can still have recorded charges.

A failed refresh retains completed output. A refresh failure with an earlier balance or page marks those values as potentially stale. An exhausted allowance produces the backend's safe code and HTTP status with an actionable explanation. Raw provider bodies, error messages, credentials, and headers are not returned to the browser.

## Replace demo authentication

`server/api.ts` stores random 32-byte session tokens in memory for eight hours and sets HttpOnly, SameSite=Strict cookies. Demo sign-in runs only in development. Alex is seeded on Plus and Sam on Plus Ultra. Both demo external IDs are stable within the applied app, so restarting the server resets sessions but does not reset Zorveus usage.

For production, replace the session resolver and fixed account registry with your authentication provider's verified server identity. Add durable entitlement storage mapping your authenticated customer to a plan. Keep the same external ID across all three operations. Configure HTTPS, secure cookies, trusted deployment origins, request limits, and deployment-specific routing in that application's server. The local entrypoint binds to loopback and rejects unrelated Host headers.

This app demonstrates AI usage enforcement without payment collection. Your app and payment provider own subscriptions, invoices, and entitlements. The selected organization funds Zorveus usage. Purchased packs and plan changes need separate trusted server flows.

Your server chooses the direct plan key from trusted entitlement state. The browser cannot select or receive either credential. Changing that assignment does not reset customer history or promise fresh credits. Activity continues to show all recorded movements for that stable customer identity.
