# Support the bundled SaaS starter and optional setup wizard

Support the main starter experience: clone the completed app with its included `/Users/peterakande/DevProjects/SDKs/zorveus-ts/examples/saas-starter/zorveus.json`, sign in, plan, apply, launch, and test. The starter already defines a Plus plan. Developers must not need a wizard or initialization command before applying that manifest

Also provide an optional guided setup for developers configuring their own applications or customizing plans. It starts with one plan and can add further plans in the same session. Keep this customization path distinct from the ready-made starter quickstart

Work in the [CLI repository](/Users/peterakande/DevProjects/SDKs/zorveus-cli). Read its [repository instructions](/Users/peterakande/DevProjects/SDKs/zorveus-cli/AGENTS.md) first. Read the companion [starter app handoff](/Users/peterakande/DevProjects/SDKs/zorveus-ts/zorveus_saas_starter_app_handoff.md), especially its supplied manifest and environment contract. Coordinate changes to that contract with the app agent

This handoff authorizes implementation and local verification. Commit, push, publication, and remote resource changes still follow the user's explicit authorization and the target repository's rules

## Inspect the existing workflow

The reviewed CLI already provides `init`, `validate`, `plan`, `apply`, `status`, import, clone, promotion, an OS credential store, and an MCP server. Preserve those behaviors and reuse their implementations

Start with these sources. All file and directory references below are absolute paths:

| Source | Purpose |
| --- | --- |
| [/Users/peterakande/DevProjects/SDKs/zorveus-cli/internal/cli/manifests.go](/Users/peterakande/DevProjects/SDKs/zorveus-cli/internal/cli/manifests.go) | Existing initialization and validation commands |
| [/Users/peterakande/DevProjects/SDKs/zorveus-cli/internal/manifest](/Users/peterakande/DevProjects/SDKs/zorveus-cli/internal/manifest) | Manifest loading, schema, validation, and file handling |
| [/Users/peterakande/DevProjects/SDKs/zorveus-cli/internal/provision](/Users/peterakande/DevProjects/SDKs/zorveus-cli/internal/provision) | Resource planning, apply, and recovery |
| [/Users/peterakande/DevProjects/SDKs/zorveus-cli/internal/provision/secrets.go](/Users/peterakande/DevProjects/SDKs/zorveus-cli/internal/provision/secrets.go) | Existing `SecretStore` and `CredentialStore` |
| [/Users/peterakande/DevProjects/SDKs/zorveus-cli/examples/subscriptions.json](/Users/peterakande/DevProjects/SDKs/zorveus-cli/examples/subscriptions.json) | Current allowance policy example |
| [/Users/peterakande/DevProjects/SDKs/zorveus-cli/examples/business-credits.json](/Users/peterakande/DevProjects/SDKs/zorveus-cli/examples/business-credits.json) | Current app credit-unit configuration |
| [/Users/peterakande/DevProjects/SDKs/zorveus-cli/examples/service-key-backend.json](/Users/peterakande/DevProjects/SDKs/zorveus-cli/examples/service-key-backend.json) | Current service-key configuration |
| [/Users/peterakande/DevProjects/SDKs/zorveus-cli/docs/mcp.md](/Users/peterakande/DevProjects/SDKs/zorveus-cli/docs/mcp.md) | Existing agent workflow and secret-handling boundaries |

Recheck these sources before implementation. The reviewed `init` creates an app and allowed-model list. The wizard and application credential delivery described below are proposed additions

## Support the supplied starter manifest first

The app agent owns the standalone starter and its bundled `/Users/peterakande/DevProjects/SDKs/zorveus-ts/examples/saas-starter/zorveus.json`. Agree on that file before building the launch integration. It describes one app, a direct inference key under `plus` displayed as Plus, a $10 per-customer monthly AI allowance, 100 credit units per USD, and a shared customer-read service key under `customers`. Follow the companion handoff for enforcement and permission details

The developer's main resource setup path, after CLI sign-in, is:

