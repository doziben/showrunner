# Showrunner — Build Specification

**Project codename:** Showrunner
**Version:** v0.1 (Open Source MVP)
**Owner:** Solomon
**Last updated:** 2026

---

## 1. What we're building

Showrunner is an open-source AI UGC orchestrator. It turns a written script into a fully-prepared UGC video bundle (avatar lip-synced clips + voiceovers + b-roll instructions) ready for a video editor to assemble.

The workflow it replaces:

1. Manually generating voiceovers in ElevenLabs
2. Manually cutting voiceovers per scene
3. Manually writing avatar prompts for each shot
4. Manually pasting prompts into image gen tools
5. Manually uploading images + audio to lipsync tools
6. Manually downloading and labeling everything

Showrunner does all of this in one orchestrated pipeline triggered by pasting a script.

### Core differentiator

Anyone can wrap an image gen API and a lipsync API. The actual product is the **storyboard intelligence layer**: an AI agent that reads your script, breaks it into shots, decides what should be on-camera (avatar) vs cutaway (b-roll), and orchestrates the right pipeline for each.

This is the moat. Lead UI and copy with this.

### Open source positioning

This is an open-source repo. No auth. Users bring their own API keys (saved locally). Designed so anyone can clone it, drop in keys, and ship UGC same day.

A hosted SaaS version may follow later, but is not part of v0.1.

---

## 2. Tech stack (locked)

| Layer             | Choice                                     | Reason                                                     |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------- |
| Framework         | SvelteKit                                  | Faster to ship, owner's primary stack                      |
| Runtime           | Node 20+                                   | Standard                                                   |
| Language          | TypeScript                                 | Type safety on API responses is critical for this pipeline |
| AI SDK            | Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) | Used via AI Gateway                                        |
| AI Gateway        | Vercel AI Gateway                          | Single endpoint for Claude calls                           |
| Image generation  | Replicate (Flux 1.1 Pro or Flux Dev)       | Best for character consistency                             |
| Voice generation  | ElevenLabs API (direct, no SDK needed)     | User-provided custom voice IDs                             |
| Lipsync           | fal.ai Veed Fabric 1.0                     | $0.08/sec at 480p, 30s cap per gen, public API             |
| Storage           | IndexedDB via Dexie                        | Local-first, no backend                                    |
| File downloads    | JSZip + FileSaver.js                       | Bundle export                                              |
| UI components     | shadcn-svelte                              | Base layer                                                 |
| Styling           | TailwindCSS                                | Pairs with shadcn                                          |
| Design language   | Flora AI (use Mobbin MCP to clone)         | Source of truth                                            |
| Job orchestration | In-memory queue with Svelte stores         | No backend needed for MVP                                  |

**Things explicitly NOT in v0.1:**

- Authentication
- Database / Postgres / Supabase
- Multi-user collaboration
- Server-side processing (all API calls go straight from browser to provider)
- Video stitching / final assembly
- Multiple avatars per project
- Billing or rate limiting

---

## 3. User flow (end to end)

### 3.1 First-time setup (Onboarding)

User lands on the app. They see a 4-step onboarding wizard. They cannot proceed to use any features until this is complete. All keys are stored in IndexedDB.

**Step 1: Welcome screen**

- Brief explanation of what Showrunner does
- "You'll need accounts with: AI Gateway (or Anthropic direct), Replicate, ElevenLabs, and fal.ai"
- Links to each provider's signup page
- "Get started" button

**Step 2: API keys**

- Form with 4 input fields:
  - AI Gateway API key (with toggle to use Anthropic direct instead)
  - Replicate API token
  - ElevenLabs API key
  - fal.ai API key
- Each input has a "test connection" button next to it that pings the provider
- Green check on success, red X with error message on fail
- All inputs are password-type with show/hide toggle
- "Continue" button only enabled when all 4 connections are verified

**Step 3: ElevenLabs voices**

- "Add the voice IDs you want available for your avatars"
- Form with two fields per voice: Label (e.g. "Energetic Female") + Voice ID
- "Add another voice" button to append rows
- Minimum 1 voice required to proceed
- "Test voice" button next to each row generates a 5-second sample using a default test phrase
- Sample plays inline with audio player

