import type { Plan } from '../src/types.js';

export type Environment = Readonly<Record<string, string | undefined>>;
export const DEFAULT_MODEL = 'gemini/gemini-3.5-flash-lite';
export function readConfig(env: Environment, base = false) {
  const issues: string[] = [];
  const appId = env.ZORVEUS_APP_ID?.trim() || '';
  const serviceKey = env.ZORVEUS_SERVICE_KEY?.trim() || '';
  const inferenceKeys: Record<Plan, string> = {
    plus: env.ZORVEUS_PLUS_INFERENCE_KEY?.trim() || '',
    plus_ultra: env.ZORVEUS_PLUS_ULTRA_INFERENCE_KEY?.trim() || '',
  };
  const model = env.ZORVEUS_MODEL_ID?.trim() || DEFAULT_MODEL;
  const customEndpoint = Boolean(env.ZORVEUS_API_BASE_URL || env.ZORVEUS_GATEWAY_URL);
  const apiBaseURL = env.ZORVEUS_API_BASE_URL || (customEndpoint ? '' : 'https://api.zorveus.com');
  const gatewayURL = env.ZORVEUS_GATEWAY_URL || (customEndpoint ? '' : 'https://api.zorveus.com/v1');
  for (const [name, value] of Object.entries({ ZORVEUS_APP_ID: appId, ZORVEUS_SERVICE_KEY: serviceKey, ZORVEUS_PLUS_INFERENCE_KEY: inferenceKeys.plus, ZORVEUS_PLUS_ULTRA_INFERENCE_KEY: inferenceKeys.plus_ultra })) {
    if (!value) issues.push(`Set ${name} on the server, then restart the app.`);
  }
  if (inferenceKeys.plus && inferenceKeys.plus === inferenceKeys.plus_ultra) {
    issues.push('Set different direct inference keys for Plus and Plus Ultra.');
  }
  for (const [name, value] of Object.entries({ ZORVEUS_API_BASE_URL: apiBaseURL, ZORVEUS_GATEWAY_URL: gatewayURL })) {
    try {
      const url = new URL(value);
      if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol)) throw new Error();
      if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error();
    } catch { issues.push(`Set ${name} to an HTTPS endpoint or a local HTTP endpoint. Configure both endpoint variables together.`); }
  }
  if (base) issues.splice(0, issues.length, 'This learning snapshot has no Zorveus billing integration. Open the completed app to rewrite text.');
  return { appId, serviceKey, inferenceKeys, model, apiBaseURL, gatewayURL, issues, ready: issues.length === 0, base };
}
export type ServerConfig = ReturnType<typeof readConfig>;
