# Security Policy

## Supported Versions

Security fixes are applied to the latest `main` branch and the most recent tagged release.

| Version        | Supported |
| -------------- | --------- |
| `main`         | Yes       |
| Latest release | Yes       |
| Older releases | No        |

## Reporting a Vulnerability

Do not open a public issue for undisclosed vulnerabilities.

Report security concerns to [security@invariantsplit.dev](mailto:security@invariantsplit.dev) with:

- a concise summary of the issue
- impact and attack preconditions
- affected files, components or addresses
- proof of concept or reproduction steps
- suggested remediation, if available

You can expect:

- acknowledgment within 3 business days
- triage status within 7 business days
- coordinated disclosure after remediation or mitigation is available

## Security Posture

This repository uses a shift-left model:

- CodeQL on GitHub Actions
- npm dependency auditing
- contract linting and static analysis in CI
- deterministic deployment metadata and runtime attestation
- signed release artifacts

## Scope Notes

- Public Sepolia deployments in this repository are for demonstration and research evidence, not for custody or production treasury use.
- Never treat demo private keys or demo manifests as secure production material.
