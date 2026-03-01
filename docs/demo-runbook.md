# Demo Runbook

## Goal

Show the public Sepolia deployment with enough evidence that a reviewer can inspect:

- deterministic deployment metadata
- verified Solidity baseline
- attested Huff runtime
- live transaction activity

## Preparation

1. Open [latest.md](../deployments/latest.md).
2. Open [demo-transactions.md](./demo-transactions.md).
3. Open the signed attestation in [attestations/11155111/0x94c46e9fd4f6c48f12c1a9fcf091eaec30571d94382890e37b9ac2d9b46c4f32.json](../attestations/11155111/0x94c46e9fd4f6c48f12c1a9fcf091eaec30571d94382890e37b9ac2d9b46c4f32.json).

## Flow

1. Explain the invariant:
   `a + b + c == msg.value`
2. Show the factory address and the `configHash` in [latest.json](../deployments/latest.json).
3. Show that predicted addresses equal actual addresses for both artifacts in [latest.json](../deployments/latest.json).
4. Open SolidityObserved on Etherscan and point out source verification.
5. Open HuffObserved on Etherscan and point out that explorer verification is replaced by runtime attestation.
6. Show the four demo transactions in [demo-transactions.md](./demo-transactions.md).
7. Show the recipient deltas and connect them back to the rounding policy.
8. Close on the signed attestation and explain that the release bundle is reproducible.

## Refresh commands

```bash
npm run build:release -- --profile observed --factory 0x8f9633c55d6EC8EF0426742460A4B374481D6c0C
npm run verify:runtime
npm run attest:release
npm run demo:transactions
```
