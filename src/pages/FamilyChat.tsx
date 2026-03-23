import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { family, FamilyMessage, connections, FamilyMember } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Volume2, Heart, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FamilyChat() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadChatData();
    // Optional: Setup interval for polling new messages
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, [memberId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages]);

  const loadChatData = async () => {
    try {
      setLoading(true);
      // Fetch member info
      const familyMembers = await connections.getFamily();
      const currentMember = familyMembers.find(m => m.id === memberId);
      if (currentMember) setMember(currentMember);

      await fetchMessages(true);
    } catch (err: unknown) {
      toast({ title: "Failed to load chat", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (showLoading = false) => {
    try {
      // Fetch history (assuming returning all my messages)
      const allMessages = await family.getMessages(0, 50);
      
      // Filter for this specific chat: 
      // sender or receiver is the memberId, or it's a system message sent to me
      const filtered = allMessages.filter(m => 
        m.sender_id === memberId || 
        m.receiver_id === memberId ||
        (m.is_system && m.receiver_id === user?.id)
      );
      
      // Sort oldest to newest for UI
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(filtered);
    } catch (error) {
      console.error("Failed fetching messages in background", error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !memberId) return;

    try {
      setSending(true);
      await family.sendMessage(memberId, newMessage.trim());
      setNewMessage("");
      await fetchMessages(false);
    } catch (err: unknown) {
      toast({ title: "Error sending message", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const playAudio = async (messageId: string, audioUrl: string) => {
    try {
      setPlayingAudioId(messageId);
      
      // Use the token authorized fetch method
      const blob = await family.downloadAudio(audioUrl);
      const url = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        audioRef.current.onended = () => {
          setPlayingAudioId(null);
          URL.revokeObjectURL(url);
        };
        audioRef.current.onerror = () => {
          setPlayingAudioId(null);
          URL.revokeObjectURL(url);
          toast({ title: "Audio Playback Error", variant: "destructive" });
        };
      }
    } catch (err: unknown) {
      setPlayingAudioId(null);
      toast({ title: "Error loading audio", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto bg-card rounded-2xl shadow-warm overflow-hidden border border-border">
      {/* Hidden Audio Element for playback */}
      <audio ref={audioRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/family")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-warm flex items-center justify-center">
              <Heart className="h-5 w-5 text-primary fill-primary/30" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">{member?.full_name || "Family Member"}</h2>
              <p className="text-xs text-muted-foreground">{member?.email || "Offline"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="space-y-6 flex flex-col justify-end min-h-full">
          {messages.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground space-y-3">
              <Heart className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p>No messages yet. Say hello!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const isSystem = msg.is_system;
                const isMe = msg.sender_id === user?.id;
                
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${isSystem ? 'items-center' : isMe ? 'items-end' : 'items-start'}`}
                  >
                    {isSystem ? (
                      <div className="flex flex-col items-center max-w-[85%] sm:max-w-md my-4">
                        <div className="flex items-center gap-2 mb-2">
                          <img 
                            src="/sys-avatar.png" 
                            alt="System" 
                            className="w-6 h-6 rounded-full bg-accent/20 object-cover" 
                            onError={(e) => {
                              // Fallback if image doesn't exist
                              (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=SM&background=FF8A65&color=fff";
                            }}
                          />
                          <span className="text-xs font-semibold text-accent font-display">SilverMate System</span>
                        </div>
                        <div className="relative group bg-accent/10 border border-accent/20 text-foreground px-5 py-3 rounded-2xl text-center shadow-sm">
                          <p className="text-sm">{msg.content}</p>
                          {msg.audio_url && (
                            <div className="mt-3 flex justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 text-accent border-accent/30 hover:bg-accent/10 rounded-full"
                                onClick={() => playAudio(msg.id, msg.audio_url!)}
                                disabled={playingAudioId === msg.id}
                              >
                                {playingAudioId === msg.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Volume2 className="w-4 h-4" />
                                )}
                                Listen
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div 
                          className={`relative px-5 py-3 rounded-2xl shadow-sm text-sm sm:text-base ${
                            isMe 
                              ? 'bg-primary text-primary-foreground rounded-br-sm' 
                              : 'bg-white dark:bg-slate-800 text-foreground rounded-bl-sm border border-border'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          
                          {msg.audio_url && (
                            <button 
                              onClick={() => playAudio(msg.id, msg.audio_url!)}
                              disabled={playingAudioId === msg.id}
                              className={`absolute -right-12 bottom-0 p-2 rounded-full transition-colors ${
                                playingAudioId === msg.id 
                                  ? 'text-primary bg-primary/10' 
                                  : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                              }`}
                            >
                              {playingAudioId === msg.id ? (
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              ) : (
                                <Volume2 className="w-5 h-5" />
                              )}
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 mx-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-background border-t border-border flex items-center gap-3">
        <Input
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border-muted bg-muted/50 focus-visible:ring-primary h-12 rounded-full px-6"
          disabled={sending}
        />
        <Button 
          type="submit" 
          disabled={!newMessage.trim() || sending} 
          className="h-12 w-12 rounded-full p-0 flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5 -ml-1" /> // offset slightly for visual center
          )}
        </Button>
      </form>
    </div>
  );
}