```sh
zorveus plan
zorveus apply --plan zorveus.plan.json --yes
```

Plan must work against the file that shipped with the clone. The developer reviews it before apply. Do not require `setup`, `init`, a template selection, or manual reconstruction of the manifest on this path

Use the existing planner and applier to create resources in the selected organization, save credentials in the OS credential store, and write IDs back to the developer's local manifest. Distribute no applied IDs or maintainer credentials with the app. A repeat plan should propose zero changes when the configuration matches

Complete the credential-delivery launch workflow below so developers can run the app using their own keys without opening a credential-store GUI or passing secrets through chat. Provide the exact implemented launch command after resource setup. Do not claim that current apply starts the app automatically, and preserve its existing behavior

The app's first version visibly demonstrates one plan, Plus. Configuring additional plans through the optional wizard does not require the app to grow a subscription checkout or upgrade UI

## Provide an optional guided setup

Use `zorveus setup` as the proposed guided entry point for a new application or explicit customization. It should take the developer through sign-in, organization selection, app configuration, plan review, approved apply, and an optional application launch. Do not end this optional wizard by handing the developer a list of commands to join together manually

Reuse the existing login, validation, planning, apply, and credential-store implementations. Check an existing session before requesting sign-in. Show the selected organization and API endpoint before remote operations. Keep the distinction between local preparation and remote resource creation visible

Keep ordinary `init` compatible. Provide an offline SaaS manifest builder as well, with a proposed interface such as `zorveus init --starter saas`. Supply explicit non-interactive inputs for the same one-plan and multi-plan configurations. Guided setup and offline initialization must use the same validated builder. Its default SaaS template should agree with the app's supplied Plus manifest. These command additions are proposals until implemented; users of the cloned starter do not need to run them

Offline initialization must refuse to overwrite an existing destination. On a later `setup` run, detect an existing manifest and offer to check it, review changes, or launch with its existing configuration. Preserve resource IDs and credential references. Do not initialize another app or rotate working credentials merely because setup runs again

## Configure plans in the optional wizard

Ask for the application name, the model for the first text request, and credit units per USD. Ask for the conversion rate once at app level. Explain each question in customer-facing terms. Use an explicit selected model. Where the existing APIs and permissions support discovery, offer available text models with readable names. Otherwise explain how to find a suitable model ID and accept it explicitly. Offline initialization must not depend on remote discovery

Then ask for the first plan's display name and finite monthly AI allowance per customer in USD. Show its resulting credit allowance using decimal-safe arithmetic. For example, at 100 credits per USD, a Plus plan with a $10 monthly AI allowance supplies 1,000 credits per customer

After each plan, offer `Continue with these plans` or `Add another plan`. Make continuation the default. If the developer adds another plan, collect its name and monthly AI allowance, show its credit allowance, and repeat the choice. Require at least one plan. Developers must be able to configure Plus, Premium, and further plans without restarting the wizard

Give each plan a unique, stable manifest reference, such as `plus` or `premium`. Keep that reference distinct from its editable display name and explain any naming collision. It is local CLI bookkeeping, not a new backend alias field or routing resource. Equivalent interactive and explicit inputs must produce equivalent manifests

Explain that these allowances control AI usage. The application and its payment provider own subscription prices, payment collection, customer subscriptions, and plan assignments. Do not treat a subscription price as its AI allowance. Keep organization funding requirements visible

Generate one app, one direct inference key and finite monthly allowance policy per configured plan, and one shared service key named `customers`. Use `plus` and the supplied starter defaults for the default SaaS template. Use the existing manifest fields and backend policy semantics. Configure credit enforcement and the existing `limit_output` overrun policy, then explain its behavior without promising stronger limits than the backend guarantees

Keep routing keys, OAuth wallet connections, provider credential setup, purchased credit packs, and live subscription changes outside this starter wizard. Preserve access to those capabilities through the existing CLI workflows. Configuring several plan policies here does not require the starter app to implement subscription purchase or upgrade screens

