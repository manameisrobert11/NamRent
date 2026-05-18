import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase.js";
import { USER_ROLES } from "../authRoles.js";

function GoogleSignIn({ selectedRole = USER_ROLES.TENANT, onSuccess }) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const userRef = doc(db, "users", firebaseUser.uid);
      const existingUser = await getDoc(userRef);

      let userData;

      if (existingUser.exists()) {
        userData = existingUser.data();

        await setDoc(
          userRef,
          {
            lastLoginAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        userData = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || "NamRent User",
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL || "",
          role: selectedRole,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          status: "active",
        };

        await setDoc(userRef, userData);
      }

      onSuccess({
        uid: firebaseUser.uid,
        name: userData.name || firebaseUser.displayName,
        email: userData.email || firebaseUser.email,
        photoURL: userData.photoURL || firebaseUser.photoURL,
        role: userData.role || USER_ROLES.TENANT,
        provider: "Google",
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
