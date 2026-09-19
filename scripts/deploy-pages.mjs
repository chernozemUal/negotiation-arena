import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const project = process.cwd();
function run(command, args, cwd = project, capture = false, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`);
  return result.stdout?.trim() || '';
}
const remote = run('git', ['remote', 'get-url', 'origin'], project, true);
const match = remote.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
if (!match) throw new Error('origin must point to the GitHub repository being published.');
const [, owner, repo] = match;
const revision = run('git', ['rev-parse', '--short', 'HEAD'], project, true);
const author = run('git', ['log', '-1', '--format=%an'], project, true);
const email = run('git', ['log', '-1', '--format=%ae'], project, true);
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['test']);
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], project, false, {
  ...process.env, STATIC_EXPORT: 'true', NEXT_PUBLIC_BASE_PATH: `/${repo}`, NEXT_TELEMETRY_DISABLED: '1',
});
if (!existsSync(join(project, 'out', 'index.html'))) throw new Error('Static build is missing index.html.');
const checkout = mkdtempSync(join(tmpdir(), 'arena-pages-'));
try {
  run('git', ['init', '-b', 'gh-pages'], checkout);
  run('git', ['remote', 'add', 'origin', remote], checkout);
  if (run('git', ['ls-remote', '--heads', 'origin', 'gh-pages'], checkout, true)) {
    run('git', ['fetch', '--depth=1', 'origin', 'gh-pages'], checkout);
    run('git', ['reset', '--hard', 'FETCH_HEAD'], checkout);
  }
  // Only clean this disposable checkout; source files and local progress are untouched.
  for (const name of readdirSync(checkout)) if (name !== '.git') rmSync(join(checkout, name), { recursive: true, force: true });
  cpSync(join(project, 'out'), checkout, { recursive: true });
  writeFileSync(join(checkout, '.nojekyll'), '');
  run('git', ['add', '.'], checkout);
  const changed = spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: checkout }).status;
  if (changed === 1) {
    run('git', ['-c', `user.name=${author}`, '-c', `user.email=${email}`, 'commit', '-m', `Publish Arena from ${revision}`], checkout);
    run('git', ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential', 'push', 'origin', 'gh-pages'], checkout);
  } else if (changed !== 0) throw new Error('Could not inspect publication changes.');
  console.log(`GitHub Pages source updated: https://${owner.toLowerCase()}.github.io/${repo}/`);
  console.log('The site becomes live after GitHub completes its Pages deployment.');
} finally {
  rmSync(checkout, { recursive: true, force: true });
}
