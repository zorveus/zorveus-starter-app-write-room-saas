# Build the cloneable SaaS starter app

Build a small AI writing app that demonstrates customer plans, AI allowances, and usage billing with Zorveus. Ship the completed app with a ready-made `/Users/peterakande/DevProjects/SDKs/zorveus-ts/examples/saas-starter/zorveus.json`. The main experience is clone, plan, apply, launch, and test using resources created in the developer's own Zorveus account

Use TypeScript and React with trusted server handlers. The planned implementation directory is `/Users/peterakande/DevProjects/SDKs/zorveus-ts/examples/saas-starter` in the [TypeScript SDK repository](/Users/peterakande/DevProjects/SDKs/zorveus-ts). Create that directory as part of this task. Read that repository's instructions and inspect existing example conventions first. Keep the directory independently installable so it can be copied or distributed as a standalone starter

Read the companion [CLI starter handoff](/Users/peterakande/DevProjects/SDKs/zorveus-ts/zorveus_cli_saas_starter_handoff.md). Coordinate credential delivery and the environment contract with the CLI agent. The starter does not require `zorveus setup` or `zorveus init`: its manifest is already included. The wizard remains an optional path for customizing resources or setting up another application. This task covers the app, its manifest, its tutorial, and its tests. Commit, push, deployment, and publication remain subject to explicit user authorization

## Make the supplied manifest the main setup path

Place a valid `/Users/peterakande/DevProjects/SDKs/zorveus-ts/examples/saas-starter/zorveus.json` at the standalone app's root beside its package manifest. It must be present in a fresh clone. The developer should not need to generate it, complete a wizard, or manually assemble billing configuration before the first plan

After CLI sign-in and the documented installation prerequisites, the resource setup path is:

```sh
zorveus plan
zorveus apply --plan zorveus.plan.json --yes
```

Tell developers to inspect the saved plan before apply. These commands create resources in their selected organization. They do not borrow an app, key, allowance, or funds from the example maintainer. Keep the selected organization and funding prerequisites visible

The supplied manifest must use the existing schema to describe:

- One app with its allowed-model configuration and `creditUnitsPerUsd: "100"`.
- One direct inference key under the stable manifest reference `plus`, displayed as `Plus`.
- A finite per-customer monthly AI allowance of `"10"` USD for Plus, yielding 1,000 included credit units at the configured rate.
- `creditMode: "enforce"` and `overrunPolicy: "limit_output"`, using the backend's existing semantics.
- One service key under `customers`, with `product_users:read` for the required customer reads. Verify first-read upsert behavior before requesting broader permissions.

The distributable manifest must contain no resource IDs, credentials, or organization-specific state. Applying it adds the developer's resource IDs to their local copy. Preserve those IDs on later runs. Do not distribute applied manifests, CLI journals, or credential-store entries

Validate the bundled file with the current CLI before delivery. Support changing its app name, allowance, and other settings through the ordinary reviewed plan/apply workflow. Reuse the same starter configuration in any optional CLI template so its resource names and defaults agree

Ship a tested default text-model configuration and document how to select another model if account access differs. Do not put a placeholder model ID into a manifest that users are told to apply unchanged. Use existing manifest fields; do not invent a runtime-model property in the CLI schema. Agree with the CLI agent how the default and any server-only override are resolved so the normal launch does not require a model wizard or manual source edits

After apply, use the implemented credential-delivery launch path agreed with the CLI agent. It must supply the developer's app ID and keys to the server without manual credential retrieval. The launch step is separate from resource creation. Do not claim that current `apply` automatically starts the app or that a proposed launch command already exists

## Keep the first app small

Provide a text input, one action that rewrites the text, the resulting output, a visible current-plan section, a customer allowance display, and a customer Activity list. Use the single Plus plan from the bundled manifest and its directly selected inference key

Make the plan concept explicit. Assign both demo customers to `plus` in trusted server state and show `Current plan: Plus` in the UI. Explain in the tutorial that the backend maps that plan assignment to the Plus inference connection for both generation and allowance reads. Show monthly policy details and remaining credits from authoritative responses where available. The default 1,000-credit allowance is configuration, not a fabricated live balance

Use existing application authentication if the target already provides it. For a standalone local example, two seeded demo accounts with server-generated sessions are sufficient. Label demo sign-in clearly, disable it outside development, and document where production authentication replaces it

Resolve the customer ID from the server session for every request. Preserve the same external customer ID across inference, balance, and Activity calls. A browser-supplied ID, inference key, model selection, plan, or allowance must not override trusted server configuration

The app and its payment provider own subscription collection and entitlements. Zorveus supplies AI usage enforcement, customer allowance, and recorded usage charges. This first example demonstrates those operations without a payment-provider integration. Purchased credit packs and plan changes belong in follow-up tutorials

The general CLI wizard can configure additional plans, but this starter demonstrates only Plus. The first version does not need a pricing comparison, subscription checkout, or plan-switching screen. Document where another server-side plan mapping would be added later

## Use the shared environment contract

Use these server-only variables in the app and CLI. They are the proposed shared contract for this starter, not a claim that the current CLI exports them