**Step 4: Confirmation**

- "You're all set" screen
- Summary of what was configured
- "Create your first avatar" button → routes to `/avatars/new`

### 3.2 Avatar creation flow

User goes to `/avatars`. Empty state if no avatars: "Create your first avatar."

**Avatar creation has two paths:**

**Path A: Generate with AI**

- User enters a description prompt (e.g. "woman in her late 20s, mixed race, cream sweater, home office")
- Or selects from a gallery of preset character templates
- User picks a voice (dropdown of voices configured in onboarding)
- User clicks "Generate avatar"
- Replicate API generates a portrait image using Flux
- 4 variations are returned; user picks one
- Selected image is locked as the avatar's reference image
- Avatar is saved with: name, reference image (base64), voice ID, description prompt

**Path B: Import existing**

- User uploads a portrait image (JPG/PNG)
- User picks a voice
- Avatar is saved with: name, reference image (base64), voice ID, description = empty

After creation, user is redirected to `/avatars/[id]` showing avatar details.

### 3.3 Project creation flow

User goes to `/projects`. Empty state: "Create your first project."

**Project creation:**

1. User enters a project name
2. User selects an avatar from their library
3. User pastes their script into a large textarea
4. User clicks "Generate storyboard"

**Storyboard generation:**

- Loading state with progress indicator
- Claude (via AI Gateway) processes the script and returns structured JSON
- User is taken to `/projects/[id]/storyboard`

**Storyboard review:**

- Each scene appears as an editable card showing:
  - Scene number
  - Type badge (AVATAR or B-ROLL)
  - Audio line (the exact words to be spoken, editable)
  - For AVATAR scenes: action description (editable), pose suggestion
  - For B-ROLL scenes: shot description (editable), recording instructions
  - Estimated duration in seconds
- User can:
  - Edit any field
  - Drag to reorder scenes
  - Delete a scene
  - Add a new scene (manual)
  - Change scene type (AVATAR ↔ B-ROLL)
- Preview pane on the right shows estimated total duration and cost breakdown
- "Generate all" button runs the pipeline

**Pipeline execution:**

- User sees a real-time progress view
- Each scene shows its own status:
  - Pending
  - Generating voiceover...
  - Generating avatar image...
  - Generating lipsync...
  - Complete (with thumbnail/preview)
  - Failed (with retry button)
- Failed scenes can be retried individually without rerunning the whole project

**Export:**

- Once all scenes complete, "Export bundle" button enables
- Clicking it builds a zip file in-browser
- Zip contents:
  ```
  project-name.zip
  ├── 01_avatar_hook.mp4
  ├── 01_voiceover.mp3
  ├── 02_broll.md (instructions)
  ├── 02_voiceover.mp3
  ├── 03_avatar_reveal.mp4
  ├── 03_voiceover.mp3
  └── README.md (full storyboard summary)
  ```

---

## 4. Data models

All stored in IndexedDB via Dexie.

### 4.1 Config

```typescript
interface Config {
  id: "singleton"; // Always 'singleton', only one config exists
  aiGatewayKey?: string;
  anthropicKey?: string;
  useAiGateway: boolean;
  replicateKey: string;
  elevenLabsKey: string;
  falKey: string;
  voices: Voice[];
  createdAt: number;
  updatedAt: number;
}

interface Voice {
  id: string; // local UUID
  label: string;
  elevenLabsVoiceId: string;
}
```

### 4.2 Avatar

```typescript
interface Avatar {
  id: string;
  name: string;
  description: string;
  referenceImageBase64: string; // The locked reference
  voiceId: string; // FK to Voice.id
  createdAt: number;
}
```

### 4.3 Project

