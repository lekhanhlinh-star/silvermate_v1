import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Heart } from "lucide-react";
import { auth, users, setToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    console.log("OAuth callback params:", { code: code?.substring(0, 20) + "...", state, errorParam });

    if (errorParam) {
      setError("Google sign-in was cancelled or failed.");
      return;
    }

    if (!code) {
      setError("No authorization code received from Google.");
      return;
    }

    (async () => {
      try {
        console.log("Calling googleCallback with:", { 
          code: code.substring(0, 20) + "...", 
          state: state?.substring(0, 50) + "..." 
        });
        const res = await auth.googleCallback(code, state || undefined);
        if (res.access_token) {
          setToken(res.access_token);
          let user = await users.me();

          const pendingType = localStorage.getItem("pending_google_user_type");
          if (pendingType && (pendingType === "PARENT" || pendingType === "CHILD")) {
            try {
              user = await users.updateMe({ user_type: pendingType });
            } catch (updateErr) {
              console.error("Failed to update user type during Google signup", updateErr);
            }
            localStorage.removeItem("pending_google_user_type");
          }

          login(res.access_token, {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            user_type: user.user_type,
          });
          navigate(user.user_type === "CHILD" ? "/family" : "/dashboard", { replace: true });
        }
      } catch (err: any) {
        setError(err.message || "Failed to complete Google sign-in.");
        toast({ title: "Google Sign-In failed", description: err.message, variant: "destructive" });
      }
    })();
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <Heart className="h-12 w-12 text-accent fill-accent mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Sign-in Failed</h2>
          <p className="text-muted-foreground font-body mb-6">{error}</p>
          <a href="/login" className="text-primary font-semibold hover:underline font-body">Back to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground font-body text-lg">Completing sign-in...</p>
      </div>
    </div>
  );
}
