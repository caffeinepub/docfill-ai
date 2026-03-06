import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentStore } from "@/hooks/useDocumentStore";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "@/hooks/useQueries";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Star,
  TrendingUp,
  Upload,
  User,
  Zap,
} from "lucide-react";
import { type Variants, motion } from "motion/react";
import { useMemo } from "react";

type Page = "dashboard" | "profile" | "upload" | "documents";

interface DashboardPageProps {
  onNavigate: (page: Page) => void;
}

function getProfileCompletion(
  profile: { name: string; email: string } | undefined,
  extra: Record<string, string>,
): number {
  const fields = [
    profile?.name,
    profile?.email,
    extra.phone,
    extra.address,
    extra.dob,
    extra.idNumber,
  ];
  const filled = fields.filter((v) => v && v.trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { data: profile, isLoading: profileLoading } =
    useGetCallerUserProfile();
  const { identity } = useInternetIdentity();
  const { docIds, documents } = useDocumentStore();

  const extraProfile = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("docfill_profile_extra") || "{}",
      ) as Record<string, string>;
    } catch {
      return {};
    }
  }, []);

  const completionPct = getProfileCompletion(profile, extraProfile);
  const recentDocs = documents.slice(-3).reverse();
  const filledDocs = documents.filter((d) => d.status === "filled").length;

  const displayName =
    profile?.name || identity?.getPrincipal().toString().slice(0, 8) || "User";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">👋</span>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Welcome back, {firstName}
          </h1>
        </div>
        <p className="text-muted-foreground">Here's your DocFill AI overview</p>
      </motion.div>

      {/* Bento Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {/* Profile Completeness — span 2 cols on large */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="bento-card h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User size={16} className="text-primary" />
                  </div>
                  Profile Completeness
                </CardTitle>
                <Badge
                  variant={completionPct === 100 ? "default" : "secondary"}
                  className={
                    completionPct === 100
                      ? "bg-success text-success-foreground"
                      : ""
                  }
                >
                  {completionPct}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-3 w-full rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <>
                  <Progress value={completionPct} className="h-3 mb-4" />
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      {
                        label: "Name",
                        value: profile?.name,
                        done: !!profile?.name,
                      },
                      {
                        label: "Email",
                        value: profile?.email,
                        done: !!profile?.email,
                      },
                      {
                        label: "Phone",
                        value: extraProfile.phone,
                        done: !!extraProfile.phone,
                      },
                      {
                        label: "Address",
                        value: extraProfile.address,
                        done: !!extraProfile.address,
                      },
                      {
                        label: "Date of Birth",
                        value: extraProfile.dob,
                        done: !!extraProfile.dob,
                      },
                      {
                        label: "ID Number",
                        value: extraProfile.idNumber,
                        done: !!extraProfile.idNumber,
                      },
                    ].map((field) => (
                      <div
                        key={field.label}
                        className="flex items-center gap-2"
                      >
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${field.done ? "bg-success" : "bg-border"}`}
                        />
                        <span className="text-xs text-muted-foreground truncate">
                          {field.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {completionPct < 100 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate("profile")}
                      className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                    >
                      Complete Profile <ArrowRight size={14} />
                    </Button>
                  )}
                  {completionPct === 100 && (
                    <div className="flex items-center gap-2 text-success text-sm font-medium">
                      <CheckCircle2 size={16} />
                      Profile complete — ready to auto-fill
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats card */}
        <motion.div variants={item}>
          <Card className="bento-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-chart-1/15 flex items-center justify-center">
                  <TrendingUp size={16} className="text-chart-1" />
                </div>
                Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Total Documents
                  </p>
                  <p className="text-2xl font-bold font-display text-foreground">
                    {docIds.length}
                  </p>
                </div>
                <FileText size={24} className="text-muted-foreground/50" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-success/8">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Auto-Filled
                  </p>
                  <p className="text-2xl font-bold font-display text-success">
                    {filledDocs}
                  </p>
                </div>
                <CheckCircle2 size={24} className="text-success/50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Upload */}
        <motion.div variants={item}>
          <Card
            className="bento-card h-full cursor-pointer card-hover group"
            onClick={() => onNavigate("upload")}
          >
            <CardContent className="flex flex-col items-center justify-center h-full py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Upload size={28} className="text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1">
                Quick Upload
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Drop a PDF and auto-fill instantly
              </p>
              <Button
                size="sm"
                className="gap-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-0 shadow-none"
              >
                Upload PDF <ArrowRight size={14} />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent documents */}
        <motion.div variants={item} className="md:col-span-2">
          <Card className="bento-card h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-chart-2/15 flex items-center justify-center">
                    <Clock size={16} className="text-chart-2" />
                  </div>
                  Recent Documents
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate("documents")}
                  className="text-primary hover:text-primary gap-1 text-xs"
                >
                  View all <ArrowRight size={12} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                    <FileText size={20} className="text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No documents yet
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onNavigate("upload")}
                    className="text-primary mt-1 text-xs"
                  >
                    Upload your first document
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentDocs.map((doc, idx) => (
                    <div
                      key={doc.id}
                      data-ocid={`documents.item.${idx + 1}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.uploadedAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tips card */}
        <motion.div variants={item}>
          <Card className="bento-card h-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-chart-2/8" />
            <CardContent className="relative py-6 px-5 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Pro Tips
                </span>
              </div>
              {[
                "Complete your profile for 100% field match accuracy",
                "Supports multi-page PDF forms",
                "Fields are detected with AI confidence scoring",
              ].map((tip) => (
                <div key={tip} className="flex items-start gap-2">
                  <Zap
                    size={13}
                    className="text-primary mt-0.5 flex-shrink-0"
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tip}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    uploaded: {
      label: "Uploaded",
      className: "bg-secondary text-secondary-foreground",
    },
    processing: {
      label: "Processing",
      className: "bg-warning/15 text-warning-foreground",
    },
    filled: { label: "Filled", className: "bg-success/15 text-success" },
  };
  const s = map[status] ?? map.uploaded;
  return (
    <Badge variant="outline" className={`text-xs border-0 ${s.className}`}>
      {s.label}
    </Badge>
  );
}
