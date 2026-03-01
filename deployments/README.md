# Deployments

Deployment manifests are published here after `npm run deploy:broadcast`.

Files:

- `latest.json`: most recent deployment manifest written by the wrapper script.
- `<chainId>.json`: last known deployment for a specific chain.
- `<chainId>/<configHash>.json`: immutable config-specific deployment manifest.
- `latest.md`: human-readable deployment summary.
- `<chainId>.md`: chain-specific human-readable summary.
- `<chainId>/<configHash>.md`: human-readable summary for a specific config release.

The manifest includes:

- chain metadata
- `configHash`, profile, and weight set
- factory address
- `CREATE2` salts and predicted addresses
- recipients compiled into the Huff artifact
- deployed addresses
- runtime code size and code hash
- Solidity verification status
- Huff runtime attestation against the locally compiled bytecode