```typescript
interface Project {
  id: string;
  name: string;
  avatarId: string; // FK to Avatar.id
  script: string;
  scenes: Scene[];
  status: "draft" | "generating" | "complete" | "failed";
  createdAt: number;
  updatedAt: number;
}

interface Scene {
  id: string;
  order: number;
  type: "avatar" | "broll";
  audioLine: string; // What's spoken in this scene
  durationSeconds: number; // Estimated
  // Avatar-specific fields
  actionDescription?: string; // What the avatar is doing
  framing?: "medium" | "close-up" | "wide";
  // B-roll-specific fields
  shotDescription?: string; // What the user should record
  recordingInstructions?: string;
  // Generation outputs
  voiceoverBase64?: string;
  voiceoverUrl?: string; // Object URL for playback
  avatarImageBase64?: string; // For avatar scenes
  lipsyncVideoBase64?: string; // For avatar scenes
  status:
    | "pending"
    | "generating-voiceover"
    | "generating-image"
    | "generating-lipsync"
    | "complete"
    | "failed";
  errorMessage?: string;
}
```

---

## 5. API integrations

### 5.1 AI Gateway / Anthropic

**Used for:** Storyboard generation

**Endpoint:** Via Vercel AI SDK with `@ai-sdk/anthropic`

**Setup:**

```typescript
import { createAnthropic } from "@ai-sdk/anthropic";

const anthropic = createAnthropic({
  apiKey: config.useAiGateway ? config.aiGatewayKey : config.anthropicKey,
  baseURL: config.useAiGateway
    ? "https://gateway.ai.cloudflare.com/v1/.../anthropic"
    : undefined,
});

const model = anthropic("claude-opus-4-7");
```

**Note:** Use `claude-opus-4-7` for storyboard generation. The reasoning required to break down a script into well-paced UGC shots benefits from the strongest model. Cost is negligible (one call per project).

### 5.2 Replicate (Image generation)

**Used for:** Avatar reference image generation + per-scene avatar shots

**Model:** `black-forest-labs/flux-1.1-pro` or `black-forest-labs/flux-dev`

For initial avatar creation: standard text-to-image
For per-scene shots: image-to-image with the locked reference image as input, low strength to preserve identity

```typescript
const replicateCall = async (input: any) => {
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.replicateKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "flux-1.1-pro-version-id",
      input,
    }),
  });
  // Poll for completion
};
```

### 5.3 ElevenLabs (Voiceovers)

**Used for:** Text-to-speech for every scene

**Endpoint:** `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`

**Model ID:** `eleven_v3` (use the v3 model for emotional control)

```typescript
const elevenLabsCall = async (text: string, voiceId: string) => {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": config.elevenLabsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_v3",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );
  return await response.arrayBuffer();
};
```

### 5.4 fal.ai (Lipsync via Veed Fabric 1.0)

**Used for:** Combining avatar image + voiceover into lipsync video

**Endpoint:** `https://fal.run/veed/fabric-1.0`

**Inputs:**

- `image_url`: The avatar image (must be hosted; we'll use base64 data URLs first, fall back to upload to fal.ai's storage)
- `audio_url`: The voiceover audio (same handling)
- `resolution`: '480p' (default) or '720p'

