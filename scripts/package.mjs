import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
const manifest = JSON.parse(readFileSync('zorveus.json', 'utf8'));
const raw = JSON.stringify(manifest);
if (/"(?:id|appId|connectionId|serviceKeyId|credentialRef)"|zrv_/.test(raw)) throw new Error('Refusing to distribute applied IDs or credentials. Use the clean bundled manifest.');
const files = ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts', 'index.html', '.gitignore', '.env.example', 'zorveus.json', 'README.md', 'public', 'src', 'server', 'scripts', 'tests', 'base'];
for (const file of files) if (!existsSync(file)) throw new Error(`Missing release input: ${file}`);
const staging = mkdtempSync(join(tmpdir(), 'write-room-package-'));
try {
  const directory = join(staging, 'saas-starter');
  mkdirSync(directory);
  for (const file of files) cpSync(file, join(directory, file), { recursive: true });
  mkdirSync('artifacts', { recursive: true });
  const archive = resolve('artifacts/saas-starter.tar.gz');
  execFileSync('tar', ['-czf', archive, '-C', staging, 'saas-starter'], { env: { ...process.env, COPYFILE_DISABLE: '1' } });
  console.log(archive);
} finally { rmSync(staging, { recursive: true, force: true }); }
