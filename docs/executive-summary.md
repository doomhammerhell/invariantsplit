# Executive Summary

InvariantSplit is a deterministic ETH settlement primitive for three fixed recipients. The project uses a deliberately split architecture:

- execution plane: minimal bytecode, fixed control flow, explicit invariants
- assurance plane: deterministic deployment, runtime attestation, signed release evidence

## Why it matters

The project is not trying to be a treasury product. It is showing what happens when a small invariant-heavy payment path is treated as a systems problem instead of only a contract problem.

## Current state

- Solidity baseline and Huff implementation both shipped
- `core` and `observed` profiles supported
- deterministic deployment via reusable `CREATE2` factory
- differential and property tests in Foundry
- runtime attestation for Huff
- signed release attestation for published deployments

## Current public demo

- Factory: [0x8f9633c55d6EC8EF0426742460A4B374481D6c0C](https://sepolia.etherscan.io/address/0x8f9633c55d6EC8EF0426742460A4B374481D6c0C)
- SolidityObserved: [0xc5068CA8448E5FAEd512eA4F734eE6f5b1b08f71](https://sepolia.etherscan.io/address/0xc5068CA8448E5FAEd512eA4F734eE6f5b1b08f71)
- HuffObserved: [0x43A2F08D802642BD30EbaDa4A509d5bbBCa0d2fC](https://sepolia.etherscan.io/address/0x43A2F08D802642BD30EbaDa4A509d5bbBCa0d2fC)
- Manifest: [latest.json](../deployments/latest.json)
- Attestation: [0x94c46e9fd4f6c48f12c1a9fcf091eaec30571d94382890e37b9ac2d9b46c4f32.json](../attestations/11155111/0x94c46e9fd4f6c48f12c1a9fcf091eaec30571d94382890e37b9ac2d9b46c4f32.json)
