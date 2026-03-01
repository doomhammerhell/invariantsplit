import { spawnSync } from 'node:child_process';

const gitCheck = spawnSync('git', ['rev-parse', '--git-dir'], {
  encoding: 'utf8',
  stdio: 'ignore'
});

if (gitCheck.status !== 0) {
  console.log('Skipping Husky installation because no Git repository was detected.');
  process.exit(0);
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(command, ['husky'], {
  stdio: 'inherit'
});

process.exit(result.status ?? 0);
