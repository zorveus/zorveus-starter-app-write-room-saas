# Verification record

Updated 10 November 2026.

## Current configuration

The app uses separate direct inference keys for Plus and Plus Ultra. Alex is assigned Plus and Sam Plus Ultra in trusted server state. The same plan key is used for generation and selected-policy allowance reads. The browser cannot choose or receive a key.

At the user's request, CLI-store retrieval was removed from the app. The CLI launcher, credential-loading module, related npm commands, and 17 launcher tests were deleted. Startup reads `.env` or directly supplied server environment variables. The existing local credentials were preserved. The CLI remains a separate provisioning tool for login, plan, and approved apply.

The default model and local `.env` model setting are now `gemini/gemini-3.5-flash-lite`. Read-only model listings for both direct plan keys include this exact ID. No paid generation request has been made with the new default. The earlier live results below used `openai/gpt-4o-mini`.

## Local checks

- All 44 tests pass across route security, SDK transport, decimal formatting, manifest settings, React interactions, accessible disclosures, reduced motion, and organization-funding errors.
- TypeScript checking and the Vite production build pass.
- The browser-bundle scan finds no server integration code or credential values.
- Runtime source and npm scripts contain no CLI invocation or OS-store lookup.
- The distribution packager excludes `.env`, node_modules, CLI state, applied manifests, and local live-check reports. It refuses an applied manifest. The SDK starter retains the clean unapplied manifest.
- A prior standalone extraction installed published dependencies and passed its tests and build outside the monorepo. The lockfile contains no sibling source or workspace dependencies.

## Live integration evidence

After explicit user approval, the supplied manifest was applied to the selected organization. It created the app, two direct inference keys, their $10 and $30 monthly allowance policies, and the customer-read service key. An unchanged repeat plan returned no changes, including after the successful requests.

Both selected-policy allowance reads returned HTTP 200. Plus initially returned 1,000 credits with a $10 monthly cap. Plus Ultra returned 3,000 credits with a $30 monthly cap. Initial rewrite attempts returned HTTP 402 with `zorveus_reservation_insufficient_balance`. The UI now explains that organization funding is separate from customer allowance credits and preserves the API code.

After the user funded the organization and authorized a retry, one short rewrite per customer returned HTTP 200 with model `openai/gpt-4o-mini` and text `The draft is now ready for your review.` Both had matching customer Activity entries with status `succeeded` and label `Rewrote text`.

For those observed requests, Plus returned `999.998605000000000000000000` remaining credits and Plus Ultra returned `2999.998605000000000000000000`. Each Activity entry recorded `-0.000013950000` USD and `0.001395000000000000000000` charged credit units. These are measured API results, not fixed future prices. No generation was automatically retried.

The original live checks used the now-removed CLI launcher. The same applied credentials are now in the user's protected local `.env`, and environment validation succeeds. Detailed request correlations remain only in ignored local artifacts and are excluded from the release archive. No additional chargeable requests were needed for the launcher removal.

## Remaining verification limits

Controlled live customer allowance exhaustion was not performed; it requires a separately authorized test policy or spend. Organization funding rejection was observed live and has a regression test.

Earlier Safari review covered the welcome and signed-in setup layouts. The browser automation host was unavailable during the final live check, so configured, successful, and denied browser captures remain unavailable. No current browser capture or end-to-end onboarding-time claim is made.

## Demo checkout

Development checkout offers server-priced 500, 1,000, and 2,500 credit packs. A successful simulated payment calls the SDK credit-grant endpoint with a stable external reference and a fixed 100-credit-per-USD rate. The grant is real; the payment is simulated. Production mode disables checkout.

Mocked tests cover confirmation, duplicate and concurrent submissions, retrying an uncertain grant with the same reference, declined payments, customer isolation, server prices, origin checks, and the public SDK payload. UI tests cover confirmation, receipts, and retrying the same order. No live credit grant or payment was made during this work, and no account was selected for testing. The existing service key's write permission has not been changed or verified live.
