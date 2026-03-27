import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Sparkles, Mic, Volume2, FileText, Clock } from "lucide-react";
import { monitoring, audio, ChatMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

export default function SessionMessages() {
  const { parentId, sessionId } = useParams<{ parentId: string; sessionId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [downloadingAudio, setDownloadingAudio] = useState<Set<string>>(new Set());
  const [showTranscript, setShowTranscript] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const hasAudio = (msg: ChatMessage): boolean => {
    return !!(msg.audio_url || msg.audio_path || msg.is_voice_message);
  };

  useEffect(() => {
    if (!parentId || !sessionId) return;
    monitoring.getMessages(parentId, sessionId)
      .then(msgs => {
        setMessages(msgs);
        // Pre-populate audioUrls with direct links if they are full http URLs
        const urls: Record<string, string> = {};
        msgs.forEach(msg => {
          if (msg.audio_url && msg.audio_url.startsWith('http')) {
            urls[msg.id] = msg.audio_url;
          }
        });
        setAudioUrls(urls);
      })
      .catch((err) => toast({ title: "Error", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [parentId, sessionId]);


  // Auto-preload disabled to avoid CORS issues
  // Audio will be loaded on-demand when user clicks play

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(audioUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [audioUrls]);

  const handleSummarize = async () => {
    if (!parentId || !sessionId) return;
    setSummarizing(true);
    try {
      const res = await monitoring.summarize(parentId, sessionId);
      setSummary(res.summary);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  };

  const downloadAudioForMessage = async (messageId: string) => {
    // Skip if already downloaded
    if (audioUrls[messageId]) return audioUrls[messageId];
    
    // Skip if currently downloading
    if (downloadingAudio.has(messageId)) return null;
    
    setDownloadingAudio(prev => new Set(prev).add(messageId));
    
    try {
      const audioBlob = await audio.downloadAudio(messageId);
      const blobUrl = URL.createObjectURL(audioBlob);
      setAudioUrls(prev => ({ ...prev, [messageId]: blobUrl }));
      return blobUrl;
    } catch (err: any) {
      console.error('Audio download failed:', err);
      const errorMsg = err.message?.includes('CORS') 
        ? 'Cannot load audio due to CORS policy. Please check backend CORS settings.'
        : err.message || 'Failed to load audio';
      toast({ 
        title: "Failed to load audio", 
        description: errorMsg, 
        variant: "destructive" 
      });
      return null;
    } finally {
      setDownloadingAudio(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const handleAudioPlay = async (messageId: string) => {
    // Download audio if not already available
    if (!audioUrls[messageId]) {
      await downloadAudioForMessage(messageId);
    }
    setPlayingAudioId(messageId);
  };

  const handleAudioEnd = () => {
    setPlayingAudioId(null);
  };

  const toggleTranscript = (messageId: string) => {
    setShowTranscript(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const voiceMessages = messages.filter(msg => hasAudio(msg));

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to={`/parent/${parentId}/sessions`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Conversation</h1>
            {voiceMessages.length > 0 && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                <Mic className="h-3.5 w-3.5" />
                {voiceMessages.length} voice message{voiceMessages.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={handleSummarize} disabled={summarizing} className="gap-2 font-body">
          {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Summarize
        </Button>
      </div>

      {summary && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 p-5 bg-gradient-warm border-border">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-body font-semibold text-foreground mb-1">AI Summary</p>
                <div className="text-foreground/80 font-body leading-relaxed prose prose-sm prose-p:my-1 prose-strong:text-foreground max-h-40 overflow-y-auto custom-scrollbar pr-2">
                  <ReactMarkdown>
                    {summary}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <Card className="border-border shadow-sm flex flex-col h-[60vh] min-h-[400px]">
        <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[85%]">
                {/* Voice indicator badge for user messages */}
                {msg.role === "user" && hasAudio(msg) && (
                  <div className="flex justify-end mb-1 gap-2">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Mic className="h-3 w-3" />
                      Voice Message
                    </Badge>
                    {msg.audio_duration && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(msg.audio_duration)}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* For user messages with audio: show audio player instead of text */}
                {msg.role === "user" && hasAudio(msg) ? (
                  <div className="space-y-2">
                    {/* Audio Player as main content */}
                    <Card className="p-3 border-primary/20 bg-primary/5">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-full shrink-0"
                            disabled={downloadingAudio.has(msg.id)}
                            onClick={async () => {
                              const audio = document.getElementById(`audio-${msg.id}`) as HTMLAudioElement;
                              if (audio) {
                                if (playingAudioId === msg.id) {
                                  audio.pause();
                                  setPlayingAudioId(null);
                                } else {
                                  // Pause other audio
                                  document.querySelectorAll('audio').forEach(a => a.pause());
                                  
                                  // Download audio if needed
                                  if (!audioUrls[msg.id]) {
                                    await downloadAudioForMessage(msg.id);
                                  }
                                  
                                  audio.play();
                                  setPlayingAudioId(msg.id);
                                }
                              }
                            }}
                          >
                            {downloadingAudio.has(msg.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Volume2 className={`h-4 w-4 ${playingAudioId === msg.id ? 'text-primary' : ''}`} />
                            )}
                          </Button>
                          <audio
                            id={`audio-${msg.id}`}
                          src={audioUrls[msg.id] || ''}
                            className="flex-1 h-8"
                            controls
                            preload="metadata"
                            onEnded={handleAudioEnd}
                            onPlay={() => setPlayingAudioId(msg.id)}
                            onPause={handleAudioEnd}
                          />
                        </div>
                      </div>
                    </Card>

                    {/* Toggle button to show/hide transcript */}
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTranscript(msg.id)}
                        className="text-xs gap-1 h-6 px-2"
                      >
                        <FileText className="h-3 w-3" />
                        {showTranscript.has(msg.id) ? "Hide" : "Show"} Transcript
                      </Button>
                    </div>

                    {/* Transcript text (collapsible) */}
                    {showTranscript.has(msg.id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-2xl px-5 py-3 text-sm font-body leading-relaxed bg-primary/10 text-foreground border border-primary/20 rounded-br-md"
                      >
                        {msg.content}
                      </motion.div>
                    )}
                  </div>
                ) : (
                  /* For assistant messages only - show text */
                  msg.role === "assistant" && (
                    <div className="rounded-2xl px-5 py-3 text-base font-body leading-relaxed bg-secondary text-secondary-foreground rounded-bl-md">
                      {msg.content}
                    </div>
                  )
                )}

                {/* Only show timestamp if there's content to display */}
                {(msg.role === "assistant" || hasAudio(msg)) && (
                  <p className={`text-xs text-muted-foreground mt-1 ${msg.role === "user" ? "text-right" : ""}`}>
                    {format(new Date(msg.created_at), "h:mm a")}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}
