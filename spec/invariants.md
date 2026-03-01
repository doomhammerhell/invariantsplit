# InvariantSplit Specification

## Scope

InvariantSplit is a fixed-recipient ETH settlement primitive for exactly three recipients with weights `50% / 30% / 20%`.

This specification covers:

- the `core` profile
- the `observed` profile
- the Solidity baseline
- the Huff implementation

## Invariants

1. Conservation of value

For every successful execution:

```text
shareA + shareB + shareC == msg.value
```

1. Deterministic rounding

The first two shares are computed with integer division:

```text
shareA = msg.value * 5000 / 10000
shareB = msg.value * 3000 / 10000
shareC = msg.value - shareA - shareB
```

All rounding dust must land on recipient `C`.

1. Atomicity

If any recipient transfer fails, the entire execution reverts and no recipient balance delta persists.

1. Fixed recipient order

Transfers occur in the order `A -> B -> C`.

1. No retained ETH

After any successful execution, the splitter contract balance is `0`.

1. Storage immutability in the Huff path

The Huff implementation must not mutate storage during distribution.

1. Selector discipline

- empty calldata routes to the distribution path
- `distribute()` routes to the distribution path
- any other selector reverts

1. Deterministic deployment identity

For a given:

- chain ID
- profile
- recipient set
- weight set
- factory address

the `configHash`, salts, and predicted `CREATE2` addresses must be reproducible.

## Non-goals

- dynamic recipient sets
- dynamic weights
- admin controls
- upgradeability
- generalized routing
- ERC20 support
- streaming or vesting semantics

## Profiles

### core

The execution surface is minimized. No execution event is emitted.

### observed

The execution path emits a distribution event so that public explorer activity and reconciliation are easier to inspect.

## Verification model

### Solidity

Explorer-native source verification is expected.

### Huff

Explorer-native source verification is not the assurance target. The assurance target is:

- locally compiled runtime
- on-chain runtime
- matching runtime hash
- signed release attestation
