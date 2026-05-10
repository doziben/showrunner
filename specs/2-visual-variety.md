# Showrunnnr Spec Addendum — Visual Variety Features

**Version:** v0.2 patch to original spec
**Status:** Adds two related features for avatar visual variety
**Owner:** Solomon

---

## Overview

The original spec generates avatar shots that all look identical across scenes (same outfit, same room, same pose). Real UGC creators rotate their visual presentation to look authentic. This addendum adds two features to address that:

1. **Within-video variety:** Expanded framing/pose options that vary across avatar scenes in a single project
2. **Across-video variety:** Per-project avatar variants (default / custom / random) so each project has a fresh visual setup

These are minor changes to the existing pipeline. No new database tables. No major UI overhaul. Just smarter prompting and one new step in the project creation flow.

---

## Feature 1: Expanded framing options (within-video variety)

### What changes

The `Scene.framing` type currently has 3 options: `medium`, `close-up`, `wide`. Expand it to 7 options that capture pose AND framing AND angle:

```typescript
type SceneFraming =
  | 'medium_direct'        // chest up, looking directly at camera (current default)
  | 'close-up_direct'      // tight on face, looking at camera
  | 'medium_off-axis'      // chest up, looking slightly off-camera (~15° to the side)
  | 'low_angle'            // phone held below face level, slight up-angle
  | 'high_angle'           // phone held above face level, slight down-angle
  | 'leaning_forward'      // engaged, intense, closer to camera, intimate
  | 'leaning_back';        // relaxed, casual, slight distance from camera
```

### Storyboard agent prompt changes

Update the storyboard system prompt (in `lib/pipeline/prompts.ts`) with a new framing rule. Add this to the existing rules section:

```
## Framing variation rule

Across avatar scenes in a single project, you must vary the framing to simulate the natural camera movement of a real UGC shoot. Do not use the same framing value in two consecutive avatar scenes.

Available framing values:
- "medium_direct": chest up, looking directly at camera (use for hooks, neutral statements)
- "close-up_direct": tight on face, looking at camera (use for emotional or "secret" beats)
- "medium_off-axis": chest up, looking slightly off-camera (use for thoughtful, reflective moments)
- "low_angle": phone held below face level, slight up-angle (use for confident, declarative moments)
- "high_angle": phone held above face level, slight down-angle (use for warm, intimate moments like CTAs)
- "leaning_forward": engaged, intense, closer to camera (use for "listen up" moments)
- "leaning_back": relaxed, casual, slight distance from camera (use for matter-of-fact statements)

The first scene must use "medium_direct" or "leaning_forward" (strong opening framings). The CTA (last scene) should use "high_angle" or "medium_direct" (warm and inviting).
```

Also update the JSON output schema in the prompt:

```
"framing": "medium_direct" | "close-up_direct" | "medium_off-axis" | "low_angle" | "high_angle" | "leaning_forward" | "leaning_back"
```

### Avatar shot prompt template changes

Update `buildAvatarShotPrompt` in `lib/pipeline/prompts.ts` to translate each framing value into specific visual instructions:

```typescript
const FRAMING_DESCRIPTIONS: Record<SceneFraming, string> = {
  'medium_direct': 'Medium shot, framed from chest up, subject looking directly into the camera lens. Phone held at chest level, eye-line straight ahead.',
  'close-up_direct': 'Close-up shot, framed from shoulders up, tighter composition. Subject looking directly into the camera lens. Phone held closer to face, eye-line straight ahead. More intimate framing.',
  'medium_off-axis': 'Medium shot, framed from chest up, subject looking slightly off-camera (about 15 degrees to the side, as if looking at someone just beside the camera). Phone held at chest level. Thoughtful, reflective composition.',
  'low_angle': 'Medium shot from a slightly low angle, phone held just below the subject\'s face level, looking slightly upward at her. Confident, declarative composition.',
  'high_angle': 'Medium shot from a slightly high angle, phone held just above the subject\'s face level, looking slightly downward at her. Warm, intimate composition. Good for connecting with viewer.',
  'leaning_forward': 'Medium shot, subject leaning forward toward the camera, closer to the lens than usual. Engaged, intense composition. Phone held at chest level but the subject is closer to it.',
  'leaning_back': 'Medium shot, subject leaning back slightly away from the camera, more relaxed posture. Casual, matter-of-fact composition. Phone held at chest level, slight distance.',
};

const buildAvatarShotPrompt = (avatar: Avatar, scene: Scene) => {
  const framingInstruction = FRAMING_DESCRIPTIONS[scene.framing] || FRAMING_DESCRIPTIONS['medium_direct'];

  return `${avatar.description}

