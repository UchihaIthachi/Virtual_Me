# Research: avatar, voice and AI stack for Virtual Me (Oct 2026)

*Deep-search notes that back the decisions in [../ROADMAP.md](../ROADMAP.md). Checked 31 Oct 2026.*

## 1. Avatar platform: Ready Player Me is gone
- Ready Player Me's public platform went **offline on 31 Jan 2026**. GLB files already exported keep working as normal 3D files. Anything loaded from RPM's servers no longer works. ([Avatar SDK: who's alive, who's gone](https://avatarsdk.com/blog/2026/08/31/avatar-platforms-2026-whos-alive-whos-gone/), [migration guide](https://avatarsdk.com/blog/2026/07/07/ready-player-me-migration-guide/), [Genies action plan](https://genies.com/blog/ready-player-me-shutdown))
- **For us:** `public/models/me.glb` is a local file, so the current avatar is safe. We can't make *new* RPM avatars, though.
- **Alternatives alive in 2026:** MetaPerson (Avatar SDK: selfie → rigged full body, Web SDK), Avaturn (selfie, stylised, SDK), VRoid Studio (VRM → GLB), MetaHuman (Unreal only), Character Creator (paid). Genies is Unity-only.
- **Still to check:** whether MetaPerson/Avaturn exports include **ARKit blendshapes + Oculus visemes**, the same morph names our face code uses. If not, we'd need a name-mapping layer (see ROADMAP Phase 7).

## 2. Real voice with exact lip sync in the browser
- **HeadTTS** (met4citizen): Kokoro-82M (timestamped ONNX) running **in the browser on WebGPU**, with WASM as a slower fallback, or on a Node server. Returns audio plus **word and viseme timestamps with Oculus viseme IDs**: exactly what our avatar needs. MIT; model Apache-2.0; no GPL eSpeak. English only. ([HeadTTS](https://scriptagc.wasmer.app/https_www_github_com/met4citizen/HeadTTS), [awesome listing](https://awesome.ecosyste.ms/projects/github.com%2Fmet4citizen%2Fheadtts), [three.js forum: Kokoro for NPC dialogue](https://discourse.threejs.org/t/local-browser-tts-with-kokoro-for-npc-dialogue-and-narration/91424))
- **TalkingHead** (met4citizen): Three.js class for RPM-style avatars, with lip sync, moods, gestures, poses, streaming API and bone physics for hair. A good reference for moods/gestures. The README names no licence, so use it as **inspiration, not a dependency**, until that's clear. ([summary](https://www.sourcepulse.org/projects/1840071), [docs](https://docsearch.algolia.com/mcp/docs/repo/met4citizen/talkinghead))
- **Today:** the Web Speech API with text-based visemes. It's free and instant, but robotic and only roughly synced.
- **Plan:** HeadTTS on desktop with WebGPU (real voice, exact visemes); keep Web Speech as the fallback on phones and older browsers.

## 3. Body animation clips
- **Mixamo** is still free with an Adobe ID: royalty-free in personal, commercial and non-profit projects, humanoid only. Don't redistribute the raw source files. ([Cinevva guide 2026](https://app.cinevva.com/guides/free-character-animations-rigging), [Adobe FAQ](https://community.adobe.com/t5/mixamo-discussions/mixamo-faq-licensing-royalties-ownership-eula-and-tos/td-p/13234775))
- **CC0 alternatives:** Quaternius Universal Animation Library (free part is CC0, may need retargeting), Kenney mini characters.
- **Plan:** add clips for talking idles (2–3 variations), typing, pointing at a screen, presenting with both hands, hand on chin, nodding while listening.

## 4. Brains: free LLMs with tool calling
- **OpenRouter:** 50 req/day free (1,000/day after a one-time $10 top-up), with free models that support tool calling. **Cloudflare Workers AI:** 10k "neurons"/day with some function-calling models. **Gemini API:** a free tier on selected Flash models. **Mistral:** about $10/month in free credits. **Groq:** free daily limits. ([KDnuggets 2026](https://kdnuggets.com/5-free-llm-api-providers-you-can-use-in-2026), [dev.to Oct 2026](https://dev.to/hassann/top-8-free-ai-apis-in-october-2026-5bb5))
- **For us:** the portfolio's `/api/chat` already rotates Mistral, GitHub Models and OpenRouter with cooldowns. The next step is **tool calling** through the same provider list (OpenAI-compatible `tools`).

## 5. Web search for "deep research"
| API | Free tier | Notes |
|---|---|---|
| Tavily | 1,000 credits/month, no card | built for agents |
| Exa | $10/month credit | neural search, good for "find similar" |
| Jina `s.jina.ai` | ~10M tokens per key | search + clean page text in one |
| Firecrawl | 1,000 credits/month; keyless option | search + scrape to markdown |
| Brave | $5/month credit (attribution, card) | independent index |
| SearXNG | unlimited, self-hosted | needs a server |
| Google CSE | closed to new users, **ends 1 Jan 2027** | avoid |

Source: [Parallel: best free web search APIs (Oct 2026)](https://parallel.ai/articles/best-free-web-search-api), [Firecrawl comparison](https://www.firecrawl.dev/blog/best-free-web-search-apis). Note that Bing Search APIs were retired in Aug 2025.
- **Plan:** Tavily as the main search (free, agent-friendly), Jina Reader to read pages as markdown, rotating like the LLM providers.

## 6. Decisions
1. Keep `me.glb`; evaluate a MetaPerson/Avaturn selfie avatar later behind a morph-name map.
2. Voice: HeadTTS (Kokoro, WebGPU) first, Web Speech fallback.
3. Brain: agent loop with tools in a Netlify Function, on the existing free-provider rotation.
4. Search: Tavily + Jina Reader, capped per visitor and per day.
5. Everything stays free-tier; all keys only in Netlify env vars.
