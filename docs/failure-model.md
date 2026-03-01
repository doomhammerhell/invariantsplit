# Failure Model

## Execution failures

### Recipient rejects ETH

Expected behavior:

- full transaction revert
- zero persistent balance change for all recipients

### Unknown selector

Expected behavior:

- revert

### Zero-value transfer

Expected behavior:

- no recipient transfer
- no retained ETH
- observed profile does not emit a distribution event

## Deployment failures

### Invalid recipient set

Expected behavior:

- factory reverts on zero address

### CREATE2 collision with different bytecode

Expected behavior:

- deployment fails because the predicted address already contains code

### Idempotent redeploy with same config and artifact

Expected behavior:

- factory returns the existing deployment
- deployment event records `reused=true`

## Assurance failures

### Solidity verification propagation lag

Expected behavior:

- manifest may temporarily show `failed`
- retrying verification later can converge to `verified`

### Huff runtime mismatch

Expected behavior:

- runtime verification script fails
- attestation must not be treated as valid proof of the deployed artifact

### Missing attestation signature

Expected behavior:

- manifest remains usable
- release provenance is reduced from signed to unsigned
