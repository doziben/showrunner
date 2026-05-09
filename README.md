# Showrunner

> Open-source AI UGC orchestrator. Paste a script, get a director-cut storyboard, lipsynced avatar clips, voiceovers, and b-roll instructions ready for an editor.

Showrunner replaces the manual UGC pipeline:

1. ~~Manually generating voiceovers in ElevenLabs~~
2. ~~Manually cutting voiceovers per scene~~
3. ~~Manually writing avatar prompts for each shot~~
4. ~~Manually pasting prompts into image gen tools~~
5. ~~Manually uploading images + audio to lipsync tools~~
6. ~~Manually downloading and labeling everything~~

Paste a script. Get a zip.

## What it does

- **Storyboard intelligence layer.** Claude reads your script, breaks it into shots, decides what should be on-camera (avatar) vs cutaway (b-roll), and orchestrates the right pipeline for each.
- **Locked avatar consistency.** Pick a reference portrait once. Every per-scene shot uses image-to-image generation with the locked reference so the same person appears throughout.
- **Voiceover with v3 audio tags.** ElevenLabs v3 model. `[confident]`, `[pause]`, `[exasperated sigh]` pass straight through.
- **Lipsync via fal.ai Veed Fabric.** Avatar image + voiceover → talking-head clip.
- **B-roll instructions.** Concrete, brutal recording instructions per cutaway. "Open ChatGPT, type X, scroll for 3 seconds." Not "show ChatGPT failing."
- **Per-scene retry.** If one provider fails, retry that scene. Don't rerun the whole project.
- **Local-first.** All keys and projects live in your browser (IndexedDB). No backend, no auth, nothing leaves your machine except API calls to the providers you configured.

## Quick start

```bash
git clone <this-repo> showrunner
cd showrunner
pnpm install
pnpm dev
```

Open http://localhost:5173. Paste your API keys when prompted.

## Required API keys

You'll need accounts with:

| Provider | Used for | Get key |
| --- | --- | --- |
| Vercel AI Gateway *(or Anthropic direct)* | Storyboard generation (claude-opus-4-7) | https://vercel.com/docs/ai-gateway |
| Replicate | Avatar image generation (Flux 1.1 Pro / Flux Dev) | https://replicate.com/account/api-tokens |
| ElevenLabs | Voiceovers (eleven_v3) | https://elevenlabs.io/app/settings/api-keys |
| fal.ai | Lipsync (Veed Fabric 1.0) | https://fal.ai/dashboard/keys |

### Cost ballpark

For a 60-second UGC video with ~30 seconds of avatar footage:

- Voiceovers: ~$0.30
- Avatar images: ~$0.16
- Lipsync: ~$2.40
- Storyboard: negligible

Showrunner shows the full breakdown before you generate.

## How it works

```
script.txt
    ↓
Claude (storyboard agent)
    ↓
Scene[] — alternating avatar / b-roll
    ↓
For each avatar scene:                For each b-roll scene:
    voiceover → image → lipsync           voiceover only
    (ElevenLabs → Replicate → fal.ai)     (b-roll instructions saved as markdown)
    ↓
project.zip — numbered mp4s, mp3s, b-roll markdowns, master README
```

## Customization

- **Storyboard prompt:** `src/lib/pipeline/prompts.ts` (`STORYBOARD_SYSTEM_PROMPT`). Editing it changes how Claude breaks down your script — e.g. tighter pacing, different platform conventions.
- **Avatar shot template:** same file (`buildAvatarShotPrompt`). Edit the backdrop, framing language, or visual continuity directives.
- **Pricing:** `src/lib/helpers/cost.ts`. Tweak when providers change rates.
- **Image model:** swap Flux 1.1 Pro for Flux Dev (or another Replicate model) in `src/lib/pipeline/avatar-image.ts`.

## Project structure

```
src/
├── routes/                        # SvelteKit pages
│   ├── onboarding/                # 4-step wizard
│   ├── avatars/                   # CRUD for locked reference portraits
│   ├── projects/                  # Storyboard workspace
│   └── settings/                  # Re-edit config
├── lib/
│   ├── pipeline/                  # Provider integrations + orchestrator
│   ├── stores/                    # Svelte stores (config, avatars, projects, jobs)
│   ├── db/                        # Dexie schema
│   ├── components/                # UI components (shadcn-svelte + custom)
│   ├── helpers/                   # Pure utilities (cost, duration, image, audio)
│   └── types/                     # Shared TypeScript types
└── app.css                        # Tailwind v4 + Flora-inspired tokens
```

## Roadmap

See `ROADMAP.md` for what's out of scope for v0.1 (multi-avatar projects, video stitching, hosted SaaS, captions, music).

## Contributing

Issues and PRs welcome. Keep the spec philosophy in mind: Showrunner is intentionally narrow. The moat is the storyboard intelligence layer, not feature breadth.

## License

MIT
