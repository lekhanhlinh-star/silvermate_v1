import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2 } from "lucide-react";
import { auth, users, setToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await auth.login(email, password);
      setToken(res.access_token);
      // Fetch real user data from /users/me
      const user = await users.me();
      login(res.access_token, {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_type: user.user_type,
      });
      navigate(user.user_type === "CHILD" ? "/family" : "/dashboard");
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await auth.googleAuthorize();
      window.location.href = res.authorization_url;
    } catch (err: any) {
      toast({
        title: "Google Sign-In failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Heart className="h-8 w-8 text-accent fill-accent" />
          <span className="font-display text-2xl font-bold text-foreground">SilverMate</span>
        </Link>

        <Card className="shadow-warm border-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-display text-2xl">Welcome Back</CardTitle>
            <CardDescription className="text-base font-body">Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-body">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-base font-body">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline font-body">Forgot password?</Link>
                </div>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 text-base" />
              </div>
              <Button type="submit" className="w-full h-12 text-base bg-accent hover:bg-accent/90 text-accent-foreground font-body" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Log In"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>

            <Button variant="outline" className="w-full h-12 text-base font-body" onClick={handleGoogleLogin}>
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign in with Google
            </Button>

            <p className="text-center mt-6 text-base text-muted-foreground font-body">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary font-semibold hover:underline">Sign Up</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
