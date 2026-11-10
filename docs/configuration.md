# Configure Write room

## Server environment

All Zorveus variables are server-only.

| Variable | Meaning | Default |
| --- | --- | --- |
| `ZORVEUS_API_BASE_URL` | Management API origin | `https://api.zorveus.com` |
| `ZORVEUS_GATEWAY_URL` | Inference base URL | `https://api.zorveus.com/v1` |
| `ZORVEUS_APP_ID` | Your applied app ID | Required |
| `ZORVEUS_SERVICE_KEY` | Your `customers` service credential | Required |
| `ZORVEUS_PLUS_INFERENCE_KEY` | Your direct `keys.plus` credential | Required |
| `ZORVEUS_PLUS_ULTRA_INFERENCE_KEY` | Your direct `keys.plus_ultra` credential | Required |
| `ZORVEUS_MODEL_ID` | Text-model override | `gemini/gemini-3.5-flash-lite` |
| `PORT` | Local app port | `3000` |

If you set either endpoint, set both. HTTP is accepted only for loopback endpoints. URLs with embedded credentials, query parameters, or fragments are rejected. Startup validation reports variable names without values. Validation proves local configuration shape, not live access or funding.

The server reads these variables from `.env` or its process environment. Existing process values take precedence. It does not access the OS credential store or run the CLI. Both plan credentials are required and must be distinct. The server chooses the direct key from the authenticated customer's assignment; browser fields cannot override it. The old shared `ZORVEUS_INFERENCE_KEY` variable is not used.

## Select a text model

1. Find a text-model ID available to your account through Zorveus's model listing or dashboard. Model listing alone does not prove inference funding.
2. Set `app.allowedModels` in `zorveus.json` to that ID. Preserve any IDs already written by apply.
3. Run `zorveus plan` and inspect the saved plan.
4. Apply the reviewed plan with `zorveus apply --plan zorveus.plan.json --yes`.
5. Set `ZORVEUS_MODEL_ID` on the server to the same ID, then restart.
6. Run `npm run preflight`. Make one explicit rewrite to verify inference and inspect its Activity.

There is no runtime-model property in the manifest schema. The shipped server default, `gemini/gemini-3.5-flash-lite`, matches the bundled allowed-model configuration. The server uses this default or the server-only override. Keep the selected model allowed by the applied manifest. If you edit the allowed-model list, use the override to match it.

## Change the app or allowance

Edit the app name, `keys.plus.cap.amount`, or `keys.plus_ultra.cap.amount` in your applied local manifest. Preserve resource IDs and stable references. Run plan, inspect it, and apply the saved plan. The app reads policy details and remaining credits from Zorveus; there is no separate app-side allowance setting to update.

The mapping in `server/api.ts` assigns Alex to `plus` and Sam to `plus_ultra`. `server/zorveus.ts` selects that plan’s direct client for inference and passes the same direct key as `inferenceKey` on the allowance read. Neither call sends `keyAlias`. A browser request must never select that mapping. Replace the seeded assignments with verified subscription data for production. Subscription checkout and upgrades are outside this example. Development mode includes simulated credit-pack checkout; see [Try demo credit checkout](../README.md#try-demo-credit-checkout).

## Run the read-only preflight

`npm run preflight` checks local inputs, model listing with each plan key, and a lookup-only read for the reserved external ID `write-room-preflight-read-only`. It never generates text or requests customer creation. Run `zorveus whoami` separately to confirm the CLI's active account and organization; the app cannot inspect the CLI credential store.

The preflight omits the inference-key selector from its customer lookup. The current backend persists `last_app_connection_id` on selected-key reads even when `upsertIfMissing` is false. Omitting that selector keeps this check read-only. The normal app deliberately selects the session customer’s plan and creates a missing customer during its first trusted allowance read.

A missing preflight customer produces an informational 404. This does not prove app access or a working selected-policy read. Verify those through the explicit customer flow. Preflight errors print safe codes and next actions, without provider messages, response bodies, or secret values.

## Start the configured server

Use `npm run preflight` for the read-only configuration and API check. Use `npm run dev` for development, or `npm run build` followed by `npm start` for the production build. Production mode disables demo sign-in and demo checkout.

The server loads `.env` once at startup using Node's environment loader. Set `PORT=3005` if the default port 3000 is occupied. Restart after editing `.env`. Missing settings appear by variable name in the setup panel, without exposing their values.

The CLI is used separately for login, plan, and reviewed apply. App startup and API requests do not invoke it. The app does not create, rotate, or retrieve credentials from the OS store.

## Credit purchases

The `customers` service key requires `product_users:read` and `product_users:write`. Reads use the plan's direct inference key to select the allowance. Grants use the service key, the session customer ID, a server-priced USD amount, a fixed `creditUnitsPerUsd: "100"`, and a stable purchase reference.

Changing the plain manifest does not change an already issued key. Update the existing key's permissions in Zorveus or replace `ZORVEUS_SERVICE_KEY` with a key that has both scopes, then restart. No CLI-store access is needed. The first scope enables reads; the second enables granting real credits after a simulated payment.