She is ${scene.actionDescription}

Filmed on iPhone in vertical 9:16 format, natural daylight, slight grain, authentic UGC aesthetic, not overly polished. ${avatar.environmentDescription}

${framingInstruction}

Same woman, same outfit, same room, same lighting as the project's reference image. Visual continuity required across all scenes in this project.

No text on screen. No music overlay. Single still frame.`;
};
```

Note: this template now references `avatar.environmentDescription`. That field needs to be added to the Avatar type to capture the locked environment for this project (see Feature 2 below).

### UI changes

None required for the core feature. The framing variation happens automatically inside the storyboard agent and image generation pipeline, transparent to the user.

Optional polish: in the Scene Card component, show the framing as a small label tag next to the type badge. E.g., `AVATAR · close-up_direct`. This helps the user understand why each scene looks different. They can also edit the framing dropdown if they want to override.

### Acceptance criteria

- [ ] Storyboard agent never returns the same framing value for two consecutive avatar scenes
- [ ] Generated avatar images visibly show framing variation (close-ups vs medium shots vs angles)
- [ ] User can edit the framing field on a scene before generation
- [ ] Default value when adding a manual scene is `medium_direct`

---

## Feature 2: Per-project avatar variants

### What changes

When creating a new project, the user picks an avatar AND chooses the visual setup for THIS project's avatar. Three options:

- **Default:** Use the avatar's original locked reference image as-is (current behavior)
- **Custom:** User describes a new outfit/environment ("kitchen, white tank top, golden hour")
- **Random:** AI picks a fresh combination different from the user's most recent projects

The selected variant is locked for the entire project (every scene uses the same outfit/environment), but each new project gets a chance to vary the setup. This mirrors how real UGC creators batch-shoot but rotate setups across shoots.

### Data model changes

**Avatar type stays mostly the same** but gains an optional environment field for the original setup:

```typescript
interface Avatar {
  id: string;
  name: string;
  description: string;                  // The locked face/body/personality (e.g., "woman in her late twenties, mixed race...")
  environmentDescription: string;       // The original locked environment (e.g., "cream sweatshirt, cozy home office, plant in background, sunny daylight")
  referenceImageBase64: string;
  voiceId: string;
  createdAt: number;
  recentEnvironments?: string[];        // Last 5 environments used (for the "random" option to avoid repetition)
}
```

**Project type gains variant fields** to track this project's specific avatar setup:

```typescript
interface Project {
  id: string;
  name: string;
  avatarId: string;
  script: string;
  scenes: Scene[];
  status: 'draft' | 'generating' | 'complete' | 'failed';
  createdAt: number;
  updatedAt: number;

  // New fields for avatar variant
  avatarVariantMode: 'default' | 'custom' | 'random';
  avatarVariantDescription: string;     // The actual environment description used for this project (filled in for all three modes)
  avatarVariantReferenceImage: string;  // The freshly generated reference image for this project's avatar setup
}
```

The `avatarVariantReferenceImage` is what gets used as the reference for every scene's avatar shot in this project. The original `Avatar.referenceImageBase64` stays the identity anchor, but the project-specific reference is the visual style anchor.

