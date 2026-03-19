import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, MessageCircle, Calendar, Sparkles, Mic } from "lucide-react";
import { monitoring, ChatSession } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

export default function ParentSessions() {
  const { parentId } = useParams<{ parentId: string }>();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionAudioCounts, setSessionAudioCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (!parentId) return;
    loadSessionsWithAudioCounts();
  }, [parentId]);

  const loadSessionsWithAudioCounts = async () => {
    if (!parentId) return;
    
    try {
      const fetchedSessions = await monitoring.getSessions(parentId);
      setSessions(fetchedSessions);
      
      // Fetch audio counts for each session
      const audioCounts: Record<string, number> = {};
      await Promise.all(
        fetchedSessions.map(async (session) => {
          try {
            const messages = await monitoring.getMessages(parentId, session.id);
            const voiceMessageCount = messages.filter(
              msg => msg.audio_url || msg.is_voice_message
            ).length;
            audioCounts[session.id] = voiceMessageCount;
          } catch (err) {
            audioCounts[session.id] = 0;
          }
        })
      );
      setSessionAudioCounts(audioCounts);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/family">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Conversations</h1>
          <p className="text-muted-foreground font-body">Your parent's chats with SilverMate</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-body text-lg">No conversations yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/parent/${parentId}/sessions/${session.id}`}>
                <Card className="hover:shadow-warm transition-shadow cursor-pointer border-border">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-body font-normal text-foreground mb-1 prose prose-sm prose-p:my-1 prose-strong:text-foreground">
                          <ReactMarkdown>
                            {session.summary || "Chat session"}
                          </ReactMarkdown>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(session.created_at), "MMM d, yyyy")}
                          </span>
                          {session.is_active && (
                            <span className="flex items-center gap-1 text-primary">
                              <Sparkles className="h-3.5 w-3.5" /> Active
                            </span>
                          )}
                          {sessionAudioCounts[session.id] > 0 && (
                            <span className="flex items-center gap-1 text-accent">
                              <Mic className="h-3.5 w-3.5" /> {sessionAudioCounts[session.id]} audio
                            </span>
                          )}
                        </div>
                      </div>
                      <MessageCircle className="h-5 w-5 text-muted-foreground mt-1" />
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