The service key needs `product_users:read` for the starter's customer allowance and Activity reads. The app uses the SDK's explicit `upsertIfMissing` option when it first reads a missing customer. Verify that contract against the current backend. Add write permission only if a separately justified operation needs it

Verify that each configured policy provides the intended per-customer allowance. Test with two customer IDs sharing a plan's inference key and with isolated customers on different plan keys. A key-level or organization-wide limit must not be presented as a fresh allowance for each customer. Do not promise that changing a customer's selected plan resets prior usage

## Show the proposed guided experience

Use a flow like this for the optional customization wizard. The normal starter quickstart uses the included JSON and plan/apply instead. The commands and prompts below describe the proposed experience, not already implemented features

```text
$ zorveus setup

Custom SaaS setup selected.
Sign in to Zorveus? Continue in browser
Organization: Acme

Application name: Acme Writer
Text model: select an available text model or enter its ID
Credit units per USD: 100

First plan name: Plus
Monthly AI allowance per customer in USD: 10
Plus: 1,000 credits per customer per month

Continue with these plans / Add another plan: Add another plan
Plan name: Premium
Monthly AI allowance per customer in USD: 30
Premium: 3,000 credits per customer per month

Continue with these plans / Add another plan: Continue

Review:
  App: Acme Writer
  Plus: $10 monthly AI allowance, 1,000 credits, direct inference key
  Premium: $30 monthly AI allowance, 3,000 credits, direct inference key
  Shared customer-read service key
  Credentials saved in the OS credential store

Show detailed plan? Yes
Apply the reviewed changes? Yes

Resources ready.
Use which plan for the starter app? Plus
Launch the starter app with these credentials? Yes

Starting the app with server-only credentials.
Next: sign in as a test customer and rewrite some text.
```

An existing login can skip browser sign-in. A developer can finish after the first plan. Always show all configured plans in the combined review before apply, including their USD allowances and displayed credit units

## Preserve review and apply

Within guided setup, call the existing validation, planning, and apply operations. Show the detailed saved plan and require approval before remote changes. Review all configured plans together rather than applying each plan as it is entered. Keep saved-plan recovery intact. The offline path should print the corresponding existing commands for developers who prefer to run each step separately

Handle cancellation without leaving a partially written manifest. In a non-interactive process, fail with actionable missing-input errors instead of waiting for a prompt. JSON output must remain machine-readable and contain no secrets

Use stable resource names so rerunning the workflow can reuse the applied manifest and existing credential-store entries. An already provisioned starter must not create duplicate resources or rotate working keys merely to launch the app

## Deliver credentials into the app process

Implement one explicit way to launch a child process with the starter's application credentials loaded from the existing credential store. Prefer process environment injection for the first release

A proposed interface is `zorveus exec --config zorveus.json -- npm run dev`. Finalize command syntax in the CLI repository, document it, and give the app agent the exact supported command. Do not publish this proposal as a working command before it exists

Resolve the applied app ID, the selected plan's inference credential, the `customers` service credential, the model configuration, and the configured API endpoints. With the supplied starter manifest, select its sole `plus` key automatically. Resolve the agreed tested model default or server-only override without requiring the optional wizard. Do not add unsupported fields to the manifest schema merely to transport runtime settings

For custom manifests with several plans, require an explicit choice for launch and provide an equivalent non-interactive selector using the stable manifest reference

