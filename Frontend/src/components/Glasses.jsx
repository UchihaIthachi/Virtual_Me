// Thin modern glasses, built from primitives and attached to the head bone,
// sized from the distance between the eyes so they fit any avatar.
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

export function useGlasses(nodes, visible) {
  const glasses = useMemo(() => {
    const g = new THREE.Group()
    g.name = 'Glasses'
    const frame = new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.35, metalness: 0.6 })
    const lens = new THREE.MeshPhysicalMaterial({ color: '#9fb4ff', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, transmission: 0 })
    // unit-sized parts; scaled to the face below
    const rimShape = new THREE.Shape()
    const w = 0.9
    const h = 0.62
    const r = 0.18
    rimShape.moveTo(-w / 2 + r, -h / 2)
    rimShape.lineTo(w / 2 - r, -h / 2)
    rimShape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
    rimShape.lineTo(w / 2, h / 2 - r)
    rimShape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
    rimShape.lineTo(-w / 2 + r, h / 2)
    rimShape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
    rimShape.lineTo(-w / 2, -h / 2 + r)
    rimShape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
    const hole = new THREE.Path(rimShape.getPoints(24).map((p) => p.clone().multiplyScalar(0.84)))
    const rim = new THREE.Shape(rimShape.getPoints(24))
    rim.holes.push(hole)
    const rimGeo = new THREE.ExtrudeGeometry(rim, { depth: 0.06, bevelEnabled: false })
    rimGeo.translate(0, 0, -0.03)
    const lensGeo = new THREE.ShapeGeometry(new THREE.Shape(hole.getPoints()))
    ;[-1, 1].forEach((side) => {
      const m = new THREE.Mesh(rimGeo, frame)
      m.position.x = side * 0.55
      g.add(m)
      const l = new THREE.Mesh(lensGeo, lens)
      l.position.set(side * 0.55, 0, 0)
      g.add(l)
      // temple arm going back over the ear
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 1.25), frame)
      arm.position.set(side * 1.0, 0.12, -0.62)
      g.add(arm)
    })
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), frame)
    bridge.position.set(0, 0.14, 0)
    g.add(bridge)
    return g
  }, [])

  useEffect(() => {
    const head = nodes.Head
    const le = nodes.LeftEye
    const re = nodes.RightEye
    if (!head || !le || !re) return undefined
    head.updateWorldMatrix(true, true)
    // eye centres in head space
    const a = head.worldToLocal(le.getWorldPosition(new THREE.Vector3()))
    const b = head.worldToLocal(re.getWorldPosition(new THREE.Vector3()))
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const eyeDist = a.distanceTo(b)
    // the head bone's forward axis: from the head centre toward the eyes
    const fwd = mid.clone().setY(0).normalize()
    const s = eyeDist / 1.1 // 1.1 = rim centre distance in unit space
    glasses.scale.setScalar(s)
    glasses.position.copy(mid).add(fwd.clone().multiplyScalar(eyeDist * 0.42))
    glasses.position.y += eyeDist * 0.02
    // face the same way as the eyes
    glasses.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fwd.lengthSq() ? fwd : new THREE.Vector3(0, 0, 1))
    head.add(glasses)
    return () => head.remove(glasses)
  }, [nodes, glasses])

  useEffect(() => {
    glasses.visible = visible
  }, [visible, glasses])
}
