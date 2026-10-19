import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('desktop/dist', { recursive: true });
for (const name of ['main', 'preload']) {
  const result = spawnSync('bun', ['build', `desktop/src/${name}.ts`, '--target=node', '--format=cjs', '--external=electron', `--outfile=desktop/dist/${name}.cjs`], { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
