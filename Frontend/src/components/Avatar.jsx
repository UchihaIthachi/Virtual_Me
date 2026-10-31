import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { button, useControls } from 'leva'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import * as THREE from 'three'
import { useChat } from '../hooks/useChat'
import { VISEMES, currentViseme, isSpeaking } from '../lib/speech'
import { GESTURES, talkSway } from '../lib/gestures'
import { LOOKS, SKIN } from '../lib/looks'
import { useGlasses } from './Glasses'

const facialExpressions = {
  default: {},
  thinking: {
    browInnerUp: 0.45,
    browDownLeft: 0.2,
    eyeLookUpLeft: 0.55,
    eyeLookUpRight: 0.55,
    eyeSquintLeft: 0.2,
    mouthPressLeft: 0.45,
    mouthPressRight: 0.45,
    mouthLeft: 0.3,
  },
  laugh: {
    jawOpen: 0.18,
    mouthSmileLeft: 0.75,
    mouthSmileRight: 0.75,
    eyeSquintLeft: 0.45,
    eyeSquintRight: 0.45,
    cheekSquintLeft: 0.55,
    cheekSquintRight: 0.55,
    browInnerUp: 0.15
  },
  confident: {
    mouthSmileLeft: 0.45,
    mouthSmileRight: 0.28,
    mouthDimpleLeft: 0.35,
    eyeSquintLeft: 0.25,
    eyeSquintRight: 0.25,
    browDownRight: 0.12,
  },
  proud: {
    mouthSmileLeft: 0.65,
    mouthSmileRight: 0.65,
    jawForward: 0.12,
    browOuterUpLeft: 0.25,
    browOuterUpRight: 0.25,
    cheekSquintLeft: 0.35,
    cheekSquintRight: 0.35,
  },
  curious: {
    browOuterUpLeft: 0.65,
    browInnerUp: 0.35,
    eyeWideLeft: 0.3,
    eyeWideRight: 0.25,
    mouthLeft: 0.2,
    mouthPucker: 0.15,
  },
  love: {
    mouthPucker: 0.85,
    eyeSquintLeft: 0.45,
    eyeSquintRight: 0.45,
    browInnerUp: 0.3,
    cheekSquintLeft: 0.5,
    cheekSquintRight: 0.5,
  },
  embarrassed: {
    mouthSmileLeft: 0.35,
    mouthSmileRight: 0.35,
    mouthPressLeft: 0.4,
    mouthPressRight: 0.4,
    eyeLookDownLeft: 0.5,
    eyeLookDownRight: 0.5,
    browInnerUp: 0.4,
    cheekSquintLeft: 0.4,
  },
  smile: {
    mouthSmileLeft: 0.55,
    mouthSmileRight: 0.55,
    cheekSquintLeft: 0.3,
    cheekSquintRight: 0.3,
    browInnerUp: 0.17,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.44,
    noseSneerLeft: 0.1700000727403593,
    noseSneerRight: 0.14000002836874015,
    mouthPressLeft: 0.61,
    mouthPressRight: 0.41000000000000003,
  },
  funnyFace: {
    jawLeft: 0.35,
    mouthPucker: 0.35,
    noseSneerLeft: 0.45,
    mouthLeft: 0.5,
    eyeLookUpLeft: 0.45,
    eyeLookUpRight: 0.45,
    cheekPuff: 0.45,
    mouthSmileLeft: 0.3,
    mouthSmileRight: 0.3
  },
  sad: {
    mouthFrownLeft: 0.6,
    mouthFrownRight: 0.6,
    mouthShrugLower: 0.4,
    browInnerUp: 0.5,
    eyeSquintLeft: 0.3,
    eyeSquintRight: 0.3,
    eyeLookDownLeft: 0.35,
    eyeLookDownRight: 0.35
  },
  surprised: {
    eyeWideLeft: 0.4,
    eyeWideRight: 0.4,
    browInnerUp: 0.65,
    browOuterUpLeft: 0.45,
    browOuterUpRight: 0.45,
    jawOpen: 0.16,
    mouthFunnel: 0.25
  },
  angry: {
    browDownLeft: 1,
    browDownRight: 1,
    eyeSquintLeft: 1,
    eyeSquintRight: 1,
    jawForward: 1,
    jawLeft: 1,
    mouthShrugLower: 1,
    noseSneerLeft: 1,
    noseSneerRight: 0.42,
    eyeLookDownLeft: 0.16,
    eyeLookDownRight: 0.16,
    cheekSquintLeft: 1,
    cheekSquintRight: 1,
    mouthClose: 0.23,
    mouthFunnel: 0.63,
    mouthDimpleRight: 1,
  },
  crazy: {
    browInnerUp: 0.9,
    jawForward: 1,
    noseSneerLeft: 0.5700000000000001,
    noseSneerRight: 0.51,
    eyeLookDownLeft: 0.39435766259644545,
    eyeLookUpRight: 0.4039761421719682,
    eyeLookInLeft: 0.9618479575523053,
    eyeLookInRight: 0.9618479575523053,
    jawOpen: 0.9618479575523053,
    mouthDimpleLeft: 0.9618479575523053,
    mouthDimpleRight: 0.9618479575523053,
    mouthStretchLeft: 0.27893590769016857,
    mouthStretchRight: 0.2885543872656917,
    mouthSmileLeft: 0.5578718153803371,
    mouthSmileRight: 0.38473918302092225,
    tongueOut: 0.9618479575523053,
  },
}


