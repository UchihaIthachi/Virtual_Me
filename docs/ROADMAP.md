# Virtual Me roadmap: from talking avatar to a thinking one

**Goal:** a 3D version of Harshana that feels alive and *smart*. It reasons out loud, researches live, explains with visuals that appear behind it, writes small books you can flip through, remembers what it learned, and stays honest about what's a fact about Harshana and what it found on the web.

Background research and sources: [research/2026-10-31-avatar-ai-stack.md](research/2026-10-31-avatar-ai-stack.md). Gotchas and decisions so far: [LEARNINGS.md](LEARNINGS.md).

---

## Where we are (done, Oct 2026)

| Area | Status |
|---|---|
| Answers | Portfolio RAG via `/api/ask` → portfolio `/api/chat` in voice mode (first person, short) |
| Voice | Browser Web Speech, word-by-word captions, mic input |
| Face | 15 visemes + 14 expressions, smooth blending, blinks, winks |
| Body | 7 clips + 9 code-made gestures (wave, nod, shake, shrug, think, bow, laugh, look, lean); head follows the cursor |
| Actions | 14 one-tap actions; mood picked per answer; tap reactions |
| Look | Modern engineer: dark hair, glasses, 5 outfits; premium glass UI; studio scene with mirror floor |
| Scene | Live candlestick chart + FIX terminal panels, tech badges, reactive stage ring |
| Ops | Netlify site + function, live status check from the portfolio, no keys of its own |

## Principles
1. **Two kinds of truth.** Facts about Harshana come *only* from the portfolio knowledge. Web findings are shown as *research* with sources, never mixed into "I did…" statements.
2. **Free tiers, rotating providers, hard caps.** Every external call has a per-visitor and a per-day budget, and a graceful fallback.
3. **Keys only on the server** (Netlify env). The browser never sees a key.
4. **The avatar is the interface, not decoration.** Every new brain feature should have a visible, embodied moment (a gesture, a display, a look).
5. **Fast first, deep on request.** Normal questions answer in under 3 s; "deep research" and "write a book" are explicit modes with progress shown.

---

## Target architecture

```text
Browser
 ├─ Avatar runtime    face (visemes + expressions), body (clips + gestures), gaze
 ├─ Director          turns a reply "script" into timed beats: say / emote / gesture / show / look
 ├─ Stage displays    3D glass panels: diagram, chart, code, steps, sources, image, book
 └─ Voice             HeadTTS (Kokoro, WebGPU) → audio + viseme timestamps;  Web Speech fallback
        │  POST /api/agent  (streams NDJSON events: thinking, tool, display, say, done)
        ▼
Netlify Function: agent loop (tool calling, max N steps, budget)
 ├─ ask_portfolio(q)        portfolio RAG (facts about Harshana)
 ├─ web_search(q)           Tavily, Jina/Firecrawl fallback
 ├─ read_page(url)          Jina Reader → markdown (trimmed)
 ├─ show_display(spec)      returns a display spec for the stage (no side effects)
 ├─ write_book(outline)     chapter/page JSON
 ├─ remember(note)          short notes → store (Netlify Blobs / Supabase)
 └─ save_research(md)       owner-only: commit .md to this repo via GitHub API
        │
        ▼
LLM providers (rotating free tiers with tool calling): Mistral, OpenRouter free, Gemini Flash, Groq, Cloudflare
```

### The reply "script" (the contract between brain and body)
Instead of plain text, the agent returns beats the Director can play in order:

```json
{
  "beats": [
    { "say": "Let me show you how the gateway handles an order.", "emotion": "confident", "gesture": "lean" },
    { "show": { "type": "diagram", "title": "Order path", "mermaid": "flowchart LR; Client-->Gateway-->CSE" }, "look": "display", "gesture": "point" },
    { "say": "Every order hits the Chronicle Queue log before it touches the exchange.", "emotion": "proud" }
  ],
  "sources": [{ "title": "CAL trading gateway", "url": "/project/cal-trading-gateway" }]
}
```

---

## Phases

