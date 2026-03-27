import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageCircle, Plus, Sparkles, Menu, X, Mic, Square } from "lucide-react";
import { chatbot, audio, ChatSession, ChatMessage, BASE_URL } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Voice UI States
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [currentResponse, setCurrentResponse] = useState<string>("");
  // Configuration - edit these values directly in code:
  const [audioOnlyMode] = useState(true); // true = Audio only, false = Text + Audio

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const firstName = user?.full_name?.split(" ")[0] || "Friend";

  // Load sessions on component mount
  useEffect(() => {
    loadSessions();
  }, []);

  // ...existing code...

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const sessionList = await chatbot.getSessions();
      setSessions(sessionList);
      
      // Auto-select the most recent session if no current session is set
      if (!currentSession && sessionList.length > 0) {
        const mostRecentSession = sessionList[0];
        setCurrentSession(mostRecentSession);
        try {
          const sessionMessages = await chatbot.getSessionMessages(mostRecentSession.id);
          const formattedMessages = sessionMessages.map((msg: ChatMessage) => ({
            role: msg.role,
            content: msg.content
          }));
          setMessages(formattedMessages);
        } catch (error) {
          console.error("Failed to load most recent session messages:", error);
        }
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      toast({ title: "Failed to load chat sessions", variant: "destructive" });
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = async (session: ChatSession) => {
    try {
      setCurrentSession(session);
      const sessionMessages = await chatbot.getSessionMessages(session.id);
      const formattedMessages = sessionMessages.map((msg: ChatMessage) => ({
        role: msg.role,
        content: msg.content
      }));
      setMessages(formattedMessages);
      setSidebarOpen(false); // Close sidebar on mobile after selection
    } catch (error) {
      console.error("Failed to load session messages:", error);
      toast({ title: "Failed to load session messages", variant: "destructive" });
    }
  };

  const createNewSession = async () => {
    try {
      const newSession = await chatbot.createSession();
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
      setSidebarOpen(false);
      toast({ title: "New chat session created" });
    } catch (error) {
      console.error("Failed to create new session:", error);
      toast({ title: "Failed to create new chat session", variant: "destructive" });
    }
  };

  const stopSpeaking = () => {
    // Stop browser TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Stop audio player for API TTS
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  };

  // ...existing code...

  // API TTS function  
  const speakWithAPITTS = async (text: string) => {
    try {
      const ttsRes = await chatbot.textToSpeech(text);
      const audioUrl = ttsRes.audio_url.startsWith('http') 
        ? ttsRes.audio_url 
        : `${BASE_URL}${ttsRes.audio_url}`;

      setIsSpeaking(true);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.play();
        audioPlayerRef.current.onended = () => setIsSpeaking(false);
        audioPlayerRef.current.onerror = () => {
          console.error("Audio playback error");
          setIsSpeaking(false);
          toast({ title: "Failed to play audio response", variant: "destructive" });
        };
      }
    } catch (error) {
      console.error("API TTS error:", error);
      toast({ title: "TTS failed", variant: "destructive" });
      setIsSpeaking(false);
    }
  };

  const toggleRecording = async () => {
    if (isProcessing) return; // Cannot start/stop recording while processing
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    if (isListening) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
    } else {
      // Start recording
      setCurrentTranscript("");
      setCurrentResponse("");
      audioChunksRef.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Process audio
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await handleAudioSubmit(audioBlob);
          // Don't kill tracks, we might reuse them. But better to stop them to free up mic light.
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to access microphone:", err);
        toast({ title: "Failed to access microphone", variant: "destructive" });
      }
    }
  };

  const handleAudioSubmit = async (audioBlob: Blob) => {
    if (audioBlob.size === 0) return;

    setIsProcessing(true);
    let sessionToUse = currentSession;
    
    try {
      // If no current session, try to use the most recent session first
      if (!sessionToUse && sessions.length > 0) {
        sessionToUse = sessions[0]; // Most recent session
        setCurrentSession(sessionToUse);
        // Load messages for this session
        try {
          const sessionMessages = await chatbot.getSessionMessages(sessionToUse.id);
          const formattedMessages = sessionMessages.map((msg: ChatMessage) => ({
            role: msg.role,
            content: msg.content
          }));
          setMessages(formattedMessages);
        } catch (error) {
          console.error("Failed to load session messages:", error);
        }
      }
      
      // Only create new session if absolutely no session is available
      if (!sessionToUse) {
        sessionToUse = await chatbot.createSession("Voice Conversation");
        setCurrentSession(sessionToUse);
        setSessions(prev => [sessionToUse!, ...prev]);
      }

      // 1. Upload and Transcribe Audio (saves to session with audio URL)
      const transcribeRes = await audio.transcribeAndUpload(sessionToUse.id, audioBlob);
      const text = transcribeRes.content;
      if (!audioOnlyMode) {
        setCurrentTranscript(text);
      }
      if (!text || text.trim() === "") {
        setIsProcessing(false);
        toast({ title: "Could not understand audio", description: "Please try speaking again." });
        return;
      }

      // Update UI with user message
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      // 2. Get Response (already saved by backend)
      const responseText = await chatbot.sendMessage(text, sessionToUse.id, (streamedText) => {
        if (!audioOnlyMode) {
          setCurrentResponse(streamedText);
        }
      });

      if (!audioOnlyMode) {
        setMessages((prev) => [...prev, { role: "assistant", content: responseText }]);
      }

      // 3. TTS - Use only API TTS
      setIsProcessing(false);
      await speakWithAPITTS(responseText);

    } catch (error) {
      console.error("Voice interaction error:", error);
      toast({ title: "Voice interaction failed", variant: "destructive" });
      setIsProcessing(false);
      setIsSpeaking(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] max-w-7xl mx-auto gap-4">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed inset-y-0 left-0 z-50 w-80 bg-background border-r lg:hidden"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-display text-lg font-semibold">Chat Sessions</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4">
                <Button
                  onClick={createNewSession}
                  className="w-full gap-2 font-body"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
              </div>

              <ScrollArea className="flex-1 px-4">
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No chat sessions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <motion.button
                        key={session.id}
                        onClick={() => loadSession(session)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${currentSession?.id === session.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted"
                          }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="font-medium text-sm truncate">
                          {session.summary || "New Chat"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(session.created_at)}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <Card className="hidden lg:flex w-80 flex-col overflow-hidden border-border shadow-warm">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-display text-lg font-semibold">Chat Sessions</h2>
        </div>

        <div className="p-4">
          <Button
            onClick={createNewSession}
            className="w-full gap-2 font-body"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1 px-4">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No chat sessions yet</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {sessions.map((session) => (
                <motion.button
                  key={session.id}
                  onClick={() => loadSession(session)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${currentSession?.id === session.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted"
                    }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="font-medium text-sm truncate">
                    {session.summary || "New Chat"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDate(session.created_at)}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Hello, {firstName} 👋
              </h1>
              <p className="text-muted-foreground font-body mt-1">
                {currentSession ? `Chat: ${currentSession.summary || "New Chat"}` : "Chat with your AI companion"}
              </p>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <Card className="flex-1 flex flex-col overflow-hidden border-border shadow-warm items-center justify-center p-6 relative">

          <audio ref={audioPlayerRef} className="hidden" />

          {/* Status Text Area */}
          <div className="absolute top-12 left-0 right-0 text-center px-4">
            <AnimatePresence mode="wait">
              {isListening && (
                <motion.p key="listening" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="text-xl font-body text-primary font-medium">
                  Listening...
                </motion.p>
              )}
              {isProcessing && (
                <motion.p key="processing" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="text-xl font-body text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Thinking...
                </motion.p>
              )}
              {isSpeaking && (
                <motion.p key="speaking" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="text-xl font-body text-foreground">
                  SilverMate is speaking...
                </motion.p>
              )}
              {!isListening && !isProcessing && !isSpeaking && (
                <motion.p key="idle" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="text-xl font-body text-muted-foreground">
                  Tap the microphone to speak
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Transcripts / Current Conversation Focus */}
          <div className="flex-1 w-full max-w-2xl flex flex-col justify-center gap-8 my-16">
            <AnimatePresence>
              {((!audioOnlyMode && currentTranscript) || (!audioOnlyMode && currentResponse)) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {!audioOnlyMode && currentTranscript && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl px-6 py-4 text-xl lg:text-2xl font-body bg-primary text-primary-foreground rounded-br-md shadow-sm">
                        {currentTranscript}
                      </div>
                    </div>
                  )}
                  {!audioOnlyMode && currentResponse && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl px-6 py-4 text-xl lg:text-2xl font-body bg-secondary text-secondary-foreground rounded-bl-md shadow-sm">
                        {currentResponse}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Big Microphone Button */}
          <div className="absolute bottom-12 left-0 right-0 flex justify-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={!isProcessing ? { scale: 1.05 } : {}}
              onClick={toggleRecording}
              disabled={isProcessing}
              className={`w-28 h-28 rounded-full flex items-center justify-center shadow-lg transition-colors ${isProcessing
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : isListening
                  ? 'bg-destructive text-destructive-foreground animate-pulse'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
            >
              {isListening ? (
                <Square className="w-10 h-10" fill="currentColor" />
              ) : (
                <Mic className="w-12 h-12" />
              )}
            </motion.button>
          </div>
        </Card>
      </div>
    </div>
  );
}
