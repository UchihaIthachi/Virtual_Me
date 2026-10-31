// Body gestures made in code, layered on top of the playing animation
// (the model only ships 7 clips). Each gesture adds small rotations to a few
// bones for `dur` seconds; `env` fades it in and out so it blends smoothly.
// Rotations are in radians; +x on the head tilts it back, -x nods it down.

const env = (p) => Math.sin(Math.PI * Math.min(1, Math.max(0, p))) // 0 -> 1 -> 0
const ease = (p) => Math.min(1, p * 3) * Math.min(1, (1 - p) * 3) // quick in, hold, quick out

export const GESTURES = {
  nod: {
    dur: 1.3,
    apply(b, p, t) {
      if (b.Head) b.Head.rotation.x += Math.sin(t * 13) * 0.16 * env(p) - 0.04 * env(p)
    },
  },
  shake: {
    dur: 1.3,
    apply(b, p, t) {
      if (b.Head) b.Head.rotation.y += Math.sin(t * 12) * 0.22 * env(p)
    },
  },
  shrug: {
    dur: 1.6,
    apply(b, p) {
      const k = ease(p)
      if (b.RightShoulder) b.RightShoulder.rotation.z += 0.28 * k
      if (b.LeftShoulder) b.LeftShoulder.rotation.z -= 0.28 * k
      if (b.RightForeArm) b.RightForeArm.rotation.x -= 0.45 * k
      if (b.Head) b.Head.rotation.z += 0.14 * k
    },
  },
  think: {
    dur: 2.2,
    loop: true,
    apply(b, p, t) {
      const k = ease(p)
      if (b.Head) {
        b.Head.rotation.z += 0.16 * k
        b.Head.rotation.x += 0.1 * k + Math.sin(t * 1.5) * 0.02
        b.Head.rotation.y += Math.sin(t * 0.9) * 0.08 * k
      }
    },
  },
  bow: {
    dur: 2,
    apply(b, p) {
      const k = env(p)
      if (b.Spine) b.Spine.rotation.x += 0.35 * k
      if (b.Spine1) b.Spine1.rotation.x += 0.2 * k
      if (b.Head) b.Head.rotation.x -= 0.25 * k
    },
  },
  wave: {
    dur: 2.4,
    apply(b, p, t) {
      const k = ease(p)
      // right arm up and out, forearm up, hand swinging side to side
      if (b.RightArm) b.RightArm.rotation.x -= 1.3 * k
      if (b.RightForeArm) {
        b.RightForeArm.rotation.x -= 1.5 * k
        b.RightForeArm.rotation.z += Math.sin(t * 10) * 0.35 * k
      }
      if (b.Head) b.Head.rotation.z += 0.08 * k
    },
  },
  laugh: {
    dur: 1.8,
    apply(b, p, t) {
      const k = env(p)
      if (b.Head) b.Head.rotation.x += 0.18 * k + Math.sin(t * 18) * 0.04 * k
      if (b.Spine2) b.Spine2.rotation.x += Math.sin(t * 18) * 0.03 * k
    },
  },
  lookAround: {
    dur: 3,
    apply(b, p, t) {
      if (b.Head) b.Head.rotation.y += Math.sin(t * 2.2) * 0.45 * env(p)
    },
  },
  lean: {
    dur: 2.2,
    apply(b, p) {
      const k = ease(p)
      if (b.Spine1) b.Spine1.rotation.x += 0.12 * k
      if (b.Head) b.Head.rotation.z -= 0.12 * k
    },
  },
}

/** Little head movements while talking, so a long answer doesn't look frozen. */
export function talkSway(b, t, amount) {
  if (!b.Head || amount <= 0) return
  b.Head.rotation.x += Math.sin(t * 2.7) * 0.025 * amount
  b.Head.rotation.y += Math.sin(t * 1.6) * 0.04 * amount
  b.Head.rotation.z += Math.sin(t * 1.1) * 0.02 * amount
}
