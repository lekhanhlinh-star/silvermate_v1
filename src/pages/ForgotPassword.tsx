import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { auth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await auth.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
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
            <CardTitle className="font-display text-2xl">Forgot Password</CardTitle>
            <CardDescription className="text-base font-body">
              {sent ? "Check your email" : "Enter your email to reset your password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                <p className="text-foreground font-body text-lg mb-2">Email sent!</p>
                <p className="text-muted-foreground font-body">
                  If an account exists for <strong>{email}</strong>, you'll receive a password reset link.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-body">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 text-base"
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-base bg-accent hover:bg-accent/90 text-accent-foreground font-body" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Reset Link"}
                </Button>
              </form>
            )}
            <div className="mt-6 text-center">
              <Link to="/login" className="text-primary font-semibold hover:underline font-body inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
