import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { compile } from 'huff-neo-js';

function usage() {
  console.error(
    'Usage: node scripts/compile-huff.mjs [--json] [--config-hash <bytes32>] <source> <recipientA> <recipientB> <recipientC>'
  );
  process.exit(1);
}

function normalizeAddress(value, label) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error(`${label} must be a 20-byte hex address`);
  }

  const normalized = value.toLowerCase();

  if (normalized === '0x0000000000000000000000000000000000000000') {
    throw new Error(`${label} cannot be the zero address`);
  }

  return normalized;
}

function normalizeBytes32(value, label) {
  if (!value) {
    return undefined;
  }

  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`${label} must be a 32-byte hex value`);
  }

  return value.toLowerCase();
}

const rawArgs = process.argv.slice(2);
const jsonOutput = rawArgs.includes('--json');
const args = rawArgs.filter((value) => value !== '--json');
const configHashIndex = args.indexOf('--config-hash');
let configHashArg;

if (configHashIndex !== -1) {
  if (configHashIndex + 1 >= args.length) {
    usage();
  }

  configHashArg = args[configHashIndex + 1];
  args.splice(configHashIndex, 2);
}

const [sourceArg, recipientAArg, recipientBArg, recipientCArg] = args;

if (!sourceArg || !recipientAArg || !recipientBArg || !recipientCArg) {
  usage();
}

const sourcePath = resolve(sourceArg);
const recipients = {
  RECIPIENT_A: normalizeAddress(recipientAArg, 'RECIPIENT_A'),
  RECIPIENT_B: normalizeAddress(recipientBArg, 'RECIPIENT_B'),
  RECIPIENT_C: normalizeAddress(recipientCArg, 'RECIPIENT_C')
};
const configHash = normalizeBytes32(configHashArg, 'CONFIG_HASH');

let source = readFileSync(sourcePath, 'utf8');

for (const [placeholder, addressValue] of Object.entries(recipients)) {
  source = source.replaceAll(`{{${placeholder}}}`, addressValue.slice(2));
}

if (configHash) {
  source = source.replaceAll('{{CONFIG_HASH}}', configHash.slice(2));
}

if (/\{\{[A-Z0-9_]+\}\}/.test(source)) {
  throw new Error(`Unresolved Huff placeholder(s) remain in ${sourcePath}`);
}

const output = compile({
  evm_version: 'paris',
  sources: [sourcePath],
  files: new Map([[sourcePath, source]]),
  construct_args: undefined,
  alternative_main: undefined,
  alternative_constructor: undefined
});

if (output.errors?.length) {
  console.error(output.errors.join('\n'));
  process.exit(1);
}

const artifact = output.contracts?.get(sourcePath);

if (!artifact) {
  throw new Error(`Compiler did not return an artifact for ${sourcePath}`);
}

const creationBytecode = `0x${artifact.bytecode}`;
const runtimeBytecode = `0x${artifact.runtime}`;

if (jsonOutput) {
  process.stdout.write(
    JSON.stringify(
      {
        sourcePath,
        recipients,
        configHash,
        creationBytecode,
        runtimeBytecode,
        creationCodeSize: artifact.bytecode.length / 2,
        runtimeCodeSize: artifact.runtime.length / 2
      },
      null,
      2
    )
  );
} else {
  process.stdout.write(creationBytecode);
}
