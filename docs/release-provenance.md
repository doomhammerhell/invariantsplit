# Release Provenance

InvariantSplit now treats deployment publication as a release artifact flow:

```text
source -> compile -> configHash -> CREATE2 salts -> predicted addresses -> broadcast -> runtime verification -> signed attestation
```

## Release inputs

- profile: `core` or `observed`
- recipients
- chain ID
- compiler/toolchain configuration
- reusable factory address

## Release outputs

- `deployments/latest.json`
- `deployments/<chainId>.json`
- `deployments/<chainId>/<configHash>.json`
- `attestations/<chainId>/<configHash>.json`
- `artifacts/<chainId>/<configHash>/build-release.json`

## Assurance layers

### Layer 1: deterministic config identity

`configHash` binds:

- system identifier
- version
- chain ID
- profile
- recipients
- weights

### Layer 2: deterministic deployment identity

Each artifact gets a salt derived from:

```text
keccak256(configHash, artifactId)
```

### Layer 3: public chain evidence

The manifest records:

- predicted address
- actual address
- runtime size
- runtime hash
- verification status

### Layer 4: runtime attestation

The Huff runtime is recompiled locally and compared directly against the on-chain runtime.

### Layer 5: signed release

The final manifest payload is canonicalized, hashed, signed with the deployment wallet, and published as an attestation artifact.
