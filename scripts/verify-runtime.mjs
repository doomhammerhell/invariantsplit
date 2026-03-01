import { resolve } from 'node:path';

import {
  compileHuffArtifact,
  loadEnvironment,
  persistDeploymentManifest,
  readJsonFile,
  resolveRecipients,
  resolveRpcUrl,
  runChecked
} from './lib/common.mjs';

function usage() {
  console.error('Usage: node scripts/verify-runtime.mjs [deployment-manifest.json] [cast args...]');
  process.exit(1);
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
  throw new Error('Runtime verification requires RPC_URL or ETH_RPC_URL');
}

const recipients = resolveRecipients({
  RECIPIENT_A: manifest.recipients.recipientA,
  RECIPIENT_B: manifest.recipients.recipientB,
  RECIPIENT_C: manifest.recipients.recipientC
});
const compiled = compileHuffArtifact(
  recipients,
  manifest.config.profile,
  manifest.config.profile === 'observed' ? manifest.config.configHash : undefined
);
const chainRuntime = runChecked('cast', [
  'code',
  '--rpc-url',
  rpcUrl,
  manifest.contracts.InvariantSplit.address
]).stdout.trim();
const matches = compiled.runtimeBytecode.toLowerCase() === chainRuntime.toLowerCase();

manifest.contracts.InvariantSplit.compiledRuntimeMatchesChain = matches;
manifest.contracts.InvariantSplit.runtimeCodeSize =
  chainRuntime.length > 2 ? (chainRuntime.length - 2) / 2 : 0;
manifest.contracts.InvariantSplit.runtimeCodeHash = runChecked('cast', [
  'codehash',
  '--rpc-url',
  rpcUrl,
  manifest.contracts.InvariantSplit.address
]).stdout.trim();
manifest.attestation = {
  ...(manifest.attestation ?? {}),
  runtime: {
    status: matches ? 'verified-runtime' : 'runtime-mismatch',
    checkedAt: new Date().toISOString(),
    source: manifest.contracts.InvariantSplit.source,
    compiledRuntimeHash: runChecked('cast', ['keccak', compiled.runtimeBytecode]).stdout.trim(),
    chainRuntimeHash: runChecked('cast', ['keccak', chainRuntime]).stdout.trim()
  }
};

persistDeploymentManifest(manifest);

if (!matches) {
  throw new Error('Compiled Huff runtime does not match the runtime bytecode on-chain');
}

console.log(`Verified Huff runtime for ${manifest.contracts.InvariantSplit.address}`);
