import { resolve } from 'node:path';

import {
  loadEnvironment,
  readJsonFile,
  resolveRpcUrl,
  resolveWalletArgs,
  runChecked,
  writeJsonFile,
  writeTextFile
} from './lib/common.mjs';

const DEMO_TRANSACTIONS = [
  {
    label: 'solidity_receive',
    targetKey: 'SplitSolidity',
    valueWei: '123456789012345'
  },
  {
    label: 'huff_receive',
    targetKey: 'InvariantSplit',
    valueWei: '234567890123456'
  },
  {
    label: 'solidity_distribute',
    targetKey: 'SplitSolidity',
    signature: 'distribute()',
    valueWei: '345678901234567'
  },
  {
    label: 'huff_distribute',
    targetKey: 'InvariantSplit',
    signature: 'distribute()',
    valueWei: '456789012345678'
  }
];

function usage() {
  console.error(
    'Usage: node scripts/demo-transactions.mjs [deployment-manifest.json] [cast args...]'
  );
  process.exit(1);
}

function parseReceipt(stdout) {
  return JSON.parse(stdout.trim());
}

function balanceOf(address, rpcUrl) {
  return BigInt(runChecked('cast', ['balance', address, '--rpc-url', rpcUrl]).stdout.trim());
}

function formatEther(wei) {
  const value = BigInt(wei);
  const whole = value / 10n ** 18n;
  const fraction = String(value % 10n ** 18n)
    .padStart(18, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

function txMarkdown(report) {
  const lines = [
    '# Demo Transactions',
    '',
    `- Generated at: \`${report.generatedAt}\``,
    `- Network: \`${report.chain.name}\``,
    `- Chain ID: \`${report.chain.id}\``,
    '',
    '## Transactions',
    ''
  ];

  for (const tx of report.transactions) {
    lines.push(`### ${tx.label}`, '');
    lines.push(`- Target: \`${tx.target}\``);
    lines.push(`- Address: [${tx.to}](${tx.addressUrl})`);
    lines.push(`- Path: \`${tx.path}\``);
    lines.push(`- Value: \`${tx.valueWei}\` wei (\`${tx.valueEth}\` ETH)`);
    lines.push(`- Tx: [${tx.hash}](${tx.txUrl})`);
    lines.push('');
  }

  lines.push('## Recipient Balance Deltas', '');
  lines.push(`- A: \`${report.recipientDeltas.recipientAWei}\` wei`);
  lines.push(`- B: \`${report.recipientDeltas.recipientBWei}\` wei`);
  lines.push(`- C: \`${report.recipientDeltas.recipientCWei}\` wei`);
  lines.push('');

  return `${lines.join('\n').trim()}\n`;
}

const env = loadEnvironment();
const rawArgs = process.argv.slice(2);

if (rawArgs.includes('--help')) {
  usage();
}

const manifestArg = rawArgs.find((value) => value.endsWith('.json'));
const extraArgs = rawArgs.filter((value) => value !== manifestArg);
const manifest = readJsonFile(resolve(manifestArg ?? 'deployments/latest.json'));
const rpcUrl = resolveRpcUrl(env, extraArgs);

if (!rpcUrl) {
  throw new Error('Demo transactions require RPC_URL or ETH_RPC_URL');
}

const walletArgs = resolveWalletArgs(env, extraArgs, true);
const recipientABefore = balanceOf(manifest.recipients.recipientA, rpcUrl);
const recipientBBefore = balanceOf(manifest.recipients.recipientB, rpcUrl);
const recipientCBefore = balanceOf(manifest.recipients.recipientC, rpcUrl);

const transactions = [];

for (const tx of DEMO_TRANSACTIONS) {
  const address = manifest.contracts[tx.targetKey].address;
  const args = [
    'send',
    address,
    '--value',
    tx.valueWei,
    '--rpc-url',
    rpcUrl,
    '--json',
    ...walletArgs,
    ...extraArgs
  ];

  if (tx.signature) {
    args.splice(2, 0, tx.signature);
  }

  const receipt = parseReceipt(runChecked('cast', args, { env }).stdout);
  const addressUrl = `${manifest.explorerUrl}/address/${address}`;
  const txUrl = `${manifest.explorerUrl}/tx/${receipt.transactionHash}`;

  transactions.push({
    label: tx.label,
    target: tx.targetKey,
    path: tx.signature ? 'selector' : 'receive',
    to: address,
    addressUrl,
    hash: receipt.transactionHash,
    txUrl,
    valueWei: tx.valueWei,
    valueEth: formatEther(tx.valueWei),
    gasUsed: receipt.gasUsed,
    blockNumber: receipt.blockNumber
  });
}

const recipientAAfter = balanceOf(manifest.recipients.recipientA, rpcUrl);
const recipientBAfter = balanceOf(manifest.recipients.recipientB, rpcUrl);
const recipientCAfter = balanceOf(manifest.recipients.recipientC, rpcUrl);

const report = {
  generatedAt: new Date().toISOString(),
  chain: manifest.chain,
  explorerUrl: manifest.explorerUrl,
  deployments: {
    SplitSolidity: manifest.contracts.SplitSolidity.address,
    InvariantSplit: manifest.contracts.InvariantSplit.address
  },
  recipients: manifest.recipients,
  transactions,
  recipientDeltas: {
    recipientAWei: (recipientAAfter - recipientABefore).toString(),
    recipientBWei: (recipientBAfter - recipientBBefore).toString(),
    recipientCWei: (recipientCAfter - recipientCBefore).toString()
  }
};

writeJsonFile(resolve('docs', 'demo-transactions.json'), report);
writeTextFile(resolve('docs', 'demo-transactions.md'), txMarkdown(report));

console.log(`Recorded ${transactions.length} demo transactions.`);
