"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  Check,
  Send,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import BrandLogo from "./brand-logo";
import RenderBoundary from "./render-boundary";
const HomeScene = dynamic(() => import("./home-scene"), {
  ssr: false,
  loading: () => (
    <div className="auth-scene-placeholder">
      A little imagination. A space of your own.
    </div>
  ),
});
export default function AuthPage({
  mode,
  destination,
}: {
  mode: "login" | "signup";
  destination: string;
}) {
  const signup = mode === "signup",
    router = useRouter();
  const emailInput = useRef<HTMLInputElement>(null),
    pending = useRef(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const alternate =
    (signup ? "/login" : "/signup") +
    "?next=" +
    encodeURIComponent(destination);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current || !supabase) return;
    setError("");
    setMessage("");
    if (signup && password !== confirmation) {
      setError("Your passwords do not match.");
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(destination);
          router.refresh();
        } else {
          setConfirmed(true);
          setPassword("");
          setConfirmation("");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.replace(destination);
        router.refresh();
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : ((e as { message?: string }).message ??
              "We couldn't connect. Please try again."),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function resetPassword() {
    if (pending.current || !supabase || !emailInput.current?.reportValidity())
      return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: window.location.origin + "/reset-password" },
      );
      if (error) throw error;
      setMessage(
        "If an account matches this email, you'll receive a password reset link shortly.",
      );
    } catch (e) {
      setError(
        (e as { message?: string }).message ??
          "Unable to send the reset email. Please try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-art" aria-label="SpaceSketch design studio">
        <Link href="/" className="auth-brand" aria-label="SpaceSketch home">
          <BrandLogo />
          <span>STUDIO</span>
        </Link>
        <div className="auth-art-note">
          <span />
          YOUR WORLD, BY DESIGN
        </div>
        <div className="auth-house">
          <RenderBoundary
            fallback={
              <div className="auth-scene-placeholder">
                Your next space starts here.
              </div>
            }
          >
            <HomeScene />
          </RenderBoundary>
        </div>
        <div className="auth-art-copy">
          <span>A SPACE TO CALL YOUR OWN</span>
          <h2>
            Great spaces
            <br />
            start with <em>you.</em>
          </h2>
          <p>
            Dream it. Sketch it. Step inside.
            <br />
            Bring your ideas home with SpaceSketch.
          </p>
        </div>
        <div className="auth-art-footer">
          <span>IMAGINE. ARRANGE. MAKE IT YOURS.</span>
          <span>2D + 3D DESIGN STUDIO</span>
        </div>
      </section>
      <section className="auth-content" aria-labelledby="auth-title">
        <Link href="/" className="auth-back">
          <ArrowLeft size={15} />
          Back to home
        </Link>
        <div className="auth-form-wrap">
          <span className="auth-kicker">
            <span />
            YOUR PERSONAL DESIGN STUDIO
          </span>
          {confirmed ? (
            <div className="auth-confirmation" role="status">
              <div className="auth-confirm-icon">
                <Send size={27} />
              </div>
              <h1 id="auth-title">Check your inbox.</h1>
              <p>
                Check your email at <strong>{email}</strong>. Confirm your email
                to start saving your spaces in the cloud.
              </p>
              <Link className="auth-submit" href={alternate}>
                Back to log in
                <ArrowUpRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              <h1 id="auth-title">
                {signup ? "Make yourself at home." : "Welcome back."}
              </h1>
              <p className="auth-intro">
                {signup
                  ? "Create your account. Your next great space starts here."
                  : "Your ideas are waiting. Let's pick up where you left off."}
              </p>
              <div className="auth-switch">
                <Link
                  aria-current={!signup ? "page" : undefined}
                  href={
                    signup
                      ? alternate
                      : "/login?next=" + encodeURIComponent(destination)
                  }
                >
                  Log in
                </Link>
                <Link
                  aria-current={signup ? "page" : undefined}
                  href={
                    !signup
                      ? alternate
                      : "/signup?next=" + encodeURIComponent(destination)
                  }
                >
                  Sign up
                </Link>
              </div>
              {!supabase && (
                <p className="auth-message" role="status">
                  Accounts are not available right now. You can still design
                  locally.
                </p>
              )}
              <form onSubmit={submit} aria-busy={busy}>
                <label htmlFor="auth-email">Email address</label>
                <div className="auth-input">
                  <Mail size={17} />
                  <input
                    id="auth-email"
                    ref={emailInput}
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    placeholder="you@example.com"
                    value={email}
                    disabled={busy}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="auth-label-row">
                  <label htmlFor="auth-password">Password</label>
                  {!signup && (
                    <button
                      type="button"
                      disabled={busy || !supabase}
                      onClick={resetPassword}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="auth-input">
                  <LockKeyhole size={17} />
                  <input
                    id="auth-password"
                    type={show ? "text" : "password"}
                    autoComplete={signup ? "new-password" : "current-password"}
                    required
                    minLength={signup ? 8 : undefined}
                    placeholder={
                      signup ? "At least 8 characters" : "Enter your password"
                    }
                    value={password}
                    disabled={busy}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={show ? "Hide password" : "Show password"}
                    aria-pressed={show}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {signup && (
                  <>
                    <p className="auth-password-hint">
                      Use at least 8 characters.
                    </p>
                    <label htmlFor="auth-confirm">Confirm password</label>
                    <div className="auth-input">
                      <LockKeyhole size={17} />
                      <input
                        id="auth-confirm"
                        type={show ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        placeholder="Enter your password again"
                        value={confirmation}
                        disabled={busy}
                        onChange={(e) => setConfirmation(e.target.value)}
                      />
                    </div>
                  </>
                )}
                {error && (
                  <p className="auth-error" role="alert">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="auth-message" role="status">
                    {message}
                  </p>
                )}
                <button
                  className="auth-submit"
                  type="submit"
                  disabled={busy || !supabase}
                >
                  {busy
                    ? "Please wait..."
                    : signup
                      ? "Create account"
                      : "Log in to your studio"}
                  <ArrowUpRight size={18} />
                </button>
              </form>
              <p className="auth-alternate">
                {signup ? "Already have an account?" : "New to SpaceSketch?"}{" "}
                <Link href={alternate}>
                  {signup ? "Log in" : "Create an account"}
                  <ArrowUpRight size={12} />
                </Link>
              </p>
              <div className="auth-divider">
                <span />
                or keep exploring
                <span />
              </div>
              <Link className="auth-guest" href="/dashboard">
                Continue without an account
                <ArrowUpRight size={15} />
              </Link>
              <p className="auth-local-note">
                <Check size={13} />
                You can design locally without signing up.
              </p>
            </>
          )}
        </div>
        <p className="auth-footer">
          A little imagination. A space of your own.
        </p>
      </section>
    </main>
  );
}
