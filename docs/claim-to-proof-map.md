# Claim to Proof Map

## Claim: deployment is deterministic

Proof:

- [latest.json](../deployments/latest.json)
- fields: `factory.address`, `config.configHash`, `contracts.*.salt`, `contracts.*.predictedAddress`, `contracts.*.address`

## Claim: Solidity artifact is public and explorer-verifiable

Proof:

- [SplitSolidityObserved on Sepolia](https://sepolia.etherscan.io/address/0xc5068CA8448E5FAEd512eA4F734eE6f5b1b08f71)
- [latest.json](../deployments/latest.json)

## Claim: Huff artifact matches the locally compiled runtime

Proof:

- [latest.json](../deployments/latest.json)
- fields: `contracts.InvariantSplit.compiledRuntimeMatchesChain`
- [attestation artifact](../attestations/11155111/0x94c46e9fd4f6c48f12c1a9fcf091eaec30571d94382890e37b9ac2d9b46c4f32.json)

## Claim: the release provenance is signed

Proof:

- [attestation artifact](../attestations/11155111/0x94c46e9fd4f6c48f12c1a9fcf091eaec30571d94382890e37b9ac2d9b46c4f32.json)
- fields: `digest`, `signer`, `signature`, `signatureValid`

## Claim: the system has live public activity

Proof:

- [solidity_receive](https://sepolia.etherscan.io/tx/0xb8cc2d7d08e8b61e6002c865f49827afb6367a214610a8b23027f5d5fa669284)
- [huff_receive](https://sepolia.etherscan.io/tx/0x1b70a39368432788464e1076c32fb0b08f74ae6cb30147aba26407084393d49e)
- [solidity_distribute](https://sepolia.etherscan.io/tx/0x9e16a013a5b99a9941d9e3688c28bd961a3d80a814dcdeac1fac83c6bb04c6c5)
- [huff_distribute](https://sepolia.etherscan.io/tx/0x47be17dfef49b7dffb5695761de9fe90f0174b1fb59fb96ed02c9e700724a09d)

## Claim: recipient deltas match the policy

Proof:

- [demo-transactions.json](./demo-transactions.json)
- fields: `recipientDeltas.recipientAWei`, `recipientDeltas.recipientBWei`, `recipientDeltas.recipientCWei`
