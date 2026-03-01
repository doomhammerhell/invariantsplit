# Threat Model

## Assets

- incoming ETH
- recipient routing correctness
- deployment provenance
- public confidence in the published artifacts

## Trust boundaries

- Solidity compiler and Huff compiler
- Foundry and `cast`
- RPC provider
- Etherscan verification backend
- local operator wallet used for deployment and attestation

## Assumptions

- the operator controls the deployment wallet
- the configured recipients are intentional
- the deployment factory bytecode is trusted
- Sepolia explorer and RPC responses are eventually consistent

## Threats addressed

- incorrect split arithmetic
- non-atomic partial distribution
- selector confusion
- deployment drift between local artifact and on-chain bytecode
- inability to reconcile a public claim with public evidence

## Threats not addressed

- malicious recipient collusion
- economic griefing through gas market conditions
- compromised operator workstation
- compromised RPC or explorer infrastructure
- censorship resistance
- post-deployment governance or admin abuse, because no admin path exists

## Mitigations

- explicit invariant tests
- differential tests across Solidity and Huff
- deterministic `CREATE2` deployment
- runtime attestation for Huff
- signed release attestation
- published manifest and transaction log
