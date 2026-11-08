import {
  CameraControls,
  ContactShadows,
  Grid,
  MeshReflectorMaterial,
  Sparkles,
  useGLTF,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { currentViseme, isSpeaking } from "../lib/speech";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";
import { Holo } from "./Holo";



// Glowing stage under the avatar: rings pulse with the voice, spin while thinking.
const Stage = () => {
  const { loading, message } = useChat();
  const inner = useRef();
  const outer = useRef();
  const glow = useRef();
  const level = useRef(0);
  useFrame((state, delta) => {
    const v = currentViseme();
    const target = isSpeaking() ? (v && v !== "viseme_sil" ? 1 : 0.35) : loading ? 0.5 : 0;
    level.current = THREE.MathUtils.lerp(level.current, target, 0.15);
    const t = state.clock.elapsedTime;
    const l = level.current;
    if (inner.current) {
      inner.current.scale.setScalar(1 + l * 0.12 + Math.sin(t * 2) * 0.01);
      inner.current.material.opacity = 0.35 + l * 0.5;
      inner.current.rotation.z += delta * (loading ? 2.4 : 0.25);
    }
    if (outer.current) {
      outer.current.scale.setScalar(1.25 + l * 0.25 + Math.sin(t * 1.3) * 0.02);
      outer.current.material.opacity = 0.12 + l * 0.35;
      outer.current.rotation.z -= delta * (loading ? 1.2 : 0.12);
    }
    if (glow.current) glow.current.material.opacity = 0.18 + l * 0.3;
  });
  const color = message?.facialExpression === "sad" ? "#94a3b8" : ["smile", "laugh", "proud"].includes(message?.facialExpression) ? "#34d399" : "#e2e8f0";
  return (
    <group rotation-x={-Math.PI / 2} position-y={0.005}>
      <mesh ref={glow}>
        <circleGeometry args={[0.75, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh ref={inner}>
        <ringGeometry args={[0.62, 0.66, 96, 1, 0, Math.PI * 1.6]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={outer}>
        <ringGeometry args={[0.7, 0.71, 96]} />
        <meshBasicMaterial color="#f8fafc" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// Soft light halo behind the avatar (a big glowing card, not affected by fog)
const Halo = () => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(226,232,240,0.38)");
    g.addColorStop(0.35, "rgba(203,213,225,0.12)");
    g.addColorStop(0.7, "rgba(16,185,129,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const ref = useRef();
  useFrame((st) => {
    if (ref.current) ref.current.material.opacity = 0.85 + Math.sin(st.clock.elapsedTime * 0.6) * 0.12;
  });
  return (
    <mesh ref={ref} position={[0, 1.7, -3.2]}>
      <planeGeometry args={[9, 7]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} fog={false} toneMapped={false} />
    </mesh>
  );
};

// Dark mirror floor: the avatar and screens reflect softly, fading into fog
const Floor = () => {
  const small = useThree((st) => st.size.width < 700);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0}>
      <planeGeometry args={[40, 40]} />
      <MeshReflectorMaterial
        resolution={small ? 256 : 768}
        blur={[400, 120]}
        mixBlur={1}
        mixStrength={small ? 6 : 12}
        mirror={0.55}
        roughness={0.85}
        metalness={0.5}
        depthScale={1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#0b0d12"
      />
    </mesh>
  );
};

// camera views: face, half body, full body
const VIEWS = {
  face: [0, 1.62, 1.15, 0, 1.56, 0],
  half: [0, 1.5, 2.1, 0, 1.25, 0],
  full: [0, 1.9, 4.6, 0, 1.0, 0],
};

export const Experience = () => {
  const cameraControls = useRef();
  const { view = "face", message, P } = useChat();
  // step back for big moves so the whole dance / jump is in frame
  const bigMove = !!message && ["dance", "jump"].includes(message.animation);
  const current = bigMove ? "full" : view;
  // tall phone screens: step back a little so the head isn't cut off
  const aspect = useThree((st) => st.size.width / st.size.height);
  const back = aspect < 0.8 ? 1.45 : aspect < 1.2 ? 1.2 : 1;
  const at = (v) => {
    const [x, y, z, tx, ty, tz] = VIEWS[v];
    return [x, y, tz + (z - tz) * back, tx, ty, tz];
  };

  useEffect(() => {
    cameraControls.current.setLookAt(...at("full"), false);
  }, []);

  useEffect(() => {
    cameraControls.current.setLookAt(...at(current), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, back]);

  return (
    <>
      <CameraControls ref={cameraControls} minDistance={0.8} maxDistance={7} maxPolarAngle={Math.PI / 2 - 0.05} />
      {/* local lights instead of a downloaded HDR (no third-party fetch, works offline) */}
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#e0f2fe", "#0f172a", 0.85]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.7} castShadow />
      {/* cool and warm rims for a studio look */}
      <spotLight position={[-2.5, 3, -2]} angle={0.6} penumbra={0.9} intensity={2.2} color="#f1f5f9" />
      <spotLight position={[2.5, 3, -2]} angle={0.6} penumbra={0.9} intensity={1.6} color="#34d399" />
      {/* studio: solid backdrop, depth fog, light halo, mirror floor with a faint grid */}
      <color attach="background" args={["#07090e"]} />
      <fog attach="fog" args={["#07090e", 5, 13]} />
      <Halo />
      <Floor />
      <Grid
        position={[0, 0.002, 0]}
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#0f2236"
        sectionSize={2}
        sectionThickness={0.8}
        sectionColor="#1b4b63"
        fadeDistance={8}
        fadeStrength={2}
        infiniteGrid
      />
      <Sparkles count={24} scale={[4, 3, 2.5]} position={[0, 1.5, -0.8]} size={1.3} speed={0.2} opacity={0.35} color="#f8fafc" />
      <Stage />
      {/* key: a new persona mounts its own model cleanly */}
      <Avatar key={P.id} model={P.model} />
      <Holo />
      <ContactShadows opacity={0.7} blur={2.4} far={2} />
    </>
  );
};
