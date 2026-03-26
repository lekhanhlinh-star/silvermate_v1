import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2, User, Users } from "lucide-react";
import { auth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"PARENT" | "CHILD" | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userType) {
      toast({ title: "Please select your role", description: "Are you a Parent or a Child?", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await auth.register({ email, password, full_name: fullName, user_type: userType });
      toast({ title: "Account created! 🎉", description: "You can now log in." });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!userType) {
      toast({ title: "Please select your role", description: "Before signing up with Google, select if you are a Parent or a Child.", variant: "destructive" });
      return;
    }
    localStorage.setItem("pending_google_user_type", userType);
    try {
      const res = await auth.googleAuthorize();
      window.location.href = res.authorization_url;
    } catch (err: any) {
      toast({ title: "Google Sign-In failed", description: err.message, variant: "destructive" });
    }
  };

  const handleLineSignup = async () => {
    if (!userType) {
      toast({ title: "Please select your role", description: "Before signing up with LINE, select if you are a Parent or a Child.", variant: "destructive" });
      return;
    }
    localStorage.setItem("pending_line_user_type", userType);
    try {
      const res = await auth.lineAuthorize();
      window.location.href = res.authorization_url;
    } catch (err: any) {
      toast({ title: "LINE Sign-In failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Heart className="h-8 w-8 text-accent fill-accent" />
          <span className="font-display text-2xl font-bold text-foreground">SilverMate</span>
        </Link>

        <Card className="shadow-warm border-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-display text-2xl">Join SilverMate</CardTitle>
            <CardDescription className="text-base font-body">Create your account to get started</CardDescription>
          </CardHeader>
          <CardContent>
            {/* User type selection */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setUserType("PARENT")}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${userType === "PARENT"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-muted-foreground/30"
                  }`}
              >
                <User className={`h-8 w-8 ${userType === "PARENT" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`font-body font-semibold text-base ${userType === "PARENT" ? "text-primary" : "text-foreground"}`}>
                  I'm a Parent
                </span>
                <span className="text-xs text-muted-foreground text-center">I want to chat with AI</span>
              </button>
              <button
                type="button"
                onClick={() => setUserType("CHILD")}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${userType === "CHILD"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-muted-foreground/30"
                  }`}
              >
                <Users className={`h-8 w-8 ${userType === "CHILD" ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`font-body font-semibold text-base ${userType === "CHILD" ? "text-primary" : "text-foreground"}`}>
                  I'm a Child
                </span>
                <span className="text-xs text-muted-foreground text-center">I want to check on my parents</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-base font-body">Full Name</Label>
                <Input id="fullName" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-body">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-body">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 text-base" />
              </div>
              <Button type="submit" className="w-full h-12 text-base bg-accent hover:bg-accent/90 text-accent-foreground font-body" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>

            <div className="space-y-3">
              <Button variant="outline" className="w-full h-12 text-base font-body" onClick={handleGoogleSignup}>
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                Sign up with Google
              </Button>

              <Button className="w-full h-12 text-base font-body text-white hover:opacity-90" style={{ backgroundColor: "#06C755" }} onClick={handleLineSignup}>
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.21 3.74 7.74 8.79 8.4.34.07.81.22.93.51.1.26.07.67.03.93l-.15.9c-.05.27-.21 1.06.93.58s6.17-3.63 8.42-6.22C22.88 13.39 22 11.02 22 10.5 22 5.82 17.52 2 12 2zm-3.16 11.5H6.58a.52.52 0 01-.52-.52V8.52c0-.29.23-.52.52-.52s.52.23.52.52v3.94h1.74c.29 0 .52.23.52.52s-.23.52-.52.52zm1.68-.52a.52.52 0 01-1.04 0V8.52a.52.52 0 011.04 0v4.46zm4.25 0a.52.52 0 01-.34.49.52.52 0 01-.56-.11l-2.44-3.32v2.94a.52.52 0 01-1.04 0V8.52a.52.52 0 01.34-.49.52.52 0 01.56.11l2.44 3.32V8.52a.52.52 0 011.04 0v4.46zm2.63-2.2a.52.52 0 010 1.04h-1.74v1.16h1.74a.52.52 0 010 1.04h-2.26a.52.52 0 01-.52-.52V8.52c0-.29.23-.52.52-.52h2.26a.52.52 0 010 1.04h-1.74v1.22h1.74z" fill="white"/></svg>
                Sign up with LINE
              </Button>
            </div>

            <p className="text-center mt-6 text-base text-muted-foreground font-body">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">Log In</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
