"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Shield, ShieldCheck, ShieldOff,
  Copy, Check, X,
  Smartphone, KeyRound, Lock, Trash2,
  Eye, EyeOff,
  Monitor, Globe, Clock,
  ArrowUpRight, Settings, LogIn, Key, UserPlus, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Fake QR ────────────────────────────────────────────────────────────────

function FakeQR({ size = 160 }: { size?: number }) {
  const cells = 21;
  const cell = size / cells;
  const filled: boolean[][] = [];
  let s = 0xDEAD;
  for (let r = 0; r < cells; r++) {
    filled[r] = [];
    for (let c = 0; c < cells; c++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      filled[r][c] = s % 3 !== 0;
    }
  }
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const border = r === 0 || r === 6 || c === 0 || c === 6;
      const inner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      filled[r][c] = border || inner;
      filled[r][cells - 1 - c] = border || inner;
      filled[cells - 1 - r][c] = border || inner;
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg">
      <rect width={size} height={size} fill="white" />
      {filled.map((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#111" /> : null,
        ),
      )}
    </svg>
  );
}

// ─── Modal shell ────────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Fake data ──────────────────────────────────────────────────────────────

const fakeSessions = [
  { id: "s1", device: "Chrome · Windows", ip: "192.168.1.42", location: "Paris, FR", lastActive: "Active now", current: true },
  { id: "s2", device: "Safari · macOS", ip: "86.234.12.98", location: "Lyon, FR", lastActive: "2h ago", current: false },
  { id: "s3", device: "Mobile · iOS", ip: "176.134.52.11", location: "Marseille, FR", lastActive: "1d ago", current: false },
];

const fakeActivityLog = [
  { id: "a1", action: "Login", detail: "Logged in from Chrome · Windows", ip: "192.168.1.42", user: "admin@neetpay.io", icon: LogIn, time: new Date(Date.now() - 5 * 60_000) },
  { id: "a2", action: "2FA Enabled", detail: "Two-factor authentication was enabled", ip: "192.168.1.42", user: "admin@neetpay.io", icon: Shield, time: new Date(Date.now() - 2 * 3600_000) },
  { id: "a3", action: "API Key Created", detail: 'New API key "Production" was generated', ip: "192.168.1.42", user: "admin@neetpay.io", icon: Key, time: new Date(Date.now() - 5 * 3600_000) },
  { id: "a4", action: "Settings Updated", detail: "Webhook URL was updated", ip: "192.168.1.42", user: "admin@neetpay.io", icon: Settings, time: new Date(Date.now() - 8 * 3600_000) },
  { id: "a5", action: "Withdrawal", detail: "0.05 BTC sent to bc1q...wlh", ip: "86.234.12.98", user: "admin@neetpay.io", icon: ArrowUpRight, time: new Date(Date.now() - 12 * 3600_000) },
  { id: "a6", action: "Team Member Invited", detail: "dev@neetpay.io was invited as Viewer", ip: "192.168.1.42", user: "admin@neetpay.io", icon: UserPlus, time: new Date(Date.now() - 24 * 3600_000) },
  { id: "a7", action: "Payment Created", detail: "Payment #138029241 created — 0.00045 BTC", ip: "192.168.1.42", user: "admin@neetpay.io", icon: CreditCard, time: new Date(Date.now() - 36 * 3600_000) },
  { id: "a8", action: "Login", detail: "Logged in from Safari · macOS", ip: "86.234.12.98", user: "dev@neetpay.io", icon: LogIn, time: new Date(Date.now() - 48 * 3600_000) },
];

function formatTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface Props {
  userName: string;
  userEmail: string;
}

