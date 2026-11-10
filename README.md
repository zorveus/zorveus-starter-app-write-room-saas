# Write room

A React and TypeScript starter app a SaaS app credits and AI requests handled with Zorveus. Rewrite drafts, enforce customer allowances, inspect Activity, and add credits through a simulated checkout.

The demo includes three accounts: Alex Morgan and Jordan Lee on Plus, and Sam Rivera on Plus Ultra. Each customer has an independent allowance and Activity history. The server selects the direct inference key for their plan.

## Install

Use Node.js 22.12 or later and npm. From the project directory, install dependencies:

```sh
npm ci
```

Install the Zorveus CLI using its [installation instructions](https://github.com/zorveus/zorveus-cli#installation).

## Provision Zorveus

You need a Zorveus organization with access to the selected model and enough funding for inference.

Sign in, confirm your organization, and review the bundled manifest:

```sh
zorveus login
zorveus whoami
zorveus validate
zorveus plan
cat zorveus.plan.json
```

The manifest defines:

- A Write room app with 100 display credits per USD.
- A Plus direct key with a $10 monthly allowance per customer, equivalent to 1,000 credits.
- A Plus Ultra direct key with a $30 monthly allowance per customer, equivalent to 3,000 credits.
- Enforced allowances with the `limit_output` overrun policy.
- A customer service key with `product_users:read` and `product_users:write` for allowance, Activity, and credit grants.

After reviewing the plan, apply it:

```sh
zorveus apply --plan zorveus.plan.json --yes
```

The CLI records resource IDs in your local manifest. Preserve those IDs when updating existing resources. Use an unapplied manifest when distributing a fresh starter. Keep saved plans, CLI state, and credentials out of version control.

## Configure and run

Create your local environment file:

```sh
cp .env.example .env
```

Fill in these server-only variables with your own provisioned values:

| Variable | Value |
| --- | --- |
| `ZORVEUS_APP_ID` | Applied app ID |
| `ZORVEUS_SERVICE_KEY` | Service key with both product-user scopes |
| `ZORVEUS_PLUS_INFERENCE_KEY` | Direct key from `keys.plus` |
| `ZORVEUS_PLUS_ULTRA_INFERENCE_KEY` | Direct key from `keys.plus_ultra` |
| `ZORVEUS_MODEL_ID` | Model ID, defaults to `gemini/gemini-3.5-flash-lite` |

Keep the two inference keys distinct. The selected model must be allowed by your app and available to your organization. For a custom backend, set both `ZORVEUS_API_BASE_URL` and `ZORVEUS_GATEWAY_URL` to matching endpoints. The example uses the hosted Zorveus API.

Run the setup check and start the app:

```sh
npm run preflight
npm run dev
```

Open `http://127.0.0.1:3000`. Set `PORT` to use another port.

The preflight checks model listings and performs a lookup with customer creation disabled. It does not generate text or grant credits. A missing preflight customer alone does not establish whether app access works.

The server reads `.env` at startup, preserving existing process environment values. Restart after changing server code or environment values. Frontend changes reload through Vite. The app does not access the CLI credential store. Keep `.env` private and never prefix credentials with `VITE_`.

## Use the demo

Select an account, enter a draft or choose **Try a sample**, then select **Rewrite text**. Command/Ctrl + Enter also starts a rewrite. The editor supports focus mode, copy, clear and restore, and **Use as draft**.

Selecting an account loads its allowance and Activity. The first allowance read can create the customer in Zorveus. Switching accounts clears the editor and customer-specific UI state. Customer identities remain stable across sessions, so signing in again does not reset credits or history.

Activity shows recorded usage, credit purchases, amounts, and statuses. Generation is not automatically retried. If a result is uncertain, inspect Activity before submitting another rewrite.

### Add credits

Select **Add credits**, choose a pack, then continue to the payment simulation:

- 500 credits for $5
- 1,000 credits for $10
- 2,500 credits for $25

**Simulate payment** grants real Zorveus customer credits without collecting money. **Simulate decline** adds no credits. A successful grant refreshes the balance and Activity. Customer credits do not fund the organization wallet; inference still requires organization funding.

The service key needs `product_users:write` alongside `product_users:read`. For an existing setup, update that key's scopes in Zorveus or supply a replacement key in `.env`. Editing the manifest alone does not update remote permissions.

If confirmation fails, use **Retry same checkout**. Each order has a stable reference to prevent duplicate grants. Orders are held in memory for up to 24 hours and are lost on server restart. Real payments require persisted orders and a verified gateway webhook before issuing credits.

## Integration code

All runtime Zorveus API calls are in [server/zorveus.ts](server/zorveus.ts): rewrites, allowance reads, Activity, and credit grants. [server/api.ts](server/api.ts) manages demo sessions and routes. [server/demo-checkout.ts](server/demo-checkout.ts) manages simulated orders. [scripts/preflight.ts](scripts/preflight.ts) makes separate read-only setup checks.

The browser receives no credentials. Customer identity and plan selection come from trusted server state. The seeded sessions and checkout simulation are development features.

## Check and package

```sh
npm run check
npm run package
```

The archive is written to `artifacts/saas-starter.tar.gz`. Packaging includes source, tests, the README, the manifest, and dependency files. It excludes `.env`, CLI state, and local artifacts, and refuses manifests containing applied resource IDs or credentials.

Build and serve with:

```sh
npm run build
npm start
```

Production mode disables demo sign-in and checkout. Add production authentication before deploying for real users. The example server binds to loopback.

For the editor without billing, run `npm run dev:base`. See the [base snapshot](base/README.md).
