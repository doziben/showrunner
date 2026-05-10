export interface Voice {
	id: string;
	label: string;
	elevenLabsVoiceId: string;
}

export type GatewayProvider = 'vercel' | 'anthropic';

export interface Config {
	id: 'singleton';
	useAiGateway: boolean;
	aiGatewayKey?: string;
	anthropicKey?: string;
	replicateKey: string;
	elevenLabsKey: string;
	falKey: string;
	voices: Voice[];
	createdAt: number;
	updatedAt: number;
}

export interface Avatar {
	id: string;
	name: string;
	description: string;
	/** The locked outfit + room + lighting for the avatar's original reference image. */
	environmentDescription: string;
	referenceImageBase64: string;
	voiceId: string;
	seed?: number;
	createdAt: number;
	/** Last 5 environment descriptions used across this avatar's projects (for the "random" variant). */
	recentEnvironments?: string[];
}

export type AvatarVariantMode = 'default' | 'custom' | 'random';

export type SceneType = 'avatar' | 'broll';
export type Framing =
	| 'medium_direct'
	| 'close-up_direct'
	| 'medium_off-axis'
	| 'low_angle'
	| 'high_angle'
	| 'leaning_forward'
	| 'leaning_back';

export type SceneStatus =
	| 'pending'
	| 'generating-voiceover'
	| 'generating-image'
	| 'generating-lipsync'
	| 'complete'
	| 'failed';

export interface Scene {
	id: string;
	order: number;
	type: SceneType;
	audioLine: string;
	durationSeconds: number;
	actionDescription?: string;
	framing?: Framing;
	shotDescription?: string;
	recordingInstructions?: string;
	voiceoverBase64?: string;
	voiceoverUrl?: string;
	avatarImageBase64?: string;
	lipsyncVideoBase64?: string;
	status: SceneStatus;
	errorMessage?: string;
}

export type ProjectStatus = 'draft' | 'generating' | 'complete' | 'failed';

export type TxKind =
	| 'storyboard'
	| 'voiceover'
	| 'avatar-portrait'
	| 'avatar-shot'
	| 'lipsync';

export type TxProvider = 'gateway' | 'anthropic' | 'elevenlabs' | 'replicate' | 'fal';

export type TxUnit = 'images' | 'seconds' | 'tokens' | 'characters';

export interface Transaction {
	id: string;
	timestamp: number;
	projectId?: string;
	avatarId?: string;
	sceneId?: string;
	kind: TxKind;
	provider: TxProvider;
	model: string;
	quantity: number;
	unit: TxUnit;
	costUsd: number;
	status: 'success' | 'failed';
	notes?: string;
}

export type LipsyncProvider = 'p-video' | 'fabric' | 'aurora';

/**
 * The shape we send into recordTransaction — id + timestamp filled in by the recorder.
 */
export type TxInput = Omit<Transaction, 'id' | 'timestamp'>;

export interface Project {
	id: string;
	name: string;
	avatarId: string;
	script: string;
	scenes: Scene[];
	status: ProjectStatus;
	/** Optional for backwards-compat with projects created before the picker shipped. */
	lipsyncProvider?: LipsyncProvider;
	/** Which avatar variant this project uses for its scene shots. */
	avatarVariantMode: AvatarVariantMode;
	/** The actual environment description in use for this project (for default mode this is a copy of avatar.environmentDescription). */
	avatarVariantDescription: string;
	/** The freshly generated reference image for this project's setup. For default mode this is a copy of avatar.referenceImageBase64. */
	avatarVariantReferenceImage: string;
	createdAt: number;
	updatedAt: number;
}
