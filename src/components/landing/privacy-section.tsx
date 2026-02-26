"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Shield, Eye, Lock, Server, FileKey } from "lucide-react";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

/* ─── Feature items ──────────────────────────────────── */

const FEATURES = [
  {
    icon: Shield,
    title: "Native XMR Support",
    desc: "First-class Monero integration — not a plugin, not a bridge. Real, native support.",
  },
  {
    icon: Eye,
    title: "No KYC Required",
    desc: "Email-only sign up. No identity documents, no waiting, no third-party verification.",
  },
  {
    icon: Lock,
    title: "Non-Custodial",
    desc: "Funds settle directly to your wallet. We never hold your crypto.",
  },
  {
    icon: Server,
    title: "Zero Tracking",
    desc: "No analytics on your customers. No data brokers. No cookies.",
  },
  {
    icon: FileKey,
    title: "Signed Webhooks",
    desc: "HMAC-SHA512 cryptographic signatures on every callback.",
  },
];

/* ─── Single animated 3D Monero coin ─────────────────── */

function AnimatedCoin3D({
  index,
  finalPosition,
  coinScale,
  finalRotation,
  progressRef,
}: {
  index: number;
  finalPosition: [number, number, number];
  coinScale: number;
  finalRotation: [number, number, number];
  progressRef: { current: number[] };
}) {
  const { scene } = useGLTF("/image/monero+coin+3d+model.glb");
  const groupRef = useRef<THREE.Group>(null);
  const cloned = useRef<THREE.Group | null>(null);

  if (!cloned.current) {
    cloned.current = scene.clone();
    const box = new THREE.Box3().setFromObject(cloned.current);
    const sz = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(sz.x, sz.y, sz.z);
    const s = (2.0 * coinScale) / maxDim;
    cloned.current.scale.setScalar(s);
    cloned.current.position.set(
      -center.x * s,
      -center.y * s,
      -center.z * s,
    );
  }

  // Wallet opening center in 3D coords (where coins burst from)
  const ox = 0;
  const oy = 0.1;

  useFrame(() => {
    if (!groupRef.current) return;
    const p = progressRef.current[index];

    // Fly from wallet center → final position
    groupRef.current.position.x = ox + (finalPosition[0] - ox) * p;
    groupRef.current.position.y = oy + (finalPosition[1] - oy) * p;
    groupRef.current.position.z = -0.5 + finalPosition[2] * p;

    // Scale: burst from nothing
    groupRef.current.scale.setScalar(Math.max(p, 0.001));

    // Rotation: fast spin that settles into final orientation
    const spin = (1 - Math.min(p, 1)) * Math.PI * 4;
    groupRef.current.rotation.set(
      finalRotation[0] * p,
      finalRotation[1] + spin,
      finalRotation[2] * p,
    );
  });

  return (
    <group ref={groupRef} scale={0.001}>
      <primitive object={cloned.current} />
    </group>
  );
}

/* ─── Coin layout — varied sizes, unique tilts ───────── */

const COINS = [
  // Hero coin — large, nearly front-facing, overlapping wallet top-center
  { size: 80, top: "5%", left: "35%", rx: 8, ry: -12, rz: -5 },
  // Big coin — tilted dramatically, top-left
  { size: 68, top: "-6%", left: "8%", rx: 25, ry: 35, rz: -12 },
  // Medium coin — right side, angled away
  { size: 56, top: "12%", left: "75%", rx: -20, ry: -40, rz: 8 },
  // Small coin — top-right, nearly edge-on
  { size: 38, top: "-8%", left: "62%", rx: 45, ry: 15, rz: -20 },
  // Medium coin — mid-left, edge-on twist
  { size: 50, top: "35%", left: "-2%", rx: -15, ry: 50, rz: 5 },
  // Small coin — bottom-right, heavily angled
  { size: 34, top: "48%", left: "82%", rx: 35, ry: -55, rz: 15 },
  // Tiny accent — top center-left
  { size: 26, top: "-10%", left: "30%", rx: -50, ry: 25, rz: 30 },
  // Medium coin — center, tilted opposite way from hero (FIXED — was same direction)
  { size: 44, top: "25%", left: "52%", rx: -38, ry: 42, rz: 18 },
  // Small coin — bottom-left
  { size: 32, top: "52%", left: "15%", rx: -30, ry: 40, rz: -18 },
];

/* ─── Mapping constants ──────────────────────────────── */

const CONTAINER_W = 520;
const CONTAINER_H = 390;
const PAD = 15;
const TOTAL = 100 + 2 * PAD;
const HALF_H = 5 * Math.tan((15 * Math.PI) / 180);
const HALF_W = HALF_H * (4 / 3);

/* ─── 3D scene — all coins with animation ────────────── */

