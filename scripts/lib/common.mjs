import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

export const PROJECT = 'InvariantSplit';
export const VERSION = 1;
export const WEIGHTS = Object.freeze({
  recipientA: 5000,
  recipientB: 3000,
  recipientC: 2000
});

export function loadEnvironment() {
  const fileValues = {};
  const envPath = resolve('.env');

  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      fileValues[key] = value;
    }
  }

  return {
    ...fileValues,
    ...process.env
  };
}

export function normalizeAddress(value, label) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value ?? '')) {
    throw new Error(`${label} must be a 20-byte hex address`);
  }

  return value.toLowerCase();
}

export function normalizeBytes32(value, label) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value ?? '')) {
    throw new Error(`${label} must be a 32-byte hex value`);
  }

  return value.toLowerCase();
}

export function normalizeProfileName(value) {
  const profile = (value ?? 'core').toLowerCase();

  if (!['core', 'observed'].includes(profile)) {
    throw new Error(`Unsupported profile "${value}". Expected "core" or "observed".`);
  }

  return profile;
}

export function isTruthy(value, defaultValue = false) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export function hasOption(args, names) {
  return args.some((value) => names.includes(value));
}

export function getOptionValue(args, names) {
  for (let index = 0; index < args.length; index += 1) {
    if (names.includes(args[index]) && index + 1 < args.length) {
      return args[index + 1];
    }
  }

  return undefined;
}

export function stripOption(args, names) {
  const stripped = [];

  for (let index = 0; index < args.length; index += 1) {
    if (names.includes(args[index])) {
      index += 1;
      continue;
    }

    stripped.push(args[index]);
  }

  return stripped;
}

export function ensureDirectory(path) {
  mkdirSync(path, { recursive: true });
}

export function writeJsonFile(path, value) {
  ensureDirectory(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeTextFile(path, value) {
  ensureDirectory(dirname(path));
  writeFileSync(path, value);
}

export function readJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function projectRelativePath(path) {
  return relative(resolve(), path).split(sep).join('/');
}

export function hexByteLength(hexValue) {
  const normalized = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;
  return normalized.length / 2;
}

export function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: options.env,
    cwd: options.cwd,
    input: options.input
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

export function runChecked(command, args, options = {}) {
  const result = runCommand(command, args, options);

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(details || `${command} ${args.join(' ')} failed`);
  }

  return result;
}

export function resolveRpcUrl(env, extraArgs) {
  return getOptionValue(extraArgs, ['--rpc-url', '-f']) ?? env.ETH_RPC_URL ?? env.RPC_URL;
}

export function resolveWalletArgs(env, extraArgs, requireWallet) {
  if (
    hasOption(extraArgs, [
      '--private-key',
      '--private-keys',
      '--account',
      '--accounts',
      '--keystore',
      '--keystores',
      '--ledger',
      '--trezor',
      '--aws',
      '--gcp',
      '--turnkey',
      '--unlocked',
      '--mnemonics'
    ])
  ) {
    return [];
  }

  if (!requireWallet) {
    return [];
  }

  if (env.PRIVATE_KEY) {
    return ['--private-key', env.PRIVATE_KEY];
  }

  if (env.ETH_KEYSTORE_ACCOUNT || env.FOUNDRY_ACCOUNT) {
    const args = ['--account', env.ETH_KEYSTORE_ACCOUNT ?? env.FOUNDRY_ACCOUNT];

    if (env.ETH_PASSWORD) {
      args.push('--password-file', env.ETH_PASSWORD);
    }

    return args;
  }

  if (isTruthy(env.LEDGER)) {
    return ['--ledger'];
  }

  throw new Error(
    'No Foundry wallet configured. Set PRIVATE_KEY, ETH_KEYSTORE_ACCOUNT, FOUNDRY_ACCOUNT, or LEDGER=1.'
  );
}

export function resolveRecipients(env) {
  return {
    recipientA: normalizeAddress(env.RECIPIENT_A, 'RECIPIENT_A'),
    recipientB: normalizeAddress(env.RECIPIENT_B, 'RECIPIENT_B'),
    recipientC: normalizeAddress(env.RECIPIENT_C, 'RECIPIENT_C')
  };
}

export function resolveProfile(env, args) {
  return normalizeProfileName(getOptionValue(args, ['--profile']) ?? env.SPLIT_PROFILE ?? 'core');
}

export function huffSourceForProfile(profile) {
  return profile === 'observed' ? 'src/InvariantSplitObserved.huff' : 'src/InvariantSplit.huff';
}

export function huffArtifactNameForProfile(profile) {
  return profile === 'observed' ? 'InvariantSplitObserved' : 'InvariantSplit';
}

export function solidityArtifactNameForProfile(profile) {
  return profile === 'observed' ? 'SplitSolidityObserved' : 'SplitSolidity';
}

export function soliditySourceForProfile(profile) {
  const artifact = solidityArtifactNameForProfile(profile);
  return `src/${artifact}.sol:${artifact}`;
}

export function profileHashForName(profile) {
  return runChecked('cast', ['keccak', normalizeProfileName(profile)])
    .stdout.trim()
    .toLowerCase();
}

export function projectSystemId() {
  return runChecked('cast', ['keccak', PROJECT]).stdout.trim().toLowerCase();
}

export function hashData(value) {
  return runChecked('cast', ['keccak', value]).stdout.trim().toLowerCase();
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);

  return `{${entries.join(',')}}`;
}