Follow the [shared environment contract](/Users/peterakande/DevProjects/SDKs/zorveus-ts/zorveus_saas_starter_app_handoff.md#use-the-shared-environment-contract). Inject only the selected plan's credential as `ZORVEUS_INFERENCE_KEY`. The bundled starter displays Plus and resolves both demo customers to that policy on the server. Additional plans in custom manifests do not automatically add app subscriptions or browser-controlled policy selection. Do not inject every plan key. Coordinate any environment-contract changes with the app agent

When launching the bundled Plus-only app, use its `plus` credential. Selecting another plan for a custom application requires that application's trusted plan mapping to match. Do not launch the Plus-labelled starter with a Premium key and describe its allowance as Plus

Resolve credentials for the active API endpoint and organization, not an unrelated credential-store account with a similar resource name

Require an unambiguous selection. If a credential is unavailable, explain how to recover or explicitly rotate it through the existing workflow. Never rotate a key as a hidden side effect of launching the app

Preserve unrelated environment variables. For conflicting Zorveus variables, fail with an explanation or require an explicit override. Do not silently combine credentials and endpoints from different environments

Execute an argument vector directly, preserve the child's working directory, propagate cancellation, and return its exit status. Keep credentials out of command arguments, CLI diagnostics, manifests, saved plans, journals, JSON output, and MCP responses. Do not return secret values to an agent as a substitute for process injection

If the product also needs environment-file export, treat it as a separate explicit operation. Show the destination, protect file permissions, preserve unrelated configuration, and handle overwrite approval through the established command policy. Process injection is sufficient for this first handoff

## Check whether setup is usable

Provide a read-only preflight for the starter, using the command structure that best fits the CLI. Check the required local inputs, selected account and organization, stored credentials, app access, model listing, and selected-policy customer lookup where available

Report each check separately with its affected field and next action. A missing customer is a setup state, and read-only checks must leave it missing. A successful model listing does not prove that inference or organization funding works

Make any customer-creation probe or chargeable inference check explicit and opt-in. Use an isolated test customer for those checks. Preserve stable error codes and request identifiers where the current SDK or API exposes them

## Document the complete user path

Make the SaaS starter discoverable from the CLI's first-app documentation. Lead with the already included manifest and the clone/plan/apply/launch/test path. Link to the starter app's tutorial and use its exact environment names and terminology

Document CLI login, funding and model-access prerequisites, the supplied Plus configuration, plan review, apply, credential delivery, application launch, first request, balance, and Activity. Explain which values are ready-made defaults and how developers can edit them before planning. State when customer creation occurs and how settlement can affect when Activity appears

Document the optional wizard separately for custom applications and additional plans. Include a Plus/Premium example completed in one wizard session. Do not replace the supplied manifest with a wizard-generated file in the starter quickstart

Keep installation and model examples current when implementing. Verify selected versions and model availability, and record what was tested. Describe the five-minute setup time as a measurement target until a fresh user completes the published flow

## Prove the result

Test wizard input, cancellation, decimal validation, overwrite protection, non-interactive behavior, and equivalent manifests from equivalent inputs. Cover continuing after one plan, adding several plans in one session, duplicate plan references, combined review, rejection before apply, and rerunning setup without duplicate resources or hidden rotations. Exercise provisioning and recovery through the existing harness

Test credential selection and missing credentials with an injected credential store. Verify automatic selection for a single plan and explicit selection for multiple plans. Confirm that the child receives the selected plan key and no other plan keys. Verify unrelated environment preservation, conflict handling, argument handling, exit status, cancellation, and redacted output

Complete a joint test with the app agent. From a fresh standalone clone containing its actual bundled `/Users/peterakande/DevProjects/SDKs/zorveus-ts/examples/saas-starter/zorveus.json`, follow only the published quickstart. Do not run init or setup to replace that manifest. Plan, review, apply, launch without manually copying secrets, make an attributed request, read the customer's Plus allowance, and find the request in Activity. Check that an unchanged repeat plan proposes no resource changes

Verify the optional wizard separately with one-plan and multi-plan inputs, so success there does not stand in for testing the supplied-manifest path

Record the commands, versions, elapsed setup time, remaining manual steps, and any unavailable live checks. A mocked inference result establishes local behavior only. Record the real request and billing outcome separately

The starter integration is complete when its bundled manifest can be planned and applied without initialization or a wizard, and the implemented launch workflow supplies the developer's own credentials to a working Plus customer flow. The optional wizard must separately support one or more plans in one session, combined review before apply, and equivalent non-interactive inputs. Existing CLI workflows must retain their behavior, and published instructions must contain only implemented commands
