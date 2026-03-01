# ADR 003: Why Fixed Recipients

## Status

Accepted

## Context

A generalized splitter is easier to market, but it changes the engineering problem. Dynamic recipients introduce storage mutation, management paths, broader ABI surface, and more review burden.

## Decision

Keep recipients fixed at build time for the Huff implementation and fixed at deployment time for the Solidity baseline.

## Rationale

- the primitive is intentionally narrow
- invariants remain simple and auditable
- runtime control flow stays linear
- deployment artifacts stay configuration-specific and attestable

## Consequences

Positive:

- smaller execution surface
- easier reasoning about conservation and atomicity
- stronger correspondence between config and runtime hash

Negative:

- recipient changes require recompilation and redeployment
- the primitive is not suitable for dynamic treasury management
