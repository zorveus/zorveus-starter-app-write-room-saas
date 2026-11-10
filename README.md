# Write room

A standalone React and TypeScript writing app with trusted server handlers. Rewrite a draft, read your plan allowance, and inspect customer Activity through Zorveus. Alex uses Plus and Sam uses Plus Ultra. Each plan has its own server-only direct inference key. Customer identities, allowances, and history stay separate.

The completed app includes `zorveus.json`. Do not run `init` or a setup wizard to replace it.

## Get the completed app

This starter has not been published as a separate repository or download. For the supplied SDK checkout, copy the finished directory outside the monorepo:

```sh
cp -R /Users/peterakande/DevProjects/SDKs/zorveus-ts/examples/saas-starter /tmp/write-room
cd /tmp/write-room
npm ci
```

Alternatively, extract the delivered `saas-starter.tar.gz` into an empty directory:

```sh
tar -xzf saas-starter.tar.gz
cd saas-starter
npm ci
```

Use Node.js 22.12 or later, npm, and the Zorveus CLI. All dependencies resolve from npm. There are no workspace dependencies or sibling source imports. The app's server binds to loopback at `http://127.0.0.1:3000`.

## Prepare your account

You need a Zorveus account, an organization where you can create apps and keys, access to a working text-model route, and enough organization funding to pay for inference. An AI allowance limits customer usage. It does not fund the organization or collect subscription payments.

The bundled model is `gemini/gemini-3.5-flash-lite`. Both demo plan keys list this exact model ID. Paid generation checks previously used `openai/gpt-4o-mini`. See [Select a text model](docs/configuration.md#select-a-text-model) to choose another allowed model.

Install the CLI using the [CLI installation instructions](https://github.com/zorveus/zorveus-cli#installation). Then sign in and verify the selected organization:

```sh
zorveus login
zorveus whoami
```

For a local Zorveus installation, use the CLI's documented `--local` endpoint configuration consistently. The app needs both matching endpoint variables. Never mix a local management endpoint with a production gateway.

## Plan and apply the supplied manifest

Run these commands from the starter root:

```sh
zorveus validate
zorveus plan
cat zorveus.plan.json
```

Inspect the saved plan. Confirm the selected organization and these proposed resources:

- One Write room app with its configured allowed-model list, with `creditUnitsPerUsd: "100"`.
- One direct inference key named Plus at the stable reference `plus`.
- A $10 USD monthly AI allowance per Plus customer, equivalent to 1,000 configured credits.
- A second direct inference key, Plus Ultra at `plus_ultra`, with a $30 USD monthly allowance per customer, or 3,000 configured credits.
- `creditMode: "enforce"` and `overrunPolicy: "limit_output"`.
- One customer-read service key at `customers`, with only `product_users:read`.

Apply only after reviewing that plan:

```sh
zorveus apply --plan zorveus.plan.json --yes
```

These resources belong to your selected organization. They use your funding and credentials. Applying saves IDs into your local manifest and credentials through the CLI's credential store. Keep those IDs for subsequent plans. Do not redistribute an applied manifest, saved plans, apply journals, `.env`, or credential-store data.

Alex is assigned to `plus` and Sam to `plus_ultra` in trusted server state. Both generation and allowance reads use the direct key for that customer’s plan. Browser inputs cannot choose a plan or key.

Check that an unchanged configuration produces no changes:

```sh
zorveus plan
```

Expected remote result after a successful apply: `No changes.` This was verified against the installed CLI after the first live apply.

## Launch the app

The app reads server configuration from a local `.env` file or directly supplied process environment variables. It does not read the CLI credential store or run credential-retrieval commands.

For a new copy, create `.env` from the example without overwriting an existing file:

```sh
cp -n .env.example .env
```

Fill in your applied app ID, customer-read service key, and both direct inference keys:

- `ZORVEUS_APP_ID`
- `ZORVEUS_SERVICE_KEY`
- `ZORVEUS_PLUS_INFERENCE_KEY`
- `ZORVEUS_PLUS_ULTRA_INFERENCE_KEY`

Keep the two plan keys distinct. Configure `ZORVEUS_API_BASE_URL` and `ZORVEUS_GATEWAY_URL` together for local or custom backends. The default text model is `gemini/gemini-3.5-flash-lite`; use `ZORVEUS_MODEL_ID` for another allowed model. See [the environment reference](docs/configuration.md).

Start the server:

```sh
npm run preflight
PORT=3005 npm run dev
```

Open `http://127.0.0.1:3005`. Omit `PORT=3005` to use port 3000. Your current local `.env` already contains the applied values. A fresh copy must supply its own credentials.

The server loads `.env` at startup and preserves values already supplied by your process environment. Restart after editing environment values or server code. Frontend changes reload through Vite. Never prefix secret variables with `VITE_`, commit `.env`, or expose it to browser code. Without configuration, the app shows setup instructions and keeps generation disabled.

## Try both customers

1. Continue as Alex Morgan, Customer A. Confirm **Current plan: Plus**.
2. Read the live allowance. A setup default of 1,000 credits is not substituted for a missing response. A returned zero appears as zero.
3. Choose a sample starter or enter your own draft. Select **Rewrite text** once.
4. Read the generated text. The app refreshes allowance and Activity without clearing the output if either refresh fails.
5. Inspect the recorded amount, currency, charged credit units, and status in Activity. Open **Reference** to see the business activity ID. The rewrite also exposes its completion ID for correlation.
6. If a matching Activity entry has not appeared, wait for the two bounded follow-up reads or select **Refresh usage**. Pending confirmation does not prove a charge or a free request.
7. Select Sam Rivera, Customer B. Confirm **Current plan: Plus Ultra**, then compare the independent allowance and Activity. The app clears the previous customer's editor and billing state.

The first trusted allowance read deliberately passes `upsertIfMissing: true`. Zorveus can create a missing customer with `product_users:read` on this endpoint. Activity is lookup-only. Demo IDs are stable across sessions and restarts, so signing in again does not reset live credits. Every generation, allowance read, and Activity read uses the session's same external customer ID. Generation and allowance reads also use the same trusted plan key. Sam keeps the existing `write-room-demo-b` identity, so this change does not reset prior history or guarantee a fresh allowance.

If a rewrite returns HTTP 402 with `zorveus_reservation_insufficient_balance`, add funding to the selected Zorveus organization before trying again. Customer allowance credits limit usage; they do not supply organization funds.

`limit_output` uses Zorveus's reservation and output-limit behavior. It is not a promise that every request consumes an exact amount. The app shows denial codes and does not retry generation automatically after an ambiguous result.

## Check and distribute the starter

```sh
npm run check
npm run package
```

The archive is written to `artifacts/saas-starter.tar.gz`. Packaging refuses a manifest containing applied IDs or credential fields and includes only the app's source, documentation, tests, manifest, and lockfile. Do this before applying, or use a clean source copy for distribution.

Build and serve the frontend with:

```sh
npm run build
npm start
```

Demo sign-in is disabled in this production mode. Production authentication is intentionally an integration point; see the [server integration explanation](docs/integration.md). The default server is a local example, not an internet-facing deployment configuration.

The editor supports Command/Ctrl + Enter to rewrite, focus mode with Escape to return, draft clear/restore, copy confirmation, and an explicit **Use as draft** action. Samples only fill the editor and never generate automatically. Fonts are served locally.

After the completed flow, use the [base snapshot and integration tutorial](docs/tutorial.md) to study how billing was added. Review [verification results and outstanding live checks](docs/verification.md) before treating this as a live-validated quickstart.
