import type { Page } from "@/App";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CalendarDays,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  Upload,
  User,
  X,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const BASE_NAV_ITEMS: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "templates", label: "Templates", icon: BookOpen },
  { id: "profile", label: "Profile", icon: User },
  { id: "upload", label: "Upload", icon: Upload },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
];

const ADMIN_PIN = "2024";

export function AppLayout({
  children,
  currentPage,
  onNavigate,
}: AppLayoutProps) {
  const { clear, identity } = useInternetIdentity();
  const { data: profile } = useGetCallerUserProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Admin mode state — check localStorage on mount
  const [isAdmin, setIsAdmin] = useState(
    () => localStorage.getItem("docfill_admin_mode") === "true",
  );

  // PIN dialog state
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinShake, setPinShake] = useState(false);

  const handleAdminLock = useCallback(() => {
    setIsAdmin(false);
    if (currentPage === "journal") {
      onNavigate("dashboard");
    }
  }, [currentPage, onNavigate]);

  // Expose handleAdminLock so NotaryJournalPage can call it via a prop
  // We pass it through context or just let NotaryJournalPage use localStorage + navigate
  // For now, we wire it in the render below.

  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) {
      localStorage.setItem("docfill_admin_mode", "true");
      setIsAdmin(true);
      setPinDialogOpen(false);
      setPinInput("");
      setPinError(false);
    } else {
      setPinError(true);
      setPinShake(true);
      setTimeout(() => setPinShake(false), 600);
      setPinInput("");
    }
  };

  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(isAdmin
      ? [{ id: "journal" as Page, label: "Notary Journal", icon: NotebookPen }]
      : []),
  ];

  const principal = identity?.getPrincipal().toString();
  const displayName =
    profile?.name || (principal ? `${principal.slice(0, 6)}...` : "User");
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Admin PIN Dialog */}
      <Dialog
        open={pinDialogOpen}
        onOpenChange={(o) => {
          setPinDialogOpen(o);
          if (!o) {
            setPinInput("");
            setPinError(false);
          }
        }}
      >
        <DialogContent data-ocid="admin.dialog" className="max-w-xs bento-card">
          <DialogHeader>
            <DialogTitle className="text-base">Admin Access</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Enter the admin PIN to unlock the Notary Journal.
            </DialogDescription>
          </DialogHeader>
          <motion.div
            animate={pinShake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-3 mt-1"
          >
            <Input
              data-ocid="admin.pin.input"
              type="password"
              placeholder="Enter PIN"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              className={cn(
                "text-center tracking-widest text-lg",
                pinError && "border-destructive focus-visible:ring-destructive",
              )}
              maxLength={8}
              autoFocus
            />
            {pinError && (
              <p className="text-xs text-destructive text-center">
                Incorrect PIN. Please try again.
              </p>
            )}
            <Button
              data-ocid="admin.pin.submit_button"
              className="w-full"
              onClick={handlePinSubmit}
              disabled={pinInput.length === 0}
            >
              Unlock
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border sidebar-shadow fixed h-screen z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-primary-glow">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-display font-bold text-foreground text-lg tracking-tight">
              DocFill
            </span>
            <Badge
              variant="secondary"
              className="ml-1.5 text-[10px] px-1.5 py-0 font-semibold"
            >
              AI
            </Badge>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                type="button"
                key={item.id}
                data-ocid={`nav.${item.id}.link`}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                <Icon
                  className={cn("w-4.5 h-4.5", active ? "text-primary" : "")}
                  size={18}
                />
                {item.label}
                {item.id === "journal" && (
                  <Badge
                    variant="outline"
                    className="ml-auto text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-600"
                  >
                    Admin
                  </Badge>
                )}
                {active && item.id !== "journal" && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-9 h-9 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground">Authenticated</p>
            </div>
          </div>
          <Button
            data-ocid="nav.logout.button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
          >
            <LogOut size={15} />
            Sign out
          </Button>
          {/* Subtle admin link */}
          <button
            type="button"
            data-ocid="nav.admin.link"
            onClick={() => {
              if (isAdmin) {
                handleAdminLock();
              } else {
                setPinDialogOpen(true);
              }
            }}
            className="w-full text-center text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors mt-2 py-1"
          >
            {isAdmin ? "Lock Admin" : "Admin"}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-foreground">
            DocFill AI
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-accent"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          className="md:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setMobileMenuOpen(false);
          }}
        />
      )}

      {/* Mobile nav */}
      <div
        className={cn(
          "md:hidden fixed top-[57px] left-0 right-0 z-40 bg-card border-b border-border shadow-lg transition-all duration-200",
          mobileMenuOpen
            ? "translate-y-0 opacity-100"
            : "-translate-y-2 opacity-0 pointer-events-none",
        )}
      >
        <nav className="px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                type="button"
                key={item.id}
                data-ocid={`nav.${item.id}.link`}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
          <Button
            data-ocid="nav.logout.button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive mt-2"
          >
            <LogOut size={15} />
            Sign out
          </Button>
          <button
            type="button"
            onClick={() => {
              if (isAdmin) {
                handleAdminLock();
              } else {
                setPinDialogOpen(true);
                setMobileMenuOpen(false);
              }
            }}
            className="w-full text-center text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors py-1"
          >
            {isAdmin ? "Lock Admin" : "Admin"}
          </button>
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
