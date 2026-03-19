import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Users, Shield } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: MessageCircle,
    title: "Caring AI Companion",
    description: "A warm, patient AI friend that's always ready to listen and chat with your loved ones.",
  },
  {
    icon: Users,
    title: "Family Connection",
    description: "Stay connected with your parents' wellbeing by viewing their conversations.",
  },
  {
    icon: Shield,
    title: "Peace of Mind",
    description: "Know what's on your parents' mind, even when you can't be there in person.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="container mx-auto flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <Heart className="h-8 w-8 text-accent fill-accent" />
          <span className="font-display text-2xl font-bold text-foreground">SilverMate</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" className="text-base font-body">Log In</Button>
          </Link>
          <Link to="/signup">
            <Button className="text-base font-body bg-accent hover:bg-accent/90 text-accent-foreground shadow-warm">
              Sign Up
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 mb-8">
            <Heart className="h-4 w-4 text-accent fill-accent" />
            <span className="text-sm font-medium text-foreground">A companion your parents deserve</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight mb-6">
            <span className="text-foreground">Your Parents' </span>
            <span className="text-gradient-warm">Caring AI</span>
            <br />
            <span className="text-foreground">Companion</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 font-body leading-relaxed">
            SilverMate gives your elderly parents a warm, patient AI friend to talk to — and gives you the peace of mind of staying connected to their world.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8 py-6 bg-accent hover:bg-accent/90 text-accent-foreground shadow-warm font-body">
                Get Started Free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 font-body">
                I Have an Account
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Decorative blob */}
        <div className="relative mt-20">
          <div className="absolute inset-0 bg-gradient-warm rounded-3xl opacity-50 blur-3xl -z-10" />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="bg-card rounded-3xl border border-border shadow-warm p-8 md:p-12 max-w-4xl mx-auto"
          >
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-left">
                <p className="text-2xl md:text-3xl font-display font-semibold text-foreground mb-3">
                  "Good morning, SilverMate!"
                </p>
                <p className="text-muted-foreground font-body text-lg">
                  Mom chats with SilverMate every day about her garden, her memories, and how she's feeling. You can check in anytime to see what's on her mind. 💛
                </p>
              </div>
              <div className="flex-shrink-0 w-24 h-24 rounded-full bg-gradient-warm flex items-center justify-center">
                <MessageCircle className="h-12 w-12 text-primary" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.15 }}
              className="bg-card rounded-2xl border border-border p-8 shadow-sm hover:shadow-warm transition-shadow"
            >
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-5">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
              <p className="text-muted-foreground font-body leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-accent fill-accent" />
            <span className="font-display font-bold text-foreground">SilverMate</span>
          </div>
          <p className="text-sm text-muted-foreground">Made with love for families ❤️</p>
        </div>
      </footer>
    </div>
  );
}
