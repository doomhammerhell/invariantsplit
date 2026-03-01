import { resolve } from 'node:path';

import {
  isTruthy,
  loadEnvironment,
  persistDeploymentManifest,
  readJsonFile,
  runCommand,
  resolveRpcUrl
} from './lib/common.mjs';

function usage() {
  console.error(
    'Usage: node scripts/verify-solidity.mjs [deployment-manifest.json] [forge args...]'
  );
  process.exit(1);
}

function verificationArgs(env, manifest, rpcUrl) {
  const contract = manifest.contracts.SplitSolidity;
  const args = [
    'verify-contract',
    contract.address,
    contract.source,
    '--constructor-args',
    contract.constructorArgs,
    '--compiler-version',
    '0.8.30',
    '--num-of-optimizations',
    '1000000',
    '--evm-version',
    'paris',
    '--watch',
    '--rpc-url',
    rpcUrl,
    '--chain',
    String(manifest.chain.id)
  ];

  if (env.VERIFIER) {
    args.push('--verifier', env.VERIFIER);
  } else if (env.VERIFIER_URL || env.VERIFIER_API_KEY) {
    args.push('--verifier', 'custom');
  } else if (env.ETHERSCAN_API_KEY) {
    args.push('--verifier', 'etherscan');
  }

  if (env.ETHERSCAN_API_KEY) {
    args.push('--etherscan-api-key', env.ETHERSCAN_API_KEY);
  }

  if (env.VERIFIER_API_KEY) {
    args.push('--verifier-api-key', env.VERIFIER_API_KEY);
  }

  if (env.VERIFIER_URL) {
    args.push('--verifier-url', env.VERIFIER_URL);
  }

  return args;
}

const env = loadEnvironment();
const rawArgs = process.argv.slice(2);

if (rawArgs.includes('--help')) {
  usage();
}

const manifestArg = rawArgs.find((value) => value.endsWith('.json'));
const extraArgs = rawArgs.filter((value) => value !== manifestArg);
const manifestPath = resolve(manifestArg ?? 'deployments/latest.json');
const manifest = readJsonFile(manifestPath);
const rpcUrl = resolveRpcUrl(env, extraArgs);

if (!rpcUrl) {
  throw new Error('Verification requires RPC_URL or ETH_RPC_URL');
}

if (!(env.ETHERSCAN_API_KEY || env.VERIFIER || env.VERIFIER_URL || env.VERIFIER_API_KEY)) {
  throw new Error('No verification provider configured');
}

const args = [...verificationArgs(env, manifest, rpcUrl), ...extraArgs];
const result = runCommand('forge', args, { env });
const verifierName = env.VERIFIER || (env.ETHERSCAN_API_KEY ? 'etherscan' : 'custom');

manifest.verification = {
  attempted: true,
  status: result.status === 0 ? 'verified' : 'failed',
  verifier: verifierName,
  message: [result.stdout, result.stderr].filter(Boolean).join('\n').trim() || null
};

manifest.contracts.SplitSolidity.verification = {
  status: result.status === 0 ? 'verified' : 'failed',
  verifier: verifierName
};

persistDeploymentManifest(manifest);

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0 && isTruthy(env.REQUIRE_VERIFY, false)) {
  process.exit(result.status ?? 1);
}
