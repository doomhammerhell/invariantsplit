# Contributing to InvariantSplit

Thanks for contributing. This repository is treated as a long-lived systems asset, so changes are expected to be reproducible, measurable and reviewable.

## Prerequisites

- Node.js `22` or `24`
- npm `10+`
- [Foundry](https://getfoundry.sh/)
- Git
- Optional: Docker or VS Code Dev Containers

## Local Setup

```bash
npm install
npm run build
npm run lint
npm test
```

If you need a reproducible editor environment, open the repository in the provided Dev Container.

## Repository Conventions

- Keep the execution plane narrow. Avoid adding mutability, governance or generic routing unless there is a defensible systems reason.
- Prefer explicit invariants over implicit behavior.
- Publish evidence for any new operational claim.
- Do not commit secrets, `.env` files or funded private keys.
- Keep artifacts deterministic. If a runtime hash changes, explain why in the pull request.

## Branching and Commits

- Use short-lived feature branches.
- Follow Conventional Commits. Examples:
  - `feat(factory): add deterministic profile registry`
  - `fix(attestation): persist relative artifact paths`
  - `docs(readme): clarify assurance plane`
- Husky and lint-staged run on commit when the repository is checked out as Git.

## Quality Gates

Run these before opening a pull request:

```bash
npm run lint
npm run build
npm test
npm run benchmark
npm run bytecode:report
```

For deployment or attestation changes, also validate:

```bash
npm run build:release -- --profile observed --factory 0x8f9633c55d6EC8EF0426742460A4B374481D6c0C
npm run verify:runtime
npm run attest:release
```

## Pull Requests

Every pull request should include:

- a clear problem statement
- design and trade-off summary
- test evidence
- risk assessment
- rollout or migration notes when behavior changes

Use the pull request template in [`.github/pull_request_template.md`](./.github/pull_request_template.md).

## Documentation Expectations

- Update the README when public behavior or workflows change.
- Update `spec/`, ADRs or threat/failure docs when system guarantees change.
- Keep Mermaid diagrams aligned with reality.

## Release Notes

Releases are automated with semantic versioning. Write commit messages so that release automation can classify the change correctly.