### UI changes

Add one new step to the project creation flow, inserted between "select avatar" and "paste script":

**Step: Choose avatar setup**

After the user picks an avatar, show a screen with three options as cards:

```
[ Default ]
Use Maya's original setup. (Same outfit and room as her reference image.)

[ Custom ]
Describe a new outfit and environment for this video.
[Text input: "e.g., kitchen, white tank top, golden hour lighting, coffee mug on counter"]

[ Random ]
Let AI pick a fresh setup different from your recent projects.
```

Below the cards, show a small preview area:

- For **Default**: show the existing avatar reference image
- For **Custom**: show a "Preview" button that generates a sample image with the custom description (so user can verify before committing)
- For **Random**: show a "Surprise me" button that picks a random setup and generates a preview

User can preview as many times as they want (each preview is a separate Replicate call, so it costs them, but worth it for getting the right setup). Once they're happy, they click "Use this setup" and continue to script paste.

The chosen setup's environment description and generated reference image are saved on the Project. From there, the rest of the pipeline works exactly as before, except every avatar shot uses the project-specific reference image instead of the global avatar reference image.

### New pipeline function: generateAvatarVariant

Add a new function in `lib/pipeline/avatar-image.ts`:

```typescript
async function generateAvatarVariant(
  avatar: Avatar,
  mode: 'default' | 'custom' | 'random',
  customDescription?: string
): Promise<{ environmentDescription: string; referenceImageBase64: string }> {

  if (mode === 'default') {
    return {
      environmentDescription: avatar.environmentDescription,
      referenceImageBase64: avatar.referenceImageBase64,
    };
  }

  let environmentDescription: string;

  if (mode === 'custom') {
    if (!customDescription) throw new Error('Custom mode requires a description');
    environmentDescription = customDescription;
  } else {
    // mode === 'random'
    environmentDescription = await generateRandomEnvironment(avatar);
  }

  // Generate a fresh reference image with the same identity but new environment
  const prompt = buildVariantPrompt(avatar, environmentDescription);
  const referenceImageBase64 = await replicateImageGen({
    prompt,
    image: avatar.referenceImageBase64, // Use original as identity anchor
    strength: 0.45, // Preserves face, allows outfit/environment change
  });

  return { environmentDescription, referenceImageBase64 };
}
```

### New prompt: random environment generator

For the "random" mode, use Claude (via the existing AI Gateway integration) to generate a varied environment description that avoids the user's recent setups.

```typescript
const RANDOM_ENVIRONMENT_SYSTEM_PROMPT = `You are a UGC art director generating varied visual setups for a creator's content. Your job is to suggest a fresh outfit and environment that feels authentic to a real social media creator's everyday life.

## Rules

1. The setup should feel like a casual moment from a real creator's day, not a staged photoshoot. Examples of authentic settings: kitchen while making coffee, bedroom propped against pillows, living room couch, home office desk, walking outside on a porch, in the car (parked), at a cafe.

2. The outfit should be casual and current. Examples: oversized hoodie, ribbed tank top, cropped sweater, plain tee, button-up shirt left open over a tank, athletic set. Avoid formal wear.

3. The lighting should match the location naturally. Morning kitchen = warm window light. Bedroom = soft lamp light. Outdoor porch = golden hour. Car = midday natural light through windshield.

4. The setup must be VISUALLY DIFFERENT from these recent setups (avoid using the same outfit, location, or lighting as any of these):

{recent_environments}

5. Output format: a single concise sentence describing the outfit, location, lighting, and one or two small contextual details (a coffee mug, a plant, an open book, etc.). About 20-30 words.

## Examples of good output

"Oversized white tee and grey sweats, sitting cross-legged on a bed propped against pillows, soft afternoon window light, a half-finished latte on the nightstand."

