import { resolve } from 'node:path';

import {
  hexByteLength,
  loadEnvironment,
  resolveRecipients,
  runChecked,
  writeJsonFile
} from './lib/common.mjs';

const env = loadEnvironment();
const recipients = {
  RECIPIENT_A: env.RECIPIENT_A ?? '0x0000000000000000000000000000000000001001',
  RECIPIENT_B: env.RECIPIENT_B ?? '0x0000000000000000000000000000000000001002',
  RECIPIENT_C: env.RECIPIENT_C ?? '0x0000000000000000000000000000000000001003'
};

runChecked('forge', ['build']);

const normalizedRecipients = resolveRecipients(recipients);
const huffArtifact = JSON.parse(
  runChecked('node', [
    'scripts/compile-huff.mjs',
    '--json',
    'src/InvariantSplit.huff',
    normalizedRecipients.recipientA,
    normalizedRecipients.recipientB,
    normalizedRecipients.recipientC
  ]).stdout
);

const solidityArtifact = JSON.parse(
  runChecked('node', [
    '-e',
    "process.stdout.write(require('fs').readFileSync('out/SplitSolidity.sol/SplitSolidity.json','utf8'))"
  ]).stdout
);

const report = {
  generatedAt: new Date().toISOString(),
  recipients: normalizedRecipients,
  solidity: {
    creationCodeSize: hexByteLength(solidityArtifact.bytecode.object),
    runtimeCodeSize: hexByteLength(solidityArtifact.deployedBytecode.object),
    creationCodeHash: runChecked('cast', [
      'keccak',
      solidityArtifact.bytecode.object
    ]).stdout.trim(),
    runtimeCodeHash: runChecked('cast', [
      'keccak',
      solidityArtifact.deployedBytecode.object
    ]).stdout.trim(),
    runtimeDisassemblyPreview: runChecked('cast', [
      'disassemble',
      solidityArtifact.deployedBytecode.object
    ])
      .stdout.split('\n')
      .slice(0, 80)
  },
  huff: {
    creationCodeSize: huffArtifact.creationCodeSize,
    runtimeCodeSize: huffArtifact.runtimeCodeSize,
    creationCodeHash: runChecked('cast', ['keccak', huffArtifact.creationBytecode]).stdout.trim(),
    runtimeCodeHash: runChecked('cast', ['keccak', huffArtifact.runtimeBytecode]).stdout.trim(),
    runtimeDisassemblyPreview: runChecked('cast', ['disassemble', huffArtifact.runtimeBytecode])
      .stdout.split('\n')
      .slice(0, 80)
  }
};

writeJsonFile(resolve('docs', 'bytecode-report.json'), report);

console.log(`Solidity runtime: ${report.solidity.runtimeCodeSize} bytes`);
console.log(`Huff runtime: ${report.huff.runtimeCodeSize} bytes`);
