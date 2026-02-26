"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  MeshTransmissionMaterial,
  Float,
  useGLTF,
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
} from "@react-three/postprocessing";
import * as THREE from "three";

/* ──────────────────────────────────────────────────────────────
   Crystal — loads the GLB model and applies glass material
   ────────────────────────────────────────────────────────────── */

function Crystal() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/image/logo3d.glb");
  const { viewport } = useThree();

  // Angular velocity for mouse-driven rotation
  const angularVel = useRef({ x: 0, y: 0 });

  // Center and scale the model on first load
  const model = useRef<THREE.Group | null>(null);
  if (!model.current) {
    model.current = scene.clone();
    // Compute bounding box to center + normalize scale
    const box = new THREE.Box3().setFromObject(model.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = 2.5 / maxDim;
    model.current.scale.setScalar(scaleFactor);
    model.current.position.sub(center.multiplyScalar(scaleFactor));
  }

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Slow auto-rotation
    angularVel.current.y += 0.02 * delta;

    // Subtle mouse influence
    const mx = state.pointer.x;
    const my = state.pointer.y;
    angularVel.current.x += my * 0.001 * delta;
    angularVel.current.y += mx * 0.001 * delta;

    // Strong friction — slow & smooth
    const friction = Math.pow(0.4, delta);
    angularVel.current.x *= friction;
    angularVel.current.y *= friction;

    // Apply rotation
    groupRef.current.rotation.x += angularVel.current.x;
    groupRef.current.rotation.y += angularVel.current.y;

    // Gentle float
    groupRef.current.position.y = Math.sin(t * 0.3) * 0.05;
  });

  // Apply glass material to all meshes in the model
  return (
    <group ref={groupRef}>
      <group>
        {model.current && (
          <primitive object={model.current}>
            {/* Override materials on all child meshes */}
          </primitive>
        )}
      </group>
    </group>
  );
}

/* ──────────────────────────────────────────────────────────────
   Glass material applier — traverses the model and swaps
   materials for glass transmission
   ────────────────────────────────────────────────────────────── */

function CrystalWithGlass() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/image/logo3d.glb");
  const { viewport } = useThree();

  const angularVel = useRef({ x: 0, y: 0 });
  const clonedScene = useRef<THREE.Group | null>(null);

  // Clone + center + scale once
  if (!clonedScene.current) {
    clonedScene.current = scene.clone();
    const box = new THREE.Box3().setFromObject(clonedScene.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = 2.5 / maxDim;
    clonedScene.current.scale.setScalar(s);
    clonedScene.current.position.set(
      -center.x * s,
      -center.y * s,
      -center.z * s
    );
  }

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Slow auto-rotation
    angularVel.current.y += 0.015 * delta;

    // Subtle mouse influence
    angularVel.current.x += state.pointer.y * 0.0008 * delta;
    angularVel.current.y += state.pointer.x * 0.0008 * delta;

    // Strong friction
    const friction = Math.pow(0.35, delta);
    angularVel.current.x *= friction;
    angularVel.current.y *= friction;

    groupRef.current.rotation.x += angularVel.current.x;
    groupRef.current.rotation.y += angularVel.current.y;

    // Gentle float
    groupRef.current.position.y = Math.sin(t * 0.3) * 0.04;
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene.current} />
    </group>
  );
}

/* ──────────────────────────────────────────────────────────────
   Scene — lighting, environment, post-processing
   ────────────────────────────────────────────────────────────── */

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={4} color="#ffffff" />
      <pointLight position={[-5, -2, 4]} intensity={2} color="#ffe0cc" />
      <spotLight
        position={[0, 6, 4]}
        intensity={3}
        angle={0.4}
        penumbra={0.8}
        color="#10B981"
      />

      <Float
        speed={1}
        rotationIntensity={0.1}
        floatIntensity={0.2}
        floatingRange={[-0.03, 0.03]}
      >
        <CrystalWithGlass />
      </Float>

      <Environment preset="city" environmentIntensity={0.6} />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          intensity={0.4}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────
   Exported component
   ────────────────────────────────────────────────────────────── */

export function CrystalScene({ className }: { className?: string }) {
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
        camera={{ position: [0, 0, 5], fov: 35 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload the GLB
useGLTF.preload("/image/logo3d.glb");
