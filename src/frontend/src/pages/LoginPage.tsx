import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { Brain, FileCheck, Loader2, Shield, Zap } from "lucide-react";
import { motion } from "motion/react";

const features = [
  { icon: Brain, text: "AI-powered field detection" },
  { icon: FileCheck, text: "Instant form auto-fill" },
  { icon: Shield, text: "Secure on-chain storage" },
];

export function LoginPage() {
  const { login, isLoggingIn, isInitializing } = useInternetIdentity();

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-card border border-border rounded-3xl shadow-card-hover overflow-hidden">
          {/* Top accent */}
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />

          <div className="px-8 py-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-primary-glow">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl text-foreground tracking-tight">
                  DocFill AI
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  Document automation, simplified
                </p>
              </div>
            </div>

            {/* Headline */}
            <div className="mb-8">
              <h2 className="font-display text-3xl font-bold text-foreground leading-tight mb-3">
                Fill any form
                <br />
                <span className="text-primary">in seconds.</span>
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Upload a PDF, let our AI detect fields, and auto-fill from your
                secure profile. No more repetitive typing.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-8">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.text}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-primary" />
                    </div>
                    <span className="text-sm text-foreground font-medium">
                      {feature.text}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA */}
            <Button
              data-ocid="auth.login.button"
              onClick={login}
              disabled={isLoggingIn || isInitializing}
              className="w-full h-12 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-glow transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
            >
              {isLoggingIn || isInitializing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isInitializing ? "Initializing..." : "Signing in..."}
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Sign in with Internet Identity
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Powered by Internet Computer · No password needed
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
