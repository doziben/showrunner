# Roadmap

The following are explicitly out of scope for v0.1 and parked for future versions:

## Maybe v0.2

- **Multi-avatar projects.** A single project picks one avatar today; v0.2 could let scenes pick different avatars.
- **Captions / subtitles generation.** The voiceover audio could be transcribed automatically and exported alongside the bundle.
- **Background music.** Pick from a small library or import a track; mixed into a guide audio file.

## Maybe v0.3

- **Auto-stitching of final video.** Today the editor assembles. v0.3 could output a rough-cut MP4 directly using ffmpeg.wasm or a stitcher service.
- **Built-in script writing assistance.** A guided "draft a UGC script for X" flow. Today the user brings their own script.
- **Voice cloning.** Today the user provides voice IDs already created in ElevenLabs.

## Probably never (v1.x or never)

- **User accounts / authentication.** Defeats the local-first ethos.
- **Cloud sync of projects.** Same.
- **Team collaboration.** Same.
- **Hosted SaaS version.** May happen, but as a separate product, not bolted onto this repo.
- **Mobile-optimized UI.** Desktop-first. Mobile works but isn't optimized.
- **Webhooks / API access.** Showrunner consumes provider APIs; it doesn't provide one of its own.
- **Translation.** Out of scope.
- **Analytics / usage tracking.** No telemetry.