export function computeConfigHash(chainId, recipients, profile) {
  const encoded = runChecked('cast', [
    'abi-encode',
    'f(bytes32,uint256,uint256,bytes32,address,address,address,uint256,uint256,uint256)',
    projectSystemId(),
    String(VERSION),
    String(chainId),
    profileHashForName(profile),
    recipients.recipientA,
    recipients.recipientB,
    recipients.recipientC,
    String(WEIGHTS.recipientA),
    String(WEIGHTS.recipientB),
    String(WEIGHTS.recipientC)
  ]).stdout.trim();

  return hashData(encoded);
}

export function computeArtifactSalt(configHash, artifactId) {
  const encoded = runChecked('cast', [
    'abi-encode',
    'f(bytes32,bytes32)',
    normalizeBytes32(configHash, 'configHash'),
    normalizeBytes32(artifactId, 'artifactId')
  ]).stdout.trim();

  return hashData(encoded);
}

export function create2Address(factoryAddress, salt, initCodeHash) {
  return runChecked('cast', [
    'create2',
    '--deployer',
    normalizeAddress(factoryAddress, 'factoryAddress'),
    '--salt',
    normalizeBytes32(salt, 'salt'),
    '--init-code-hash',
    normalizeBytes32(initCodeHash, 'initCodeHash')
  ]).stdout.trim();
}

export function compileHuffArtifact(recipients, profile, configHash) {
  const args = [
    'scripts/compile-huff.mjs',
    '--json',
    huffSourceForProfile(profile),
    recipients.recipientA,
    recipients.recipientB,
    recipients.recipientC
  ];

  if (configHash) {
    args.splice(2, 0, '--config-hash', configHash);
  }

  return JSON.parse(runChecked('node', args).stdout);
}

export function getWalletAddress(env, extraArgs = []) {
  const walletArgs = resolveWalletArgs(env, extraArgs, true);
  return runChecked('cast', ['wallet', 'address', ...walletArgs]).stdout.trim();
}

export function signHash(hash, env, extraArgs = []) {
  const walletArgs = resolveWalletArgs(env, extraArgs, true);
  return runChecked('cast', ['wallet', 'sign', '--no-hash', hash, ...walletArgs]).stdout.trim();
}

export function verifyHashSignature(hash, signer, signature) {
  const result = runChecked('cast', [
    'wallet',
    'verify',
    '--no-hash',
    '--address',
    signer,
    hash,
    signature
  ]).stdout.trim();

  return result.toLowerCase().includes('valid');
}