// Draco decoder served from this site (no third-party CDN at runtime)
const DRACO = '/draco/'

// a warm resting face between replies
const REST = { mouthSmileLeft: 0.12, mouthSmileRight: 0.12 }
// morphs around the mouth that would fight the lip sync
const MOUTH = /^(mouth|jaw|cheekPuff|tongue)/

let setupMode = false

export function Avatar(props) {
  const { nodes, materials, scene } = useGLTF('/models/me.glb', DRACO)
  const MORPH_KEYS = useMemo(() => Object.keys(nodes.EyeLeft.morphTargetDictionary).concat(Object.keys(nodes.Wolf3D_Head.morphTargetDictionary)).filter((k, i, a) => a.indexOf(k) === i), [nodes])

  const { message, loading, poke, look: lookId, glasses } = useChat()
  const look = useRef({ x: 0, y: 0 })

  // outfit / style: recolor the model's own materials (keeps folds and shading)
  const originals = useMemo(() => ({ top: materials.Wolf3D_Outfit_Top.map }), [materials])
  useEffect(() => {
    const L = LOOKS.find((x) => x.id === lookId) || LOOKS[0]
    const top = materials.Wolf3D_Outfit_Top
    top.map = null // plain color instead of the printed texture
    top.color.set(L.top)
    top.roughness = 0.85
    top.needsUpdate = true
    materials.Wolf3D_Outfit_Bottom.color.set(L.bottom)
    materials.Wolf3D_Hair.color.set(L.hair)
    materials.Wolf3D_Skin.color.set(SKIN)
    materials.Wolf3D_Body.color.set(SKIN)
    return undefined
  }, [lookId, materials, originals])
  const lookDef = LOOKS.find((x) => x.id === lookId) || LOOKS[0]
  useGlasses(nodes, glasses)
  const gesture = useRef(null) // { name, start }
  // ?debug in the URL exposes gestures for tuning from the console
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('debug')) {
      window.__vm = { GESTURES, nodes, play: (name) => (gesture.current = { name, start: performance.now() }) }
    }
  }, [])
  const talk = useRef(0)

  // each reply sets the mood; speaking itself is handled by lib/speech
  useEffect(() => {
    if (!message) {
      setAnimation('idle')
      setFacialExpression(loading ? 'default' : '')
      return
    }
    const anim = message.animation && animations.find((a) => a.name === message.animation) ? message.animation : 'idle'
    setAnimation(anim)
    setFacialExpression(message.facialExpression || 'default')
    gesture.current = message.gesture && GESTURES[message.gesture] ? { name: message.gesture, start: performance.now() } : null
    if (message.wink) {
      setWinkLeft(true)
      setTimeout(() => setWinkLeft(false), 450)
    }
  }, [message])

  // thinking pose while waiting for the answer
  useEffect(() => {
    if (loading && !message) {
      setFacialExpression('thinking')
      gesture.current = { name: 'think', start: performance.now() }
    } else if (!message && gesture.current?.name === 'think') {
      gesture.current = null
      setFacialExpression('')
    }
  }, [loading])

  const { animations } = useGLTF('/models/animations.glb', DRACO)

  const group = useRef()
  const { actions, mixer } = useAnimations(animations, group)
  const [animation, setAnimation] = useState(
    animations.find((a) => a.name === 'idle')
      ? 'idle'
      : animations[0].name // Check if Idle animation exists otherwise use first animation
  )

  useEffect(() => {
    actions[animation]
      .reset()
      .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
      .play()
    return () => actions[animation].fadeOut(0.5)
  }, [animation])

  const [blink, setBlink] = useState(false)
  const [winkLeft, setWinkLeft] = useState(false)
  const [winkRight, setWinkRight] = useState(false)
  const [facialExpression, setFacialExpression] = useState('')

  // every mesh with morph targets, found once (not on every frame)
  const morphMeshes = useMemo(() => {
    const list = []
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) list.push(child)
    })
    return list
  }, [scene])

  // used by the (hidden) setup panel only
  const lerpMorphTarget = (target, value, speed = 0.1) => {
    morphMeshes.forEach((child) => {
      const index = child.morphTargetDictionary[target]
      if (index === undefined) return
      child.morphTargetInfluences[index] = THREE.MathUtils.lerp(child.morphTargetInfluences[index], value, speed)
    })
  }

  // ease one morph toward its target, at the same speed on any frame rate
  const dampMorph = (key, target, lambda, delta) => {
    for (const child of morphMeshes) {
      const index = child.morphTargetDictionary[key]
      if (index === undefined) continue
      const cur = child.morphTargetInfluences[index]
      child.morphTargetInfluences[index] = THREE.MathUtils.damp(cur, target, lambda, delta)
    }
  }

  useFrame((state, delta) => {
    // head (and a little of the neck) turns toward the cursor, on top of the animation
    if (!setupMode && nodes.Head) {
      const tx = THREE.MathUtils.clamp(state.pointer.x, -1, 1) * 0.45
      const ty = THREE.MathUtils.clamp(-state.pointer.y, -1, 1) * -0.15
      look.current.x = THREE.MathUtils.lerp(look.current.x, tx, 0.08)
      look.current.y = THREE.MathUtils.lerp(look.current.y, ty, 0.08)
      nodes.Head.rotation.y += look.current.x
      nodes.Head.rotation.x += look.current.y
      if (nodes.Neck) nodes.Neck.rotation.y += look.current.x * 0.35

      // gesture on top
      const g = gesture.current
      if (g) {
        const def = GESTURES[g.name]
        const secs = (performance.now() - g.start) / 1000
        let p = secs / def.dur
        if (def.loop && p > 0.5) p = 0.5 // hold the middle while it's needed
        if (p >= 1) gesture.current = null
        else def.apply(nodes, p, state.clock.elapsedTime)
      }
      // small natural head movement while talking
      talk.current = THREE.MathUtils.lerp(talk.current, isSpeaking() ? 1 : 0, 0.05)
      talkSway(nodes, state.clock.elapsedTime, talk.current)
    }

    if (setupMode) return

    // One pass over all morph targets: expression + lip sync + blinks, each
    // eased toward its target so faces blend instead of snapping.
    const dt = Math.min(delta, 0.05)
    const speaking = isSpeaking()
    const mapping = facialExpressions[facialExpression] || REST
    const viseme = currentViseme()
    for (const key of MORPH_KEYS) {
      if (key === 'eyeBlinkLeft' || key === 'eyeBlinkRight') continue
      if (key.startsWith('viseme_')) {
        // lips: the current mouth shape at 70%, the rest relax
        dampMorph(key, key === viseme ? 0.7 : 0, key === viseme ? 22 : 14, dt)
        continue
      }
      let target = mapping[key] || 0
      // while talking, the lips belong to the voice: soften the expression's mouth
      if (speaking && MOUTH.test(key)) target *= 0.35
      dampMorph(key, target, 5, dt)
    }
    dampMorph('eyeBlinkLeft', blink || winkLeft ? 1 : 0, 28, dt)
    dampMorph('eyeBlinkRight', blink || winkRight ? 1 : 0, 28, dt)
  })

  useControls('FacialExpressions', {
    winkLeft: button(() => {
      setWinkLeft(true)
      setTimeout(() => setWinkLeft(false), 300)
    }),
    winkRight: button(() => {
      setWinkRight(true)
      setTimeout(() => setWinkRight(false), 300)
    }),
    animation: {
      value: animation,
      options: animations.map((a) => a.name),
      onChange: (value) => setAnimation(value),
    },
    facialExpression: {
      options: Object.keys(facialExpressions),
      onChange: (value) => setFacialExpression(value),
    },
    enableSetupMode: button(() => {
      setupMode = true
    }),
    disableSetupMode: button(() => {
      setupMode = false
    }),
    logMorphTargetValues: button(() => {
      const emotionValues = {}
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach(
        (key) => {
          if (key === 'eyeBlinkLeft' || key === 'eyeBlinkRight') {
            return // eyes wink/blink are handled separately
          }
          const value =
            nodes.EyeLeft.morphTargetInfluences[
              nodes.EyeLeft.morphTargetDictionary[key]
            ]
          if (value > 0.01) {
            emotionValues[key] = value
          }
        }
      )
      console.log(JSON.stringify(emotionValues, null, 2))
    }),
  })

  const [, set] = useControls('MorphTarget', () =>
    Object.assign(
      {},
      ...Object.keys(nodes.EyeLeft.morphTargetDictionary).map(
        (key) => {
          return {
            [key]: {
              label: key,
              value: 0,
              min: nodes.EyeLeft.morphTargetInfluences[
                nodes.EyeLeft.morphTargetDictionary[key]
              ],
              max: 1,
              onChange: (val) => {
                if (setupMode) {
                  lerpMorphTarget(key, val, 1)
                }
              },
            },
          }
        }
      )
    )
  )

  useEffect(() => {
    let blinkTimeout
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true)
        setTimeout(() => {
          setBlink(false)
          nextBlink()
        }, 200)
      }, THREE.MathUtils.randInt(1000, 5000))
    }
    nextBlink()
    return () => clearTimeout(blinkTimeout)
  }, [])

  return (
    <group
      {...props}
      dispose={null}
      ref={group}
      onClick={(e) => {
        e.stopPropagation()
        poke()
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name='EyeLeft'
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name='EyeRight'
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name='Wolf3D_Head'
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={
          nodes.Wolf3D_Head.morphTargetDictionary
        }
        morphTargetInfluences={
          nodes.Wolf3D_Head.morphTargetInfluences
        }
      />
      <skinnedMesh
        name='Wolf3D_Teeth'
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={
          nodes.Wolf3D_Teeth.morphTargetDictionary
        }
        morphTargetInfluences={
          nodes.Wolf3D_Teeth.morphTargetInfluences
        }
      />
      <skinnedMesh
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        name='Wolf3D_Outfit_Top'
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
        morphTargetDictionary={
          nodes.Wolf3D_Outfit_Top.morphTargetDictionary
        }
        morphTargetInfluences={
          nodes.Wolf3D_Outfit_Top.morphTargetInfluences
        }
      />
      <skinnedMesh
        name='Wolf3D_Outfit_Bottom'
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
        morphTargetDictionary={
          nodes.Wolf3D_Outfit_Bottom.morphTargetDictionary
        }
        morphTargetInfluences={
          nodes.Wolf3D_Outfit_Bottom.morphTargetInfluences
        }
      />
      <skinnedMesh
        name='Wolf3D_Outfit_Footwear'
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
        morphTargetDictionary={
          nodes.Wolf3D_Outfit_Footwear.morphTargetDictionary
        }
        morphTargetInfluences={
          nodes.Wolf3D_Outfit_Footwear.morphTargetInfluences
        }
      />
      <skinnedMesh
        name='Wolf3D_Body'
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
        morphTargetDictionary={
          nodes.Wolf3D_Body.morphTargetDictionary
        }
        morphTargetInfluences={
          nodes.Wolf3D_Body.morphTargetInfluences
        }
      />
    </group>
  )
}

useGLTF.preload('/models/me.glb', DRACO)
useGLTF.preload('/models/animations.glb', DRACO)
