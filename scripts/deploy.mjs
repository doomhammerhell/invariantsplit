import { resolve } from 'node:path';

import {
  PROJECT,
  VERSION,
  compileHuffArtifact,
  computeArtifactSalt,
  create2Address,
  hexByteLength,
  hashData,
  huffArtifactNameForProfile,
  huffSourceForProfile,
  isTruthy,
  loadEnvironment,
  normalizeAddress,
  persistDeploymentManifest,
  projectSystemId,
  readJsonFile,
  resolveProfile,
  resolveRecipients,
  resolveRpcUrl,
  resolveWalletArgs,
  runChecked,
  runCommand,
  solidityArtifactNameForProfile,
  soliditySourceForProfile,
  stripOption,
  WEIGHTS
} from './lib/common.mjs';

function usage() {
  console.error('Usage: node scripts/deploy.mjs <simulate|broadcast> [forge args...]');
  process.exit(1);
}

function parseForgeJson(stdout) {
  const trimmed = stdout.trim();

  if (!trimmed) {
    throw new Error('forge script returned no JSON output');
  }

  const candidates = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const payload =
    candidates.findLast(
      (value) => value?.returns && Object.prototype.hasOwnProperty.call(value, 'success')
    ) ?? candidates.findLast((value) => Object.prototype.hasOwnProperty.call(value, 'success'));

  if (!payload) {
    throw new Error(`Could not locate forge script payload in output:\n${trimmed}`);
  }

  return payload;
}

function getChainMetadata(rpcUrl, env) {
  if (!rpcUrl) {
    return {
      id: 'simulation',
      name: 'simulation'
    };
  }

  const chainId = runChecked('cast', ['chain-id', '--rpc-url', rpcUrl]).stdout.trim();
  const chainNameResult = runCommand('cast', ['chain', '--rpc-url', rpcUrl]);
  const rawChainName = chainNameResult.status === 0 ? chainNameResult.stdout.trim() : '';
  const knownChains = {
    1: 'mainnet',
    11155111: 'sepolia',
    8453: 'base',
    84532: 'base-sepolia',
    42161: 'arbitrum',
    421614: 'arbitrum-sepolia',
    10: 'optimism',
    11155420: 'optimism-sepolia',
    137: 'polygon',
    80002: 'polygon-amoy',
    31337: 'anvil'
  };
  const fallbackName = knownChains[chainId] ?? chainId;
  const chainName =
    rawChainName && rawChainName !== 'unknown' ? rawChainName : (env.CHAIN ?? fallbackName);

  return {
    id: chainId,
    name: chainName || chainId
  };
}

function getOnchainContractInfo(rpcUrl, address) {
  const runtimeBytecode = runChecked('cast', ['code', '--rpc-url', rpcUrl, address]).stdout.trim();
  const runtimeCodeHash = runChecked('cast', [
    'codehash',
    '--rpc-url',
    rpcUrl,
    address
  ]).stdout.trim();

  return {
    runtimeBytecode,
    runtimeCodeSize: hexByteLength(runtimeBytecode),
    runtimeCodeHash
  };
}

function maybeVerify(manifest, env) {
  if (!isTruthy(env.AUTO_VERIFY, true)) {
    manifest.verification = {
      attempted: false,
      status: 'skipped',
      verifier: 'disabled',
      message: 'AUTO_VERIFY=false'
    };
    manifest.contracts.SplitSolidity.verification = {
      status: 'skipped',
      verifier: 'disabled'
    };
    persistDeploymentManifest(manifest);
    return;
  }

  if (!(env.ETHERSCAN_API_KEY || env.VERIFIER || env.VERIFIER_URL || env.VERIFIER_API_KEY)) {
    manifest.verification = {
      attempted: false,
      status: 'skipped',
      verifier: 'unconfigured',
      message: 'No verification provider configured'
    };
    manifest.contracts.SplitSolidity.verification = {
      status: 'skipped',
      verifier: 'unconfigured'
    };
    persistDeploymentManifest(manifest);
    return;
  }

  const result = runCommand(
    'node',
    ['scripts/verify-solidity.mjs', resolve('deployments', 'latest.json')],
    {
      env
    }
  );

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0 && isTruthy(env.REQUIRE_VERIFY, false)) {
    process.exit(result.status ?? 1);
  }
}

