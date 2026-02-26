"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Float,
  useGLTF,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
} from "@react-three/postprocessing";
import * as THREE from "three";

/* ──────────────────────────────────────────────────────────────
   Single Monero coin instance
   ────────────────────────────────────────────────────────────── */

function MoneroCoin({
  position = [0, 0, 0] as [number, number, number],
  scale = 1,
  rotationOffset = 0,
  tiltX = 0,
  tiltZ = 0,
  speed = 0.3,
}: {
  position?: [number, number, number];
  scale?: number;
  rotationOffset?: number;
  tiltX?: number;
  tiltZ?: number;
  speed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/image/monero+coin+3d+model.glb");

  const clonedScene = useRef<THREE.Group | null>(null);
  if (!clonedScene.current) {
    clonedScene.current = scene.clone();
    const box = new THREE.Box3().setFromObject(clonedScene.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = (2.0 * scale) / maxDim;
    clonedScene.current.scale.setScalar(s);
    clonedScene.current.position.set(-center.x * s, -center.y * s, -center.z * s);
  }

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Slow continuous Y rotation
    groupRef.current.rotation.y = t * speed + rotationOffset;

    // Fixed tilt
    groupRef.current.rotation.x = tiltX;
    groupRef.current.rotation.z = tiltZ;

    // Gentle float
    groupRef.current.position.y = position[1] + Math.sin(t * 0.5 + rotationOffset) * 0.03;
  });

  return (
    <group ref={groupRef} position={position}>
      <primitive object={clonedScene.current} />
    </group>
  );
}

/* ──────────────────────────────────────────────────────────────
   Scene — multiple coins scattered at different sizes/angles
   ────────────────────────────────────────────────────────────── */

function MoneroScene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[4, 4, 5]} intensity={3} color="#ffffff" />
      <pointLight position={[-4, -2, 3]} intensity={1.5} color="#ffe0cc" />
      <spotLight
        position={[0, 5, 4]}
        intensity={2.5}
        angle={0.5}
        penumbra={0.8}
        color="#FF6600"
      />

      {/* Main coin — large, center-left, face forward */}
      <Float speed={0.8} rotationIntensity={0.05} floatIntensity={0.15} floatingRange={[-0.02, 0.02]}>
        <MoneroCoin
          position={[-0.3, 0, 0]}
          scale={1.2}
          speed={0.25}
          rotationOffset={0}
        />
      </Float>

      {/* Top-right coin — smaller, tilted */}
      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.2} floatingRange={[-0.03, 0.03]}>
        <MoneroCoin
          position={[1.6, 0.8, -0.8]}
          scale={0.55}
          speed={0.35}
          rotationOffset={1.2}
          tiltX={0.3}
          tiltZ={-0.2}
        />
      </Float>

      {/* Bottom-right coin — medium, angled */}
      <Float speed={0.9} rotationIntensity={0.06} floatIntensity={0.18} floatingRange={[-0.02, 0.02]}>
        <MoneroCoin
          position={[1.3, -0.7, -0.4]}
          scale={0.7}
          speed={0.3}
          rotationOffset={2.5}
          tiltX={-0.15}
          tiltZ={0.25}
        />
      </Float>

      {/* Far left coin — small, decorative */}
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.25} floatingRange={[-0.04, 0.04]}>
        <MoneroCoin
          position={[-1.8, -0.5, -1]}
          scale={0.4}
          speed={0.4}
          rotationOffset={4}
          tiltX={0.4}
          tiltZ={0.3}
        />
      </Float>

      {/* Top-left coin — tiny, background depth */}
      <Float speed={1.3} rotationIntensity={0.12} floatIntensity={0.3} floatingRange={[-0.05, 0.05]}>
        <MoneroCoin
          position={[-1.2, 1, -1.5]}
          scale={0.3}
          speed={0.45}
          rotationOffset={5.5}
          tiltX={-0.3}
          tiltZ={-0.4}
        />
      </Float>

      <Environment preset="city" environmentIntensity={0.5} />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.5}
          luminanceSmoothing={0.9}
          intensity={0.3}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────
   Exported component
   ────────────────────────────────────────────────────────────── */

export function MoneroCoinScene({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={className} />;
  }

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 30 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <MoneroScene />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload
useGLTF.preload("/image/monero+coin+3d+model.glb");
