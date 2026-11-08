// POST /api/ask {message, history} -> {messages:[{text, facialExpression, animation}]}
//
// Answers come from the portfolio's chat (/api/chat), which only uses facts
// from the portfolio's own content (RAG). We ask it in "voice" mode so it
// replies as Harshana's personal assistant (talking about him in the third
// person: the avatar doesn't look like him), short and without markdown, then pick a facial
// expression and animation for the avatar. The browser speaks the text.
//
// Env (Netlify → Site configuration → Environment variables):
//   RAG_URL             portfolio address, default https://harshanalf.netlify.app
//   CHAT_PARTNER_TOKEN  optional; same value on both sites, so the portfolio
//                       rate-limits per visitor instead of per this site

const RAG_URL = (process.env.RAG_URL || "https://harshanalf.netlify.app").replace(/\/+$/, "");
const MAX_INPUT = 500;
const TIMEOUT_MS = 30000;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// markdown / links -> plain speakable text, max ~3 sentences
function speakable(text) {
  let t = String(text || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [label](url) -> label
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>]+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  // sentence ends are . ! ? followed by a space (so "FIX 5.0" stays whole)
  const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  t = sentences.slice(0, 3).join(" ").trim();
  return t.length > 420 ? `${t.slice(0, 417).replace(/\s+\S*$/, "")}...` : t;
}

// Mood from the question and reply: facial expression, animation and a body
// gesture (nod, shrug, wave...). Keeps the avatar lively without another model call.
function mood(question, answer) {
  const q = question.toLowerCase();
  const a = answer.toLowerCase();
  const m = (facialExpression, animation, gesture) => ({ facialExpression, animation, ...(gesture ? { gesture } : {}) });
  if (/\b(hi|hello|hey|good (morning|evening|afternoon))\b/.test(q)) return m("smile", "idle", "wave");
  if (/\b(sorry|can't|cannot|don't know|do not know|only answer|not sure|no information)\b/.test(a)) return m("embarrassed", "idle", "shrug");
  if (/\b(open to|available|looking for|hire|yes,|yes!)\b/.test(a)) return m("smile", "idle", "nod");
  if (/\b(merged|certif|won|award|first|live in production|shipped|final stage|only engineer|solo)\b/.test(a)) return m("proud", "happy", "nod");
  if (/\b(why|how come|what if)\b/.test(q)) return m("thinking", "idle", "think");
  if (/\b(latency|gateway|fix|kafka|architecture|throughput|kubernetes|java|go\b|design)\b/.test(a)) return m("confident", "idle", "lean");
  if (/\b(fun|hobby|hobbies|free time|enjoy)\b/.test(q)) return m("laugh", "happy", "laugh");
  if (/\?\s*$/.test(answer)) return m("curious", "idle", "lean");
  return m("confident", "idle", "nod");
}

async function askPortfolio(message, history, clientIp, ids = {}, persona = "assistant") {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const headers = { "content-type": "application/json" };
    // the visitor's anonymous ids, so the portfolio's /insights links answers to visits
    if (ids.visitor) headers["x-visitor-id"] = ids.visitor;
    if (ids.session) headers["x-session-id"] = ids.session;
    if (process.env.CHAT_PARTNER_TOKEN) {
      headers["x-chat-partner"] = process.env.CHAT_PARTNER_TOKEN;
      headers["x-client-ip"] = clientIp;
    }
    const res = await fetch(`${RAG_URL}/api/chat`, {
      method: "POST",
      signal: ac.signal,
      headers,
      body: JSON.stringify({ message, history, voice: persona === "me" ? true : "assistant", page: { path: "/virtual-me", label: persona === "me" ? "Virtual Me, Harshana's 3D twin" : "Harshana's 3D assistant" } }),
    });
    if (!res.ok || !res.body) throw new Error(`portfolio ${res.status}`);
    // NDJSON stream: {t:"sources"} {t:"delta",v} ... {t:"done"}
    const text = await res.text();
    let answer = "";
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const ev = JSON.parse(line);
        if (ev.t === "delta") answer += ev.v;
      } catch {
        /* skip a broken line */
      }
    }
    return answer;
  } finally {
    clearTimeout(timer);
  }
}

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // same site only
  const origin = req.headers.get("origin");
  if (origin) {
    let oHost = "";
    try {
      oHost = new URL(origin).host;
    } catch {
      /* bad origin */
    }
    const host = new URL(req.url).host;
    if (!(oHost === host || oHost.endsWith(".netlify.app") || oHost.startsWith("localhost") || oHost.startsWith("127.0.0.1"))) return json({ error: "Forbidden" }, 403);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const message = String(body?.message || "").trim().slice(0, MAX_INPUT);
  if (!message) {
    return json({ messages: [{ text: "Hi! I'm Harshana's assistant. Ask me about his work, trading systems, open source, or his life off the clock.", facialExpression: "smile", animation: "happy" }] });
  }
  const history = Array.isArray(body?.history)
    ? body.history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }))
    : [];

  try {
    const ip = context?.ip || req.headers.get("x-nf-client-connection-ip") || "";
    const clean = (v) => String(v || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
    const ids = { visitor: clean(req.headers.get("x-visitor-id")), session: clean(req.headers.get("x-session-id")) };
    // "me" (Virtual Me, first person) only once it is switched on for this site (VITE_VIRTUAL_ME=1)
    const persona = body?.persona === "me" && process.env.VITE_VIRTUAL_ME === "1" ? "me" : "assistant";
    const raw = await askPortfolio(message, history, ip, ids, persona);
    const text = speakable(raw) || "Sorry, I didn't catch that. Could you ask again?";
    return json({ messages: [{ text, ...mood(message, text) }] });
  } catch (err) {
    console.error("ask failed:", err?.message || err);
    return json({ messages: [{ text: "Sorry, my brain is offline for a moment. Please try again in a bit.", facialExpression: "sad", animation: "loser" }] });
  }
};

export const config = { path: "/api/ask" };
