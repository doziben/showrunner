import type { Avatar, Framing, Scene } from '$lib/types';

/**
 * The fallback environment description for avatars created before the
 * environmentDescription field existed (and the legacy hardcoded look).
 * Also used as the v3 migration backfill.
 */
export const DEFAULT_ENVIRONMENT_DESCRIPTION =
	'Cream sweatshirt, sitting at a small wooden desk in a cozy home office, plant and bookshelf blurred in the background, natural daylight from a window to her left, soft warm lighting.';

/**
 * Map of framing values to camera/pose instructions injected into the
 * per-scene avatar prompt. New framings must be added here and to the
 * Framing union in $lib/types — a typo silently falls back to medium_direct.
 */
export const FRAMING_DESCRIPTIONS: Record<Framing, string> = {
	medium_direct:
		'Medium shot, framed from chest up, subject looking directly into the camera lens. Phone held at chest level, eye-line straight ahead.',
	'close-up_direct':
		'Close-up shot, framed from shoulders up, tighter composition. Subject looking directly into the camera lens. Phone held closer to face, eye-line straight ahead. More intimate framing.',
	'medium_off-axis':
		'Medium shot, framed from chest up, subject looking slightly off-camera (about 15 degrees to the side, as if looking at someone just beside the camera). Phone held at chest level. Thoughtful, reflective composition.',
	low_angle:
		"Medium shot from a slightly low angle, phone held just below the subject's face level, looking slightly upward at her. Confident, declarative composition.",
	high_angle:
		"Medium shot from a slightly high angle, phone held just above the subject's face level, looking slightly downward at her. Warm, intimate composition. Good for connecting with viewer.",
	leaning_forward:
		'Medium shot, subject leaning forward toward the camera, closer to the lens than usual. Engaged, intense composition. Phone held at chest level but the subject is closer to it.',
	leaning_back:
		'Medium shot, subject leaning back slightly away from the camera, more relaxed posture. Casual, matter-of-fact composition. Phone held at chest level, slight distance.'
};

/**
 * Storyboard director system prompt.
 * Source of truth: spec.md section 6. Do not modify without spec change.
 */
export const STORYBOARD_SYSTEM_PROMPT = `You are a UGC video director with 10 years of experience producing short-form content for TikTok, Instagram Reels, and LinkedIn. Your job is to take a script and break it down into a shot-by-shot storyboard optimized for the UGC format.

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
      "framing": "medium_direct" | "close-up_direct" | "medium_off-axis" | "low_angle" | "high_angle" | "leaning_forward" | "leaning_back",

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
- Include action descriptions that are mid-action verbs ("leaning forward", "raising eyebrow"), not static descriptions ("looking at camera").
- For recordingInstructions on b-roll scenes, be brutally specific. "Open ChatGPT, type 'give me content ideas for my brand', let it generate, scroll through the boring output for 3 seconds." Not "show ChatGPT failing."

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
      "framing": "medium_direct"
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
      "framing": "leaning_forward"
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

/**
 * Per-scene avatar shot prompt builder.
 *
 * `environmentDescription` is the project's locked outfit + room + lighting —
 * usually `project.avatarVariantDescription`, falling back to the avatar's
 * original `environmentDescription` for default-mode projects.
 */
export function buildAvatarShotPrompt(
	avatar: Avatar,
	scene: Scene,
	environmentDescription: string
): string {
	const framingInstruction =
		(scene.framing && FRAMING_DESCRIPTIONS[scene.framing]) ?? FRAMING_DESCRIPTIONS.medium_direct;

	const env = environmentDescription || avatar.environmentDescription || DEFAULT_ENVIRONMENT_DESCRIPTION;

	return `${avatar.description}

She is ${scene.actionDescription ?? 'mid-conversation, natural expressive energy'}

Filmed on iPhone in vertical 9:16 format, natural daylight, slight grain, authentic UGC aesthetic, not overly polished. ${env}

${framingInstruction}

Same woman, same outfit, same room, same lighting as the project's reference image. Visual continuity required across all scenes in this project.

No text on screen. No music overlay. Single still frame.`;
}

/**
 * Variant reference image prompt — used to generate the project-specific
 * reference image with the same identity but a fresh outfit/environment.
 */
export function buildVariantPrompt(avatar: Avatar, environmentDescription: string): string {
	return `${avatar.description}

${environmentDescription}

Filmed on iPhone in vertical 9:16 format, natural lighting, slight grain, authentic UGC aesthetic, not overly polished. She is holding her phone in selfie position at chest level, looking directly into the lens with a friendly, neutral expression.

Same woman as the reference image (face, hair, body must match exactly). Only the outfit, environment, and lighting are different.

Medium shot, framed from chest up. No text on screen. No music. Single still frame.`;
}

/**
 * System prompt for the random-environment generator. Renders with the
 * caller's recent environments interpolated into {recent_environments}.
 */
export const RANDOM_ENVIRONMENT_SYSTEM_PROMPT = `You are a UGC art director generating varied visual setups for a creator's content. Your job is to suggest a fresh outfit and environment that feels authentic to a real social media creator's everyday life.

## Rules

1. The setup should feel like a casual moment from a real creator's day, not a staged photoshoot. Examples of authentic settings: kitchen while making coffee, bedroom propped against pillows, living room couch, home office desk, walking outside on a porch, in the car (parked), at a cafe.

2. The outfit should be casual and current. Examples: oversized hoodie, ribbed tank top, cropped sweater, plain tee, button-up shirt left open over a tank, athletic set. Avoid formal wear.

3. The lighting should match the location naturally. Morning kitchen = warm window light. Bedroom = soft lamp light. Outdoor porch = golden hour. Car = midday natural light through windshield.

4. The setup must be VISUALLY DIFFERENT from these recent setups (avoid using the same outfit, location, or lighting as any of these):

{recent_environments}

5. Output format: a single concise sentence describing the outfit, location, lighting, and one or two small contextual details (a coffee mug, a plant, an open book, etc.). About 20-30 words. Output the sentence only — no preamble, no quotes, no explanation.

## Examples of good output

"Oversized white tee and grey sweats, sitting cross-legged on a bed propped against pillows, soft afternoon window light, a half-finished latte on the nightstand."

"Black ribbed tank top with denim shorts, leaning on a kitchen counter, warm morning sunlight streaming through a window, a French press and an open notebook nearby."

"Cream cardigan over a tank, sitting at a wooden cafe table, late afternoon golden hour light, a matcha latte and an open laptop in front of her."

Now generate a fresh setup.`;
