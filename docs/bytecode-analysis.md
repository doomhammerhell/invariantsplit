# Bytecode Analysis

InvariantSplit ships two implementations of the same fixed split primitive:

- [src/SplitSolidity.sol](../src/SplitSolidity.sol)
- [src/InvariantSplit.huff](../src/InvariantSplit.huff)

The purpose of the comparison is not to show that Solidity is "bad". It is to show what changes when the design is reduced to a stateless, fixed-arity, opcode-level implementation.

## Measured sizes

These values are generated from the local build and can be refreshed with:

```bash
npm run bytecode:report
```

Current local fixture values on February 28, 2026:

- Solidity creation code: `1013` bytes
- Solidity runtime code: `695` bytes
- Huff creation code: `178` bytes
- Huff runtime code: `169` bytes

The most important difference is deployment surface. The Huff contract removes constructor logic, storage initialization, revert strings, metadata-heavy scaffolding, and loop/state machinery from the deployed runtime.

For the current Sepolia deployment with full 20-byte recipient addresses:

- Solidity creation code: `1013` bytes
- Solidity runtime code: `695` bytes
- Huff creation code: `232` bytes
- Huff runtime code: `223` bytes

That increase is expected. In the Huff build, recipient addresses are embedded as immediates, so very small test addresses can compile to shorter `PUSH` opcodes than real production addresses.

Current live Sepolia artifacts:

- SolidityObserved: [0xc5068CA8448E5FAEd512eA4F734eE6f5b1b08f71](https://sepolia.etherscan.io/address/0xc5068CA8448E5FAEd512eA4F734eE6f5b1b08f71)
- HuffObserved: [0x43A2F08D802642BD30EbaDa4A509d5bbBCa0d2fC](https://sepolia.etherscan.io/address/0x43A2F08D802642BD30EbaDa4A509d5bbBCa0d2fC)
- Transaction log: [demo-transactions.md](./demo-transactions.md)

The observed profile deliberately spends more bytecode for public explainability. In the current observed Sepolia deployment:

- SolidityObserved runtime code: `904` bytes
- HuffObserved runtime code: `294` bytes

That trade-off is intentional. The `core` profile remains the smallest execution surface. The `observed` profile exists so execution metadata can be seen directly in public explorer traces.

## Huff runtime structure

The Huff runtime is intentionally linear:

1. Accept either empty calldata or the `distribute()` selector.
2. Load `msg.value`.
3. Compute `a`, `b`, and `c` directly in memory.
4. Execute exactly three `CALL`s in a fixed order.
5. Revert atomically if any `CALL` fails.

Representative runtime disassembly:

```text
00000009: CALLDATASIZE
0000000a: ISZERO
0000000b: PUSH2 0x0029
0000000e: JUMPI
...
00000033: CALLVALUE
00000034: DUP1
00000035: ISZERO
00000036: PUSH2 0x00a1
00000039: JUMPI
...
00000076: PUSH2 0x1001
00000079: GAS
0000007a: CALL
0000007b: ISZERO
0000007c: PUSH2 0x00a3
```

What matters here:

- no dynamic jumps
- no loops
- no storage reads or writes
- no constructor arguments at runtime
- no ABI decoding beyond selector dispatch

## Solidity runtime structure

The Solidity baseline is still intentionally readable and relatively lean, but it pays for high-level features:

- storage-backed recipient array
- storage-backed weights
- loop control
- generic internal transfer helper
- metadata tail appended by the Solidity toolchain

That is a perfectly reasonable engineering trade for maintainability, but it expands runtime size and deploy cost.

## Gas trade-off

The selector-path benchmark currently measures:

- `SplitSolidity.distribute()`: `111,998`
- `InvariantSplit.distribute()`: `110,430`

The runtime gas delta is real but modest. That result is useful because it shows where the main gain comes from in this project:

- lower deployment footprint
- tighter control over bytecode shape
- explicit invariants and deterministic control flow

It is not a claim that Huff automatically creates dramatic execution savings for every fixed-arity contract.

## Engineering trade-offs

Benefits of the Huff version:

- smallest deployed surface in the project
- very explicit control flow
- no accidental storage mutation
- fixed failure semantics
- recipient set baked directly into code

Costs of the Huff version:

- redeployment required for a new recipient set
- harder maintenance and audit ergonomics
- no explorer-native source verification flow comparable to Solidity
- greater risk of stack-order mistakes during implementation

Benefits of the Solidity baseline:

- easier to read, review, and extend
- normal verification path on explorers
- more portable for teams without Huff expertise

Costs of the Solidity baseline:

- larger runtime
- larger creation code
- more high-level scaffolding in the deployed artifact

## Practical conclusion

InvariantSplit is a good Huff fit because the problem is small, fixed, stateless, and invariant-driven. As soon as the product requirements become dynamic, upgradeable, or governance-heavy, the maintainability premium of Huff rises quickly and the comparison changes.
