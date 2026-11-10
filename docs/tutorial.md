# Add customer billing to the base editor

First run the [completed app quickstart](../README.md). This learning path uses the same editor and customer sessions, with an explicit base mode that disables generation and billing.

## Open the base snapshot

```sh
npm run dev:base
```

Choose a demo account. Enter a draft or choose a sample starter. The app shows **Base learning snapshot**, no balance, and a disabled rewrite action. No paid provider fallback runs. `base/config.ts` defines the runnable base's billing-free configuration; the normal app and base reuse the editor.

## Inspect the completed server integration

Stop the base server. Open `server/zorveus.ts`. The `createBilling` function creates one native inference client and one management service client. Each client receives its matching configured endpoint and credential on the server.

Find the `rewrite` operation. It chooses the direct inference client for the trusted plan. It passes the authenticated external ID in `zorveusMetadata.externalUserId` and a business activity ID in `usageMetadata`. Its request options disable retries. Model and credential selection come from the server configuration, not the submitted text.

Find the `allowance` operation. It sends the same external ID and the direct key for the same plan to `getByExternalId`. The first read opts into missing-customer creation. It returns `remaining_credit_units` and policy details. It does not substitute the manifest's configured allowance for a missing live balance.

Find the `activity` operation. It requests customer-scoped Activity using the same identity. It maps recorded decimal strings and saved charged credit units into the browser response. It passes the opaque next cursor unchanged to the next request.

## Follow the trusted plan assignment

Open `server/api.ts`. Alex has `plan: 'plus'` and Sam has `plan: 'plus_ultra'` in trusted state. The integration uses the session customer's direct plan key for both generation and allowance reads. Browser fields named `plan`, `model`, or `externalUserId` are never used for those operations.

The manifest includes a direct inference key for each plan. Both credentials are required, and no routing alias is sent. For production, replace the seeded assignments with a server-side mapping backed by verified subscription state. Keep both generation and allowance reads on the selected connection. That work does not belong in a browser account selector.

## Run the completed integration

```sh
npm run dev
```

Use the supplied manifest and the reviewed plan/apply flow from the quickstart. Supply your server credentials through .env or the process environment. Rewrite a draft, read the live allowance, and inspect Activity for that customer. The organization pays the usage charge. The displayed credit balance includes the selected base allowance and applicable grants.

Switch to Customer B and repeat. Compare customer-specific history. Finally run `npm test` to see the transport, route, and UI checks that protect attribution, policy selection, decimal values, denial states, and output preservation.
