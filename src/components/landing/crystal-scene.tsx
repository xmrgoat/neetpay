"use client";

import { useRef, useState, useEffect, Suspense, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/* ──────────────────────────────────────────────────────────────
   Load GLB with silent texture error handling
   ────────────────────────────────────────────────────────────── */

if (typeof window !== "undefined") {
  const _origError = console.error;
  console.error = function (...args: unknown[]) {
    const msg = typeof args[0] === "string" ? args[0] : "";
    if (msg.includes("GLTFLoader") && msg.includes("load texture")) return;
    _origError.apply(console, args);
  };
}

const silentManager = new THREE.LoadingManager();
silentManager.onError = () => {};

let _cachedScene: THREE.Group | null = null;
const _loadPromise =
  typeof window !== "undefined"
    ? new Promise<THREE.Group>((resolve) => {
        const loader = new GLTFLoader(silentManager);
        loader.load(
          "/image/logo3d.glb",
          (gltf) => {
            _cachedScene = gltf.scene;
            resolve(gltf.scene);
          },
          undefined,
          () => {}
        );
      })
    : null;

function useSilentGLTF() {
  const [scene, setScene] = useState<THREE.Group | null>(_cachedScene);
  useEffect(() => {
    if (_cachedScene) {
      setScene(_cachedScene);
    } else {
      _loadPromise?.then((s) => setScene(s));
    }
  }, []);
  return scene;
}

/* ──────────────────────────────────────────────────────────────
   Procedural texture generation (cached once)
   ────────────────────────────────────────────────────────────── */

/* ── Custom diamond shader ─────────────────────────────────── */

const crystalVertexShader = /* glsl */ `
varying vec3 vViewPos;
varying vec2 vUv;
varying vec3 vWorldNormal;

void main() {
  vUv = uv;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mvPos.xyz;
  // Pass object-space normal transformed to view space
  vWorldNormal = normalMatrix * normal;
  gl_Position = projectionMatrix * mvPos;
}
`;

const crystalFragmentShader = /* glsl */ `
uniform sampler2D uColorMap;
uniform float uTime;
uniform vec3 uTint;

varying vec3 vViewPos;
varying vec2 vUv;
varying vec3 vWorldNormal;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

void main() {
  // Compute normal — try geometry normal first, fallback to screen-space derivatives
  vec3 geoN = normalize(vWorldNormal);
  vec3 dfdxN = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
  float geoLen = length(vWorldNormal);
  vec3 N = geoLen > 0.1 ? geoN : dfdxN;

  // Base color — smoky translucent tint (very subtle)
  vec4 texColor = texture2D(uColorMap, vUv);
  vec3 baseColor = texColor.rgb * uTint;

  // === Rotating key light for scintillation ===
  vec3 lightDir1 = normalize(vec3(sin(uTime * 0.7) * 0.6, 0.7, cos(uTime * 0.7) * 0.6));
  vec3 lightDir2 = normalize(vec3(-0.5, 0.3, 0.8));
  vec3 lightDir3 = normalize(vec3(cos(uTime * 0.4) * 0.4, -0.3, sin(uTime * 0.4) * 0.5));

  // Lambertian diffuse from multiple lights
  float diff1 = max(dot(N, lightDir1), 0.0) * 0.3;
  float diff2 = max(dot(N, lightDir2), 0.0) * 0.18;
  float diff3 = max(dot(N, lightDir3), 0.0) * 0.12;
  float ambient = 0.15;
  float diffuse = ambient + diff1 + diff2 + diff3;

  // === Diamond sparkle — multi-layer specular ===
  vec3 viewDir = normalize(-vViewPos);

  // Primary specular (sharp, rotating)
  vec3 half1 = normalize(lightDir1 + viewDir);
  float spec1 = pow(max(dot(N, half1), 0.0), 160.0) * 1.0;

  // Secondary specular (softer, fixed)
  vec3 half2 = normalize(lightDir2 + viewDir);
  float spec2 = pow(max(dot(N, half2), 0.0), 80.0) * 0.5;

  // Third specular (rotating opposite)
  vec3 half3 = normalize(lightDir3 + viewDir);
  float spec3 = pow(max(dot(N, half3), 0.0), 120.0) * 0.6;

  // === Micro-facet sparkle grid — tiny crystal facets catching light ===
  vec2 sparkleUv1 = floor(vUv * 300.0);
  float facetRand1 = hash(sparkleUv1);
  float facetFlash1 = step(0.93, facetRand1) * spec1 * 2.5;

  vec2 sparkleUv2 = floor(vUv * 150.0 + vec2(uTime * 0.2, 0.0));
  float facetRand2 = hash(sparkleUv2);
  float facetFlash2 = step(0.91, facetRand2) * spec2 * 2.0;

  vec3 sparklePos = floor(vViewPos * 40.0);
  float facetRand3 = hash3(sparklePos + vec3(0.0, 0.0, uTime * 0.15));
  float facetFlash3 = step(0.94, facetRand3) * (spec1 + spec3) * 1.5;

  float totalSparkle = facetFlash1 + facetFlash2 + facetFlash3;

  // Specular highlight color (warm orange, less white)
  vec3 specColor = vec3(1.0, 0.55, 0.2);

  // Rim light — subtle edge glow
  float rim = 1.0 - max(dot(viewDir, N), 0.0);
  rim = pow(rim, 4.0) * 0.25;
  vec3 rimColor = vec3(0.8, 0.3, 0.0) * rim;

  // === Fresnel — glassy transparency ===
  float fresnel = pow(1.0 - max(dot(viewDir, N), 0.0), 3.0);
  // Edges are more opaque (reflection), center is see-through
  float alpha = mix(0.35, 0.92, fresnel);

  // Boost alpha where specular / sparkle hits so highlights stay bright
  float highlightBoost = clamp(
    (spec1 + spec2 + spec3) * 0.6 + totalSparkle * 0.8,
    0.0, 1.0
  );
  alpha = clamp(alpha + highlightBoost, 0.0, 1.0);

  // Combine
  vec3 color = baseColor * diffuse
             + specColor * (spec1 * 0.2 + spec2 * 0.12 + spec3 * 0.12)
             + specColor * totalSparkle
             + rimColor;

  gl_FragColor = vec4(color, alpha);
}
`;

/* ── Procedural texture — smooth glassy crystal surface ── */

function generateTextures() {
  const sz = 1024;

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = sz;
  colorCanvas.height = sz;
  const ctx = colorCanvas.getContext("2d")!;

  // Base — dark smoky glass
  ctx.fillStyle = "#141418";
  ctx.fillRect(0, 0, sz, sz);

  // Very subtle noise — just enough to break uniformity
  const imgData = ctx.getImageData(0, 0, sz, sz);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = Math.floor(Math.random() * 8);
    d[i] = Math.min(255, d[i] + n);
    d[i + 1] = Math.min(255, d[i + 1] + n);
    d[i + 2] = Math.min(255, d[i + 2] + n + 2); // slight blue tint for glass
  }
  ctx.putImageData(imgData, 0, 0);

  // Soft caustic streaks — very faint internal refractions
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let v = 0; v < 12; v++) {
    ctx.beginPath();
    let x = Math.random() * sz;
    let y = Math.random() * sz;
    ctx.moveTo(x, y);
    for (let s = 0; s < 2 + Math.floor(Math.random() * 3); s++) {
      x += (Math.random() - 0.5) * 150;
      y += (Math.random() - 0.5) * 150;
      ctx.quadraticCurveTo(
        x + (Math.random() - 0.5) * 60,
        y + (Math.random() - 0.5) * 60,
        x, y
      );
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;

  return { colorMap };
}

let _textures: ReturnType<typeof generateTextures> | null = null;
function getTextures() {
  if (!_textures) _textures = generateTextures();
  return _textures;
}

/* ──────────────────────────────────────────────────────────────
   Theme presets — dark (obsidian amber) / light (golden crystal)
   ────────────────────────────────────────────────────────────── */

const THEMES = {
  dark: {
    tint: new THREE.Color("#cc5200"),
    bloomIntensity: 0.35,
    bloomThreshold: 0.55,
  },
  light: {
    tint: new THREE.Color("#dd6620"),
    bloomIntensity: 0.2,
    bloomThreshold: 0.6,
  },
};

/* ──────────────────────────────────────────────────────────────
   Interactive Crystal — mouse follow + drag to rotate
   ────────────────────────────────────────────────────────────── */

function CrystalModel({ isDark }: { isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const scene = useSilentGLTF();

  const angularVel = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const SPIN_SPEED = 0.35;

  // Clone, center, scale, apply material
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone();
    const { colorMap } = getTextures();

    const material = new THREE.ShaderMaterial({
      vertexShader: crystalVertexShader,
      fragmentShader: crystalFragmentShader,
      uniforms: {
        uColorMap: { value: colorMap },
        uTime: { value: 0 },
        uTint: { value: THEMES.dark.tint.clone() },
      },
      transparent: true,
      depthWrite: true,
    });
    materialRef.current = material;

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = material;
      }
    });

    const box = new THREE.Box3().setFromObject(clone);
    const dims = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(dims.x, dims.y, dims.z);
    const s = 2.5 / maxDim;
    clone.scale.setScalar(s);
    clone.position.set(-center.x * s, -center.y * s, -center.z * s);
    return clone;
  }, [scene]);

  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    // Prevent R3F from eating the events
    canvas.style.touchAction = "none";

    const onDown = (e: PointerEvent) => {
      // Only start drag if click is on our canvas
      if (e.target !== canvas) return;
      e.preventDefault();
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      angularVel.current.y += dx * 0.008;
      angularVel.current.x += dy * 0.008;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
      canvas.style.cursor = "grab";
    };

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onDown, { capture: true });
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown, { capture: true });
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [gl]);

  // Animate material + rotation per frame
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const mat = materialRef.current;

    // ── Update shader uniforms ──
    if (mat) {
      const target = isDark ? THEMES.dark : THEMES.light;
      const speed = 3.0 * delta;

      mat.uniforms.uTime.value = t;
      (mat.uniforms.uTint.value as THREE.Color).lerp(target.tint, speed);
    }

    // ── Auto-spin (paused while dragging) ──
    if (!isDragging.current) {
      groupRef.current.rotation.y += SPIN_SPEED * delta;
    }

    // ── Drag velocity with smooth friction ──
    const friction = Math.pow(0.95, delta * 60);
    angularVel.current.x *= friction;
    angularVel.current.y *= friction;
    groupRef.current.rotation.x += angularVel.current.x;
    groupRef.current.rotation.y += angularVel.current.y;

    // ── Spring back X rotation toward 0 when not dragging ──
    if (!isDragging.current) {
      groupRef.current.rotation.x *= Math.pow(0.96, delta * 60);
    }

    // Gentle float
    groupRef.current.position.y = Math.sin(t * 0.4) * 0.06;
  });

  if (!clonedScene) return null;

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

/* ──────────────────────────────────────────────────────────────
   Scene — theme-reactive lighting with smooth transitions
   ────────────────────────────────────────────────────────────── */

function Scene({ isDark }: { isDark: boolean }) {
  return (
    <>
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2} floatingRange={[-0.03, 0.03]}>
        <CrystalModel isDark={isDark} />
      </Float>

      <EffectComposer>
        <Bloom
          luminanceThreshold={isDark ? 0.6 : 0.7}
          luminanceSmoothing={0.9}
          intensity={isDark ? 0.25 : 0.15}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────
   Exported component
   ────────────────────────────────────────────────────────────── */

export function CrystalScene({
  className,
  isDark = true,
}: {
  className?: string;
  isDark?: boolean;
}) {
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
          toneMapping: THREE.NoToneMapping,
        }}
        events={() => ({ enabled: false, priority: 0, compute: () => {} } as never)}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene isDark={isDark} />
        </Suspense>
      </Canvas>
    </div>
  );
}