export function SecurityContent({ userName, userEmail }: Props) {
  const pageRef = useRef<HTMLDivElement>(null);

  // State
  const [twoFaEnabled, setTwoFaEnabled] = useState(true);
  const [withdrawalPwEnabled, setWithdrawalPwEnabled] = useState(false);
  const [sessions, setSessions] = useState(fakeSessions);

  // Modals
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [show2faDisable, setShow2faDisable] = useState(false);
  const [showWithdrawalPw, setShowWithdrawalPw] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // Form state
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [code2fa, setCode2fa] = useState("");
  const [withdrawalPw, setWithdrawalPwVal] = useState({ password: "", confirm: "" });
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [copied, setCopied] = useState(false);

  const fakeSecret = "JBSWY3DPEHPK3PXP";
  const fakeBackupCodes = ["a8f2-k9d3", "m4p7-x2b1", "c6n8-w3j5", "t1v9-r7q4", "e5h3-y8l6"];

  useGSAP(() => {
    if (!pageRef.current) return;
    const sections = pageRef.current.querySelectorAll("[data-section]");
    gsap.fromTo(sections, { opacity: 0, y: 12 }, {
      opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: "power2.out",
      onComplete() { gsap.set(sections, { clearProps: "transform,opacity" }); },
    });
  }, { scope: pageRef });

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function revokeSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <>
      <div ref={pageRef} className="space-y-5">

        {/* ── Password ───────────────────────────────────────── */}
        <div data-section className="rounded-xl border border-border bg-background">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
                <KeyRound className="h-4 w-4 text-foreground-secondary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Password</p>
                <p className="font-mono text-xs text-muted tracking-wider">••••••••••••••••</p>
              </div>
            </div>
            <button
              onClick={() => setShowChangePassword(true)}
              className="rounded-lg border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface/80"
            >
              Change Password
            </button>
          </div>
        </div>

        {/* ── Two-Factor Authentication ──────────────────────── */}
        <div data-section className="rounded-xl border border-border bg-background overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{
              background: twoFaEnabled
                ? "linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.02) 100%)"
                : "linear-gradient(135deg, rgba(234,179,8,0.06) 0%, rgba(234,179,8,0.02) 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                twoFaEnabled ? "bg-success/10" : "bg-warning/10",
              )}>
                {twoFaEnabled
                  ? <ShieldCheck className="h-4.5 w-4.5 text-success" />
                  : <ShieldOff className="h-4.5 w-4.5 text-warning" />
                }
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Two-Factor Authentication
                </p>
                <p className="text-[11px] text-muted">
                  {twoFaEnabled
                    ? "Your account is protected with an authenticator app"
                    : "Add an extra layer of security — requires a 6-digit code to log in"
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => twoFaEnabled ? setShow2faDisable(true) : setShow2faSetup(true)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                twoFaEnabled
                  ? "bg-error/10 text-error hover:bg-error/20"
                  : "bg-primary text-white hover:bg-primary/90",
              )}
            >
              {twoFaEnabled ? "Disable 2FA" : "Enable 2FA"}
            </button>
          </div>

          {/* Backup codes when enabled */}
          {twoFaEnabled && (
            <div className="border-t border-border/50 px-5 py-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted mb-2">Backup Codes</p>
              <div className="flex flex-wrap gap-2">
                {fakeBackupCodes.map((c) => (
                  <span key={c} className="rounded-md bg-surface px-2.5 py-1 font-mono text-[11px] text-foreground-secondary">{c}</span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted">Store these codes safely. Each can only be used once.</p>
            </div>
          )}
        </div>

        {/* ── Withdrawal Password ────────────────────────────── */}
        <div data-section className="rounded-xl border border-border bg-background overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{
              background: withdrawalPwEnabled
                ? "linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.02) 100%)"
                : "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(99,102,241,0.02) 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                withdrawalPwEnabled ? "bg-success/10" : "bg-primary/10",
              )}>
                <Lock className={cn("h-4 w-4", withdrawalPwEnabled ? "text-success" : "text-primary")} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Withdrawal Password</p>
                <p className="text-[11px] text-muted max-w-md">
                  {withdrawalPwEnabled
                    ? "Withdrawals are protected — enter your withdrawal password instead of email/2FA verification"
                    : "Set a dedicated password for faster, more secure withdrawals"
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowWithdrawalPw(true)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors shrink-0",
                withdrawalPwEnabled
                  ? "bg-surface border border-border text-foreground hover:bg-surface/80"
                  : "bg-primary text-white hover:bg-primary/90",
              )}
            >
              {withdrawalPwEnabled ? "Change" : "Enable"}
            </button>
          </div>
        </div>

        {/* ── Active Sessions ────────────────────────────────── */}
        <div data-section className="rounded-xl border border-border bg-background">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface">
              <Monitor className="h-4 w-4 text-foreground-secondary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Active Sessions</h2>
              <p className="text-[11px] text-muted">Devices currently logged into your account</p>
            </div>
          </div>
          <div className="divide-y divide-border/50">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3.5 px-5 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface">
                  <Monitor className="h-3.5 w-3.5 text-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{s.device}</p>
                    {s.current && (
                      <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-success">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-[10px] text-muted">
                      <Globe className="h-2.5 w-2.5" />{s.ip}
                    </span>
                    <span className="text-[10px] text-muted">·</span>
                    <span className="text-[10px] text-muted">{s.location}</span>
                    <span className="text-[10px] text-muted">·</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted">
                      <Clock className="h-2.5 w-2.5" />{s.lastActive}
                    </span>
                  </div>
                </div>
                {!s.current && (
                  <button
                    onClick={() => revokeSession(s.id)}
                    className="rounded-lg px-2.5 py-1 text-[10px] font-semibold text-error bg-error/10 hover:bg-error/20 transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Activity Log ───────────────────────────────────── */}
        <div data-section className="rounded-xl border border-border bg-background">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface">
              <Clock className="h-4 w-4 text-foreground-secondary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Activity Log</h2>
              <p className="text-[11px] text-muted">Recent actions performed on this account</p>
            </div>
          </div>

          {/* Table header */}
          <div className="hidden sm:flex items-center border-b border-border/50 px-5 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted">
            <span className="w-8" />
            <span className="flex-1">Action</span>
            <span className="w-[120px]">User</span>
            <span className="w-[100px]">IP Address</span>
            <span className="w-[120px] text-right">Time</span>
          </div>

          <div className="divide-y divide-border/50">
            {fakeActivityLog.map((log) => (
              <div key={log.id} className="flex items-center px-5 py-3 transition-colors hover:bg-surface/40">
                {/* Icon */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface mr-3">
                  <log.icon className="h-3.5 w-3.5 text-muted" />
                </div>

                {/* Action + detail */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground leading-none">{log.action}</p>
                  <p className="mt-1 text-[10px] text-muted leading-none truncate">{log.detail}</p>
                </div>

                {/* User */}
                <span className="hidden sm:block w-[120px] shrink-0 truncate text-[11px] text-muted font-mono">{log.user}</span>

                {/* IP */}
                <span className="hidden sm:block w-[100px] shrink-0 text-[11px] text-muted font-mono">{log.ip}</span>

                {/* Time */}
                <span className="w-[120px] shrink-0 text-right text-[11px] text-muted tabular-nums">{formatTime(log.time)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Delete Account ─────────────────────────────────── */}
        <div data-section className="rounded-xl border border-error/20 bg-background overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(239,68,68,0.02) 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-error/10">
                <Trash2 className="h-4 w-4 text-error" />
              </div>
              <div>
                <p className="text-sm font-semibold text-error">Delete Account</p>
                <p className="text-[11px] text-muted">
                  Permanently remove your account and all associated data. This action is irreversible.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="rounded-lg bg-error px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-error/90 shrink-0"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ MODALS ═══════════════════════ */}

      {/* Change Password Modal */}
      {showChangePassword && (
        <Modal onClose={() => { setShowChangePassword(false); setPasswords({ current: "", new: "", confirm: "" }); }}>
          <ModalHeader title="Change Password" onClose={() => { setShowChangePassword(false); setPasswords({ current: "", new: "", confirm: "" }); }} />
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted">Current Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPw ? "text" : "password"}
                  value={passwords.current}
                  onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 pr-9 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-primary transition-colors"
                  placeholder="Enter current password"
                />
                <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted">New Password</label>
              <input
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-primary transition-colors"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted">Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-primary transition-colors"
                placeholder="Confirm new password"
              />
            </div>
            <button
              disabled={!passwords.current || !passwords.new || passwords.new !== passwords.confirm}
              onClick={() => { setShowChangePassword(false); setPasswords({ current: "", new: "", confirm: "" }); }}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Update Password
            </button>
          </div>
        </Modal>
      )}

      {/* 2FA Setup Modal */}
      {show2faSetup && (
        <Modal onClose={() => { setShow2faSetup(false); setCode2fa(""); }}>
          <ModalHeader title="Enable 2FA" onClose={() => { setShow2faSetup(false); setCode2fa(""); }} />
          <div className="p-5 space-y-5">
            <div className="flex flex-col items-center gap-3">
              <p className="text-[11px] text-muted text-center">Scan this QR code with your authenticator app</p>
              <div className="rounded-xl bg-white p-3">
                <FakeQR size={160} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted mb-1.5">Or enter this key manually</p>
              <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
                <span className="flex-1 font-mono text-xs text-foreground-secondary tracking-wider">{fakeSecret}</span>
                <button onClick={() => copyText(fakeSecret)} className="shrink-0 text-muted hover:text-foreground transition-colors">
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted mb-1.5">Verification Code</p>
              <input
                type="text"
                value={code2fa}
                onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-foreground placeholder:text-muted/40 outline-none focus:border-primary transition-colors"
              />
            </div>
            <button
              onClick={() => { setTwoFaEnabled(true); setShow2faSetup(false); setCode2fa(""); }}
              disabled={code2fa.length !== 6}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Verify & Enable
            </button>
          </div>
        </Modal>
      )}

      {/* 2FA Disable Modal */}
      {show2faDisable && (
        <Modal onClose={() => { setShow2faDisable(false); setCode2fa(""); }}>
          <ModalHeader title="Disable 2FA" onClose={() => { setShow2faDisable(false); setCode2fa(""); }} />
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-error/5 border border-error/10 px-4 py-3">
              <p className="text-xs text-error/90 leading-relaxed">
                Disabling 2FA will make your account less secure. You will no longer need a verification code to log in.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted mb-1.5">Enter your 2FA code to confirm</p>
              <input
                type="text"
                value={code2fa}
                onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-foreground placeholder:text-muted/40 outline-none focus:border-error transition-colors"
              />
            </div>
            <button
              onClick={() => { setTwoFaEnabled(false); setShow2faDisable(false); setCode2fa(""); }}
              disabled={code2fa.length !== 6}
              className="w-full rounded-lg bg-error py-2.5 text-sm font-semibold text-white transition-colors hover:bg-error/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Disable 2FA
            </button>
          </div>
        </Modal>
      )}

      {/* Withdrawal Password Modal */}
      {showWithdrawalPw && (
        <Modal onClose={() => { setShowWithdrawalPw(false); setWithdrawalPwVal({ password: "", confirm: "" }); }}>
          <ModalHeader title={withdrawalPwEnabled ? "Change Withdrawal Password" : "Set Withdrawal Password"} onClose={() => { setShowWithdrawalPw(false); setWithdrawalPwVal({ password: "", confirm: "" }); }} />
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
              <p className="text-xs text-foreground-secondary leading-relaxed">
                With a withdrawal password, you can confirm withdrawals quickly without needing email or 2FA verification each time.
              </p>
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted">Withdrawal Password</label>
              <input
                type="password"
                value={withdrawalPw.password}
                onChange={(e) => setWithdrawalPwVal((p) => ({ ...p, password: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-primary transition-colors"
                placeholder="Enter withdrawal password"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted">Confirm Password</label>
              <input
                type="password"
                value={withdrawalPw.confirm}
                onChange={(e) => setWithdrawalPwVal((p) => ({ ...p, confirm: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-primary transition-colors"
                placeholder="Confirm withdrawal password"
              />
            </div>
            <button
              disabled={!withdrawalPw.password || withdrawalPw.password !== withdrawalPw.confirm}
              onClick={() => { setWithdrawalPwEnabled(true); setShowWithdrawalPw(false); setWithdrawalPwVal({ password: "", confirm: "" }); }}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {withdrawalPwEnabled ? "Update Withdrawal Password" : "Enable Withdrawal Password"}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccount && (
        <Modal onClose={() => { setShowDeleteAccount(false); setDeleteConfirm(""); }}>
          <ModalHeader title="Delete Account" onClose={() => { setShowDeleteAccount(false); setDeleteConfirm(""); }} />
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-error/5 border border-error/10 px-4 py-3">
              <p className="text-xs text-error/90 leading-relaxed">
                This will permanently delete your account, all payment data, API keys, and wallet configuration.
                This action <strong>cannot be undone</strong>.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted mb-1.5">
                Type <span className="text-error font-bold">DELETE</span> to confirm
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-lg border border-error/30 bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/40 outline-none focus:border-error transition-colors"
              />
            </div>
            <button
              disabled={deleteConfirm !== "DELETE"}
              className="w-full rounded-lg bg-error py-2.5 text-sm font-semibold text-white transition-colors hover:bg-error/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Permanently Delete Account
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
