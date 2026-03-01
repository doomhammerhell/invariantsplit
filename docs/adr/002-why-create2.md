# ADR 002: Why CREATE2

## Status

Accepted

## Context

The original deployment flow published addresses after the fact. That is enough for a demo, but not enough for reproducible release engineering.

## Decision

Deploy through a reusable factory with `CREATE2` and derive salts from:

```text
salt = keccak256(configHash, artifactId)
```

## Rationale

- predicted addresses become computable before broadcast
- deployment identity becomes a function of config, profile, and artifact
- manifests can record expected address and actual address as a check, not just an observation
- rerunning the same deployment is idempotent

## Consequences

Positive:

- deterministic deployment
- better release provenance
- simpler multi-chain rollout conventions

Negative:

- the factory address becomes part of the deployment identity
- reuse of the same factory is required for stable address derivation