| Variable | Meaning |
| --- | --- |
| `ZORVEUS_API_BASE_URL` | Management API origin, such as `https://api.zorveus.com` |
| `ZORVEUS_GATEWAY_URL` | Inference base URL, such as `https://api.zorveus.com/v1` |
| `ZORVEUS_APP_ID` | Applied Zorveus app ID |
| `ZORVEUS_SERVICE_KEY` | Organization service credential for customer reads |
| `ZORVEUS_INFERENCE_KEY` | Direct inference credential for the bundled `plus` plan |
| `ZORVEUS_MODEL_ID` | Server-only model selection or override, resolved with the shipped, tested default |

Use the configured endpoint pair together. Do not derive production endpoints when the developer supplied a local configuration. Read the selected policy and conversion from Zorveus rather than introducing separate app-side allowance or conversion settings that can drift

Ship an `/Users/peterakande/DevProjects/SDKs/zorveus-ts/examples/saas-starter/.env.example` containing variable names and descriptions without real credentials. Prefer the CLI's process environment injection once implemented. Support direct server environment configuration as a documented alternative. Manual environment editing and a setup wizard must not be prerequisites for the main clone/plan/apply/launch path

Validate configuration at startup. With incomplete setup, show an actionable configuration state and disable generation. Keep secret values out of error text, logs, browser bundles, browser responses, and public environment variables

## Integrate through the current SDK

Inspect the current public SDK before writing the integration. These existing source files and directories are the starting points. Their references use absolute paths:

| Source | Purpose |
| --- | --- |
| [/Users/peterakande/DevProjects/SDKs/zorveus-ts/packages/sdk/README.md](/Users/peterakande/DevProjects/SDKs/zorveus-ts/packages/sdk/README.md) | Public clients, attribution, allowance, Activity, and decimal guidance |
| [/Users/peterakande/DevProjects/SDKs/zorveus-ts/packages/sdk/src/service-client.ts](/Users/peterakande/DevProjects/SDKs/zorveus-ts/packages/sdk/src/service-client.ts) | Management client and endpoint configuration |
| [/Users/peterakande/DevProjects/SDKs/zorveus-ts/packages/sdk/src/resources/product-users.ts](/Users/peterakande/DevProjects/SDKs/zorveus-ts/packages/sdk/src/resources/product-users.ts) | Customer reads and Activity methods |
| [/Users/peterakande/DevProjects/SDKs/zorveus-ts/packages/sdk/src/types/product-users.ts](/Users/peterakande/DevProjects/SDKs/zorveus-ts/packages/sdk/src/types/product-users.ts) | Selected-policy parameters and response types |
| [/Users/peterakande/DevProjects/SDKs/zorveus-ts/examples](/Users/peterakande/DevProjects/SDKs/zorveus-ts/examples) | Existing example applications and server integration conventions |

Treat the existing example as evidence to review. Verify attribution and request-context behavior against the current SDK instead of copying it without checking

For response details, read the SDK's [customer Activity guidance](/Users/peterakande/DevProjects/SDKs/zorveus-ts/packages/sdk/README.md#list-customer-activity), [selected-key allowance and credit-unit guidance](/Users/peterakande/DevProjects/SDKs/zorveus-ts/packages/sdk/README.md#selected-key-allowance-reads-and-credit-units), and response types. These references use absolute paths in the TypeScript SDK checkout. Preserve the documented customer-facing fields and permission boundaries. Keep the standalone tutorial self-contained or link to published documentation; it must not depend on missing handoff files or sibling source checkouts

Keep Zorveus calls in a small server integration module with clear operations for inference, customer allowance, and customer Activity. Use the public SDK, preserve useful error information, and avoid a new generic gateway framework

Use either the native `Zorveus` inference client or `ZorveusOpenAI` for this example. Choose one and use it consistently. Configure its inference endpoint and credential on the server. Attach the authenticated customer's external ID to every generation request

Use `ZorveusServiceClient` for `productUsers.getByExternalId` and `productUsers.listActivityByExternalId`. The reviewed SDK supports passing `inferenceKey` to the customer read to select the same policy used for generation. Pass it explicitly

Missing-user reads currently default to 404. Use `upsertIfMissing: true` deliberately on the first trusted customer read if the example creates missing product users that way. Explain this step in the tutorial. A configuration preflight must remain read-only

Attach a business-defined activity ID and label to generation using the SDK's documented usage metadata mechanism. Preserve a request identifier when the SDK exposes one. Do not invent response headers, settlement statuses, or unsupported SDK methods

## Display balances and Activity honestly

Use the selected-policy `allowance.remaining_credit_units` for the customer credit balance when the app configures a credit-unit conversion. The grant-only credit summary does not include the base allowance. Existing monetary getters retain their currency meaning

Preserve financial quantities as decimal strings. Use the SDK's decimal formatter for display and compatible decimal arithmetic if an operation needs calculation. Test quantities with long fractional parts. Represent missing or unknown balances as unavailable, and preserve a genuine zero as zero