```typescript
const falCall = async (imageDataUrl: string, audioDataUrl: string) => {
  // First, upload to fal.ai storage to get URLs
  const imageUpload = await fetch("https://fal.run/storage/upload", {
    method: "POST",
    headers: { Authorization: `Key ${config.falKey}` },
    body: imageBlob,
  });
  // ...
  const response = await fetch("https://fal.run/veed/fabric-1.0", {
    method: "POST",
    headers: {
      Authorization: `Key ${config.falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_url: imageUploadUrl,
      audio_url: audioUploadUrl,
      resolution: "480p",
    }),
  });
};
```

Cost: $0.08/sec at 480p. A 5-second clip costs $0.40. A typical 60-second UGC video has maybe 30 seconds of avatar footage = $2.40 in lipsync alone.

---

## 6. The storyboard agent prompt

This is the most important prompt in the system. It runs once per project to convert a raw script into a structured storyboard.

```typescript
const STORYBOARD_SYSTEM_PROMPT = `You are a UGC video director with 10 years of experience producing short-form content for TikTok, Instagram Reels, and LinkedIn. Your job is to take a script and break it down into a shot-by-shot storyboard optimized for the UGC format.

## UGC conventions you must follow

1. **The hook is always on-camera.** The first line must be an avatar shot. Faces hold attention in the first 3 seconds; cutaways lose viewers.

2. **High-information moments are cutaways.** When the script describes something specific (a tool, a screen, a process, a number), cut to b-roll showing that thing. Avatar talking head over abstract claims, b-roll over concrete demonstrations.

3. **Emotional beats are on-camera.** Frustration, excitement, "here's the secret" moments need a face. Use the avatar.

4. **CTAs are on-camera.** The final ask (subscribe, comment, follow) needs a face for trust.

5. **Pacing.** Avatar shots are 3 to 10 seconds. B-roll shots are 2 to 8 seconds. Don't let any single shot run longer than 12 seconds; the format demands cuts.

6. **Pattern interrupts.** Every 8 to 12 seconds there should be a visual change (cut from avatar to b-roll, or new b-roll, or framing change on the avatar).

## Your output format

Return a JSON object matching this exact schema:

{
  "scenes": [
    {
      "type": "avatar" | "broll",
      "audioLine": "The exact text to be spoken in this scene. Should be a natural breath-group from the script.",
      "durationSeconds": <integer estimate, based on ~3 words per second>,

      // For avatar scenes only:
      "actionDescription": "What the avatar is doing physically. Mid-sentence energy, expression, hand gesture, posture. Match the emotional tone of the line.",
      "framing": "medium" | "close-up" | "wide",

      // For broll scenes only:
      "shotDescription": "What the viewer sees on screen during this audio.",
      "recordingInstructions": "Specific guidance for the user on how to capture this shot. Be concrete: what to record, what app to open, what to do."
    }
  ]
}

## Rules

- Break the script into natural breath groups, not arbitrary chunks. Each scene's audioLine should be something a person would say in one breath.
- The first scene must be type: "avatar".
- The last scene (CTA) must be type: "avatar".
- Use b-roll wherever the script describes something concrete that benefits from visual proof (apps, screens, products, processes, comparisons).
- Avatar scenes should have varied framing across the storyboard (don't keep it medium shot the whole time). Use close-up for emotional or "secret" beats, wide rarely.
- Include action descriptions that are mid-action verbs ("leaning forward", "raising eyebrow"), not static descriptions ("looking at camera").
- For recordingInstructions on b-roll scenes, be brutally specific. "Open ChatGPT, type 'give me content ideas for my brand', let it generate, scroll through the boring output for 3 seconds." Not "show ChatGPT failing."

## Example

Input script: "Most businesses use AI for content the wrong way. They open ChatGPT and type generic prompts. Here's what nobody tells you. ChatGPT can't actually open Instagram."

Output:
{
  "scenes": [
    {
      "type": "avatar",
      "audioLine": "Most businesses use AI for content the wrong way.",
      "durationSeconds": 4,
      "actionDescription": "Mid-conversation energy, slight head tilt, eyebrows raised. Hand gesture coming into frame, palm slightly open. 'Wait, listen to this' energy.",
      "framing": "medium"
    },
    {
      "type": "broll",
      "audioLine": "They open ChatGPT and type generic prompts.",
      "durationSeconds": 5,
      "shotDescription": "Screen recording of ChatGPT being opened, prompt being typed, generic output appearing.",
      "recordingInstructions": "Open ChatGPT in a browser. Type slowly: 'give me content ideas for my brand'. Let it generate fully. Scroll through the boring bullet list output. Capture as 9:16 screen recording."
    },
    {
      "type": "avatar",
      "audioLine": "Here's what nobody tells you.",
      "durationSeconds": 3,
      "actionDescription": "Tighter framing, conspiratorial energy. Slight forward lean, knowing smirk forming, index finger raised subtly.",
      "framing": "close-up"
    },
    {
      "type": "broll",
      "audioLine": "ChatGPT can't actually open Instagram.",
      "durationSeconds": 4,
      "shotDescription": "Screen recording showing ChatGPT failing to access an Instagram link.",
      "recordingInstructions": "In ChatGPT, paste an Instagram post URL and ask it to summarize the post. Capture the response where it admits it can't access the link. Highlight that admission with a red circle in post."
    }
  ]
}

Now process the user's script.`;
```

The user message simply contains the raw script. Use `generateObject` from the AI SDK with a Zod schema matching the output structure for type-safe parsing.

---

## 7. The avatar shot prompt template

For each avatar scene, generate the per-scene image using this template. The "locked avatar block" is the description that was used to create the original reference, plus the action description for this specific scene.

```typescript
const buildAvatarShotPrompt = (avatar: Avatar, scene: Scene) => {
  return `${avatar.description}

She is ${scene.actionDescription}

Filmed on iPhone in vertical 9:16 format, natural daylight from a window to her left, slight grain, authentic UGC aesthetic, not overly polished. Sitting at a small wooden desk in a cozy home office. Blurred background shows a plant, a bookshelf, and soft warm lighting. Holding her phone in selfie position at chest level, looking directly into the lens.

${
  scene.framing === "close-up"
    ? "Close-up shot, framed from shoulders up, tighter composition."
    : ""
}
${scene.framing === "medium" ? "Medium shot, framed from chest up." : ""}
${
  scene.framing === "wide"
    ? "Wide shot, full upper body and surroundings visible."
    : ""
}

Same woman, same outfit, same room, same lighting as reference image. Visual continuity required.

No text on screen. No music overlay. Single still frame.`;
};
```

For Replicate Flux call, pass the locked reference image as the `image` input parameter with a low denoising strength (~0.4 to 0.5) to preserve identity while allowing the action change.

---

## 8. UI / Design specification

### 8.1 Design language: Flora AI clone

Use the Mobbin MCP to pull Flora AI screens as reference. Replicate exactly:

- Color palette (cream/off-white background, warm dark text, soft accents)
- Typography (likely a custom serif display + clean sans body)
- Generous spacing
- Soft shadows, subtle borders
- Card-based layouts with rounded corners (~16px radius)
- Button treatments (filled with subtle gradient, outline variants)
- Form input styling (large, generous padding, clear focus states)

shadcn-svelte is the component base. Customize the Tailwind theme to match Flora exactly.

### 8.2 Layout structure

Two-column app shell:

**Left sidebar (240px):**

- Logo / wordmark at top
- Navigation: Avatars, Projects
- Settings link at bottom (re-edit API keys)

**Main content area:**

- Page-specific content
- Generous max-width (~1200px)
- Centered with padding

### 8.3 Key screens

**Onboarding (4 steps)**

- Full-screen overlay, centered card
- Progress indicator at top (4 dots)
- Each step has its own content + "Continue" button

**Avatars index (`/avatars`)**

- Grid of avatar cards (3 columns on desktop, 1 on mobile)
- Each card: large portrait image, name, voice label, "Use" + "Edit" buttons
- "Create new avatar" card at the start of the grid (dashed border, plus icon)

**Avatar detail (`/avatars/[id]`)**

- Large portrait on the left
- Details on the right: name, description, voice (with "play sample" button)
- "Edit" and "Delete" actions

**Projects index (`/projects`)**

- List view with each project as a row
- Columns: name, avatar (small thumbnail), status badge, last updated, actions
- "New project" button top-right

**Project workspace (`/projects/[id]/storyboard`)**

- Main area: vertical list of scene cards
- Right panel (collapsible): preview info (total duration, estimated cost, scene count)
- Top bar: project name, avatar info, "Generate all" CTA

**Scene card design:**

- Type badge in top-left (colored: avatar = warm orange, broll = cool blue)
- Scene number
- Audio line in larger type (editable inline, click to edit)
- Below: action/shot description, framing (for avatar) or recording instructions (for broll)
- Drag handle on the left
- Status indicator on the right (pending/generating/complete/failed)
- For complete avatar scenes: small video preview thumbnail
- For complete broll scenes: just the voiceover player

**Generation progress view:**

- Same layout as storyboard but each card shows live status
- Progress bars on actively generating scenes
- Toast notifications for individual scene completions
- "Export bundle" button at top, disabled until all complete

### 8.4 Responsive behavior

Desktop is the primary target. Mobile should work but may collapse panels. Don't optimize for mobile in v0.1.

---

## 9. File structure

```
showrunner/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte                    # App shell, sidebar
│   │   ├── +layout.ts                        # Check onboarding completed
│   │   ├── +page.svelte                      # Dashboard / landing (redirects)
│   │   ├── onboarding/
│   │   │   └── +page.svelte                  # 4-step wizard
│   │   ├── avatars/
│   │   │   ├── +page.svelte                  # Index
│   │   │   ├── new/
│   │   │   │   └── +page.svelte              # Create avatar
│   │   │   └── [id]/
│   │   │       └── +page.svelte              # Detail/edit
│   │   ├── projects/
│   │   │   ├── +page.svelte                  # Index
│   │   │   ├── new/
│   │   │   │   └── +page.svelte              # Create project (paste script)
│   │   │   └── [id]/
│   │   │       ├── +page.svelte              # Redirect to storyboard
│   │   │       └── storyboard/
│   │   │           └── +page.svelte          # Storyboard workspace
│   │   └── settings/
│   │       └── +page.svelte                  # Re-edit config
│   ├── lib/
│   │   ├── pipeline/
│   │   │   ├── storyboard.ts                 # Calls Claude, returns Scene[]
│   │   │   ├── voiceover.ts                  # ElevenLabs TTS
│   │   │   ├── avatar-image.ts               # Replicate Flux
│   │   │   ├── lipsync.ts                    # fal.ai Fabric
│   │   │   ├── orchestrator.ts               # Coordinates the full pipeline per scene
│   │   │   └── prompts.ts                    # All prompt templates
│   │   ├── stores/
│   │   │   ├── config.ts                     # Reactive config store
│   │   │   ├── avatars.ts                    # Avatar CRUD store
│   │   │   ├── projects.ts                   # Project CRUD store
│   │   │   └── jobs.ts                       # In-memory job queue state
│   │   ├── db/
│   │   │   ├── index.ts                      # Dexie setup
│   │   │   └── migrations.ts                 # Schema versions
│   │   ├── components/
│   │   │   ├── ui/                           # shadcn-svelte components
│   │   │   ├── SceneCard.svelte
│   │   │   ├── AvatarCard.svelte
│   │   │   ├── OnboardingStep.svelte
│   │   │   ├── ApiKeyInput.svelte
│   │   │   ├── VoiceSelector.svelte
│   │   │   ├── ScriptEditor.svelte
│   │   │   └── ProgressIndicator.svelte
│   │   ├── utils/
│   │   │   ├── zip.ts                        # Bundle export
│   │   │   ├── audio.ts                      # Audio handling helpers
│   │   │   ├── image.ts                      # Image base64 helpers
│   │   │   └── duration.ts                   # Estimate scene durations
│   │   └── types/
│   │       └── index.ts                      # All TypeScript types
│   ├── app.css                               # Global styles, Flora-inspired tokens
│   └── app.html
├── static/
│   ├── favicon.png
│   └── og-image.png
├── tailwind.config.ts
├── svelte.config.js
├── vite.config.ts
├── package.json
├── tsconfig.json
├── README.md                                 # Setup instructions for users
└── .env.example                              # Empty, since no env vars needed
```

---

## 10. Implementation phases

### Phase 1: Foundation (Day 1, Hours 1-3)

1. Initialize SvelteKit project with TypeScript
2. Install dependencies: `tailwindcss`, `shadcn-svelte`, `dexie`, `ai`, `@ai-sdk/anthropic`, `replicate`, `@fal-ai/client`, `jszip`, `file-saver`, `nanoid`, `zod`
3. Configure Tailwind with Flora-inspired theme tokens (colors, typography, spacing)
4. Set up the app shell layout
5. Set up Dexie database with migrations
6. Implement config store + persistence

### Phase 2: Onboarding (Day 1, Hours 4-6)

1. Build 4-step onboarding wizard
2. Implement API key validation (test connections)
3. Implement voice management (add/remove/test)
4. Routing guard: if no config, redirect to `/onboarding`

### Phase 3: Avatar management (Day 1, Hours 7-9)

1. Avatar list page
2. Avatar create page (both paths: AI generate, import)
3. Replicate integration for portrait generation
4. Avatar detail page
5. Reference image storage (base64 in IndexedDB)

### Phase 4: Storyboard agent (Day 2, Hours 1-3)

1. Implement the storyboard prompt
2. Set up AI SDK with the chosen provider
3. Use `generateObject` with Zod schema for structured output
4. Test extensively with sample scripts before building UI

### Phase 5: Project workspace (Day 2, Hours 4-7)

1. Project create page (script input)
2. Storyboard view with scene cards
3. Inline editing for scene fields
4. Drag-and-drop reordering
5. Add/delete scene actions
6. Cost estimation display

### Phase 6: Pipeline orchestration (Day 2, Hours 8-12)

1. ElevenLabs voiceover generation
2. Replicate avatar shot generation (per scene, with reference image)
3. fal.ai Fabric lipsync generation
4. Job queue with status updates
5. Per-scene retry logic
6. Progress UI

### Phase 7: Export (Day 3, Hours 1-2)

1. JSZip bundle generation
2. README.md generation in the bundle
3. File download trigger

### Phase 8: Polish (Day 3, Hours 3-6)

1. Empty states
2. Error states
3. Loading states
4. Toast notifications
5. Confirmation dialogs (destructive actions)
6. Keyboard shortcuts
7. Settings page (re-edit config)

---

## 11. Critical implementation details

### 11.1 Avatar consistency

This is the most important technical detail. If the avatar drifts between scenes, the product is broken.

**Approach:**

1. When the avatar is first generated, save the resulting image as the locked reference
2. For every per-scene shot, use Flux's image-to-image mode with:
   - The locked reference as input
   - Strength: 0.4-0.5 (preserves identity, allows action change)
   - The action description in the prompt
3. Use the same seed for the same avatar across scenes (store seed with avatar)
4. After generation, run a quick visual sanity check (could be future feature: face embedding similarity score)

**Test before building anything else:** Generate 5 different action shots of the same avatar and verify they look like the same person. If they don't, this whole approach fails. Iterate on strength + prompting until they do.

### 11.2 Audio + image hosting for fal.ai

fal.ai Fabric expects URLs for image and audio. Options:

- **Option A (preferred):** Upload to fal.ai's storage endpoint first, get a temporary URL, pass that URL to Fabric
- **Option B (fallback):** Use data URLs (may have size limits)
- **Option C:** User-provided storage (S3, R2, etc) — too much friction for v0.1

Use Option A. fal.ai client library handles this.

### 11.3 Cost transparency

Show the user costs upfront, before generation runs:

```
Estimated cost for this project:
- Voiceovers (8 scenes @ ~5s avg): ~$0.20 (ElevenLabs)
- Avatar images (4 scenes): ~$0.16 (Replicate Flux)
- Lipsync (4 scenes @ ~5s avg): ~$1.60 (fal.ai Fabric)
Total: ~$1.96
```

This prevents sticker shock. Make the math transparent.

### 11.4 ElevenLabs v3 audio tags

The script may contain v3 audio tags like `[confident]`, `[pause]`, `[exasperated sigh]`. Pass them through to ElevenLabs as-is; v3 handles them natively. Don't strip them.

### 11.5 Error handling

Every API call must have:

- Timeout (30s for ElevenLabs, 5min for Replicate, 5min for fal.ai)
- Retry with exponential backoff (3 attempts)
- Clear error messages surfaced to the user
- Failed scenes don't break the whole project; user can retry individual scenes

### 11.6 Local-first considerations

All data lives in the browser. Users should be warned:

- Clearing browser storage will lose all projects and avatars
- Avatars and generated videos can take significant local storage (offer "export and delete" option for completed projects)
- Recommend exporting bundles immediately after generation

---

## 12. README.md (for the open source repo)

The repo's README should include:

1. **Hero**: One-sentence description + screenshot
2. **What it does**: Bulleted list of capabilities
3. **Why it exists**: The manual UGC pipeline pain
4. **Quick start**: Clone, install, run
5. **Required API keys**: Where to get each one + estimated costs
6. **How it works**: Architecture diagram showing the flow
7. **Customization**: How to modify prompts, swap providers, etc
8. **Roadmap**: What's coming (multi-avatar, video stitching, hosted version)
9. **Contributing**: PR guidelines
10. **License**: MIT

---

## 13. .env.example

Empty file with comments. All keys are entered via UI:

```
# Showrunner does not use environment variables.
# All API keys are configured in the app's onboarding flow
# and stored locally in your browser's IndexedDB.
#
# This means:
# - Your keys never leave your machine
# - You can run multiple isolated instances by using different browsers
# - There's no server to deploy
```

---

## 14. Out of scope (do NOT build in v0.1)

Be ruthless about this. The following are explicitly out of scope:

- User accounts / authentication
- Cloud sync of projects
- Team collaboration
- Multiple avatars in a single project
- Auto-stitching of final video (we hand off to video editors)
- Hosted SaaS version
- Mobile-optimized UI
- Webhooks
- API access (Showrunner consuming, not providing)
- Built-in script writing assistance (user brings their own script)
- Voice cloning (user provides voice IDs already created in ElevenLabs)
- Background music
- Captions / subtitles generation
- Translation
- Analytics / usage tracking

Park these in a `ROADMAP.md` for future versions.

---

## 15. Acceptance criteria (Definition of Done)

v0.1 is complete when:

- [ ] A new user can clone the repo, run `npm install && npm run dev`, and see the app
- [ ] Onboarding successfully validates and saves all 4 API keys
- [ ] User can add at least one custom voice ID and test it
- [ ] User can generate an avatar from a description prompt
- [ ] User can create a project with a pasted script
- [ ] Storyboard agent returns a structured storyboard within 30 seconds
- [ ] User can edit any field in the storyboard
- [ ] Generation pipeline completes for a 5-scene project (mix of avatar and broll) without errors
- [ ] Generated avatars look like the same person across all scenes
- [ ] Voiceovers respect ElevenLabs v3 audio tags in the script
- [ ] Lipsync videos download and play correctly
- [ ] Bundle export produces a working zip with all files properly labeled
- [ ] Failed scenes can be retried individually
- [ ] All costs are estimated and displayed before generation runs

---

## 16. Reference: example project end-to-end

To verify the build, here's a sample project that should work end-to-end:

**Avatar:** Generate a "woman in her late 20s, mixed race, cream sweater, in a home office"

**Voice:** A female voice configured in ElevenLabs (any expressive voice)

**Project name:** "AI content video"

**Script:**

```
[confident] Most businesses are using AI for content the wrong way.

