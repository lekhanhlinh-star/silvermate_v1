import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Headphones, Volume2, Filter, Calendar, Clock, User, Bot } from "lucide-react";
import { audio, ChatMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterType = "all" | "user" | "assistant";
type DurationFilter = "all" | "short" | "medium" | "long";

export default function AudioHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [downloadingAudio, setDownloadingAudio] = useState<Set<string>>(new Set());
  
  const [roleFilter, setRoleFilter] = useState<FilterType>("all");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;
  
  const { toast } = useToast();

  useEffect(() => {
    loadAudioMessages();
  }, [currentPage]);

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

  const loadAudioMessages = async () => {
    setLoading(true);
    try {
      const audioMessages = await audio.getMessagesWithAudio({
        skip: currentPage * pageSize,
        limit: pageSize,
      });
      setMessages(audioMessages);
    } catch (err: any) {
      toast({ 
        title: "Error loading audio messages", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadAudioForMessage = async (messageId: string) => {
    if (audioUrls[messageId] || downloadingAudio.has(messageId)) return;
    
    setDownloadingAudio(prev => new Set(prev).add(messageId));
    
    try {
      const audioBlob = await audio.downloadAudio(messageId);
      const blobUrl = URL.createObjectURL(audioBlob);
      setAudioUrls(prev => ({ ...prev, [messageId]: blobUrl }));
    } catch (err: any) {
      toast({ 
        title: "Failed to load audio", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setDownloadingAudio(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const handleAudioPlay = async (messageId: string) => {
    if (!audioUrls[messageId]) {
      await downloadAudioForMessage(messageId);
    }
    setPlayingAudioId(messageId);
  };

  const handleAudioEnd = () => {
    setPlayingAudioId(null);
  };

  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Apply filters
  const filteredMessages = messages.filter(msg => {
    // Role filter
    if (roleFilter !== "all" && msg.role !== roleFilter) return false;
    
    // Duration filter
    if (durationFilter !== "all" && msg.audio_duration) {
      if (durationFilter === "short" && msg.audio_duration > 30) return false;
      if (durationFilter === "medium" && (msg.audio_duration <= 30 || msg.audio_duration > 120)) return false;
      if (durationFilter === "long" && msg.audio_duration <= 120) return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Headphones className="h-8 w-8 text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground">Audio History</h1>
        </div>
        <p className="text-muted-foreground font-body">
          All your voice messages and AI audio responses
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Speaker</label>
            <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as FilterType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="user">My Voice Only</SelectItem>
                <SelectItem value="assistant">AI Responses Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Duration</label>
            <Select value={durationFilter} onValueChange={(val) => setDurationFilter(val as DurationFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lengths</SelectItem>
                <SelectItem value="short">Short (&lt; 30s)</SelectItem>
                <SelectItem value="medium">Medium (30s - 2m)</SelectItem>
                <SelectItem value="long">Long (&gt; 2m)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="mb-4 text-sm text-muted-foreground">
        Showing {filteredMessages.length} of {messages.length} messages
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div className="text-center py-16">
          <Headphones className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-body text-lg">
            No audio messages found
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMessages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="border-border hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Speaker Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === "user" 
                        ? "bg-primary/10 text-primary" 
                        : "bg-accent/10 text-accent"
                    }`}>
                      {msg.role === "user" ? (
                        <User className="h-5 w-5" />
                      ) : (
                        <Bot className="h-5 w-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant={msg.role === "user" ? "default" : "secondary"}>
                          {msg.role === "user" ? "You" : "SilverMate AI"}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(msg.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {msg.audio_duration && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(msg.audio_duration)}
                          </span>
                        )}
                      </div>

                      {/* Audio Player */}
                      <Card className="p-3 border-border/50 bg-background/50 mb-2">
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-full shrink-0"
                            disabled={downloadingAudio.has(msg.id)}
                            onClick={async () => {
                              const audioEl = document.getElementById(`audio-${msg.id}`) as HTMLAudioElement;
                              if (audioEl) {
                                if (playingAudioId === msg.id) {
                                  audioEl.pause();
                                  setPlayingAudioId(null);
                                } else {
                                  document.querySelectorAll('audio').forEach(a => a.pause());
                                  
                                  if (!audioUrls[msg.id]) {
                                    await downloadAudioForMessage(msg.id);
                                  }
                                  
                                  audioEl.play();
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
                      </Card>

                      {/* Transcript/Content */}
                      <div className="text-sm text-foreground/80 line-clamp-2">
                        {msg.transcript || msg.content}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {messages.length === pageSize && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={messages.length < pageSize}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
