import { readFileSync, readdirSync } from 'node:fs';
const assets = readdirSync('dist/assets').filter(name => name.endsWith('.js'));
const bundle = assets.map(name => readFileSync(`dist/assets/${name}`, 'utf8')).join('\n');
for (const name of ['ZORVEUS_SERVICE_KEY', 'ZORVEUS_INFERENCE_KEY', 'ZORVEUS_PLUS_INFERENCE_KEY', 'ZORVEUS_PLUS_ULTRA_INFERENCE_KEY', 'ZORVEUS_APP_ID']) {
  const value = process.env[name];
  if (value && bundle.includes(value)) throw new Error(`Browser bundle contains a value from ${name}.`);
}
for (const marker of ['class ZorveusServiceClient', 'write_room_session', '/product-users/by-external-id']) {
  if (bundle.includes(marker)) throw new Error('Server integration code was found in the browser bundle.');
}
console.log('PASS browser bundle: no supplied server credentials or server integration markers.');
