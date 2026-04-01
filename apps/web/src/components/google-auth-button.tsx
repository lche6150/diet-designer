"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";

type CredentialResponse = {
  credential: string;
};

type GoogleButtonOptions = {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number;
};

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: CredentialResponse) => void;
      }) => void;
      renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

const googleScriptId = "google-identity-script";
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type GoogleAuthButtonProps = {
  context?: "signin" | "signup";
  redirectTo?: string;
};

const loadGoogleScript = () => {
  return new Promise<void>((resolve, reject) => {
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(googleScriptId);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error("Failed to load Google Identity")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = googleScriptId;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity"));
    document.head.appendChild(script);
  });
};

const getButtonText = (context: GoogleAuthButtonProps["context"]) => {
  if (context === "signup") {
    return "signup_with";
  }

  return "continue_with";
};

export default function GoogleAuthButton({
  context = "signin",
  redirectTo = "/",
}: GoogleAuthButtonProps) {
  const router = useRouter();
  const { signIn } = useAuth();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCredentialResponse = useCallback(
    async (response: CredentialResponse) => {
      try {
        setStatus("loading");
        setErrorMessage(null);

        const result = await fetch(`${apiBaseUrl}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: response.credential }),
        });

        if (!result.ok) {
          const payload = await result.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Google login failed");
        }

        const payload = await result.json();
        signIn(payload.accessToken, payload.user);
        router.push(redirectTo);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Google login failed";
        setStatus("error");
        setErrorMessage(message);
      }
    },
    [redirectTo, router, signIn]
  );

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setStatus("error");
      setErrorMessage("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");
      return;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        await loadGoogleScript();

        if (cancelled || !buttonRef.current) {
          return;
        }

        if (!window.google?.accounts?.id) {
          throw new Error("Google Identity SDK unavailable");
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: getButtonText(context),
          shape: "pill",
          width: 320,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Google login failed";
        setStatus("error");
        setErrorMessage(message);
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [context, handleCredentialResponse]);

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <div ref={buttonRef} className="flex justify-center" />
      {status === "loading" && (
        <p className="text-xs text-zinc-500">Signing you in...</p>
      )}
      {errorMessage ? (
        <p className="text-xs text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}
