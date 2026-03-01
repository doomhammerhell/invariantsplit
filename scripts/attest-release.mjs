import { resolve } from 'node:path';

import {
  getWalletAddress,
  hashData,
  loadEnvironment,
  persistDeploymentManifest,
  projectRelativePath,
  readJsonFile,
  resolveWalletArgs,
  signHash,
  stableStringify,
  verifyHashSignature,
  writeJsonFile
} from './lib/common.mjs';

function usage() {
  console.error(
    'Usage: node scripts/attest-release.mjs [deployment-manifest.json] [wallet args...]'
  );
  process.exit(1);
}

function releasePayload(manifest) {
  return {
    schemaVersion: 1,
    project: manifest.project,
    deployedAt: manifest.deployedAt,
    chain: manifest.chain,
    config: manifest.config,
    factory: manifest.factory,
    recipients: manifest.recipients,
    contracts: Object.fromEntries(
      Object.entries(manifest.contracts).map(([key, contract]) => [
        key,
        {
          artifact: contract.artifact,
          artifactId: contract.artifactId,
          address: contract.address,
          predictedAddress: contract.predictedAddress,
          salt: contract.salt,
          creationCodeSize: contract.creationCodeSize,
          runtimeCodeSize: contract.runtimeCodeSize,
          runtimeCodeHash: contract.runtimeCodeHash,
          compiledRuntimeMatchesChain: contract.compiledRuntimeMatchesChain ?? null,
          verification: contract.verification ?? null
        }
      ])
    )
  };
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
const payload = releasePayload(manifest);
const canonicalPayload = stableStringify(payload);
const digest = hashData(canonicalPayload);
const attestation = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  digest,
  payload
};

try {
  resolveWalletArgs(env, extraArgs, true);
  attestation.signer = getWalletAddress(env, extraArgs);
  attestation.signature = signHash(digest, env, extraArgs);
  attestation.signatureValid = verifyHashSignature(
    digest,
    attestation.signer,
    attestation.signature
  );
  attestation.status = attestation.signatureValid ? 'signed' : 'invalid-signature';
} catch {
  attestation.signer = null;
  attestation.signature = null;
  attestation.signatureValid = false;
  attestation.status = 'unsigned';
}

const attestationPath = resolve(
  'attestations',
  String(manifest.chain.id),
  `${manifest.config.configHash}.json`
);
writeJsonFile(attestationPath, attestation);

manifest.attestation = {
  ...(manifest.attestation ?? {}),
  status: attestation.status,
  path: projectRelativePath(attestationPath),
  digest,
  signer: attestation.signer,
  signatureValid: attestation.signatureValid
};

persistDeploymentManifest(manifest);

console.log(`Wrote release attestation to ${attestationPath}`);
