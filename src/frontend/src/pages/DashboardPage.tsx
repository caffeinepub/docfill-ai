import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useBilling } from "@/hooks/useBilling";
import { useDocumentStore } from "@/hooks/useDocumentStore";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "@/hooks/useQueries";
import { fetchPublicForm } from "@/lib/publicFormFetch";
import {
  type PublicForm,
  getTrendingForms,
  searchForms,
} from "@/lib/publicFormLibrary";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Globe,
  Loader2,
  Search,
  Shield,
  Star,
  TrendingUp,
  Upload,
  User,
  Zap,
} from "lucide-react";
import { CreditCard, Crown } from "lucide-react";
import { type Variants, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Page =
  | "dashboard"
  | "profile"
  | "upload"
  | "documents"
  | "templates"
  | "billing";

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
    extra.street,
    extra.city,
    extra.state,
    extra.zip,
    extra.dob,
    extra.idNumber,
    extra.employer,
    extra.jobTitle,
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

const itemVariant: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  Tax: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Immigration: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Employment: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "Real Estate": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "Social Security": "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  Health: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
};

function formatDownloadCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

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

  const { fillCount, isProUser } = useBilling();

  // Public Library state
  const [publicLibraryMode, setPublicLibraryMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicForm[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [fetchingFormId, setFetchingFormId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const trendingForms = useMemo(() => getTrendingForms(5), []);

  const handleSearch = () => {
    const results = searchForms(searchQuery);
    setSearchResults(results);
    setHasSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleFetchForm = async (form: PublicForm) => {
    if (fetchingFormId) return;
    setFetchingFormId(form.id);
    try {
      const { blob, fileName } = await fetchPublicForm(form);

      // Encode blob as base64 for sessionStorage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        sessionStorage.setItem(
          "docfill_public_form",
          JSON.stringify({
            base64,
            fileName,
            formName: form.name,
            domain: form.domain,
            isVerified: form.isGov,
            fromPublicLibrary: true,
            category: form.category,
          }),
        );
        toast.success("Form loaded \u2014 running field recognition...");
        setTimeout(() => {
          onNavigate("upload");
        }, 1500);
      };
      reader.readAsDataURL(blob);
    } catch {
      toast.error("Failed to fetch form. Please try again.");
    } finally {
      setFetchingFormId(null);
    }
  };

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
        <motion.div variants={itemVariant} className="lg:col-span-2">
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
                      { label: "Name", done: !!profile?.name },
                      { label: "Email", done: !!profile?.email },
                      { label: "Phone", done: !!extraProfile.phone },
                      { label: "Street", done: !!extraProfile.street },
                      { label: "City", done: !!extraProfile.city },
                      { label: "State", done: !!extraProfile.state },
                      { label: "Zip", done: !!extraProfile.zip },
                      { label: "Date of Birth", done: !!extraProfile.dob },
                      { label: "ID Number", done: !!extraProfile.idNumber },
                      { label: "Employer", done: !!extraProfile.employer },
                      { label: "Job Title", done: !!extraProfile.jobTitle },
                    ].map((field) => (
                      <div
                        key={field.label}
                        className="flex items-center gap-2"
                      >
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            field.done ? "bg-success" : "bg-border"
                          }`}
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
                      data-ocid="dashboard.profile.button"
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
        <motion.div variants={itemVariant}>
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
        <motion.div variants={itemVariant}>
          <Card
            className="bento-card h-full cursor-pointer card-hover group"
            onClick={() => onNavigate("upload")}
            data-ocid="dashboard.upload.button"
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

        {/* Billing card */}
        <motion.div variants={itemVariant}>
          <Card
            className="bento-card h-full cursor-pointer card-hover group border-amber-500/20"
            onClick={() => onNavigate("billing")}
            data-ocid="dashboard.billing_card"
          >
            <CardContent className="flex flex-col h-full py-6 px-5">
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <CreditCard
                    size={18}
                    className="text-amber-600 dark:text-amber-400"
                  />
                </div>
                {isProUser ? (
                  <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1 text-xs">
                    <Crown size={10} />
                    Pro
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Basic
                  </Badge>
                )}
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1 text-sm">
                Subscription
              </h3>
              {isProUser ? (
                <p className="text-xs text-muted-foreground mb-3">
                  Unlimited fills active
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    {fillCount}/2 free fills used
                  </p>
                  <Progress
                    value={Math.min(100, (fillCount / 2) * 100)}
                    className={
                      fillCount >= 2
                        ? "[&>div]:bg-destructive"
                        : "[&>div]:bg-amber-500"
                    }
                  />
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="mt-auto gap-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs justify-start px-0"
              >
                Manage Billing →
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent documents */}
        <motion.div variants={itemVariant} className="md:col-span-2">
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
                  data-ocid="dashboard.documents.button"
                >
                  View all <ArrowRight size={12} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentDocs.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-8 text-center"
                  data-ocid="documents.empty_state"
                >
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
        <motion.div variants={itemVariant}>
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

      {/* ============================================================
          PUBLIC LIBRARY SECTION
      ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="space-y-5"
      >
        {/* Section header with toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Globe size={20} className="text-primary" />
              Template Search
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {publicLibraryMode
                ? "Browsing global public forms from official .gov sources"
                : "Search your uploaded documents or switch to the public library"}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-2.5">
            <Label
              htmlFor="public-library-toggle"
              className="text-sm font-medium text-muted-foreground cursor-pointer"
            >
              My Uploads
            </Label>
            <Switch
              id="public-library-toggle"
              checked={publicLibraryMode}
              onCheckedChange={(v) => {
                setPublicLibraryMode(v);
                if (!v) {
                  setSearchQuery("");
                  setSearchResults([]);
                  setHasSearched(false);
                }
              }}
              data-ocid="library.toggle"
            />
            <Label
              htmlFor="public-library-toggle"
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              Global Public Forms
            </Label>
          </div>
        </div>

        {publicLibraryMode && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Search bar */}
            <Card className="bento-card">
              <CardContent className="pt-5 pb-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search for a public form (e.g., 'IRS W9' or 'California Rental Agreement')"
                      className="pl-9"
                      data-ocid="library.search_input"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    className="gap-2 px-5"
                    data-ocid="library.search.button"
                  >
                    <Search size={15} />
                    Search
                  </Button>
                </div>

                {/* Search Results */}
                {hasSearched && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 space-y-2"
                  >
                    {searchResults.length === 0 ? (
                      <div
                        className="text-center py-6 text-muted-foreground text-sm"
                        data-ocid="library.empty_state"
                      >
                        No forms found matching &ldquo;{searchQuery}&rdquo;. Try
                        terms like &ldquo;W-9&rdquo;, &ldquo;I-9&rdquo;, or
                        &ldquo;rental&rdquo;.
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground mb-3">
                          {searchResults.length} result
                          {searchResults.length !== 1 ? "s" : ""} found
                        </p>
                        {searchResults.map((form, idx) => (
                          <SearchResultCard
                            key={form.id}
                            form={form}
                            index={idx + 1}
                            isFetching={fetchingFormId === form.id}
                            onFetch={handleFetchForm}
                          />
                        ))}
                      </>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>

            {/* Trending Forms */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-primary" />
                <h3 className="font-semibold text-foreground">
                  Trending Forms
                </h3>
                <Badge variant="secondary" className="text-xs">
                  Top 5
                </Badge>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin">
                {trendingForms.map((form, idx) => (
                  <TrendingFormCard
                    key={form.id}
                    form={form}
                    rank={idx + 1}
                    isFetching={fetchingFormId === form.id}
                    onFetch={handleFetchForm}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {!publicLibraryMode && (
          <Card className="bento-card">
            <CardContent className="py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Globe size={24} className="text-primary" />
              </div>
              <p className="font-medium text-foreground mb-1">
                Access 12+ Official Government Forms
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Toggle &ldquo;Global Public Forms&rdquo; to search and fetch
                official PDFs from .gov sources directly into your workspace.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPublicLibraryMode(true)}
                className="gap-2 text-primary border-primary/30 hover:bg-primary/5"
                data-ocid="library.open_modal_button"
              >
                <Globe size={14} />
                Open Public Library
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search Result Card
// ---------------------------------------------------------------------------

interface SearchResultCardProps {
  form: PublicForm;
  index: number;
  isFetching: boolean;
  onFetch: (form: PublicForm) => void;
}

function SearchResultCard({
  form,
  index,
  isFetching,
  onFetch,
}: SearchResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      data-ocid={`library.item.${index}`}
      className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors group"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText size={18} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-semibold text-sm text-foreground">
            {form.name}
          </span>
          {form.isGov && (
            <Badge
              variant="outline"
              className="text-xs gap-1 border-emerald-500/50 text-emerald-600 bg-emerald-500/8 py-0"
            >
              <Shield size={10} />
              Source Verified
            </Badge>
          )}
          <Badge
            variant="outline"
            className={`text-xs py-0 border-0 ${
              CATEGORY_COLORS[form.category] ||
              "bg-secondary text-secondary-foreground"
            }`}
          >
            {form.category}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {form.description}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Globe size={10} />
            {form.domain}
          </span>
          <span className="text-xs text-muted-foreground">
            ~{form.fieldCount} fields
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDownloadCount(form.downloadCount)} downloads
          </span>
        </div>
      </div>
      <Button
        size="sm"
        onClick={() => onFetch(form)}
        disabled={isFetching}
        className="gap-2 flex-shrink-0"
        data-ocid={`library.item.${index}.primary_button`}
      >
        {isFetching ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        {isFetching ? "Fetching..." : "Use Official Version"}
      </Button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Trending Form Card
// ---------------------------------------------------------------------------

interface TrendingFormCardProps {
  form: PublicForm;
  rank: number;
  isFetching: boolean;
  onFetch: (form: PublicForm) => void;
}

function TrendingFormCard({
  form,
  rank,
  isFetching,
  onFetch,
}: TrendingFormCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.06 }}
      data-ocid={`trending.item.${rank}`}
      className="relative flex-shrink-0 w-52 rounded-2xl border border-border/60 bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all duration-200 group cursor-pointer"
    >
      {/* Rank badge */}
      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow">
        {rank}
      </div>

      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-sm text-foreground leading-tight">
            {form.name}
          </p>
          {form.isGov && (
            <Shield
              size={13}
              className="text-emerald-500 flex-shrink-0 mt-0.5"
            />
          )}
        </div>
        <Badge
          variant="outline"
          className={`text-xs py-0 border-0 ${
            CATEGORY_COLORS[form.category] ||
            "bg-secondary text-secondary-foreground"
          }`}
        >
          {form.category}
        </Badge>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <Download size={11} />
        <span>{formatDownloadCount(form.downloadCount)} downloads</span>
      </div>

      <Button
        size="sm"
        className="w-full gap-2 text-xs"
        onClick={() => onFetch(form)}
        disabled={isFetching}
        data-ocid={`trending.item.${rank}.primary_button`}
      >
        {isFetching ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Download size={12} />
        )}
        {isFetching ? "Fetching..." : "Download & Fill"}
      </Button>
    </motion.div>
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
