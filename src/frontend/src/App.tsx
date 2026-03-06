import { AppLayout } from "@/components/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { DashboardPage } from "@/pages/DashboardPage";
import { DocumentsPage } from "@/pages/DocumentsPage";
import { LoginPage } from "@/pages/LoginPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { UploadPage } from "@/pages/UploadPage";
import { Loader2, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

type Page = "dashboard" | "profile" | "upload" | "documents";

function LoadingScreen() {
  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-primary-glow">
          <Zap className="w-7 h-7 text-primary-foreground" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin" size={16} />
          <span className="text-sm font-medium">Loading DocFill AI…</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (!identity) {
    return (
      <>
        <LoginPage />
        <Toaster richColors position="bottom-right" />
      </>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage onNavigate={setCurrentPage} />;
      case "profile":
        return <ProfilePage />;
      case "upload":
        return <UploadPage />;
      case "documents":
        return <DocumentsPage onNavigate={setCurrentPage} />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <>
      <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
        {/* Footer */}
        <footer className="mt-16 pb-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with{" "}
            <span className="text-destructive">♥</span> using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </AppLayout>
      <Toaster richColors position="bottom-right" />
    </>
  );
}
