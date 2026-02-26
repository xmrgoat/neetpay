"use client";

import { useRef, useState, useEffect, Suspense, useCallback } from "react";
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
   Interactive Crystal — mouse follow + drag to rotate
   ────────────────────────────────────────────────────────────── */

function CrystalModel() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/image/logo3d.glb");

  // Rotation state — angularVel is extra velocity from drag / spring
  const angularVel = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  // Continuous Y spin speed (right-to-left)
  const SPIN_SPEED = 0.35;

  // Clone + center + scale once
  const clonedScene = useRef<THREE.Group | null>(null);
  if (!clonedScene.current) {
    clonedScene.current = scene.clone();
    const box = new THREE.Box3().setFromObject(clonedScene.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = 2.5 / maxDim;
    clonedScene.current.scale.setScalar(s);
    clonedScene.current.position.set(-center.x * s, -center.y * s, -center.z * s);
  }

  // Listen for pointer events on the canvas
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      // Add velocity from drag — high multiplier for aggressive spin
      angularVel.current.y += dx * 0.04;
      angularVel.current.x += dy * 0.04;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging.current = false;
      canvas.style.cursor = "grab";
    };

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [gl]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Always apply continuous Y spin (right-to-left)
    groupRef.current.rotation.y += SPIN_SPEED * delta;

    if (!isDragging.current) {
      // Spring X back to 0 (face forward) — tilt recovery
      const springX = 3.0;
      angularVel.current.x -= groupRef.current.rotation.x * springX * delta;

      // Dampen extra Y velocity back toward 0 (resume steady spin)
      angularVel.current.y *= Math.pow(0.92, delta * 60);

      // Mouse subtly tilts the model
      const mouseOffsetX = state.pointer.y * 0.12;
      angularVel.current.x += (mouseOffsetX - angularVel.current.x) * 0.03;

      // Dampen X velocity
      angularVel.current.x *= (1 - 0.05);
    }

    // Friction on drag momentum
    const friction = isDragging.current ? 0.98 : Math.pow(0.94, delta * 60);
    angularVel.current.x *= friction;
    angularVel.current.y *= friction;

    // Apply extra velocity from drag on top of the continuous spin
    groupRef.current.rotation.x += angularVel.current.x * delta * 2;
    groupRef.current.rotation.y += angularVel.current.y * delta * 2;

    // Gentle float
    groupRef.current.position.y = Math.sin(t * 0.4) * 0.06;
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
        <CrystalModel />
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
