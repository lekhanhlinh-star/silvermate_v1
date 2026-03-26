import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Heart, 
  Users, 
  Link2, 
  Loader2, 
  MessageCircle, 
  ChevronRight, 
  Headphones, 
  Calendar,
  Bot,
  Activity,
  History,
  MessageSquare
} from "lucide-react";
import { connections, audio, FamilyMember, ChatSession } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export default function ChildDashboard() {
  const { user } = useAuth();
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
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-body animate-pulse italic">Connecting with your family...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="font-display text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            Your Loved Ones
            <Heart className="h-8 w-8 text-primary fill-primary/10" />
          </h1>
          <p className="text-muted-foreground font-body text-lg">
             Manage connections and review interactions with SilverMate.
          </p>
        </motion.div>
        
        <motion.div 
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="flex items-center gap-3"
        >
          {family.length > 0 && user?.user_type === "CHILD" && (
            <Button 
              onClick={loadVoiceSessions} 
              disabled={loadingVoice}
              variant="outline"
              className="gap-2 h-11 px-5 border-border/60 hover:bg-primary/5 transition-all rounded-xl shadow-sm"
            >
              {loadingVoice ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <History className="h-4 w-4" />
              )}
              Recent Activity
            </Button>
          )}
          <Link to="/connect">
            <Button className="h-11 px-5 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-display font-semibold transition-all rounded-xl shadow-md hover:shadow-lg active:scale-95">
              <Link2 className="h-4 w-4" /> Connect New
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Recent Activity (Voice Sessions) */}
      <AnimatePresence>
         {showVoiceSessions && voiceSessions.length > 0 && (
            <motion.div
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: "auto" }}
               exit={{ opacity: 0, height: 0 }}
               className="mb-12 overflow-hidden"
            >
               <Card className="border-accent/30 bg-accent/5 backdrop-blur-sm shadow-inner rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                     <div>
                        <CardTitle className="text-xl font-display flex items-center gap-2">
                           Recent AI Conversations
                        </CardTitle>
                        <CardDescription>
                           Conversations between your parents and SilverMate
                        </CardDescription>
                     </div>
                     <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowVoiceSessions(false)}
                        className="hover:bg-accent/10"
                     >
                        Close
                     </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-6">
                     {voiceSessions.slice(0, 5).map((session, i) => (
                        <motion.div
                           key={session.id}
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           transition={{ delay: i * 0.05 }}
                        >
                           <Link to={`/parent/${session.user_id}/sessions/${session.id}`}>
                              <div className="group flex items-center justify-between p-4 bg-background/60 border border-border/40 hover:border-accent/40 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md">
                                 <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                                       <Headphones className="h-5 w-5 text-accent" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <p className="font-body font-semibold text-foreground truncate">
                                          {session.summary || "Daily conversation log"}
                                       </p>
                                       <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                          <Calendar className="h-3 w-3" />
                                          {new Date(session.created_at).toLocaleDateString()} at {new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                       </p>
                                    </div>
                                 </div>
                                 <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                              </div>
                           </Link>
                        </motion.div>
                     ))}
                  </CardContent>
               </Card>
            </motion.div>
         )}
      </AnimatePresence>

      {/* Main Family Section */}
      {family.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 bg-card/60 backdrop-blur rounded-3xl border border-dashed border-border/60"
        >
          <div className="w-24 h-24 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto mb-6 relative">
             <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" />
             <Users className="h-12 w-12 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-3 font-semibold">No Family Members Linked</h2>
          <p className="text-muted-foreground font-body text-lg max-w-sm mx-auto mb-8 leading-relaxed">
             Link with your parents to start monitoring their activity and chatting with them.
          </p>
          <Link to="/connect">
            <Button size="lg" className="h-12 px-10 bg-accent hover:bg-accent/90 text-accent-foreground font-display font-bold text-lg rounded-2xl shadow-xl transition-all active:scale-95">
              Connect Family Member
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid gap-6">
          {family.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="hover:shadow-2xl hover:shadow-primary/5 transition-all border-border/60 group overflow-hidden bg-white/40 backdrop-blur-md rounded-2xl">
                <div className="relative p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    {/* User Info */}
                    <div className="flex items-center gap-6">
                      <div className="relative group">
                         <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-500" />
                         <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-light flex-shrink-0 flex items-center justify-center shadow-lg text-white font-display text-xl font-bold">
                           {getInitials(member.full_name)}
                         </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                           <p className="font-display font-bold text-2xl text-foreground">
                             {member.full_name}
                           </p>
                           <Badge variant="outline" className="h-5 text-[10px] uppercase tracking-tighter bg-muted/30">Parent</Badge>
                        </div>
                        <p className="text-muted-foreground font-body mb-2">{member.email}</p>
                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Connected</span>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full lg:w-[480px]">
                      {/* Action 1: Direct Chat */}
                      <Link to={`/family/chat/${member.id}`}>
                        <Button className="w-full h-auto p-4 flex flex-col items-start gap-1 bg-primary hover:bg-primary/90 text-primary-foreground font-display rounded-2xl transition-all shadow-md group-hover:shadow-lg active:scale-95 text-left border-none relative overflow-hidden">
                           <div className="absolute top-[-20px] right-[-20px] w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
                           <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="h-5 w-5" />
                              <span className="font-bold text-base">Chat with {member.full_name.split(' ')[0]}</span>
                           </div>
                           <span className="text-xs text-primary-foreground/70 font-body leading-tight">Send a direct message or voice note.</span>
                        </Button>
                      </Link>

                      {/* Action 2: Review AI Interactions */}
                      <Link to={`/parent/${member.id}/sessions`}>
                        <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-start gap-1 border-border/80 hover:border-accent hover:bg-accent/5 font-display rounded-2xl transition-all shadow-sm active:scale-95 text-left bg-transparent">
                           <div className="flex items-center gap-2 mb-1">
                              <Bot className="h-5 w-5 text-accent" />
                              <span className="font-bold text-base text-foreground">AI Interactions</span>
                           </div>
                           <span className="text-xs text-muted-foreground font-body leading-tight">Listen to talks between Parent & BOT.</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Bottom Status/Summary link (Optional Polish) */}
                <div className="bg-muted/30 px-8 py-3 flex items-center justify-between border-t border-border/30">
                   <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium italic">
                      <Activity className="h-3 w-3 text-primary" />
                      Monitoring connection active via SilverMate AI
                   </div>
                   <Link to={`/parent/${member.id}/sessions`} className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 group/link uppercase tracking-wider">
                      Full History <ChevronRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
                   </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple Badge component if not imported
function Badge({ children, variant, className }: any) {
  return (
    <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