function runPostDeployScript(scriptName, env) {
  const result = runCommand('node', [scriptName, resolve('deployments', 'latest.json')], { env });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`${scriptName} failed`);
  }
}

const mode = process.argv[2];

if (!['simulate', 'broadcast'].includes(mode)) {
  usage();
}

const rawExtraArgs = process.argv.slice(3);
const env = loadEnvironment();
const profile = resolveProfile(env, rawExtraArgs);
const factoryAddress =
  rawExtraArgs.includes('--factory') || env.INVARIANT_SPLIT_FACTORY || env.FACTORY_ADDRESS
    ? normalizeAddress(
        rawExtraArgs[rawExtraArgs.indexOf('--factory') + 1] ??
          env.INVARIANT_SPLIT_FACTORY ??
          env.FACTORY_ADDRESS,
        'FACTORY_ADDRESS'
      )
    : '0x0000000000000000000000000000000000000000';
const extraArgs = stripOption(stripOption(rawExtraArgs, ['--profile']), ['--factory']);
const rpcUrl = resolveRpcUrl(env, extraArgs);
const recipients = resolveRecipients(env);
const walletArgs = resolveWalletArgs(env, extraArgs, mode === 'broadcast');
const forgeArgs = [
  'script',
  'scripts/DeployInvariantSplit.s.sol:DeployInvariantSplit',
  '--ffi',
  '--json',
  '--sig',
  'run(address,string)',
  factoryAddress,
  profile
];
const forgeEnv = { ...env };

if (mode !== 'broadcast') {
  delete forgeEnv.PRIVATE_KEY;
  delete forgeEnv.ETH_KEYSTORE_ACCOUNT;
  delete forgeEnv.ETH_PASSWORD;
  delete forgeEnv.FOUNDRY_ACCOUNT;
}

if (mode === 'broadcast') {
  forgeArgs.push('--broadcast');
}

if (rpcUrl && !resolveRpcUrl({}, extraArgs)) {
  forgeArgs.push('--rpc-url', rpcUrl);
}

forgeArgs.push(...walletArgs, ...extraArgs);

const forgeResult = runChecked('forge', forgeArgs, { env: forgeEnv });
const forgeOutput = parseForgeJson(forgeResult.stdout);

if (!forgeOutput.success) {
  throw new Error('forge script reported failure');
}

const returns = forgeOutput.returns;
const huffAddress = returns.huffDeployment.value;
const solidityAddress = returns.solidityDeployment.value;
const resolvedFactoryAddress = returns.factoryDeployment.value;
const configHash = returns.configHash.value.toLowerCase();
const profileHash = returns.profileHash.value.toLowerCase();

console.log(`Factory: ${resolvedFactoryAddress}`);
console.log(`SplitSolidity: ${solidityAddress}`);
console.log(`InvariantSplit: ${huffAddress}`);
console.log(`Profile: ${profile}`);
console.log(`Config hash: ${configHash}`);

if (mode !== 'broadcast') {
  process.exit(0);
}

if (!rpcUrl) {
  throw new Error('Broadcast mode requires RPC_URL or ETH_RPC_URL');
}

const chain = getChainMetadata(rpcUrl, env);
const huffArtifact = compileHuffArtifact(
  recipients,
  profile,
  profile === 'observed' ? configHash : undefined
);
const huffOnchain = getOnchainContractInfo(rpcUrl, huffAddress);
const solidityOnchain = getOnchainContractInfo(rpcUrl, solidityAddress);
const solidityArtifactName = solidityArtifactNameForProfile(profile);
const solidityArtifact = readJsonFile(
  resolve('out', `${solidityArtifactName}.sol`, `${solidityArtifactName}.json`)
);
const solidityConstructorSig =
  profile === 'observed'
    ? 'constructor(address,address,address,bytes32)'
    : 'constructor(address,address,address)';
