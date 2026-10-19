import nextEnv from '@next/env';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root = process.cwd();
nextEnv.loadEnvConfig(root, false);
const production = process.argv.includes('--production');
if (production && (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') || process.env.NEXT_PUBLIC_CONVEX_URL?.includes('scrupulous-barracuda-795'))) {
  throw new Error('Production packaging requires a production Clerk instance and the production Convex URL. The default build is a preview.');
}
const run = args => { const result = spawnSync(process.execPath, args, { stdio: 'inherit' }); if (result.status !== 0) process.exit(result.status ?? 1); };
run(['scripts/desktop-compile.mjs']);
// A release must reflect the selected cloud catalog, not another build's
// persisted "use cache" snapshot (including its anonymous/offline fallback).
if (production || !process.argv.includes('--reuse-cache')) await rm(path.resolve(root, '.next/cache'), { recursive: true, force: true });
run(['node_modules/next/dist/bin/next', 'build', '--webpack']);
const target = path.resolve(root, 'desktop-build/web');
if (!target.startsWith(path.resolve(root, 'desktop-build') + path.sep)) throw new Error('Unsafe staging path');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
const filter = source => !path.relative(root, source).split(path.sep).some(part => part.startsWith('.env') || ['.git', '.clerk', '.convex', 'outputs', 'release', 'desktop'].includes(part)) && !/\.(pem|key|pfx|p12)$/i.test(source);
await cp('.next/standalone', target, { recursive: true, dereference: true, filter });
await cp('public', path.join(target, 'public'), { recursive: true, dereference: true, filter });
await cp('.next/static', path.join(target, '.next/static'), { recursive: true, dereference: true, filter });
const publicConfig = {};
for (const key of ['NEXT_PUBLIC_CONVEX_URL', 'NEXT_PUBLIC_CONVEX_SITE_URL', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SANITY_PROJECT_ID', 'NEXT_PUBLIC_SANITY_DATASET'])
  if (process.env[key]) publicConfig[key] = process.env[key];
await writeFile(path.join(target, 'desktop-public-env.json'), JSON.stringify(publicConfig, null, 2));
await writeFile(path.join(target, 'desktop-release.json'), JSON.stringify({ channel: production ? 'production' : 'preview', site: 'https://tack-tick.vercel.app' }, null, 2));
const secrets = Object.entries(process.env).filter(([key, value]) => /SECRET|TOKEN|DEPLOY_KEY|ADMIN_KEY|PRIVATE_KEY/.test(key) && !key.startsWith('NEXT_PUBLIC_') && value?.length > 12);
async function inspect(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isSymbolicLink()) throw new Error('Developer symlink in packaged runtime');
    if (item.isDirectory()) { await inspect(file); continue; }
    if (item.name.startsWith('.env')) throw new Error('Environment file in packaged runtime');
    if (/\.(js|cjs|mjs|json|html|txt)$/.test(item.name)) {
      const text = await readFile(file, 'utf8');
      for (const [key, value] of secrets) if (text.includes(value)) throw new Error(`Server credential ${key} in packaged runtime`);
    }
  }
}
await inspect(target);
console.log('Bundled Next.js runtime staged and checked for developer credentials.');
