import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Save, CheckCircle2 } from "lucide-react";
import { users } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Profile() {
  const { user, login, token } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<"PARENT" | "CHILD">(user?.user_type || "CHILD");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updateData: Record<string, string> = {};
      if (fullName !== user?.full_name) updateData.full_name = fullName;
      if (email !== user?.email) updateData.email = email;
      if (password) updateData.password = password;
      if (userType !== user?.user_type) updateData.user_type = userType;

      if (Object.keys(updateData).length === 0) {
        toast({ title: "No changes", description: "Nothing to update." });
        setLoading(false);
        return;
      }

      const updated = await users.updateMe(updateData);
      if (token) {
        login(token, {
          id: updated.id,
          email: updated.email,
          full_name: updated.full_name,
          user_type: updated.user_type,
        });
      }
      setPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({ title: "Profile updated! ✨" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-display text-3xl font-bold text-foreground mb-2 text-center">Your Profile</h1>
      <p className="text-center text-muted-foreground font-body mb-8">Manage your account settings</p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border shadow-warm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-warm flex items-center justify-center">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-xl">{user?.full_name}</CardTitle>
                <CardDescription className="font-body">
                  {user?.user_type === "PARENT" ? "Parent Account" : "Child Account"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-base font-body">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-body">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userType" className="text-base font-body">Account Role</Label>
                <select
                  id="userType"
                  value={userType}
                  onChange={(e) => setUserType(e.target.value as "PARENT" | "CHILD")}
                  className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="PARENT" className="text-foreground bg-background">Parent Account</option>
                  <option value="CHILD" className="text-foreground bg-background">Child Account</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-body">New Password (optional)</Label>
                <Input id="password" type="password" placeholder="Leave blank to keep current" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base" />
              </div>
              <Button type="submit" className="w-full h-12 text-base bg-accent hover:bg-accent/90 text-accent-foreground font-body gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : saved ? <><CheckCircle2 className="h-5 w-5" /> Saved!</> : <><Save className="h-5 w-5" /> Save Changes</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
