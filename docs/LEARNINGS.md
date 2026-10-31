# What we learned building Virtual Me

A running log of decisions, gotchas and numbers, so future work (and future assistants) don't relearn them. Newest first. Add to it whenever something surprises you.

## 2026-10-31

### Architecture
- **One knowledge base, two faces.** Virtual Me doesn't keep its own facts: `/api/ask` calls the portfolio's `/api/chat` (RAG over the portfolio's own content) with `voice: true`, which makes it answer in the first person, in ≤3 sentences, with no markdown. Update the portfolio and the avatar gets smarter too.
- **Partner token.** With `CHAT_PARTNER_TOKEN` set on both sites, the portfolio rate-limits each *visitor* instead of the whole Virtual Me site.
- **No servers, no paid keys.** Voice is the browser's Web Speech API; the old ffmpeg + Rhubarb + Google TTS + ElevenLabs pipeline is gone. (Those keys were committed in the old repo: they must stay revoked.)
- **Netlify production branch.** This site was created in 2024 with production branch `deploy`; pushes to `master` were only branch previews. Set the production branch to `master`.

### Avatar (Ready Player Me GLB)
- **RPM shut down on 31 Jan 2026.** Our local `me.glb` still works; we can't create new RPM avatars. See `research/2026-10-31-avatar-ai-stack.md`.
- **Morph targets:** 67 per mesh: 15 Oculus visemes (`viseme_sil`…`viseme_U`) plus 52 ARKit blendshapes. Expressions are just maps of ARKit names to 0–1.
- **Only 7 clips** ship in `animations.glb`: dance, happy, idle, jump, kiss, loser, sad. Everything else (wave, nod, shrug, think, bow, laugh, look around, lean) is **added in code on top of the playing clip** (`src/lib/gestures.js`).
- **Additive bone offsets are safe** because every clip animates Head, Neck and Spine, so the mixer resets them each frame and offsets don't build up. Check this before adding offsets to a bone a clip doesn't touch.
- **Bone axes (found by screenshots):** Head +x = look up. RightArm −x = raise the arm sideways; RightForeArm −x = forearm up (with the arm raised: a wave). Shoulder z ± = shrug. Spine +x = bow forward.
- **Face smoothing:** one pass per frame over all morphs with `THREE.MathUtils.damp` (frame-rate independent). Expressions use λ≈5, lips λ≈14–22, blinks λ≈28. While speaking, the expression's mouth/jaw morphs are scaled to 35% so the lips belong to the voice.
- **Big perf bug we fixed:** the original code called Leva's `set()` for every morph target every frame (thousands of React store updates a second) and traversed the whole scene per morph. Cache the meshes; never touch UI state inside `useFrame`.
- **Glasses** are built from primitives and parented to the Head bone, sized from the distance between the eye bones, so they fit and follow every animation.
- **Outfits:** recolouring materials (and dropping the shirt's colour texture while keeping its normal map) gives clean modern looks with no new assets.

### Speech and lip sync
- Web Speech `onboundary` gives word positions on most desktop voices but **not all** (some Chrome network voices never fire it), so the viseme timeline also advances at an estimated ~14.5 characters/second.
- iOS/Safari only allow speech after a tap: speak a silent utterance inside the click handler (`unlockSpeech`).
- **Sentence splitting:** split on `[.!?]` *followed by a space*, or "FIX 5.0" gets cut at "5.".

### Scene and UI
- **No third-party fetches at runtime:** the Draco decoder is self-hosted in `/draco/` and the drei `Environment` HDR (githack, often rate-limited) was replaced with lights. An error boundary keeps the chat usable if WebGL fails.
- `MeshReflectorMaterial` floor + fog + an additive halo plane give a "studio" look; use a lower resolution on phones.
- The canvas-texture panels (live chart, FIX terminal) cost almost nothing and are a cheap way to put "screens" in 3D, the base for the future explainer displays.

### Testing
- Headless Chromium with `--use-gl=swiftshader` renders the scene (slowly, ~2 fps), which is enough for screenshots. A `?debug` URL exposes `window.__vm` (gestures, bones, `play()`) for tuning poses from the console or Playwright.
- External CDNs (fonts, githack, gstatic) are blocked in the test sandbox: a good canary for runtime dependencies.
