# Security

## Threat model

Showrunner is a fully client-side app. There is no Showrunner server. The trust boundaries are:

- **The user's browser** — holds all API keys and project data in IndexedDB.
- **The provider APIs** — Anthropic / Vercel AI Gateway, Replicate, ElevenLabs, fal.ai. Each is called directly from the browser using the user's own keys.

Showrunner itself receives, stores, and transmits no user data. There is nothing to compromise on our side.

## What this means in practice

- **Keys never leave your machine.** They live in IndexedDB on the origin you run Showrunner from. They are not synced anywhere.
- **Provider TOS applies.** Costs incurred against your keys are between you and the provider.
- **Multiple instances are isolated.** Different browsers / browser profiles get different IndexedDB stores. There is no shared state.
- **Clearing site data wipes everything.** Avatars, projects, generated outputs, and keys all live in IndexedDB. Export bundles you care about; back up keys separately.
- **Hosted forks need scrutiny.** If you use Showrunner deployed on a third-party domain, you are trusting that domain's operator not to alter the client code in a way that exfiltrates your keys. Self-host or audit the deployed bundle if that risk matters to you.

## Reporting a vulnerability

If you discover a security issue — a way the client-side code could leak keys, a dependency with a known CVE we're shipping, or anything that could harm a Showrunner user — please **do not** open a public issue.

Email: **doziben@gmail.com** with subject `[Showrunner Security]`.

Include:

- A clear description of the issue
- Reproduction steps or PoC
- Affected version / commit
- Your assessment of impact

I'll acknowledge within 5 business days and aim for a fix within 30 days for high-severity issues.

## Coordinated disclosure

If the issue affects an upstream dependency or provider API, I'll coordinate with the upstream maintainers before public disclosure.

## Scope

In scope:

- Code in this repository
- The default deployment configuration

Out of scope:

- Vulnerabilities in upstream provider APIs (report to the provider)
- Issues that require physical access to the user's machine
- Social engineering of users to paste their keys into untrusted forks
- Self-XSS via developer console
