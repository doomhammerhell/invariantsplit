import { resolve } from 'node:path';

import {
  compileHuffArtifact,
  computeArtifactSalt,
  computeConfigHash,
  create2Address,
  getOptionValue,
  hashData,
  huffArtifactNameForProfile,
  loadEnvironment,
  normalizeAddress,
  profileHashForName,
  readJsonFile,
  resolveProfile,
  resolveRecipients,
  resolveRpcUrl,
  runChecked,
  solidityArtifactNameForProfile,
  writeJsonFile
} from './lib/common.mjs';

function usage() {
  console.error(
    'Usage: node scripts/build-release.mjs [--profile <core|observed>] [--factory <address>]'
  );
  process.exit(1);
}

const env = loadEnvironment();
const args = process.argv.slice(2);

if (args.includes('--help')) {
  usage();
}

const profile = resolveProfile(env, args);
const recipients = resolveRecipients(env);
const rpcUrl = resolveRpcUrl(env, args);
const chainId = rpcUrl
  ? runChecked('cast', ['chain-id', '--rpc-url', rpcUrl]).stdout.trim()
  : env.CHAIN_ID;

if (!chainId) {
  throw new Error('build-release requires RPC_URL/ETH_RPC_URL or CHAIN_ID');
}

const factoryAddressRaw =
  getOptionValue(args, ['--factory']) ?? env.INVARIANT_SPLIT_FACTORY ?? env.FACTORY_ADDRESS;
const factoryAddress = factoryAddressRaw
  ? normalizeAddress(factoryAddressRaw, 'FACTORY_ADDRESS')
  : null;
const configHash = computeConfigHash(chainId, recipients, profile);
const profileHash = profileHashForName(profile);
const huffArtifact = compileHuffArtifact(
  recipients,
  profile,
  profile === 'observed' ? configHash : undefined
);
const solidityArtifactName = solidityArtifactNameForProfile(profile);
const solidityArtifact = readJsonFile(
  resolve('out', `${solidityArtifactName}.sol`, `${solidityArtifactName}.json`)
);
const constructorArgs =
  profile === 'observed'
    ? runChecked('cast', [
        'abi-encode',
        'constructor(address,address,address,bytes32)',
        recipients.recipientA,
        recipients.recipientB,
        recipients.recipientC,
        configHash
      ]).stdout.trim()
    : runChecked('cast', [
        'abi-encode',
        'constructor(address,address,address)',
        recipients.recipientA,
        recipients.recipientB,
        recipients.recipientC
      ]).stdout.trim();
const solidityBytecode = solidityArtifact.bytecode.object.startsWith('0x')
  ? solidityArtifact.bytecode.object
  : `0x${solidityArtifact.bytecode.object}`;
const solidityCreationCode = `${solidityBytecode}${constructorArgs.slice(2)}`;
const huffArtifactId = hashData(huffArtifactNameForProfile(profile));
const solidityArtifactId = hashData(solidityArtifactName);
const bundle = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  chainId,
  profile,
  profileHash,
  configHash,
  recipients,
  solidity: {
    artifact: solidityArtifactName,
    artifactId: solidityArtifactId,
    constructorArgs,
    creationCodeHash: hashData(solidityCreationCode),
    salt: computeArtifactSalt(configHash, solidityArtifactId)
  },
  huff: {
    artifact: huffArtifactNameForProfile(profile),
    artifactId: huffArtifactId,
    configHash: profile === 'observed' ? configHash : null,
    creationCodeHash: hashData(huffArtifact.creationBytecode),
    runtimeCodeHash: hashData(huffArtifact.runtimeBytecode),
    salt: computeArtifactSalt(configHash, huffArtifactId)
  }
};

if (factoryAddress) {
  bundle.factory = factoryAddress;
  bundle.solidity.predictedAddress = create2Address(
    factoryAddress,
    bundle.solidity.salt,
    bundle.solidity.creationCodeHash
  );
  bundle.huff.predictedAddress = create2Address(
    factoryAddress,
    bundle.huff.salt,
    bundle.huff.creationCodeHash
  );
}

const outputPath = resolve('artifacts', String(chainId), configHash, 'build-release.json');
writeJsonFile(outputPath, bundle);

console.log(`Wrote release bundle to ${outputPath}`);
