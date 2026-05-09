# Contributing to Showrunner

Thanks for considering a contribution. Showrunner is intentionally narrow — the moat is the storyboard intelligence layer, not feature breadth — so PRs that align with that focus are most likely to land.

## Ground rules

- **Read `spec.md` first.** It's the source of truth. Sections 6 (storyboard prompt) and 7 (avatar shot template) are intentionally locked; changes need a corresponding spec change.
- **Keep it client-side.** No backend services, no databases, no auth. If you find yourself wanting a server, find a client-side solution instead.
- **Local-first stays local-first.** All user data lives in the browser via IndexedDB. Don't add code that exfiltrates keys or project content anywhere.
- **Don't break existing projects.** Schema changes to IndexedDB need a Dexie migration in `src/lib/db/migrations.ts`.

## Setup

```bash
git clone https://github.com/<your-fork>/showrunner.git
cd showrunner
pnpm install
pnpm dev
```

Open http://localhost:5173.

## Before opening a PR

```bash
pnpm exec svelte-check          # 0 errors required
pnpm build                      # production build must pass
pnpm lint                       # prettier + eslint
```

## What lands

- **Bug fixes.** Always welcome.
- **Provider improvements.** Better prompts, cheaper/faster models, smarter retries.
- **New lipsync models.** Add to `src/lib/pipeline/lipsync-models.ts` and the dispatch in `src/lib/pipeline/lipsync.ts`. Include pricing.
- **Accessibility, performance, error messages.** Always welcome.

## What probably doesn't land in v0.x

See `ROADMAP.md`. Things explicitly out of scope right now: auth, multi-user, hosted SaaS, video stitching, mobile-first redesigns, captions, translation, telemetry.

If you have something on that list you want to ship, open an issue first to discuss whether it fits a future version.

## Commit style

Conventional-ish. Examples:

```
feat(lipsync): add Sync Labs as a fourth model option
fix(orchestrator): retry on 503 from ElevenLabs
docs(readme): clarify CORS workaround for Replicate
```

Reference issues in the body (`Closes #42`).

## License

By contributing, you agree your contributions will be licensed under the MIT License (see `LICENSE`).
