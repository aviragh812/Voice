import { SignIn, SignUp, SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import Home from "./pages/Home";

function AuthPage({ mode, hasClerkKey }: { mode: "sign-in" | "sign-up"; hasClerkKey: boolean }) {
  const isSignUp = mode === "sign-up";

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <div className="auth-brand">
          <div className="brand-mark auth-brand-mark"><span>BS</span></div>
          <div>
            <strong>BoltiStock</strong>
            <span>Speak. Stock. Sorted.</span>
          </div>
        </div>
        <div className="auth-copy">
          <p className="section-kicker">STORE INVENTORY</p>
          <h1>{isSignUp ? "Create your stock workspace." : "Welcome back to your shop."}</h1>
          <p>
            Secure access for owners and staff before they update products,
            transactions, and low-stock alerts.
          </p>
        </div>
        <div className="auth-stats">
          <div><strong>Live</strong><span>MongoDB sync</span></div>
          <div><strong>Voice</strong><span>Stock updates</span></div>
          <div><strong>Alerts</strong><span>Reorder tracking</span></div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-tabs">
          <a className={!isSignUp ? "active" : ""} href="#/sign-in">Login</a>
          <a className={isSignUp ? "active" : ""} href="#/sign-up">Signup</a>
        </div>

        {hasClerkKey ? (
          isSignUp ? (
            <SignUp
              routing="hash"
              signInUrl="#/sign-in"
              fallbackRedirectUrl="/"
              appearance={{ elements: { rootBox: "clerk-root", cardBox: "clerk-card" } }}
            />
          ) : (
            <SignIn
              routing="hash"
              signUpUrl="#/sign-up"
              fallbackRedirectUrl="/"
              appearance={{ elements: { rootBox: "clerk-root", cardBox: "clerk-card" } }}
            />
          )
        ) : (
          <div className="auth-missing-key">
            <strong>Clerk API key needed</strong>
            <p>Add your Clerk publishable key as <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>.env</code>, then restart the dev server.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function useAuthMode() {
  const getMode = () => window.location.hash.includes("sign-up") ? "sign-up" : "sign-in";
  const [mode, setMode] = useState<"sign-in" | "sign-up">(getMode);

  useEffect(() => {
    const handleHashChange = () => setMode(getMode());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return mode;
}

export default function App({ hasClerkKey }: { hasClerkKey: boolean }) {
  const mode = useAuthMode();

  if (!hasClerkKey) {
    return <AuthPage mode={mode} hasClerkKey={false} />;
  }

  return (
    <>
      <SignedOut>
        <AuthPage mode={mode} hasClerkKey />
      </SignedOut>
      <SignedIn>
        <SignedInHome />
      </SignedIn>
    </>
  );
}

function SignedInHome() {
  const { user } = useUser();
  return <Home key={user?.id || "signed-in"} />;
}
