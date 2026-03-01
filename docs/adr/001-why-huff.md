# ADR 001: Why Huff

## Status

Accepted

## Context

The execution problem is fixed-arity, stateless in the hot path, and defined by a small set of economic invariants. The target is not feature breadth. The target is deterministic value transfer with minimal runtime surface.

## Decision

Implement the low-level execution plane in Huff and keep a Solidity baseline for comparison and differential testing.

## Rationale

- Huff gives explicit control over control flow and `CALL` ordering.
- The recipient set can be embedded directly into runtime bytecode.
- The runtime can avoid loops and storage mutation.
- The deployment footprint is materially smaller than the Solidity baseline.

## Consequences

Positive:

- smaller runtime
- smaller creation code
- explicit bytecode-level invariants
- clearer control over failure semantics

Negative:

- lower ergonomics for review
- redeploy required for recipient changes
- no explorer-native verification path equivalent to Solidity