const solidityConstructorArgs =
  profile === 'observed'
    ? runChecked('cast', [
        'abi-encode',
        solidityConstructorSig,
        recipients.recipientA,
        recipients.recipientB,
        recipients.recipientC,
        configHash
      ]).stdout.trim()
    : runChecked('cast', [
        'abi-encode',
        solidityConstructorSig,
        recipients.recipientA,
        recipients.recipientB,
        recipients.recipientC
      ]).stdout.trim();
const solidityBytecode = solidityArtifact.bytecode.object.startsWith('0x')
  ? solidityArtifact.bytecode.object
  : `0x${solidityArtifact.bytecode.object}`;
const solidityCreationCode = `${solidityBytecode}${solidityConstructorArgs.slice(2)}`;
const solidityArtifactId = hashData(solidityArtifactName);
const huffArtifactId = hashData(huffArtifactNameForProfile(profile));
const soliditySalt = computeArtifactSalt(configHash, solidityArtifactId);
const huffSalt = computeArtifactSalt(configHash, huffArtifactId);
const solidityPredicted = create2Address(
  resolvedFactoryAddress,
  soliditySalt,
  hashData(solidityCreationCode)
);
const huffPredicted = create2Address(
  resolvedFactoryAddress,
  huffSalt,
  hashData(huffArtifact.creationBytecode)
);

if (huffPredicted.toLowerCase() !== huffAddress.toLowerCase()) {
  throw new Error(
    `Huff deployment address mismatch: predicted ${huffPredicted}, got ${huffAddress}`
  );
}

if (solidityPredicted.toLowerCase() !== solidityAddress.toLowerCase()) {
  throw new Error(
    `Solidity deployment address mismatch: predicted ${solidityPredicted}, got ${solidityAddress}`
  );
}

const manifest = {
  schemaVersion: 2,
  project: PROJECT,
  deployedAt: new Date().toISOString(),
  chain,
  explorerUrl: env.EXPLORER_URL || null,
  recipients,
  config: {
    version: VERSION,
    systemId: projectSystemId(),
    profile,
    profileHash,
    configHash,
    weights: WEIGHTS
  },
  factory: {
    address: resolvedFactoryAddress
  },
  verification: {
    attempted: false,
    status: 'pending',
    verifier: env.VERIFIER || (env.ETHERSCAN_API_KEY ? 'etherscan' : 'unconfigured'),
    message: null
  },
  attestation: {
    status: 'pending'
  },
  contracts: {
    SplitSolidity: {
      artifact: solidityArtifactName,
      artifactId: solidityArtifactId,
      address: solidityAddress,
      predictedAddress: solidityPredicted,
      salt: soliditySalt,
      source: soliditySourceForProfile(profile),
      constructorArgs: solidityConstructorArgs,
      creationCodeSize: hexByteLength(solidityArtifact.bytecode.object),
      runtimeCodeSize: solidityOnchain.runtimeCodeSize,
      runtimeCodeHash: solidityOnchain.runtimeCodeHash,
      verification: {
        status: 'pending'
      }
    },
    InvariantSplit: {
      artifact: huffArtifactNameForProfile(profile),
      artifactId: huffArtifactId,
      address: huffAddress,
      predictedAddress: huffPredicted,
      salt: huffSalt,
      source: huffSourceForProfile(profile),
      constructorArgs: null,
      creationCodeSize: huffArtifact.creationCodeSize,
      runtimeCodeSize: huffOnchain.runtimeCodeSize,
      runtimeCodeHash: huffOnchain.runtimeCodeHash,
      compiledRuntimeMatchesChain:
        huffOnchain.runtimeBytecode.toLowerCase() === huffArtifact.runtimeBytecode.toLowerCase(),
      verification: {
        status: 'bytecode-attested'
      }
    }
  }
};

persistDeploymentManifest(manifest);
maybeVerify(manifest, env);
runPostDeployScript('scripts/verify-runtime.mjs', env);
runPostDeployScript('scripts/attest-release.mjs', env);