### Phase 1: A smarter brain (agent with tools) · ~1 week
- `/api/agent`: OpenAI-compatible tool calling through the existing provider rotation; max 4 tool steps; 25 s budget; streams events.
- Tools: `ask_portfolio`, `show_display`; the rest come in later phases.
- **Visible thinking:** while the agent works, a glass "thought stream" panel shows steps ("Searching my portfolio…", "Found 3 projects", "Drawing a diagram…"). The avatar holds the *think* pose and glances at the panel.
- **Script output** (beats, above), validated against a JSON schema; plain text falls back to one `say` beat.
- Session memory: the last 8 turns plus a running 3-line summary.
- **Done when:** "How does your trading gateway work?" produces speech plus at least one display, and the avatar points at it.

### Phase 2: Deep search mode · ~1 week
- A **Research** toggle (or "research …" prompts) switches to plan → search → read → synthesize:
  1. The agent writes 3–5 sub-questions (shown as cards on the stage).
  2. `web_search` + `read_page` for each (Tavily; Jina Reader for page text); cards fill in as sources arrive.
  3. A synthesized answer with inline citations; the avatar summarises in ≤4 sentences and the full report sits in a panel.
- **Budgets:** ≤8 searches and ≤6 page reads per research; 3 researches per visitor per day; a daily cap per site.
- **Saving research:**
  - Visitors can download the report as `.md`.
  - **Owner mode** (secret passphrase → signed cookie) adds **"Save to repo"**: the function commits `docs/research/YYYY-MM-DD-<slug>.md` through the GitHub contents API with a fine-grained token limited to this repo (env `GITHUB_TOKEN_DOCS`).
- **Done when:** a research run on "event sourcing for exchange gateways" produces a cited report, plays a 20-second spoken summary and can be saved as Markdown.

### Phase 3: Real voice and a much more expressive face · ~1–2 weeks
- **HeadTTS (Kokoro 82M) in the browser with WebGPU:** natural voice plus *exact* viseme timestamps (replaces text-guessed visemes). Lazy-load the model (~80–90 MB) only after "Start talking" on capable desktops; keep Web Speech on phones.
- **Emotion engine:** a small state model (valence, arousal, focus) that drifts and decays, instead of one-shot expressions.
  - Expressions blend by weight (for example 0.6 proud + 0.3 smile).
  - Micro-expressions: brow flashes on emphasis, half-smiles at sentence ends, squints when "thinking hard".
  - **Eyes:** saccades, looking away while recalling, looking back to the viewer on the key point, blink rate tied to arousal.
  - Breathing and a subtle idle sway.
- **More body language:** new Mixamo/CC0 clips (talking idles ×3, typing, pointing at a screen, presenting with both hands, hand on chin, listening nod); emphasis gestures timed to stressed words (from TTS word timestamps).
- **Listening state:** while the visitor speaks into the mic, the avatar nods slightly and keeps eye contact.
- **Done when:** a 30-second answer has no frozen moments, the lips match the audio, and at least 3 different gestures happen at natural points.

### Phase 4: Magic displays behind the avatar · ~1–2 weeks
- **Display types (all rendered as glass panels):**
  - `diagram`: Mermaid → SVG → texture, drawn line by line
  - `chart`: series data → animated bars or lines
  - `code`: syntax-highlighted, typed out
  - `steps`: numbered cards that light up as they're spoken
  - `timeline`: career or project milestones
  - `sources`: research citations with favicons
  - `quote` / `stat`: big numbers
- **Appear effect:** each display materialises with a hologram shader (scanlines, fresnel edge, dissolve) and can be grabbed, rotated or enlarged.
- **Choreography:** the Director syncs `show` beats to the sentence that mentions them; the avatar turns its head toward the panel and points (an IK-lite arm aim at the panel).
- **Layout manager:** up to 3 panels in an arc behind the avatar; older ones fade back; on phones panels become a swipeable card strip.
- **Done when:** explaining the PNR pool shows a diagram that draws itself as he talks through it.

