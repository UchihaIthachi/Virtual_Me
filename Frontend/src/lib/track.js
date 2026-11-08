// Anonymous usage stats for Virtual Me, stored with the portfolio's analytics
// (harshanalf.netlify.app /api/track) and shown on its private /insights page,
// tab "Virtual Me". Events go under the path "vm:/" so they never mix with the
// portfolio's own numbers.
//
// Anonymous by design (this site has no consent box): nothing is stored in the
// browser for analytics. A throw-away visit id lives in memory while the page is
// open, and events are flagged anonymous so the server keeps no IP hash or
// network owner. Sent: the event (visit, question asked and how, emote / look /
// view, mic use, errors), time on page, window size, language and time zone.
// Off when the browser sends Do Not Track, for bots, on localhost, or when
// localStorage "track.off" = "1".

const ENDPOINT = (import.meta.env.VITE_TRACK_URL || 'https://harshanalf.netlify.app/api/track').replace(/\/+$/, '')
const PATH = 'vm:/'
const queue = []
let timer = null
let started = false
let visibleSince = 0
let visibleMs = 0

const rid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`)
    .replace(/-/g, '')
    .slice(0, 24)

const store = (s, k, v) => {
  try {
    if (v === undefined) return s.getItem(k)
    s.setItem(k, v)
  } catch {
    /* storage blocked */
  }
  return v
}

export const trackingOff = () => {
  if (typeof window === 'undefined') return true
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return true
  if (store(localStorage, 'track.off') === '1') return true
  if (/bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent)) return true
  return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !import.meta.env.VITE_TRACK_URL
}

// one visit id for this page load, never stored
const VISIT = rid()

/** The visit id goes with each question, so the portfolio can group a visit's answers. */
export function getIds() {
  return { visitor: '', session: trackingOff() ? '' : VISIT }
}

function flush(beacon = false) {
  clearTimeout(timer)
  timer = null
  if (!queue.length || trackingOff()) return
  const { session } = getIds()
  const payload = JSON.stringify({
    a: 1, // anonymous: no visitor id, no IP hash, no network owner
    s: session,
    ref: store(sessionStorage, 'vm.t.ref') || '',
    scr: `${screen.width}x${screen.height}`,
    lang: navigator.language,
    tz: (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone
      } catch {
        return undefined
      }
    })(),
    c: { vp: `${innerWidth}x${innerHeight}`, touch: navigator.maxTouchPoints > 0 },
    e: queue.splice(0, 40),
  })
  try {
    // text/plain keeps it a simple cross-site request (no preflight)
    if (beacon && navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, payload)
    else fetch(ENDPOINT, { method: 'POST', body: payload, keepalive: true, mode: 'no-cors', headers: { 'content-type': 'text/plain' } }).catch(() => {})
  } catch {
    /* ignore */
  }
  if (queue.length) flush(beacon)
}

/** type: vm_view | vm_ask | vm_action | vm_voice | vm_error | engagement | outbound */
export function track(type, { label, value, props, target } = {}) {
  if (trackingOff()) return
  queue.push({ type, t: Date.now(), path: PATH, label, value, props, target })
  if (queue.length >= 20) flush()
  else if (!timer) timer = setTimeout(flush, 4000)
}

function reportTime() {
  if (visibleSince) visibleMs += Date.now() - visibleSince
  visibleSince = 0
  const secs = Math.round(visibleMs / 100) / 10
  if (secs >= 1) track('engagement', { value: Math.min(secs, 3600) })
  visibleMs = 0
}

export function startTracking() {
  if (started || trackingOff()) return
  started = true
  if (!store(sessionStorage, 'vm.t.ref')) store(sessionStorage, 'vm.t.ref', document.referrer || 'direct')
  visibleSince = document.visibilityState === 'visible' ? Date.now() : 0
  track('vm_view', { label: document.title?.slice(0, 120) })
  // visible time every minute: accurate visit length + "on the site now" on /insights
  setInterval(() => {
    if (document.visibilityState !== 'visible' || !visibleSince) return
    const now = Date.now()
    visibleMs += now - visibleSince
    visibleSince = now
    if (visibleMs >= 5000) {
      reportTime()
      visibleSince = Date.now()
      flush()
    }
  }, 60000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      reportTime()
      flush(true)
    } else visibleSince = Date.now()
  })
  addEventListener('pagehide', () => {
    reportTime()
    flush(true)
  })
  addEventListener('error', (ev) => track('vm_error', { label: String(ev.message || 'error').slice(0, 120) }))
  addEventListener('unhandledrejection', (ev) => track('vm_error', { label: String(ev.reason?.message || ev.reason || 'rejection').slice(0, 120) }))
  // links out (GitHub, LinkedIn, portfolio)
  document.addEventListener('click', (e) => {
    const a = e.target?.closest?.('a[href]')
    if (!a) return
    try {
      const u = new URL(a.href, location.href)
      if (u.origin !== location.origin) track('outbound', { label: (a.textContent || u.hostname).trim().slice(0, 80), target: u.href.slice(0, 300) })
    } catch {
      /* ignore */
    }
  }, true)
}
