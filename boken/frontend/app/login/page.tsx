"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Logo from "@/components/Logo";
import { Button, Field } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { saveSession, verifyToken } from "@/utils/userAuth";
import { api, ApiError } from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const { toast } = useFeedback();

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{ access: string; refresh: string; username: string }>("/login/", {
        method: "POST",
        body: loginData,
        auth: false,
      });
      saveSession(data.access, data.refresh, data.username);
      if (!(await verifyToken(data.access))) throw new Error("Invalid token after login");
      // Full reload so every part of the app picks up the new session
      window.location.assign("/discover");
    } catch (err) {
      console.error("Login error:", err);
      setError("That email and password do not match an account.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (registerData.username.trim().length < 3) return setError("Pick a username with at least 3 characters.");
    if (!registerData.email.includes("@")) return setError("That email address does not look right.");
    if (registerData.password.length < 8) return setError("Your password needs at least 8 characters.");
    if (registerData.password !== registerData.confirmPassword) return setError("The two passwords are different.");

    setLoading(true);
    try {
      await api("/api/user/", {
        method: "POST",
        auth: false,
        body: {
          username: registerData.username.trim(),
          email: registerData.email.trim(),
          password: registerData.password,
        },
      });
      toast("Account created, you can sign in now", "success");
      setLoginData({ email: registerData.email.trim(), password: "" });
      setRegisterData({ username: "", email: "", password: "", confirmPassword: "" });
      switchMode("login");
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err instanceof ApiError && err.message
          ? err.message
          : "We could not create the account. The username or email may already be taken."
      );
    } finally {
      setLoading(false);
    }
  };

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-ink"
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="-mb-28 grid min-h-dvh md:-mb-16 lg:grid-cols-[1.05fr_1fr]">
      <ScrollPanel />

      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Boken
          </Link>
          <Logo className="lg:hidden" />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <p className="eyebrow mb-3">{mode === "login" ? "Welcome back" : "New reader"}</p>
          <h1 className="display text-5xl">{mode === "login" ? "Sign in" : "Create account"}</h1>
          <p className="mt-3 text-[15px] text-muted">
            {mode === "login"
              ? "Your library is where you left it."
              : "Free, and it only takes a moment. Your chapters, notes and ratings stay with you."}
          </p>

          {error && (
            <p role="alert" className="mt-6 rounded-lg border border-seal/30 bg-seal/[0.07] px-3.5 py-2.5 text-sm text-seal">
              {error}
            </p>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <Field label="Email" htmlFor="login-email">
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="field"
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="Password" htmlFor="login-password">
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="field pr-11"
                  />
                  {passwordToggle}
                </div>
              </Field>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Signing in" : "Sign in"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="mt-8 space-y-5">
              <Field label="Username" htmlFor="reg-username" hint="Shown next to the series you add.">
                <input
                  id="reg-username"
                  autoComplete="username"
                  required
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  className="field"
                />
              </Field>
              <Field label="Email" htmlFor="reg-email">
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  className="field"
                  placeholder="you@example.com"
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Password" htmlFor="reg-password" hint="8 characters minimum">
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className="field pr-11"
                    />
                    {passwordToggle}
                  </div>
                </Field>
                <Field label="Confirm" htmlFor="reg-confirm">
                  <input
                    id="reg-confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    className="field"
                  />
                </Field>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Creating your account" : "Create account"}
              </Button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-muted">
            {mode === "login" ? "First time here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              className="font-semibold text-ink underline decoration-seal decoration-2 underline-offset-4"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// A vertical strip of panels, the way a webtoon episode reads
function ScrollPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#14213D] text-[#F3EFE6] lg:block">
      <div className="absolute inset-0 grid grid-cols-[1fr_1.3fr] gap-3 p-3 opacity-95">
        <div className="flex flex-col gap-3 pt-24">
          <Panel className="h-56" tone="dots" />
          <Panel className="h-80" tone="lines" accent />
          <Panel className="h-64" tone="dots" />
        </div>
        <div className="flex flex-col gap-3">
          <Panel className="h-72" tone="lines" />
          <Panel className="h-48" tone="sun" />
          <Panel className="h-96" tone="dots" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#14213D] via-[#14213D]/90 to-transparent" />
      <div className="relative flex h-full flex-col justify-end p-12">
        <span className="relative block h-16 w-28 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/Boken_title.png"
            alt=""
            className="absolute -left-[16px] -top-[9px] w-[140px] max-w-none invert mix-blend-screen"
          />
        </span>
        <p className="display mt-6 max-w-md text-6xl xl:text-7xl">Read on. We keep count.</p>
        <p className="mt-5 max-w-sm text-[15px] text-[#F3EFE6]/70">
          A reading log for manhwa and manhua. Chapters read, chapters out, and what you thought of them.
        </p>
      </div>
    </aside>
  );
}

function Panel({ className, tone, accent }: { className: string; tone: "dots" | "lines" | "sun"; accent?: boolean }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md border border-[#F3EFE6]/15 ${
        accent ? "bg-[#C8412B]" : "bg-[#1B3A70]"
      } ${className}`}
    >
      {tone === "dots" && <div className="halftone absolute inset-0 text-[#F3EFE6]/25" />}
      {tone === "lines" && (
        <div
          className="absolute inset-0 text-[#F3EFE6]/25"
          style={{
            backgroundImage:
              "repeating-conic-gradient(from 0deg at 60% 40%, currentColor 0deg 1deg, transparent 1deg 6deg)",
          }}
        />
      )}
      {tone === "sun" && <div className="absolute -right-10 top-6 h-40 w-40 rounded-full bg-[#D9A23A]/80" />}
    </div>
  );
}
