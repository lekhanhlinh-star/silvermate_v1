import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { family, FamilyMessage, connections, FamilyMember } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Volume2, Heart, Loader2, Bot, Activity } from "lucide-react";
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
  const [errorCount, setErrorCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadChatData();
    // Setup interval for polling new messages
    const interval = setInterval(() => {
      // Don't poll if we've had too many errors recently (prevents console spam when offline)
      if (errorCount < 3) {
         fetchMessages(false);
      } else {
         setIsOffline(true);
      }
    }, 5000); 
    return () => clearInterval(interval);
  }, [memberId, errorCount]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    const timer = setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const loadChatData = async () => {
    try {
      setLoading(true);
      setErrorCount(0);
      setIsOffline(false);
      // Fetch member info
      const familyMembers = await connections.getFamily();
      const currentMember = familyMembers.find(m => m.id === memberId);
      if (currentMember) setMember(currentMember);

      await fetchMessages(true);
    } catch (err: unknown) {
      setErrorCount(prev => prev + 1);
      toast({ title: "Failed to load chat", description: err instanceof Error ? err.message : "Connection error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (showLoading = false) => {
    try {
      // Fetch history 
      const allMessages = await family.getMessages(0, 50);
      setErrorCount(0); // Reset on success
      setIsOffline(false);
      
      // Filter for this specific chat
      const filtered = allMessages.filter(m => 
        m.sender_id === memberId || 
        m.receiver_id === memberId ||
        (m.is_system && m.receiver_id === user?.id)
      );
      
      // Sort oldest to newest for UI
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(filtered);
    } catch (error) {
      setErrorCount(prev => prev + 1);
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
              <div className="flex items-center gap-2">
                {isOffline ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-destructive uppercase tracking-widest animate-pulse">
                    <Activity className="h-3 w-3" />
                    Connection Lost
                  </span>
                ) : (
                  <p className="text-xs text-muted-foreground">{member?.email || "Connected"}</p>
                )}
              </div>
            </div>
          </div>
          {isOffline && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadChatData}
              className="h-8 border-destructive/30 text-destructive hover:bg-destructive/5 gap-1.5"
            >
              <Activity className="h-3.5 w-3.5" />
              Retry
            </Button>
          )}
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
              {messages.map((msg, idx) => {
                const isSystem = msg.is_system;
                // Reliable logic: if the message receiver is the person we're chatting with, then WE sent it.
                const isMe = msg.receiver_id === memberId && !isSystem;
                
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ 
                       type: "spring", 
                       stiffness: 260, 
                       damping: 20,
                       delay: Math.min(idx * 0.05, 0.5) 
                    }}
                    className={`flex flex-col w-full ${isSystem ? 'items-center px-4' : isMe ? 'items-end pr-2' : 'items-start pl-2'}`}
                  >
                    {isSystem ? (
                      <div className="flex flex-col items-center max-w-[90%] sm:max-w-lg my-6 group">
                        <div className="flex items-center gap-2 mb-3">
                           <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/20">
                              <Bot className="h-4 w-4 text-accent" />
                           </div>
                           <span className="text-[11px] font-bold text-accent uppercase tracking-widest font-display">SilverMate Intelligence</span>
                        </div>
                        <div className="relative bg-accent/5 backdrop-blur-sm border border-accent/30 text-foreground px-6 py-4 rounded-3xl text-center shadow-sm hover:shadow-md transition-all">
                          <p className="text-sm font-medium leading-relaxed italic text-foreground/90">{msg.content}</p>
                          {msg.audio_url && (
                            <div className="mt-4 flex justify-center">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-9 gap-2 px-6 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm transition-all active:scale-95"
                                onClick={() => playAudio(msg.id, msg.audio_url!)}
                                disabled={playingAudioId === msg.id}
                              >
                                {playingAudioId === msg.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Volume2 className="w-4 h-4" />
                                )}
                                Listen to AI Summary
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={`flex flex-col group max-w-[85%] sm:max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-end gap-2">
                           {!isMe && (
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mb-1 border border-primary/5">
                                 <Heart className="h-4 w-4 text-primary opacity-40" />
                              </div>
                           )}
                           <div className="flex flex-col">
                              <div 
                                className={`relative px-5 py-3 rounded-2xl shadow-sm transition-all ${
                                  isMe 
                                    ? 'bg-primary text-primary-foreground rounded-br-none hover:shadow-primary/20' 
                                    : 'bg-white dark:bg-slate-800 text-foreground rounded-bl-none border border-border/50 hover:shadow-md'
                                }`}
                              >
                                <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap font-body font-medium">
                                   {msg.content}
                                </p>
                                
                                {msg.audio_url && (
                                  <button 
                                    onClick={() => playAudio(msg.id, msg.audio_url!)}
                                    disabled={playingAudioId === msg.id}
                                    className={`absolute ${isMe ? '-left-12' : '-right-12'} bottom-1 p-2.5 rounded-full transition-all hover:scale-110 active:scale-90 ${
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
                              <div className={`flex items-center gap-1 mt-1.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                 <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                                   {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                 </span>
                                 {isMe && <Heart className="h-2.5 w-2.5 text-primary/30" />}
                              </div>
                           </div>
                        </div>
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