### Phase 5: Books you can flip through · ~1 week
- "Write me a short book about …" → `write_book`: outline → 6–12 pages (title, body ≤120 words, one display per page).
- A **3D book** on a stand beside the avatar, with page-curl turns (or a clean 2D reader on phones); the avatar narrates each page; arrow keys or swipe turn pages.
- **Export:** `.md` (one file, chapters as headings) and print-to-PDF; owner mode can save to `docs/books/<slug>.md`.
- **Starter shelf (pre-generated, cached):** "FIX in 10 pages", "Event sourcing on Chronicle Queue", "Strangler-fig migration (ISA PNR)", "Contributing to CNCF projects".

### Phase 6: Memory: what we learn, stored as notes · ~1 week
- **Knowledge notes ("nodes"):** each finished research or book produces small notes `{id, title, summary, tags, sources, links}` stored in Netlify Blobs (or Supabase), plus a readable copy in `docs/notes/` in owner mode.
- **Notes graph:** a 3D constellation display of notes linked by tags; clicking a node makes the avatar explain it.
- **Learning loop:**
  - Unanswered or low-confidence visitor questions are logged anonymously and grouped weekly into `docs/LEARNINGS-questions.md`.
  - The owner adds the missing facts to the portfolio; both sites improve.
- Keep [LEARNINGS.md](LEARNINGS.md) as the engineering diary (decisions, gotchas, numbers).
- **Privacy:** no personal data in notes; visitors can ask for "forget this conversation".

### Phase 7: Swappable models (brain and body) · ongoing
- **Brain:** a `models.json` config (provider, model, supports tools, context, cost tier), a router choosing by task (fast chat vs research vs book), and the existing eval script extended with tool-use and "facts only from portfolio" checks before switching the default.
- **Body:**
  - Keep `me.glb` (Ready Player Me is closed).
  - Add a **morph-name map and bone-name map** so a MetaPerson, Avaturn or VRM avatar can drop in.
  - Evaluate a selfie-based avatar that looks more like Harshana.
  - Keep an outfit system per model.
- **Voice:** a pluggable TTS interface (HeadTTS, Web Speech, later a cloned voice only with explicit consent and a clear "AI voice" label).

### Phase 8: Polish, safety and measurement · ongoing
- **Performance budget:** <3 MB JS before the avatar; 60 fps desktop / 30 fps mid phones; lazy-load TTS and the book renderer.
- **Accessibility:** captions always on for deaf users, reduced-motion mode (no camera moves or holograms), keyboard paths for every action.
- **Safety:** prompt-injection guard on web pages read during research (treat page text as data), a source allow/deny list, and a clear "web research, not Harshana's own work" badge.
- **Analytics** (existing portfolio insights): questions, research topics, drop-off, average session length.
- **Tests:** a Playwright smoke test (scene loads, a beat script plays, the display appears), plus the agent eval in CI.

---

## Milestones

| # | Milestone | Visible result | Phases |
|---|---|---|---|
| M1 | Thinks out loud | Thought stream + first diagrams | 1 (+ basic 4) |
| M2 | Researcher | Cited deep research, saved as Markdown | 2 |
| M3 | Alive | Real voice, exact lips, emotion engine, new clips | 3 |
| M4 | Teacher | Holographic displays and choreography | 4 |
| M5 | Author | Flip-through books | 5 |
| M6 | Remembers | Notes graph + learning loop | 6 |

## Cost (all free tiers)
LLMs: Mistral / OpenRouter free / Gemini Flash / Groq / Cloudflare (rotating). Search: Tavily 1k/month + Jina. Voice: HeadTTS in the browser (no server cost). Storage: Netlify Blobs / Supabase free. Hosting: Netlify free.

## Open questions
- [ ] Does a MetaPerson or Avaturn export include ARKit + Oculus viseme morphs?
- [ ] HeadTTS model download size on first use: acceptable on desktop only?
- [ ] Owner-mode auth: a simple passphrase → signed cookie, or Netlify Identity?
- [ ] Which free models give reliable tool calling today? Run the eval before Phase 1 ships.
