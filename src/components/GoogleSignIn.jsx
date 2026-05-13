import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase.js";

function GoogleSignIn({ role, fallbackUser, onSuccess }) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = result.user;
      onSuccess({
        role,
        name: profile.displayName || fallbackUser.name,
        email: profile.email || fallbackUser.email,
        provider: "Google",
        photoURL: profile.photoURL,
      });
    } catch (authError) {
      setError(authError.message || "Google sign-in could not be completed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="social-login-stack">
      <button className="social-login-button google" type="button" onClick={handleGoogleSignIn} disabled={isLoading}>
        <span aria-hidden="true">G</span>
        {isLoading ? "Connecting..." : "Continue with Google"}
      </button>
      {error && <p className="social-login-error">{error}</p>}
    </div>
  );
}

export default GoogleSignIn;