[slightly mocking] They open ChatGPT, type "give me content ideas for my brand," [pause] and get back the same generic list every other brand in their niche is getting.

[leaning in] Here's what nobody tells you.

[matter-of-fact] ChatGPT can't actually open Instagram. It can't browse TikTok. It can't read your competitor's latest post.

[exasperated sigh] So you spend an hour going back and forth, [tired] and the content still sounds mid.

[shifting tone, energetic] That's why we built the Postana calendar agent.

[warm, inviting] Comment "POSTANA" and I'll send you the link.
```

**Expected storyboard:** ~7 scenes, alternating avatar and b-roll, total runtime ~45 seconds.

**Expected output:** Zip file with 7 voiceovers, ~4 avatar lipsync videos, ~3 b-roll instruction markdowns, and a master README.

---

## 17. Notes for Claude Code

- Read this entire spec before writing any code
- Build in the phase order specified in section 10
- After each phase, verify the acceptance criteria for that phase before moving on
- The storyboard agent prompt in section 6 is final; do not modify without reason
- The avatar shot prompt template in section 7 is final; do not modify without reason
- For UI: use the Mobbin MCP to pull Flora AI references first, before writing any styles
- All API integrations should have detailed error logging visible in the browser console during development
- No backend. Everything runs in the browser. If you find yourself wanting a server, stop and find a client-side solution.
- When in doubt, prioritize developer experience for the open source user. Setup should be obvious. Errors should be clear. Defaults should be sensible.