"Black ribbed tank top with denim shorts, leaning on a kitchen counter, warm morning sunlight streaming through a window, a French press and an open notebook nearby."

"Cream cardigan over a tank, sitting at a wooden cafe table, late afternoon golden hour light, a matcha latte and an open laptop in front of her."

Now generate a fresh setup.`;

async function generateRandomEnvironment(avatar: Avatar): Promise<string> {
  const recent = avatar.recentEnvironments?.slice(0, 5).map(e => `- ${e}`).join('\n') || '- (none yet)';

  const userPrompt = RANDOM_ENVIRONMENT_SYSTEM_PROMPT.replace('{recent_environments}', recent);

  const result = await generateText({
    model: anthropic('claude-opus-4-7'),
    prompt: userPrompt,
  });

  return result.text.trim();
}
```

### Variant prompt template

For both custom and random modes, use this prompt to generate the project-specific reference image:

```typescript
const buildVariantPrompt = (avatar: Avatar, environmentDescription: string) => {
  return `${avatar.description}

${environmentDescription}

Filmed on iPhone in vertical 9:16 format, natural lighting, slight grain, authentic UGC aesthetic, not overly polished. She is holding her phone in selfie position at chest level, looking directly into the lens with a friendly, neutral expression.

Same woman as the reference image (face, hair, body must match exactly). Only the outfit, environment, and lighting are different.

Medium shot, framed from chest up. No text on screen. No music. Single still frame.`;
};
```

### Updating recentEnvironments

Whenever a project is created (regardless of mode), append the chosen `avatarVariantDescription` to the avatar's `recentEnvironments` array. Keep only the last 5 entries.

```typescript
// In project creation logic, after generating the variant:
const updatedAvatar = {
  ...avatar,
  recentEnvironments: [
    project.avatarVariantDescription,
    ...(avatar.recentEnvironments || [])
  ].slice(0, 5),
};
await db.avatars.update(avatar.id, updatedAvatar);
```

This ensures the random mode keeps generating fresh setups instead of cycling through the same 2-3 options.

### Acceptance criteria

- [ ] User can choose between default, custom, and random when creating a new project
- [ ] Custom mode allows free-text description and shows a preview before committing
- [ ] Random mode generates a varied setup that doesn't match recent projects
- [ ] Default mode uses the avatar's original reference (no extra generation cost)
- [ ] All scenes within a single project use the same project-specific reference image
- [ ] The avatar's recentEnvironments list is updated after each project creation
- [ ] User can preview the generated reference image before continuing to script paste

---

## Implementation order

If implementing these together, do them in this order:

1. **Feature 1 first (framing variation).** It's purely a prompt change. Test it on existing projects to verify the variation reads correctly in the generated images.

2. **Feature 2 second (avatar variants).** It requires UI changes and a new pipeline function, so it's heavier. Do it after Feature 1 is confirmed working.

Estimated build time:

- Feature 1: 1-2 hours (prompt updates, type updates, scene card label)
- Feature 2: 4-6 hours (UI flow, new pipeline function, preview generation, data model migration)

---

## Notes for Claude Code

- The framing values must match exactly what's in the storyboard agent prompt and the `FRAMING_DESCRIPTIONS` map. A typo will cause silent fallbacks.
- For Feature 2, the `avatar.referenceImageBase64` should NEVER be overwritten. It's the permanent identity anchor. Always create a separate `avatarVariantReferenceImage` on the Project.
- The image-to-image strength of 0.45 for variant generation is a starting point. If faces drift between original and variant, lower it. If outfits/environments don't change enough, raise it.
- For the random environment generator, use `claude-opus-4-7` for better creative variety than smaller models.
- Show estimated cost on the variant generation step (one Replicate call per preview, ~$0.04 each). Users may preview 3-4 times before committing.
- Migration: existing projects don't have variant fields. Default them to `avatarVariantMode: 'default'` and copy the avatar's reference image into `avatarVariantReferenceImage`.
