import { type FormEvent, useEffect, useState } from "react";
import { Apple, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Zap } from "lucide-react";
import { defaultRouteForUser, type StoredAuthUser } from "../core/auth";

const loginSportsImage = "/images/login-sports-montage.webp";
const sportsEdgeMarketsLogo = "/images/sportsedge-markets-logo.png";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authUser, setAuthUser] = useState<StoredAuthUser | null>(null);

  useEffect(() => {
    const hash = window.location.hash || "";
    const queryIndex = hash.indexOf("?");
    if (queryIndex === -1) return;

    const params = new URLSearchParams(hash.slice(queryIndex + 1));
    const oauthError = params.get("oauth_error");
    const token = params.get("auth_token");
    const encodedUser = params.get("auth_user");

    if (oauthError) {
      setAuthError(oauthError);
      window.history.replaceState(null, "", "#login");
      return;
    }

    if (!token || !encodedUser) return;

    try {
      const base64 = encodedUser.replace(/-/g, "+").replace(/_/g, "/");
      const user = JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="))) as StoredAuthUser;
      window.localStorage.setItem("sportsedge.auth.token", token);
      window.localStorage.setItem("sportsedge.auth.user", JSON.stringify(user));
      setAuthUser(user);
      setAuthError("");
      window.location.hash = defaultRouteForUser(user);
    } catch {
      setAuthError("OAuth sign in completed, but the session could not be read.");
      window.history.replaceState(null, "", "#login");
    }
  }, []);

  function startOAuth(provider: "apple" | "google") {
    setAuthError("");
    window.location.href = `/auth/oauth/${provider}/start`;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthUser(null);
    setIsSigningIn(true);

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(payload.detail || "Sign in failed");

      window.localStorage.setItem("sportsedge.auth.token", payload.token);
      window.localStorage.setItem("sportsedge.auth.user", JSON.stringify(payload.user));
      setAuthUser(payload.user);
      setPassword("");
      window.location.hash = defaultRouteForUser(payload.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-visual" aria-label="SportsEdge sports trading visual">
        <img className="login-visual-image" src={loginSportsImage} alt="Multiple sports in a live trading market environment" />
        <div className="visual-overlay" />
        <a className="visual-brand" href="https://sportsedge.markets/" aria-label="SportsEdge Markets home">
          <img className="brand-logo" src={sportsEdgeMarketsLogo} alt="SportsEdge Markets logo" />
        </a>
        <div className="visual-market-card">
          <div><span>Data policy</span><strong>Source only</strong></div>
          <div><span>Prices</span><strong>Exchange feed</strong></div>
          <div><span>Status</span><strong>Login required</strong></div>
        </div>
      </section>

      <section className="login-panel" aria-label="Login form">
        <div className="login-card">
          <div className="login-kicker">Sports trading terminal</div>
          <div className="login-card-head">
            <div className="mini-mark"><ShieldCheck size={19} /></div>
            <div>
              <h1>Terminal Login</h1>
              <p>Access live markets, orders, signals, and risk.</p>
            </div>
          </div>

          <div className="social-row">
            <button className="social-button" type="button" onClick={() => startOAuth("apple")}><Apple size={18} />Apple</button>
            <button className="social-button" type="button" onClick={() => startOAuth("google")}><span className="google-mark">G</span>Google</button>
          </div>

          <div className="divider"><span>or use email</span></div>

          <form className="login-form" onSubmit={handleLogin}>
            <label className="auth-field">
              <span>Email address</span>
              <div>
                <Mail size={17} />
                <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
            </label>

            <label className="auth-field">
              <span>Password</span>
              <div>
                <Lock size={17} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button aria-label={showPassword ? "Hide password" : "Show password"} type="button" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <div className="login-options">
              <label><input type="checkbox" defaultChecked /><span>Remember device</span></label>
              <button type="button">Reset password</button>
            </div>

            {authError ? <p className="auth-message error">{authError}</p> : null}
            {authUser ? (
              <p className="auth-message success">
                Signed in as {authUser.email} · {(authUser.roles || []).join(", ") || "user"} · {authUser.subscription?.plan_name || authUser.subscription?.level || "active"}
              </p>
            ) : null}

            <button className="login-submit" type="submit" disabled={isSigningIn}>
              <Zap size={17} />
              {isSigningIn ? "Signing In" : "Sign In"}
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="secure-note">
            <span>2FA required</span>
            <span>Encrypted session</span>
            <span>Risk lock active</span>
          </div>
        </div>
      </section>
    </main>
  );
}