export function explorerAddressUrl(manifest, address) {
  if (!manifest.explorerUrl) {
    return null;
  }

  return `${manifest.explorerUrl.replace(/\/$/, '')}/address/${address}`;
}

export function renderDeploymentMarkdown(manifest) {
  const lines = [
    '# InvariantSplit Deployment',
    '',
    `- Network: \`${manifest.chain.name}\``,
    `- Chain ID: \`${manifest.chain.id}\``,
    `- Deployed at: \`${manifest.deployedAt}\``,
    ''
  ];

  if (manifest.config?.profile) {
    lines.push(`- Profile: \`${manifest.config.profile}\``);
  }

  if (manifest.config?.configHash) {
    lines.push(`- Config hash: \`${manifest.config.configHash}\``);
  }

  if (manifest.factory?.address) {
    lines.push(`- Factory: \`${manifest.factory.address}\``);
  }

  if (manifest.config?.profile || manifest.config?.configHash || manifest.factory?.address) {
    lines.push('');
  }

  if (manifest.verification?.attempted) {
    lines.push(
      `- Verification: \`${manifest.verification.status}\` via \`${manifest.verification.verifier}\``,
      ''
    );
  }

  if (manifest.attestation?.status) {
    lines.push(`- Release attestation: \`${manifest.attestation.status}\``, '');
  }

  lines.push('## Recipients', '');
  lines.push(`- A: \`${manifest.recipients.recipientA}\``);
  lines.push(`- B: \`${manifest.recipients.recipientB}\``);
  lines.push(`- C: \`${manifest.recipients.recipientC}\``, '');
  lines.push('## Contracts', '');

  for (const [label, contract] of Object.entries(manifest.contracts)) {
    const explorerLink = explorerAddressUrl(manifest, contract.address);
    const addressText = explorerLink
      ? `[${contract.address}](${explorerLink})`
      : `\`${contract.address}\``;

    lines.push(`### ${contract.artifact ?? label}`, '');
    lines.push(`- Address: ${addressText}`);

    if (contract.predictedAddress) {
      lines.push(`- Predicted address: \`${contract.predictedAddress}\``);
    }

    if (contract.salt) {
      lines.push(`- CREATE2 salt: \`${contract.salt}\``);
    }

    lines.push(`- Runtime size: \`${contract.runtimeCodeSize}\` bytes`);
    lines.push(`- Runtime hash: \`${contract.runtimeCodeHash}\``);

    if (
      contract.compiledRuntimeMatchesChain !== null &&
      contract.compiledRuntimeMatchesChain !== undefined
    ) {
      lines.push(
        `- Runtime matches compiled artifact: \`${contract.compiledRuntimeMatchesChain}\``
      );
    }

    if (contract.verification?.status) {
      lines.push(`- Verification status: \`${contract.verification.status}\``);
    }

    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

export function persistDeploymentManifest(manifest) {
  const deploymentsDir = resolve('deployments');
  const chainDir = resolve(deploymentsDir, String(manifest.chain.id));
  const configHash = manifest.config?.configHash;
  const chainFile = resolve(deploymentsDir, `${manifest.chain.id}.json`);
  const latestFile = resolve(deploymentsDir, 'latest.json');
  const chainMarkdown = resolve(deploymentsDir, `${manifest.chain.id}.md`);
  const latestMarkdown = resolve(deploymentsDir, 'latest.md');

  if (configHash) {
    writeJsonFile(resolve(chainDir, `${configHash}.json`), manifest);
    writeTextFile(resolve(chainDir, `${configHash}.md`), renderDeploymentMarkdown(manifest));
  }

  writeJsonFile(chainFile, manifest);
  writeJsonFile(latestFile, manifest);
  writeTextFile(chainMarkdown, renderDeploymentMarkdown(manifest));
  writeTextFile(latestMarkdown, renderDeploymentMarkdown(manifest));
}
