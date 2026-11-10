import { readConfig, type Environment } from '../server/config.js';
// Runnable billing-free snapshot. Reuses the app without a second accounting implementation.
export function baseConfig(environment: Environment) { return readConfig(environment, true); }
