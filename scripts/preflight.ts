import { existsSync } from 'node:fs';
import { Zorveus, ZorveusError, ZorveusServiceClient } from '@zorveus/sdk';
import { readConfig } from '../server/config.js';
if (existsSync('.env')) process.loadEnvFile('.env');
const config = readConfig(process.env);
if (!config.ready) {
  for (const issue of config.issues) console.log(`FAIL configuration: ${issue}`);
  process.exitCode = 1;
} else {
  console.log('PASS local configuration: all required server inputs are present. Values are not printed.');

  const service = new ZorveusServiceClient({ apiKey: config.serviceKey, baseURL: config.apiBaseURL, timeout: 15_000, maxRetries: 0 });
  const fail = (field: string, error: unknown) => {
    const code = error instanceof ZorveusError && error.code && /^[a-z_0-9]{1,80}$/.test(error.code) ? error.code : 'unavailable';
    console.log(`FAIL ${field}: ${code}. Check endpoint, credential, and app access. No secret or upstream error text is printed.`);
    process.exitCode = 1;
  };
  for (const [plan, apiKey] of Object.entries(config.inferenceKeys)) {
    const inference = new Zorveus({ apiKey, baseURL: config.apiBaseURL, gatewayBaseURL: config.gatewayURL, timeout: 15_000, maxRetries: 0 });
    try {
      const models = await inference.models.list();
      const listed = models.data.some(model => model.id === config.model);
      console.log(listed ? `PASS ${plan} model listing: selected model is listed. This does not prove funding or inference works.` : `FAIL ${plan} model selection: choose an available text model and update allowedModels through plan/apply.`);
      if (!listed) process.exitCode = 1;
    } catch (error) { fail(`${plan} direct inference key / model listing`, error); }
  }
  try {
    // No selector: selected-key reads persist last_app_connection_id even with upsert disabled.
    // This reserved identity is never used by the demo. No creation and no generation.
    await service.productUsers.getByExternalId({ appId: config.appId, externalUserId: 'write-room-preflight-read-only', upsertIfMissing: false });
    console.log('PASS customer lookup: the reserved preflight customer already exists; no creation requested.');
  } catch (error) {
    if (error instanceof ZorveusError && error.status === 404) console.log('INFO customer lookup: resource not found with creation disabled. A 404 alone does not prove app access. No customer was created.');
    else fail('ZORVEUS_SERVICE_KEY / customer lookup', error);
  }
}