function WalletCoinsScene({
  progressRef,
}: {
  progressRef: { current: number[] };
}) {
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

      {COINS.map((coin, i) => {
        const centerPctX =
          parseFloat(coin.left) + (coin.size / CONTAINER_W) * 50;
        const centerPctY =
          parseFloat(coin.top) + (coin.size / CONTAINER_H) * 50;
        const fracX = (centerPctX + PAD) / TOTAL;
        const fracY = (centerPctY + PAD) / TOTAL;
        const x = (fracX - 0.5) * 2 * HALF_W;
        const y = (0.5 - fracY) * 2 * HALF_H;
        const scale = (coin.size / CONTAINER_W) * (100 / TOTAL) * HALF_W;

        return (
          <AnimatedCoin3D
            key={i}
            index={i}
            finalPosition={[x, y, 0]}
            coinScale={scale}
            finalRotation={[
              (coin.rx * Math.PI) / 180,
              (coin.ry * Math.PI) / 180,
              (coin.rz * Math.PI) / 180,
            ]}
            progressRef={progressRef}
          />
        );
      })}

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

/* ─── Premium wallet with animated 3D coins ──────────── */

function WalletVisual() {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const coinProgress = useRef<number[]>(COINS.map(() => 0));

  useEffect(() => setMounted(true), []);

  /* ── GSAP: coins burst out with stagger ── */
  useGSAP(
    () => {
      if (!containerRef.current) return;

      const proxies = COINS.map(() => ({ v: 0 }));

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 82%",
          toggleActions: "play none none none",
        },
      });

      // Staggered burst — each coin flies out with back-overshoot easing
      proxies.forEach((proxy, i) => {
        tl.to(
          proxy,
          {
            v: 1,
            duration: 2.4,
            ease: "back.out(1.7)",
            onUpdate: () => {
              coinProgress.current[i] = proxy.v;
            },
          },
          0.5 + i * 0.15,
        );
      });
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] max-w-[520px] mx-auto"
    >
      {/* Dark backdrop — makes wallet readable against any background */}
      <div
        className="absolute inset-[-25%] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(8,8,12,0.45) 0%, rgba(8,8,12,0.2) 40%, transparent 65%)",
        }}
      />
      {/* Ambient orange glow */}
      <div
        className="absolute inset-[-20%] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, rgba(255,102,0,0.08) 0%, transparent 50%)",
        }}
      />

      {/* ── Wallet body ── */}
      <div
        className="absolute inset-x-[4%] bottom-[6%] top-[18%] rounded-2xl z-[5]"
        style={{
          background:
            "linear-gradient(165deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.04) 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.05) inset",
        }}
      >
        {/* Wallet inner pocket gradient */}
        <div
          className="absolute top-0 left-0 right-0 h-[50%] rounded-t-2xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        />

        {/* Wallet flap (open, tilted back) */}
        <div
          className="absolute -top-[28%] inset-x-0 h-[36%] rounded-t-2xl origin-bottom"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.08) 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderBottom: "none",
            transform: "perspective(600px) rotateX(22deg)",
            boxShadow:
              "0 -4px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div className="absolute bottom-[40%] left-[10%] right-[10%] h-[1px] bg-white/[0.04] rounded-full" />
        </div>

        {/* Interior — subtle card slots */}
        <div className="absolute top-[25%] left-[8%] right-[8%] space-y-3">
          <div className="h-[1px] bg-white/[0.035] rounded-full" />
          <div className="h-[1px] bg-white/[0.025] rounded-full" />
          <div className="h-[1px] bg-white/[0.015] rounded-full" />
        </div>

        {/* Bottom branding bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-11 rounded-b-2xl flex items-center justify-between px-4"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 100%)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex items-center gap-2">
            <Image
              src="/image/logo1.png"
              alt="neetpay"
              width={20}
              height={20}
              className="shrink-0 opacity-70"
            />
            <span className="text-[12px] font-semibold tracking-tight">
              <span className="text-white/60">neet</span>
              <span className="text-[#FF6600]/70">pay</span>
            </span>
          </div>
          <span className="text-[9px] font-medium text-white/15 tracking-widest uppercase">
            wallet
          </span>
        </div>
      </div>

      {/* ── 3D animated coins overlay ── */}
      {mounted && (
        <div className="absolute inset-[-15%] z-10 pointer-events-none">
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
              <WalletCoinsScene progressRef={coinProgress} />
            </Suspense>
          </Canvas>
        </div>
      )}
    </div>
  );
}

/* ─── Main section ────────────────────────────────────── */

export function PrivacySection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;

      const els = sectionRef.current.querySelectorAll("[data-ps-animate]");
      els.forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            delay: i * 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          },
        );
      });
    },
    { scope: sectionRef, revertOnUpdate: true },
  );

  return (
    <section
      ref={sectionRef}
      className="relative pt-40 sm:pt-52 pb-24 sm:pb-32 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* ── Two-column layout ── */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left — Wallet with coins */}
          <div data-ps-animate className="relative w-full lg:w-1/2">
            <WalletVisual />
          </div>

          {/* Right — Text + features */}
          <div className="w-full lg:w-1/2 space-y-8">
            {/* Label */}
            <div data-ps-animate>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#ff6600]/20 bg-[#ff6600]/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ff6600]">
                <Shield size={10} />
                Privacy-First
              </span>
            </div>

            {/* Heading */}
            <h2
              data-ps-animate
              className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              Privacy isn&apos;t a feature.
              <br />
              <span className="text-[#FF6600]">It&apos;s the default.</span>
            </h2>

            {/* Subtitle */}
            <p
              data-ps-animate
              className="text-base text-white/50 leading-relaxed max-w-md"
            >
              We&apos;re one of the only payment gateways with native Monero
              support. No KYC, no tracking, no custodial risk — the way crypto
              was meant to work.
            </p>

            {/* Feature list */}
            <div className="space-y-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  data-ps-animate
                  className="flex items-start gap-4 group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] group-hover:border-white/20 group-hover:bg-white/[0.08] transition-colors">
                    <f.icon
                      size={16}
                      className="text-white/50 group-hover:text-white transition-colors"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{f.title}</p>
                    <p className="text-[12px] text-white/40 leading-relaxed mt-0.5">
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Preload the GLB
useGLTF.preload("/image/monero+coin+3d+model.glb");