Use the customer-scoped Activity method with opaque pagination. Keep customer identity and filters stable between pages. Show the API's recorded amounts, units, currency, labels, and statuses. Follow the SDK's documented credit-unit contract when presenting historical entries. Do not reconstruct settled charges using the current conversion rate

After generation, refresh the balance and Activity. If settlement is delayed, show that the latest usage is pending confirmation using the evidence the API provides. Do not mark every failed provider request as free or invent a completed charge before it appears

Keep independent loading, empty, unavailable, denied, failed, and completed states. A failed balance refresh must leave the generated text readable. Bound automatic refresh attempts and provide a manual refresh action

When Zorveus rejects usage because allowance is exhausted, show a useful explanation and preserve the response code. Avoid automatic retries of a chargeable generation request after a timeout or ambiguous result. Balance and Activity reads can use bounded retry behavior

## Make the completed app the quickstart

Lead with the completed app and its supplied `/Users/peterakande/DevProjects/SDKs/zorveus-ts/examples/saas-starter/zorveus.json`. Publish exact clone or download instructions for the supported distribution method once available. Verify that the extracted standalone directory runs outside this monorepo

The primary guide must walk through these observable steps:

1. Clone the completed app and install its published dependencies.
2. Sign in to the CLI and confirm the selected organization. Explain account, model-access, and funding prerequisites.
3. Run `zorveus plan` against the included manifest and inspect the proposed app, Plus allowance, and customer-read service key.
4. Apply the reviewed saved plan to create the developer's resources.
5. Launch using the implemented CLI credential-delivery path.
6. Sign in as demo customer A and see `Current plan: Plus` and the allowance returned by Zorveus.
7. Rewrite text, inspect the returned output, and refresh the balance and Activity.
8. Sign in as demo customer B to verify a separate customer allowance and history under the same Plus policy.

Reusing an account or restarting the app does not reset its live credits. Describe settlement delays using API evidence. Keep sample prompts and local demo authentication distinguishable from actual returned balances, output, and charges

## Explain the integration after the first success

Provide a small runnable base snapshot without Zorveus billing and a completed integration. Use a documented base commit or a small base source directory. Reuse application code where practical, and avoid maintaining two accounting implementations

In the base snapshot, clearly show that Zorveus billing is not configured. Do not ship an unmetered paid provider call as an automatic fallback. Make the completed app the main runnable example

Offer the base snapshot and step-by-step integration tutorial after the quickstart, as a separate learning path. Explain the small server integration module, the trusted customer-to-Plus assignment, request attribution, selected-key allowance reads, and customer Activity. Explain who pays and what the displayed balance includes beside the first example. Learning how to add the SDK must not require recreating the supplied manifest by hand

Use the existing plan and apply commands for the resource setup instructions. Document the exact application-launch command once the CLI agent implements it. Until then, label launch proposals as pending and provide a verified manual credential-configuration alternative with the remaining friction disclosed. Do not advertise the no-copy launch path as complete before it exists. Document the tested CLI and SDK versions, supported model default, and model selection procedure

For standalone use, provide a package manifest and lockfile that resolve published dependencies. A copied starter must not require unpublished workspace packages, sibling source paths, or secrets from an example maintainer's machine

Keep installation, build, and launch instructions reproducible. Provide a clear account and funding prerequisite section. Record measured setup time without claiming a five-minute result that has not been demonstrated

## Prove the customer flow

Test the bundled unapplied manifest against the current CLI schema. Verify that it contains the `plus` and `customers` references, the documented monthly allowance and conversion, and no resource IDs or secrets. Test the server routes through their public behavior with injected SDK clients or transports. Verify that both demo customers have trusted Plus assignments, a customer cannot read another customer's allowance or Activity, and browser inputs cannot choose another policy

Test balance formatting, a genuine zero, unknown values, long fractional quantities, Activity pagination, unavailable services, missing configuration, and preservation of completed output after a refresh fails. Verify that the completed browser bundle and responses contain no server credentials

Use two isolated customers sharing the same plan key. Verify independent customer identity, allowance, and Activity. Exercise allowance exhaustion with a controlled policy. Avoid asserting an exact provider price or exact token charge as a permanent test fixture

Complete a joint live check with the CLI agent using the actual bundled manifest from a fresh standalone copy and only the published instructions. Do not generate another manifest with init or setup for this test. Plan, inspect, apply, launch with injected credentials, make one real attributed text request, and show its Plus allowance and Activity outcome. Verify that rerunning plan after apply proposes no changes when configuration is unchanged. Record pending settlement honestly and keep request correlation available for diagnosis

Drive the app in a browser and capture the configured, successful, and denied states. Supply reproduction steps and record checks that remain unavailable. Mocked tests and a successful build alone do not establish that the live integration works

The handoff is complete when a fresh copy already contains a valid `/Users/peterakande/DevProjects/SDKs/zorveus-ts/examples/saas-starter/zorveus.json`, the developer can plan and apply it without a wizard, and the implemented launch path supplies their own credentials. The running app must visibly demonstrate Plus, independent customer allowances, a real attributed request, and Activity. The standalone guide and optional learning tutorial must reproduce those results without undocumented assistance
