// Speaks text with the browser's built-in voice and exposes the mouth shape
// (Oculus viseme name, as used by Ready Player Me avatars) for the current
// moment, so the avatar's lips follow the speech. No server, no keys.
//
// Timing: word "boundary" events re-sync the position when the voice sends
// them; between them (or with voices that never send them) the position moves
// at an estimated speaking rate.

const RATE = 1;
const CHARS_PER_SEC = 14.5 * RATE;

// letter (or pair) -> viseme
const PAIRS = { th: "viseme_TH", ch: "viseme_CH", sh: "viseme_CH", ph: "viseme_FF", ng: "viseme_nn", oo: "viseme_U", ee: "viseme_I" };
const SINGLE = {
  a: "viseme_aa", e: "viseme_E", i: "viseme_I", o: "viseme_O", u: "viseme_U", y: "viseme_I",
  b: "viseme_PP", m: "viseme_PP", p: "viseme_PP",
  f: "viseme_FF", v: "viseme_FF",
  d: "viseme_DD", t: "viseme_DD", l: "viseme_DD",
  k: "viseme_kk", g: "viseme_kk", c: "viseme_kk", q: "viseme_kk", x: "viseme_kk",
  j: "viseme_CH",
  s: "viseme_SS", z: "viseme_SS",
  n: "viseme_nn",
  r: "viseme_RR",
  w: "viseme_U", h: "viseme_aa",
};
export const VISEMES = ["viseme_sil", "viseme_PP", "viseme_FF", "viseme_TH", "viseme_DD", "viseme_kk", "viseme_CH", "viseme_SS", "viseme_nn", "viseme_RR", "viseme_aa", "viseme_E", "viseme_I", "viseme_O", "viseme_U"];

function visemeAt(text, i) {
  const c = (text[i] || "").toLowerCase();
  if (!/[a-z]/.test(c)) return "viseme_sil";
  const pair = c + (text[i + 1] || "").toLowerCase();
  return PAIRS[pair] || SINGLE[c] || "viseme_sil";
}

let state = { text: "", startedAt: 0, syncChar: 0, syncTime: 0, speaking: false };

const position = () => Math.floor(state.syncChar + ((performance.now() - state.syncTime) / 1000) * CHARS_PER_SEC);

/** Index of the character being spoken now (-1 when silent), for word-by-word captions. */
export function spokenChar() {
  if (!state.speaking) return -1;
  return Math.min(position(), state.text.length);
}
export const isSpeaking = () => state.speaking;

/** Mouth shape for right now (null when silent). */
export function currentViseme() {
  if (!state.speaking) return null;
  const now = performance.now();
  const pos = Math.floor(state.syncChar + ((now - state.syncTime) / 1000) * CHARS_PER_SEC);
  if (pos >= state.text.length) return null;
  return visemeAt(state.text, pos);
}

let muted = false;
export const setMuted = (m) => {
  muted = m;
  if (m) window.speechSynthesis?.cancel();
};
export const isMuted = () => muted;
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

// prefer a natural English voice, male if available
function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter((v) => /^en[-_]/i.test(v.lang));
  const pref = [/Google UK English Male/i, /Daniel/i, /Microsoft (Guy|Ryan|Andrew|Brian|David)/i, /Male/i, /Alex/i, /Google US English/i];
  for (const re of pref) {
    const v = en.find((x) => re.test(x.name));
    if (v) return v;
  }
  return en[0] || voices[0] || null;
}

/** iOS/Safari only allow speech after a tap: call this inside the click handler. */
export function unlockSpeech() {
  if (!canSpeak()) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/**
 * Speak `text`. Resolves when done (or immediately-ish when muted / no voice,
 * after a silent "talking" pass so the lips still move with the captions).
 */
export function speak(text) {
  return new Promise((resolve) => {
    const finish = () => {
      state.speaking = false;
      resolve();
    };
    const start = () => {
      const now = performance.now();
      state = { text, startedAt: now, syncChar: 0, syncTime: now, speaking: true };
    };
    if (muted || !canSpeak()) {
      // silent: animate the mouth for the estimated duration
      start();
      setTimeout(finish, (text.length / CHARS_PER_SEC) * 1000 + 300);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = RATE;
    u.pitch = 0.95;
    u.onstart = start;
    u.onboundary = (e) => {
      if (typeof e.charIndex === "number") {
        state.syncChar = e.charIndex;
        state.syncTime = performance.now();
      }
    };
    u.onend = finish;
    u.onerror = finish;
    // some browsers never fire onstart for the first utterance
    setTimeout(() => {
      if (!state.speaking) start();
    }, 400);
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
  state.speaking = false;
}

// voices load asynchronously in Chrome
if (canSpeak()) window.speechSynthesis.onvoiceschanged = () => pickVoice();
