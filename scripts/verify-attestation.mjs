import { resolve } from 'node:path';

import { hashData, readJsonFile, stableStringify, verifyHashSignature } from './lib/common.mjs';

function usage() {
  console.error('Usage: node scripts/verify-attestation.mjs [attestation.json]');
  process.exit(1);
}

const rawArgs = process.argv.slice(2);

if (rawArgs.includes('--help')) {
  usage();
}

const attestationPath = resolve(rawArgs[0] ?? 'attestations');
const attestation = readJsonFile(attestationPath);
const digest = hashData(stableStringify(attestation.payload));

if (digest !== attestation.digest) {
  throw new Error(`Digest mismatch: expected ${attestation.digest}, got ${digest}`);
}

if (attestation.signature && attestation.signer) {
  const valid = verifyHashSignature(attestation.digest, attestation.signer, attestation.signature);

  if (!valid) {
    throw new Error('Attestation signature is invalid');
  }
}

console.log(`Verified attestation ${attestationPath}`);
