# InvariantSplit: Formal Invariants and Deterministic Settlement in a Weekend-Built EVM Primitive

_This is a submission for the [DEV Weekend Challenge: Community](https://dev.to/challenges/weekend-2026-02-28)_

## The Community

I built this for a community that usually gets ignored in "weekend project" conversations: people maintaining trustless infrastructure with production-grade expectations.

That includes:

- open-source maintainers operating narrow settlement paths
- engineers building machine-facing or operator-facing rails for IIoT and distributed systems
- protocol teams that care less about feature sprawl and more about determinism, explainability, and failure semantics

In those environments, the most expensive bugs are rarely UI bugs. They are state transition bugs, bytecode drift, silent rounding errors, and operational ambiguity after deployment.

That is why I treated InvariantSplit as a tiny critical system rather than a toy contract. The code path is intentionally narrow, but the assurance story is not.

This is also why the project is relevant to a broader "quantum-ready" engineering posture, even though it does not claim post-quantum cryptography on-chain today. The design already separates the execution plane from the assurance plane, which means provenance, signatures, and stronger future cryptographic attestations can evolve without perturbing the settlement bytecode itself.

## What I Built

I built `InvariantSplit`, a deterministic ETH settlement primitive for exactly three fixed recipients with weights `50% / 30% / 20%`.

At the execution layer, the project ships two implementations:

- a Solidity baseline for readability and ergonomic review
- a Huff implementation for bytecode-level control and reduced execution surface

At the systems layer, the project ships two profiles:

- `core`: minimal settlement path
- `observed`: same settlement semantics, but with execution metadata for public reconciliation

The key idea is architectural separation:

- **Execution Plane**: settlement logic, minimal branching, deterministic distribution, atomic revert semantics
- **Assurance Plane**: formal spec, differential tests, deterministic `CREATE2` deployment, runtime attestation, signed manifests, and public evidence

This makes the project small in code volume but strong in defensibility.

The settlement rule is explicit:

```text
shareA = value * 5000 / 10000
shareB = value * 3000 / 10000
shareC = value - shareA - shareB
```

The last line is the real design decision. I do not compute three percentages independently and hope the numbers reconcile. I compute the residual explicitly, which gives me exact conservation of value and a deterministic dust policy.

## Demo

Repository:

- [doomhammerhell/invariantsplit](https://github.com/doomhammerhell/invariantsplit)

Live Sepolia observed deployment:

- Factory: [0x8f9633c55d6EC8EF0426742460A4B374481D6c0C](https://sepolia.etherscan.io/address/0x8f9633c55d6EC8EF0426742460A4B374481D6c0C)
- SolidityObserved: [0xc5068CA8448E5FAEd512eA4F734eE6f5b1b08f71](https://sepolia.etherscan.io/address/0xc5068CA8448E5FAEd512eA4F734eE6f5b1b08f71)
- HuffObserved: [0x43A2F08D802642BD30EbaDa4A509d5bbBCa0d2fC](https://sepolia.etherscan.io/address/0x43A2F08D802642BD30EbaDa4A509d5bbBCa0d2fC)

Published evidence:

- Manifest: [deployments/latest.json](https://github.com/doomhammerhell/invariantsplit/blob/main/deployments/latest.json)
- Human-readable manifest: [deployments/latest.md](https://github.com/doomhammerhell/invariantsplit/blob/main/deployments/latest.md)
- Signed attestation: [attestations/11155111/0x94c46e9fd4f6c48f12c1a9fcf091eaec30571d94382890e37b9ac2d9b46c4f32.json](https://github.com/doomhammerhell/invariantsplit/blob/main/attestations/11155111/0x94c46e9fd4f6c48f12c1a9fcf091eaec30571d94382890e37b9ac2d9b46c4f32.json)
- Demo transaction log: [docs/demo-transactions.md](https://github.com/doomhammerhell/invariantsplit/blob/main/docs/demo-transactions.md)
- Claim-to-proof map: [docs/claim-to-proof-map.md](https://github.com/doomhammerhell/invariantsplit/blob/main/docs/claim-to-proof-map.md)

Representative live transactions:

- Solidity `receive()`: [0xb8cc2d7d08e8b61e6002c865f49827afb6367a214610a8b23027f5d5fa669284](https://sepolia.etherscan.io/tx/0xb8cc2d7d08e8b61e6002c865f49827afb6367a214610a8b23027f5d5fa669284)
- Huff `receive()`: [0x1b70a39368432788464e1076c32fb0b08f74ae6cb30147aba26407084393d49e](https://sepolia.etherscan.io/tx/0x1b70a39368432788464e1076c32fb0b08f74ae6cb30147aba26407084393d49e)
- Solidity `distribute()`: [0x9e16a013a5b99a9941d9e3688c28bd961a3d80a814dcdeac1fac83c6bb04c6c5](https://sepolia.etherscan.io/tx/0x9e16a013a5b99a9941d9e3688c28bd961a3d80a814dcdeac1fac83c6bb04c6c5)
- Huff `distribute()`: [0x47be17dfef49b7dffb5695761de9fe90f0174b1fb59fb96ed02c9e700724a09d](https://sepolia.etherscan.io/tx/0x47be17dfef49b7dffb5695761de9fe90f0174b1fb59fb96ed02c9e700724a09d)

![System architecture diagram](https://raw.githubusercontent.com/doomhammerhell/invariantsplit/main/docs/assets/diagrams/system-architecture.png)

![Verified SolidityObserved contract on Sepolia](https://raw.githubusercontent.com/doomhammerhell/invariantsplit/main/docs/assets/screenshots/solidity-observed-sepolia-real.png)

![HuffObserved contract on Sepolia](https://raw.githubusercontent.com/doomhammerhell/invariantsplit/main/docs/assets/screenshots/huff-observed-sepolia-real.png)

![Huff distribute transaction on Sepolia](https://raw.githubusercontent.com/doomhammerhell/invariantsplit/main/docs/assets/screenshots/huff-distribute-tx-sepolia-real.png)

### Visual Placement Notes

- Insert a system architecture diagram immediately after this section.
- Insert a delivery pipeline diagram before the assurance discussion in `How I Built It`.
- Insert Sepolia screenshots after the public evidence bullets.

## Code

Core artifacts:

- Huff core: [src/InvariantSplit.huff](https://github.com/doomhammerhell/invariantsplit/blob/main/src/InvariantSplit.huff)
- Huff observed: [src/InvariantSplitObserved.huff](https://github.com/doomhammerhell/invariantsplit/blob/main/src/InvariantSplitObserved.huff)
- Solidity baseline: [src/SplitSolidity.sol](https://github.com/doomhammerhell/invariantsplit/blob/main/src/SplitSolidity.sol)
- Solidity observed: [src/SplitSolidityObserved.sol](https://github.com/doomhammerhell/invariantsplit/blob/main/src/SplitSolidityObserved.sol)
- Deterministic factory: [src/InvariantSplitFactory.sol](https://github.com/doomhammerhell/invariantsplit/blob/main/src/InvariantSplitFactory.sol)

Assurance and release tooling:

- Release bundle: [scripts/build-release.mjs](https://github.com/doomhammerhell/invariantsplit/blob/main/scripts/build-release.mjs)
- Deployment wrapper: [scripts/deploy.mjs](https://github.com/doomhammerhell/invariantsplit/blob/main/scripts/deploy.mjs)
- Runtime verification: [scripts/verify-runtime.mjs](https://github.com/doomhammerhell/invariantsplit/blob/main/scripts/verify-runtime.mjs)
- Release attestation: [scripts/attest-release.mjs](https://github.com/doomhammerhell/invariantsplit/blob/main/scripts/attest-release.mjs)
- Attestation verification: [scripts/verify-attestation.mjs](https://github.com/doomhammerhell/invariantsplit/blob/main/scripts/verify-attestation.mjs)

Verification surface:

- Differential tests: [tests/InvariantSplitDifferential.t.sol](https://github.com/doomhammerhell/invariantsplit/blob/main/tests/InvariantSplitDifferential.t.sol)
- Property tests: [tests/InvariantSplitProperties.t.sol](https://github.com/doomhammerhell/invariantsplit/blob/main/tests/InvariantSplitProperties.t.sol)
- System invariants: [spec/invariants.md](https://github.com/doomhammerhell/invariantsplit/blob/main/spec/invariants.md)

## How I Built It

### 1. Execution Plane vs Assurance Plane

The first design decision was to avoid letting the settlement logic absorb operational complexity.

The execution plane is intentionally narrow:

- accept ETH through `receive()` or `distribute()`
- compute three shares deterministically
- transfer in fixed order `A -> B -> C`
- revert atomically on any failure

The assurance plane is where the system earns trust:

- formal specification of invariants
- differential testing against a high-level baseline
- deterministic `CREATE2` deployment
- runtime attestation for the Huff artifact
- signed manifests and public evidence

That split is the same systems move you make in constrained distributed environments: keep the hot path simple, move proof and observability out of band, and never let control-plane rigor bloat the execution plane.

![Delivery pipeline diagram](https://raw.githubusercontent.com/doomhammerhell/invariantsplit/main/docs/assets/diagrams/delivery-pipeline.png)

### Mermaid Placement Notes

- Put the "system architecture" diagram here.
- Reuse the repository diagram from the README, or export it as an image if DEV.to does not render Mermaid in your theme.

### 2. Bytecode Analysis and Why Huff Was the Right Tool Here

For most smart contract systems, Solidity is the right default. I did not pick Huff because it is exotic. I picked it because this particular problem has the exact properties that make low-level control worthwhile:

- fixed arity
- fixed recipients
- fixed weights
- no upgradeability
- no admin path
- no dynamic storage mutation in the hot path
- no need for general-purpose routing

When the domain is this constrained, Huff becomes an engineering tool for reducing ambiguity.

At the EVM level, the contract does three important things:

1. rejects unknown selectors immediately
2. computes `shareA`, `shareB`, and the residual `shareC` directly on the stack and in scratch memory
3. issues three ordered `CALL`s, reverting the entire execution if any call fails

That matters because every abstraction you remove in this problem reduces two risks:

- review surface
- unintended bytecode behavior

The Solidity baseline remains in the repository because semantic transparency matters. But the Huff implementation is superior for this case because it narrows the execution shape down to the exact machine behavior I want to defend.

### 3. Mathematical Rigor: Invariant Proofs

The core invariant is conservation of value:

```text
Σ share_i = msg.value
```

For this primitive, `n = 3`, and the settlement rule is:

```text
shareA = floor(msg.value * 5000 / 10000)
shareB = floor(msg.value * 3000 / 10000)
shareC = msg.value - shareA - shareB
```

Therefore:

```text
shareA + shareB + shareC
= shareA + shareB + (msg.value - shareA - shareB)
= msg.value
```

The important part is not just the equality. It is the dust settlement policy.

Because integer division truncates, any remainder introduced during the first two computations is absorbed by the residual term:

```text
delta = msg.value - shareA - shareB
```

and by construction:

```text
shareC = delta
```

So the "dust" is not left to emergent behavior. It is assigned deterministically to the final recipient. That is the sort of explicit policy decision I expect in critical infrastructure, because unmodeled edge behavior is where trustless systems become hard to explain.

### 4. Differential Testing: Semantic Equivalence Against Solidity

Low-level code needs a semantic oracle. That is what the Solidity baseline is for.

I used Foundry to run differential tests between:

- Solidity core and Huff core
- Solidity observed and Huff observed
- selector path and `receive()` path
- happy path and explicit reject-path behavior

The goal was not just "does Huff pass its own tests?" The goal was:

- does Huff preserve the same externally observable semantics as the higher-level specification?
- does it preserve conservation, atomicity, selector discipline, and dust handling under fuzzed inputs?
- does deployment remain idempotent when the same configuration is replayed through the factory?

This matters because low-level optimization without semantic equivalence is just hand-written risk.

### 5. Deterministic Deployment and the Assurance Plane

InvariantSplit uses a reusable `CREATE2` factory, which means the deployment process is not "broadcast and hope." It is modeled as a reproducible release artifact.

For each profile and recipient set, the system derives:

- `configHash`
- artifact-specific salts
- predicted addresses
- runtime hashes

That gives me a control surface where I can compare:

- what should be deployed
- what was deployed
- what bytecode is actually on-chain

This is where the project stops looking like a weekend contract and starts looking like release engineering for a critical primitive.

### 6. Runtime Attestation and Signed Manifests

I keep three ideas separate:

- **verification**: explorer-native source verification, used for the Solidity artifact
- **runtime attestation**: local Huff compilation matched against on-chain runtime bytecode
- **release provenance**: a signed manifest covering config, artifacts, addresses, salts and hashes

That separation is deliberate. Conflating those into a single word like "verified" would be imprecise.

This distinction is especially important for Huff, because raw creation bytecode deployment is not the same assurance surface as a standard Solidity explorer flow.

The signed manifest turns release identity into a machine-readable claim. The runtime attestation makes the low-level artifact defensible. The result is a project where trust comes from a chain of evidence, not from repository aesthetics.

### 7. Benchmark Data

The benchmark results are intentionally interpreted narrowly.

#### Bytecode footprint

| Artifact            | Creation Code | Runtime Code |
| ------------------- | ------------: | -----------: |
| Solidity baseline   |    1013 bytes |    695 bytes |
| Huff implementation |     232 bytes |    223 bytes |

#### Selector-path gas

| Function                      | Gas Used |
| ----------------------------- | -------: |
| `SplitSolidity.distribute()`  |  111,998 |
| `InvariantSplit.distribute()` |  110,430 |

This is the key takeaway:

- the dominant win is bytecode footprint
- the runtime gas gain is real, but modest
- the main systems value is deterministic execution shape and reduced attack surface

That is a more serious claim than "Huff is faster." It is also a more defensible one.

### 8. Suggested Visual Inserts

Use these where they strengthen the post:

- **After `What I Built`**: Mermaid system architecture showing Execution Plane vs Assurance Plane
- **Before `Runtime Attestation and Signed Manifests`**: Mermaid delivery pipeline from source to manifest and attestation
- **After `Benchmark Data`**: screenshot of the benchmark table rendered from the repo
- **After `Demo`**: Sepolia explorer screenshots showing verified Solidity, Huff runtime address, and recent transactions

Suggested placeholders:

- `[Optional screenshot: Foundry benchmark output for Solidity vs Huff]`
- `[Optional screenshot: deployment manifest and signed attestation side by side]`

## Conclusion

InvariantSplit is intentionally small, but it is not small-minded.

The code solves a narrow settlement problem. The engineering work solves a harder problem: how to make a low-level trustless primitive explainable, reproducible, and defensible in public.

That is the standard I care about for open-source infrastructure:

- the code path should be minimal
- the invariants should be explicit
- the deployment identity should be deterministic
- the proof surface should survive outside the repository

In other words: code is only part of the proof of correctness.

That is the real reason I think projects like this matter. They show that even a weekend build can be engineered with the discipline we normally reserve for IIoT control paths, mission-critical distributed systems, and future cryptographic provenance models.
