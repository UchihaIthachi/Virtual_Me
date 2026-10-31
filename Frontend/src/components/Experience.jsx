import {
  CameraControls,
  ContactShadows,
  Sparkles,
  useGLTF,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { currentViseme, isSpeaking } from "../lib/speech";
import {
  Suspense,
  useEffect,
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
  const color = message?.facialExpression === "sad" ? "#60a5fa" : message?.facialExpression === "smile" ? "#a3e635" : "#818cf8";
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
        <meshBasicMaterial color="#c7d2fe" transparent opacity={0.15} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export const Experience = () => {
  const cameraControls = useRef();
  const { cameraZoomed: wantZoom, message } = useChat();
  // step back for big moves so the whole dance / jump is in frame
  const bigMove = !!message && ["dance", "jump"].includes(message.animation);
  const cameraZoomed = wantZoom && !bigMove;

  useEffect(() => {
    cameraControls.current.setLookAt(
      0,
      2,
      5,
      0,
      1.5,
      0
    );
  }, []);

  useEffect(() => {
    if (cameraZoomed) {
      cameraControls.current.setLookAt(
        0,
        1.5,
        1.5,
        0,
        1.5,
        0,
        true
      );
    } else {
      cameraControls.current.setLookAt(
        0,
        2.2,
        5,
        0,
        1.0,
        0,
        true
      );
    }
  }, [cameraZoomed]);
  return (
    <>
      <CameraControls
        ref={cameraControls}
      />
      {/* local lights instead of a downloaded HDR (no third-party fetch, works offline) */}
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#dbeafe", "#1e293b", 0.9]} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.6} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#a5b4fc" />
      {/* rim light from behind for a studio look */}
      <spotLight position={[0, 3.5, -2.5]} angle={0.5} penumbra={0.8} intensity={2.2} color="#818cf8" />
      <Sparkles count={70} scale={[4, 3, 2.5]} position={[0, 1.4, -0.6]} size={2.2} speed={0.35} opacity={0.6} color="#c7d2fe" />
      <Stage />
      <Avatar />
      <Holo />
      <ContactShadows opacity={0.7} />
    </>
  );
};
