/**
 * Audio + system notifications for "generation finished" moments.
 * AudioContext is created lazily on first ping so it doesn't hit the
 * browser's autoplay policy — the click on "Generate all" is the user
 * gesture that unlocks it.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	if (!audioCtx) {
		const Ctor =
			(window.AudioContext as typeof AudioContext | undefined) ??
			((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
		if (!Ctor) return null;
		audioCtx = new Ctor();
	}
	return audioCtx;
}

/**
 * Two-tone success ping (E5 → A5) — pleasant, short, hard to confuse with
 * an OS alert. Quiet by design.
 */
export function playSuccessPing(): void {
	const ctx = getCtx();
	if (!ctx) return;
	if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	const now = ctx.currentTime;
	const tones = [
		{ freq: 660, start: 0, dur: 0.18 }, // E5
		{ freq: 880, start: 0.11, dur: 0.32 } // A5
	];
	for (const { freq, start, dur } of tones) {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.value = freq;
		gain.gain.value = 0;
		gain.gain.linearRampToValueAtTime(0.18, now + start + 0.015);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now + start);
		osc.stop(now + start + dur + 0.02);
	}
}

/**
 * Lower-toned failure ping (A4 → E4 descending). Distinguishable from success.
 */
export function playFailurePing(): void {
	const ctx = getCtx();
	if (!ctx) return;
	if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	const now = ctx.currentTime;
	const tones = [
		{ freq: 440, start: 0, dur: 0.18 },
		{ freq: 330, start: 0.13, dur: 0.32 }
	];
	for (const { freq, start, dur } of tones) {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.value = freq;
		gain.gain.value = 0;
		gain.gain.linearRampToValueAtTime(0.16, now + start + 0.015);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now + start);
		osc.stop(now + start + dur + 0.02);
	}
}

/**
 * Ask once for system-notification permission. Safe to call multiple times.
 */
export async function ensureNotificationPermission(): Promise<NotificationPermission> {
	if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
	if (Notification.permission === 'default') {
		try {
			return await Notification.requestPermission();
		} catch {
			return 'denied';
		}
	}
	return Notification.permission;
}

/**
 * Show an OS-level notification. Skips quietly if the page is currently
 * focused — the in-app toast already covers that case.
 */
export function showSystemNotification(title: string, body: string): void {
	if (typeof window === 'undefined' || !('Notification' in window)) return;
	if (Notification.permission !== 'granted') return;
	if (document.visibilityState === 'visible' && document.hasFocus()) return;
	try {
		new Notification(title, { body, silent: false });
	} catch {
		// Some browsers throw on insecure origins; ignore.
	}
}
