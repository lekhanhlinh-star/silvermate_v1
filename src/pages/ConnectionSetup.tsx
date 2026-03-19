import { useState, useRef, useCallback } from "react";
import { Loader2, Plus, Check, CheckCircle2 } from "lucide-react";
import { connections } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function ConnectionSetup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pinDigits, setPinDigits] = useState<string[]>(Array(6).fill(""));
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedName, setConnectedName] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const connectionType = user?.user_type === "CHILD" ? "CHILD_TO_PARENT" : "PARENT_TO_CHILD";
  const enteredPin = pinDigits.join("");
  const isPinComplete = enteredPin.length === 6 && pinDigits.every(d => d !== "");

  const handleGeneratePin = async () => {
    setLoading(true);
    try {
      const res = await connections.generatePin(connectionType as any);
      setGeneratedPin(res.pin_code);
      toast({ title: "PIN Generated!", description: `Share this PIN: ${res.pin_code}` });
    } catch (err: any) {
      toast({ 
        title: "Unable to Generate PIN", 
        description: "Please try again in a moment.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    if (!isPinComplete) return;
    setVerifying(true);
    try {
      const res = await connections.verifyPin(enteredPin);
      if (res.success) {
        setConnected(true);
        setConnectedName(res.connected_user.full_name);
        toast({ title: "Connected! 🎉", description: `You're now linked with ${res.connected_user.full_name}` });
      }
    } catch (err: any) {
      // Clear the PIN inputs
      setPinDigits(Array(6).fill(""));
      inputRefs.current[0]?.focus();
      
      toast({ 
        title: "Invalid PIN", 
        description: "The PIN you entered is incorrect or has expired. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleDigitChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [pinDigits]);

  const handleDigitKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [pinDigits]);

  if (connected) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl"
          style={{ backgroundColor: "#8B36FF", boxShadow: "0 20px 40px rgba(139,54,255,0.4)" }}>
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
        <h2 className="font-serif text-xl font-bold mb-2" style={{ color: "#2D2D2D" }}>Connected!</h2>
        <p className="text-base" style={{ color: "#666666" }}>
          You're now linked with <strong>{connectedName}</strong>. 💛
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 lg:p-8">
      {/* Header */}
      <header className="mb-4 lg:mb-6">
        <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white">Connect Family</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs lg:text-sm">
          Bring your loved ones closer with a single code.
        </p>
      </header>

      {/* Two Column Grid (Mobile: Stack, Desktop: Side by Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 max-w-5xl mx-auto">
        
        {/* Left Card: Generate PIN (Purple/Violet) */}
        <div className="relative group bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden flex flex-col items-center justify-center p-5 lg:p-6 border-4 border-transparent hover:border-purple-500/30 transition-all duration-300 min-h-[280px] lg:min-h-[320px]">
          {/* Purple Decorative Blur Elements */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl"></div>
          
          <div className="z-10 flex flex-col items-center gap-3 lg:gap-4 text-center">
            {/* Icon Circle */}
            <div className="w-20 h-20 lg:w-28 lg:h-28 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600">
              <Plus className="w-8 h-8 lg:w-12 lg:h-12" strokeWidth={1.5} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white uppercase tracking-widest">Host</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-xs lg:text-sm">
                Create a secure link for your family circle
              </p>
            </div>

            {generatedPin && (
              <div className="text-center py-2 px-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
                <p className="text-xl lg:text-2xl font-bold tracking-[0.3em] mb-1 text-purple-600">
                  {generatedPin}
                </p>
                <p className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400">
                  Share this PIN with your family member
                </p>
              </div>
            )}

            {/* Big Circular Button */}
            <button
              onClick={handleGeneratePin}
              disabled={loading}
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-purple-600 hover:bg-purple-700 shadow-2xl shadow-purple-600/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 text-white disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-7 w-7 lg:h-8 lg:w-8 animate-spin" />
              ) : (
                <Plus className="h-8 w-8 lg:h-10 lg:w-10" strokeWidth={3} />
              )}
            </button>
          </div>
        </div>

        {/* Right Card: Enter PIN (Orange) */}
        <div className="relative group bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden flex flex-col items-center justify-center p-5 lg:p-6 border-4 border-transparent hover:border-orange-500/30 transition-all duration-300 min-h-[280px] lg:min-h-[320px]">
          {/* Orange Decorative Blur Elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl"></div>
          
          <div className="z-10 flex flex-col items-center gap-3 lg:gap-4 text-center w-full">
            {/* Icon Circle */}
            <div className="w-20 h-20 lg:w-28 lg:h-28 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600">
              <Check className="w-8 h-8 lg:w-12 lg:h-12" strokeWidth={1.5} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white uppercase tracking-widest">Join</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs lg:text-sm">
                Enter the 6-digit code shared by your family
              </p>
            </div>

            {/* 6-Digit PIN Input Grid */}
            <div className="flex gap-1.5 lg:gap-2 justify-center">
              {pinDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleDigitKeyDown(i, e)}
                  className="w-8 h-10 lg:w-10 lg:h-12 rounded-lg lg:rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-base lg:text-lg font-bold text-orange-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center"
                />
              ))}
            </div>

            {/* Big Circular Connect Button */}
            <button
              onClick={handleVerifyPin}
              disabled={!isPinComplete || verifying}
              className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-orange-600 hover:bg-orange-700 shadow-2xl shadow-orange-600/40 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <Loader2 className="h-7 w-7 lg:h-8 lg:w-8 animate-spin" />
              ) : (
                <Check className="h-8 w-8 lg:h-10 lg:w-10" strokeWidth={4} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 lg:mt-10 text-center text-slate-400 dark:text-slate-500 text-[10px] lg:text-xs">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 lg:gap-6">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
            <span>Secure End-to-End Encryption</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
            <span>Supports up to 10 members</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
