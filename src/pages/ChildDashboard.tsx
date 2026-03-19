import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, Link2, Loader2, MessageCircle, ChevronRight, Headphones, Calendar } from "lucide-react";
import { connections, audio, FamilyMember, ChatSession } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function ChildDashboard() {
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [voiceSessions, setVoiceSessions] = useState<ChatSession[]>([]);
  const [loadingVoice, setLoadingVoice] = useState(false);
  const [showVoiceSessions, setShowVoiceSessions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFamily();
  }, []);

  const loadFamily = async () => {
    try {
      const members = await connections.getFamily();
      setFamily(members);
    } catch (err: any) {
      toast({ title: "Error loading family", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadVoiceSessions = async () => {
    setLoadingVoice(true);
    try {
      const sessions = await audio.getParentSessions();
      setVoiceSessions(sessions);
      setShowVoiceSessions(true);
    } catch (err: any) {
      toast({ title: "Error loading voice sessions", description: err.message, variant: "destructive" });
    } finally {
      setLoadingVoice(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Your Family</h1>
          <p className="text-muted-foreground font-body mt-1">Check in on your loved ones</p>
        </div>
        <div className="flex gap-2">
          {family.length > 0 && (
            <Button 
              onClick={loadVoiceSessions} 
              disabled={loadingVoice}
              variant="outline"
              className="gap-2 font-body"
            >
              {loadingVoice ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Headphones className="h-4 w-4" />
              )}
              Voice Sessions
            </Button>
          )}
          <Link to="/connect">
            <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-body">
              <Link2 className="h-4 w-4" /> Connect Parent
            </Button>
          </Link>
        </div>
      </div>

      {/* Voice Sessions View */}
      {showVoiceSessions && voiceSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-accent/20 bg-accent/5">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Headphones className="h-5 w-5 text-accent" />
                Recent Voice Sessions
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowVoiceSessions(false)}
              >
                Hide
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {voiceSessions.slice(0, 5).map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/parent/${session.user_id}/sessions/${session.id}`}>
                    <Card className="hover:bg-accent/10 transition-colors cursor-pointer p-3 border-border/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-body text-sm text-foreground line-clamp-1">
                            {session.summary || "Voice conversation"}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(session.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {family.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-warm flex items-center justify-center mx-auto mb-6">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-3">No connections yet</h2>
          <p className="text-muted-foreground font-body text-lg max-w-md mx-auto mb-6">
            Connect with your parent using a 6-digit PIN to start viewing their conversations with SilverMate.
          </p>
          <Link to="/connect">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-body text-lg px-8">
              Connect Now
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {family.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={`/parent/${member.id}/sessions`}>
                <Card className="hover:shadow-warm transition-shadow cursor-pointer border-border">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-warm flex items-center justify-center">
                        <Heart className="h-7 w-7 text-primary fill-primary/30" />
                      </div>
                      <div>
                        <p className="font-body font-bold text-lg text-foreground">{member.full_name}</p>
                        <p className="text-muted-foreground font-body">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="h-5 w-5" />
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
