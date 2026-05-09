<div align="center">

# Showrunner

**Open-source AI UGC orchestrator.** Paste a script. Get a director-cut storyboard, lipsynced avatar clips, voiceovers, and b-roll instructions ready for an editor.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-FF3E00.svg)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org/)
[![Local-first](https://img.shields.io/badge/local--first-yes-22c55e.svg)](#local-first)

</div>

---

## The pipeline this replaces

The manual UGC workflow most creators run today:

1. ~~Generating voiceovers in ElevenLabs~~
2. ~~Cutting voiceovers per scene~~
3. ~~Writing avatar prompts for each shot~~
4. ~~Pasting prompts into image gen tools~~
5. ~~Uploading images + audio to lipsync tools~~
6. ~~Downloading and labeling everything~~

Showrunner does all of it from one paste of a script. You hand the resulting zip to a video editor and they assemble.

## What it actually is

Anyone can wrap an image-gen API and a lipsync API. **The product is the storyboard intelligence layer:** a Claude-powered director that reads your script, breaks it into shots, decides which lines should be on-camera (avatar) vs cutaway (b-roll), and orchestrates the right pipeline for each.

Concretely, you get:

- **Storyboard agent.** Claude Opus reads your script and returns a structured shot list optimized for short-form UGC pacing — hooks on-camera, demonstrations as b-roll, CTAs on-camera, pattern interrupts every 8–12 seconds.
- **Locked avatar consistency.** Pick or generate a reference portrait once. Every per-scene shot uses image-to-image generation with that locked reference so the same person appears throughout.
- **Voiceover with v3 audio tags.** ElevenLabs v3 model. `[confident]`, `[pause]`, `[exasperated sigh]` pass straight through to the synthesized audio.
- **Pluggable lipsync.** Three models, choose per project — see [Lipsync models](#lipsync-models).
- **B-roll instructions.** Concrete, brutal recording instructions per cutaway. *"Open ChatGPT, type 'give me content ideas for my brand', let it generate, scroll through the boring output for 3 seconds."* Not *"show ChatGPT failing."*
- **Per-scene retry.** If one provider fails, retry that scene without rerunning the whole project.
- **Local-first.** All keys and projects live in your browser via IndexedDB. No backend, no auth, nothing leaves your machine except API calls to the providers you configured.

## Status

| Area | State |
| --- | --- |
| Storyboard agent | ✅ Ships with Claude Opus 4.7 via Vercel AI Gateway or Anthropic direct |
| Avatar generation | ✅ Replicate Flux 1.1 Pro for portraits, Flux Dev img2img for per-scene shots |
| Voiceover | ✅ ElevenLabs v3 with audio-tag pass-through |
| Lipsync | ✅ Three models: PrunaAI P-Video, Veed Fabric 1.0, Creatify Aurora |
| Bundle export | ✅ Numbered MP4s + MP3s + b-roll markdowns + master README |
| Settings + re-edit | ✅ Re-run any step, swap providers, manage voices |
| Multi-avatar projects | ❌ One avatar per project (see ROADMAP) |
| Auto video stitching | ❌ Hand-off to editors today |
| Hosted SaaS | ❌ Not in v0.x |

## Quick start

**Prerequisites:**

- Node 20 or newer
- pnpm 8+ (recommended) or npm

```bash
git clone <your-fork-url> showrunner
cd showrunner
pnpm install
pnpm dev
```

Open <http://localhost:5173>. The app boots into a 4-step onboarding wizard. You'll need API keys for the providers below — the wizard tests each connection live.

To produce a static deployable bundle:

```bash
pnpm build       # outputs to ./build (static SPA)
pnpm preview     # serves the production build locally
```

## Required API keys

You'll need accounts with:

| Provider | Used for | Get key |
| --- | --- | --- |
| Vercel AI Gateway *(or Anthropic direct)* | Storyboard generation (`claude-opus-4-7`) | <https://vercel.com/docs/ai-gateway> · <https://console.anthropic.com/settings/keys> |
| Replicate | Avatar image generation (Flux 1.1 Pro / Flux Dev) and the P-Video lipsync model | <https://replicate.com/account/api-tokens> |
| ElevenLabs | Voiceovers (`eleven_v3`) | <https://elevenlabs.io/app/settings/api-keys> |
| fal.ai | Lipsync (Veed Fabric 1.0, Creatify Aurora) | <https://fal.ai/dashboard/keys> |

### Cost ballpark

For a 60-second UGC video with ~30 seconds of avatar footage and the cheapest lipsync model (P-Video):

| Step | Cost |
| --- | --- |
| Voiceovers (ElevenLabs) | ~$0.30 |
| Avatar images (Replicate Flux) | ~$0.16 |
| Lipsync (P-Video @ $0.02/sec) | ~$0.60 |
| Storyboard agent | negligible |
| **Total** | **~$1.06** |

Showrunner displays the full breakdown — including the projected per-model lipsync cost — *before* you generate, so there are no surprises.

## Lipsync models

Choose per project. Cost shown live in the storyboard view.

| Model | Provider | Rate | Resolution | Best for |
| --- | --- | --- | --- | --- |
| **PrunaAI P-Video** | Replicate | **$0.02/sec** | 720p | Cheapest. Optimized variant. Max 10s/clip. |
| **Veed Fabric 1.0** | fal.ai | **$0.08/sec** | 480p | Reliable middle. Wide codec support. |
| **Creatify Aurora** | fal.ai | **$0.14/sec** | 720p | Highest quality. Polished output. |

Default is P-Video. Switch in the right rail of the storyboard view at any time — cost recalculates instantly.

To add a new model: see `src/lib/pipeline/lipsync-models.ts` for the catalog format and `src/lib/pipeline/lipsync.ts` for the dispatcher.

## How it works

```
                   ┌──────────────────────────────┐
                   │   Your script (paste)        │
                   └──────────────┬───────────────┘
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │   Claude (storyboard agent)  │
                   │   spec.md §6 prompt          │
                   └──────────────┬───────────────┘
                                  │
                          Scene[] (avatar / broll)
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │   Per-scene orchestrator     │
                   │   Concurrency 2, retry x3    │
                   └──┬─────────────┬─────────────┘
                      │             │
              ┌───────▼──┐    ┌─────▼──────┐
              │ AVATAR   │    │  B-ROLL    │
              └───┬──────┘    └─────┬──────┘
                  │                 │
        Voiceover (ElevenLabs)   Voiceover only
                  │                 │
        Image (Replicate Flux)      │  ← user records
        img2img w/ locked ref       │     this visual
                  │                 │
        Lipsync (P-Video / Fabric / Aurora)
                  │                 │
                  └────────┬────────┘
                           ▼
                ┌──────────────────────┐
                │  project.zip         │
                │  • 01_avatar.mp4     │
                │  • 01_voiceover.mp3  │
                │  • 02_broll.md       │
                │  • 02_voiceover.mp3  │
                │  • README.md         │
                └──────────────────────┘
```

## Local-first

Showrunner has no server. Concretely:

- **API keys** live in IndexedDB on the origin you run the app from. They are not synced anywhere.
- **Avatars and projects** (including generated audio, images, and lipsync videos as base64) all live in IndexedDB.
- **Different browsers / browser profiles get separate stores.** Run two isolated Showrunner instances by using two browsers.
- **Clearing site data wipes everything.** Export bundles you care about right after generation. See [Troubleshooting](#troubleshooting) for export quirks.
- **No telemetry.** Showrunner never phones home.

See `SECURITY.md` for the full threat model.

## Customization

Most likely edits, by file:

| Want to change | Edit |
| --- | --- |
| How Claude breaks down scripts | `src/lib/pipeline/prompts.ts` (`STORYBOARD_SYSTEM_PROMPT`) |
| How avatar shots are framed | `src/lib/pipeline/prompts.ts` (`buildAvatarShotPrompt`) |
| Lipsync model pricing or add a new model | `src/lib/pipeline/lipsync-models.ts` + `src/lib/pipeline/lipsync.ts` |
| Image gen model | `src/lib/pipeline/avatar-image.ts` |
| Voiceover settings (stability, similarity_boost) | `src/lib/pipeline/voiceover.ts` |
| Cost estimates | `src/lib/helpers/cost.ts` (`PRICING`) |
| Tailwind tokens, theme | `src/app.css` |

Sections 6 and 7 prompts in `spec.md` are the source of truth — keep them in sync if you change the code.

## Project structure

```
src/
├── routes/                        # SvelteKit pages
│   ├── +layout.svelte             # App shell, routing guard
│   ├── onboarding/                # 4-step wizard
│   ├── avatars/                   # CRUD for locked reference portraits
│   ├── projects/                  # Storyboard workspace
│   └── settings/                  # Re-edit config
├── lib/
│   ├── pipeline/                  # Provider integrations + orchestrator
│   │   ├── prompts.ts             # Storyboard + avatar shot prompts (§6, §7)
│   │   ├── storyboard.ts          # Claude via @ai-sdk/gateway or @ai-sdk/anthropic
│   │   ├── avatar-image.ts        # Replicate Flux portraits + per-scene img2img
│   │   ├── voiceover.ts           # ElevenLabs v3 TTS
│   │   ├── lipsync.ts             # Dispatcher: p-video / fabric / aurora
│   │   ├── lipsync-models.ts      # Model catalog (label, rate, max duration)
│   │   ├── orchestrator.ts        # Bounded-parallel runner, retry, per-scene status
│   │   └── export.ts              # JSZip bundle + master README
│   ├── stores/                    # Reactive Svelte stores (config, avatars, projects, jobs)
│   ├── db/                        # Dexie schema + migrations
│   ├── components/                # UI components (shadcn-svelte + custom)
│   ├── helpers/                   # Pure utilities (cost, duration, image, audio)
│   └── types/                     # Shared TypeScript types
├── app.css                        # Tailwind v4 + Flora-inspired tokens
└── app.html
```

## Deployment

Showrunner is a static SPA — `pnpm build` outputs to `./build`. Deploy anywhere that serves static files:

- **Vercel / Netlify / Cloudflare Pages** — point them at this repo, set the build command to `pnpm build`, output directory to `build`. Done.
- **GitHub Pages** — drop the `build` directory into a Pages branch.
- **Self-host** — `pnpm preview` for local; any nginx/Caddy/Apache works for prod.

Because there's no backend, deployment is just static hosting. There are no env vars to set.

## Troubleshooting

**Replicate calls fail with CORS errors.** Replicate's API does not always allow direct browser calls. If you hit this, the simplest workaround is a tiny Cloudflare Worker proxy that forwards `Authorization` and `Content-Type` headers. We may add an opt-in proxy in a future version.

**fal.ai upload failures on Safari.** fal.ai's storage upload occasionally has issues with Safari's strict cookie handling. Try Chrome or Firefox if the lipsync step keeps failing on Safari specifically.

**ElevenLabs returns 401 even though the key tested OK.** Voice IDs are scoped to the workspace that created them. Make sure the voice IDs you added in onboarding belong to the same ElevenLabs workspace as the API key.

**Storyboard agent returns scenes that don't follow the spec rules.** The model is non-deterministic. Re-running usually fixes drift. If a specific kind of script consistently breaks the rules, edit `STORYBOARD_SYSTEM_PROMPT` in `src/lib/pipeline/prompts.ts` to add a rule.

**Browser storage filling up.** Generated lipsync videos can be large. The detail screen of each project shows you what's stored; export and delete completed projects to free space.

**Reset the app entirely.** Settings → "Reset configuration", or clear site data via your browser's developer tools.

## Spec

The full build spec lives in `spec.md`. It documents the data models, the storyboard agent prompt, the avatar shot template, the locked tech stack, the user flows, the acceptance criteria, and what's explicitly out of scope. Read it before making non-trivial changes.

## Roadmap

See `ROADMAP.md` for what's parked for future versions (multi-avatar projects, video stitching, captions, hosted SaaS).

## Contributing

See `CONTRIBUTING.md`.

Quick version: read `spec.md`, keep it client-side, run `pnpm exec svelte-check && pnpm build && pnpm lint` before opening a PR.

## Security

See `SECURITY.md` for the threat model and how to report vulnerabilities.

## Acknowledgments

- **Spec + first build:** Solomon Nwabuoku
- **Design language:** clones the [Flora AI](https://florafauna.ai) aesthetic — dark, mono, sans-only, content-forward
- **UI primitives:** [shadcn-svelte](https://www.shadcn-svelte.com) on top of [bits-ui](https://www.bits-ui.com)
- **Sample script:** the example in `spec.md` references [Postana](https://postana.app), the calendar agent

## License

MIT — see [`LICENSE`](./LICENSE).

You can use, modify, distribute, and commercialize this code. Keep the copyright notice in any copies or substantial portions you redistribute.
