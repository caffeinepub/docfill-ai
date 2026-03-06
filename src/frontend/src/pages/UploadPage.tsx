import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  type CoordinateSlot,
  detectCoordinateSlots,
} from "@/utils/coordinateDetector";
import {
  type CoordinateFillEntry,
  type PdfFillEntry,
  fillAndDownloadPdf,
  fillAndDownloadPdfByCoordinates,
  getPdfFieldNames,
} from "@/utils/pdfFill";
import {
  MASTER_PROFILE_LABELS,
  type SemanticMapResult,
  semanticMap,
} from "@/utils/semanticMapping";
import {
  AlertCircle,
  Brain,
  Camera,
  CheckCircle2,
  CloudUpload,
  Download,
  FileCheck,
  FileText,
  Globe,
  Loader2,
  MapPin,
  RotateCcw,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { PDFDocument } from "pdf-lib";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface DetectedField {
  /** Raw field name from the PDF AcroForm */
  label: string;
  /** Friendly Master Profile label for display (e.g. "Full Name") */
  masterLabel: string | null;
  /** Matched Master Profile key (e.g. "name"), or null */
  profileKey: string | null;
  /** Profile value resolved from the matched key */
  profileValue: string;
  /** True when profileValue is non-empty */
  hasMatch: boolean;
  /** How the match was made */
  matchType: "semantic" | "keyword" | "none";
}

// ---------------------------------------------------------------------------
// Language translations for Haitian forms
// ---------------------------------------------------------------------------

const FIELD_LABEL_TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    "Full Name": "Nom complet",
    "Email Address": "Adresse e-mail",
    "Phone Number": "Numéro de téléphone",
    "Street Address": "Adresse postale",
    City: "Ville",
    State: "État",
    "Zip Code": "Code postal",
    "Date of Birth": "Date de naissance",
    "ID / Passport Number": "Numéro d'identification",
    Employer: "Employeur",
    "Job Title": "Titre du poste",
    "Referee 1 Name": "Nom du parrain 1",
    "Referee 2 Name": "Nom du parrain 2",
  },
  ht: {
    "Full Name": "Non konplè",
    "Email Address": "Adrès imèl",
    "Phone Number": "Nimewo telefòn",
    "Street Address": "Adrès",
    City: "Vil",
    State: "Eta",
    "Zip Code": "Kòd postal",
    "Date of Birth": "Dat nesans",
    "ID / Passport Number": "Nimewo idantifikasyon",
    Employer: "Anplwayè",
    "Job Title": "Tit travay",
    "Referee 1 Name": "Non patwon 1",
    "Referee 2 Name": "Non patwon 2",
  },
};

// ---------------------------------------------------------------------------
// Photo requirements guide
// ---------------------------------------------------------------------------

const PHOTO_SPECS: Record<string, string> = {
  n400: '📷 US Photo Spec: 2"×2" color photo, white background, taken within 30 days, no glasses.',
  "n1-jamaica":
    '📷 Jamaica Photo Spec: 1"×1" matte finish, white background, neutral expression, taken within 6 months. Two copies required.',
  ds2029:
    '📷 DS-2029 Photo Spec: 2"×2" color photo, white background, neutral expression, within 6 months.',
};

interface ExtraProfile {
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  dob: string;
  idNumber: string;
  employer: string;
  jobTitle: string;
}

interface RefereeData {
  referee1Name?: string;
  referee1Phone?: string;
  referee1Address?: string;
  referee2Name?: string;
  referee2Phone?: string;
  referee2Address?: string;
}

function getProfileData() {
  const extra = JSON.parse(
    localStorage.getItem("docfill_profile_extra") || "{}",
  ) as ExtraProfile;
  const profile = JSON.parse(
    localStorage.getItem("docfill_user_profile") || "{}",
  ) as { name?: string; email?: string };
  const refs = JSON.parse(
    localStorage.getItem("docfill_referees") || "{}",
  ) as RefereeData;
  return { ...profile, ...extra, ...refs };
}

/**
 * For each actual PDF field name, use semanticMap to find the corresponding
 * profile key and value.
 */
function buildDetectedFields(
  pdfFieldNames: string[],
  profileData: Record<string, string | undefined>,
): DetectedField[] {
  return pdfFieldNames.map((fieldName) => {
    const result: SemanticMapResult = semanticMap(fieldName);
    const profileKey = result.key;
    const profileValue =
      profileKey && profileData[profileKey]
        ? (profileData[profileKey] as string).trim()
        : "";
    const hasMatch = profileValue.length > 0;
    const masterLabel = profileKey
      ? (MASTER_PROFILE_LABELS[profileKey] ?? null)
      : null;
    const matchType: DetectedField["matchType"] =
      profileKey === null ? "none" : result.matchType;

    return {
      label: fieldName,
      masterLabel,
      profileKey,
      profileValue,
      hasMatch,
      matchType,
    };
  });
}

/**
 * Build the fill entries using semanticMap directly on PDF field names.
 * Overrides keyed by profileKey take priority over the original profile value.
 */
function buildFillMapping(
  pdfFieldNames: string[],
  overrides: Record<string, string>,
  profileData: Record<string, string | undefined>,
): PdfFillEntry[] {
  const result: PdfFillEntry[] = [];

  for (const pdfName of pdfFieldNames) {
    const { key } = semanticMap(pdfName);
    if (!key) continue;

    const value =
      overrides[key] !== undefined ? overrides[key] : (profileData[key] ?? "");

    if (value?.trim()) {
      result.push({ fieldName: pdfName, value: value.trim() });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Match type badge helper
// ---------------------------------------------------------------------------

type MatchBadgeType = DetectedField["matchType"] | "visual";

function MatchTypeBadge({ type }: { type: MatchBadgeType }) {
  if (type === "semantic") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 h-5 bg-success/10 text-success border-success/30 font-medium"
      >
        Semantic
      </Badge>
    );
  }
  if (type === "keyword") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 text-primary border-primary/30 font-medium"
      >
        Keyword
      </Badge>
    );
  }
  if (type === "visual") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 h-5 bg-warning/10 text-warning border-warning/30 font-medium"
      >
        Visual
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-[10px] px-1.5 py-0 h-5 bg-muted text-muted-foreground border-border font-medium"
    >
      No Match
    </Badge>
  );
}

type Stage =
  | "idle"
  | "extracting"
  | "no_fields"
  | "detected"
  | "coord_detected"
  | "review"
  | "coord_review"
  | "filling"
  | "complete";

type ReviewLang = "en" | "fr" | "ht";

interface UploadPageProps {
  templateId?: string | null;
}

export function UploadPage({ templateId }: UploadPageProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [pdfFieldNames, setPdfFieldNames] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Coordinate mode state
  const [coordSlots, setCoordSlots] = useState<CoordinateSlot[]>([]);
  const [coordOverrides, setCoordOverrides] = useState<Record<string, string>>(
    {},
  );
  const [fillMode, setFillMode] = useState<"acroform" | "coordinate">(
    "acroform",
  );

  // N-400 smart detection banner
  const [n400BannerDismissed, setN400BannerDismissed] = useState(false);

  // Language toggle for Haitian forms
  const [reviewLang, setReviewLang] = useState<ReviewLang>("en");

  const isHaitianForm = templateId === "ds2029" || templateId === "i821";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Check if the detected fields suggest an N-400
  const isLikelyN400 = useCallback(
    (fileName: string, fieldNames: string[]): boolean => {
      if (templateId === "n400") return false; // already applied
      const nameLower = fileName.toLowerCase();
      const nameMatch =
        nameLower.includes("n400") ||
        nameLower.includes("n-400") ||
        nameLower.includes("naturalization");
      const n400Keywords = [
        "alien",
        "uscis",
        "naturalization",
        "a-number",
        "a number",
      ];
      const fieldMatchCount = fieldNames.filter((f) =>
        n400Keywords.some((kw) => f.toLowerCase().includes(kw)),
      ).length;
      return nameMatch || fieldMatchCount >= 3;
    },
    [templateId],
  );

  // Auto-trigger extraction when file is dropped/selected
  const triggerExtraction = useCallback(
    (selectedFile: File) => {
      setFile(selectedFile);
      setStage("extracting");
      setExtractionProgress(0);
      setOverrides({});
      setCoordOverrides({});
      setN400BannerDismissed(false);

      const startTime = Date.now();
      const duration = 3000;

      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min((elapsed / duration) * 95, 95);
        setExtractionProgress(pct);
        if (elapsed >= duration) {
          if (progressIntervalRef.current)
            clearInterval(progressIntervalRef.current);
        }
      }, 50);

      setTimeout(async () => {
        if (progressIntervalRef.current)
          clearInterval(progressIntervalRef.current);
        setExtractionProgress(100);

        // Get real PDF field names
        const realFieldNames = await getPdfFieldNames(selectedFile);

        if (realFieldNames.length === 0) {
          // Coordinate detection path
          const profile = getProfileData();
          try {
            const ab = await selectedFile.arrayBuffer();
            const tempDoc = await PDFDocument.load(ab, {
              ignoreEncryption: true,
            });
            const firstPage = tempDoc.getPage(0);
            const { width, height } = firstPage.getSize();
            const slots = detectCoordinateSlots(profile, width, height);
            if (slots.length === 0) {
              setStage("no_fields");
              return;
            }
            setCoordSlots(slots);
            setCoordOverrides({});
            setFillMode("coordinate");
            setStage("coord_detected");
          } catch {
            setStage("no_fields");
          }
          return;
        }

        setFillMode("acroform");
        setPdfFieldNames(realFieldNames);
        const profile = getProfileData();
        const fields = buildDetectedFields(realFieldNames, profile);
        setDetectedFields(fields);
        setStage("detected");
      }, 3000);
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: isLikelyN400 is a stable callback
    [],
  );

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile?.type === "application/pdf") {
        triggerExtraction(droppedFile);
      } else {
        toast.error("Please upload a PDF file");
      }
    },
    [triggerExtraction],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile?.type === "application/pdf") {
        triggerExtraction(selectedFile);
      } else {
        toast.error("Please upload a PDF file");
      }
    },
    [triggerExtraction],
  );

  const handleAutoFill = useCallback(async () => {
    if (!file) return;
    setStage("filling");

    try {
      if (fillMode === "coordinate") {
        const entriesToFill: CoordinateFillEntry[] = coordSlots
          .map((slot) => ({
            text:
              coordOverrides[slot.profileKey] !== undefined
                ? coordOverrides[slot.profileKey]
                : slot.suggestedText,
            x: slot.x,
            y: slot.y,
            page: slot.page,
            fontSize: slot.fontSize,
          }))
          .filter((e) => e.text.trim().length > 0);

        const outputFilename = file.name.replace(/\.pdf$/i, "_filled.pdf");
        await fillAndDownloadPdfByCoordinates(
          file,
          entriesToFill,
          outputFilename,
        );
        setStage("complete");
        toast.success("Document filled and downloaded!");
        return;
      }

      // AcroForm path
      const profile = getProfileData();
      const fillData = buildFillMapping(pdfFieldNames, overrides, profile);
      const outputFilename = file.name.replace(/\.pdf$/i, "_filled.pdf");

      const result = await fillAndDownloadPdf(file, fillData, outputFilename);

      if (result === null) {
        toast.error("No fillable fields detected in this PDF.");
        setStage("no_fields");
        return;
      }

      setStage("complete");
      toast.success("Document filled and downloaded!");
    } catch {
      toast.error("Failed to fill document. Please try again.");
      setStage(fillMode === "coordinate" ? "coord_detected" : "review");
    }
  }, [file, pdfFieldNames, overrides, fillMode, coordSlots, coordOverrides]);

  const handleReset = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setStage("idle");
    setFile(null);
    setDetectedFields([]);
    setExtractionProgress(0);
    setPdfFieldNames([]);
    setOverrides({});
    setCoordSlots([]);
    setCoordOverrides({});
    setFillMode("acroform");
    setN400BannerDismissed(false);
    setReviewLang("en");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Effective matched fields (respecting overrides keyed by profileKey)
  const effectiveFields = detectedFields.map((f) => {
    const overrideVal =
      f.profileKey !== null ? overrides[f.profileKey] : undefined;
    const effectiveValue =
      overrideVal !== undefined ? overrideVal : f.profileValue;
    const hasMatch =
      overrideVal !== undefined ? overrideVal.length > 0 : f.hasMatch;
    return { ...f, effectiveValue, hasMatch };
  });

  // Effective coord slots for the review stage
  const effectiveCoordSlots = coordSlots.map((slot) => ({
    ...slot,
    effectiveText:
      coordOverrides[slot.profileKey] !== undefined
        ? coordOverrides[slot.profileKey]
        : slot.suggestedText,
  }));

  const matchedFields = effectiveFields.filter((f) => f.hasMatch);
  const semanticCount = detectedFields.filter(
    (f) => f.matchType === "semantic",
  ).length;

  // N-400 detection banner visibility
  const showN400Banner =
    !n400BannerDismissed &&
    stage === "detected" &&
    file !== null &&
    isLikelyN400(file.name, pdfFieldNames);

  const filledCoordCount = effectiveCoordSlots.filter(
    (s) => s.effectiveText.trim().length > 0,
  ).length;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
              Upload Portal
            </h1>
            <p className="text-muted-foreground text-sm">
              Upload a PDF to detect fields and auto-fill from your profile
              {templateId && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  Template: {templateId.toUpperCase().replace("-", " ")}
                </span>
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stage Cards */}
      <AnimatePresence mode="wait">
        {/* IDLE — Drop Zone */}
        {stage === "idle" && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {/* Photo Guide */}
            {templateId && PHOTO_SPECS[templateId] && (
              <div
                data-ocid="upload.photo_guide.panel"
                className="flex items-start gap-3 rounded-xl bg-blue-500/8 border border-blue-500/20 px-4 py-3 mb-4"
              >
                <Camera
                  size={16}
                  className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  {PHOTO_SPECS[templateId]}
                </p>
              </div>
            )}
            <Card className="bento-card">
              <CardContent className="p-0">
                <label
                  data-ocid="upload.dropzone"
                  htmlFor="pdf-file-input"
                  aria-label="Upload PDF file"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "flex flex-col items-center justify-center py-16 px-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200",
                    isDragging
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-border hover:border-primary/50 hover:bg-muted/30",
                  )}
                >
                  <div
                    className={cn(
                      "w-20 h-20 rounded-3xl flex items-center justify-center mb-5 transition-all duration-200",
                      isDragging ? "bg-primary/20 scale-110" : "bg-primary/10",
                    )}
                  >
                    <CloudUpload
                      size={36}
                      className={
                        isDragging ? "text-primary" : "text-primary/70"
                      }
                    />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-lg mb-2">
                    {isDragging ? "Drop your PDF here" : "Drag & drop your PDF"}
                  </h3>
                  <p className="text-sm text-muted-foreground text-center mb-5">
                    or click to browse files — AI extraction starts
                    automatically
                  </p>
                  <Button
                    data-ocid="upload.upload_button"
                    variant="outline"
                    size="sm"
                    className="gap-2 border-primary/30 text-primary hover:bg-primary/5 pointer-events-none"
                  >
                    <Upload size={15} />
                    Choose PDF file
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    Supports fillable and flat PDF forms up to 50MB
                  </p>
                  <input
                    id="pdf-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* EXTRACTING — AI Loading */}
        {stage === "extracting" && (
          <motion.div
            key="extracting"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bento-card" data-ocid="upload.loading_state">
              <CardContent className="py-12 px-6 text-center">
                {/* File info */}
                <div className="flex items-center gap-3 mb-8 p-3 rounded-xl bg-muted/40 text-left">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {file
                        ? `${(file.size / 1024).toFixed(1)} KB · PDF Document`
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Animated Brain */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring" />
                  <div
                    className="absolute inset-0 rounded-full bg-primary/10 animate-ping"
                    style={{ animationDuration: "2s", animationDelay: "0.3s" }}
                  />
                  <div className="relative w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
                    <Brain size={32} className="text-primary animate-pulse" />
                  </div>
                </div>

                <h3 className="font-display font-semibold text-foreground text-lg mb-2">
                  AI Extraction in Progress
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Scanning document structure and running semantic field
                  mapping...
                </p>

                {/* Progress bar */}
                <div className="space-y-2">
                  <Progress value={extractionProgress} className="h-2.5" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Analyzing form structure</span>
                    <span>{Math.round(extractionProgress)}%</span>
                  </div>
                </div>

                {/* Step indicators */}
                <div className="flex items-center justify-center gap-6 mt-6">
                  {[
                    { label: "Parsing PDF", done: extractionProgress > 25 },
                    { label: "Field Detection", done: extractionProgress > 55 },
                    {
                      label: "Coordinate Detection",
                      done: extractionProgress > 85,
                    },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors duration-300",
                          step.done ? "bg-success" : "bg-border",
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs transition-colors duration-300",
                          step.done
                            ? "text-foreground font-medium"
                            : "text-muted-foreground",
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* NO FIELDS — Error State (only shown when profile is empty too) */}
        {stage === "no_fields" && (
          <motion.div
            key="no_fields"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              className="bento-card border-destructive/30 overflow-hidden"
              data-ocid="upload.no_fields.error_state"
            >
              <div className="h-1 bg-gradient-to-r from-destructive via-destructive/60 to-destructive/20" />
              <CardContent className="py-10 px-6 text-center">
                {/* File info */}
                <div className="flex items-center gap-3 mb-8 p-3 rounded-xl bg-muted/40 text-left">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {file
                        ? `${(file.size / 1024).toFixed(1)} KB · PDF Document`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
                  <AlertCircle size={32} className="text-destructive" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-xl mb-2">
                  No Fillable Fields Detected
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  No fillable fields detected. Please upload a fillable PDF form
                  or complete your Master Profile so coordinate placement can be
                  used.
                </p>
                <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-left mb-6 text-xs text-muted-foreground max-w-sm mx-auto">
                  <p className="font-medium text-foreground mb-1">Tip</p>
                  <p>
                    A fillable PDF is a form with interactive text fields.
                    Scanned PDFs or flat documents can still be filled using
                    coordinate-based placement if your Master Profile has data.
                  </p>
                </div>
                <Button
                  data-ocid="upload.no_fields.button"
                  onClick={handleReset}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <RotateCcw size={15} />
                  Try Another PDF
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* COORD DETECTED — Visual Placement Preview */}
        {stage === "coord_detected" && (
          <motion.div
            key="coord_detected"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bento-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <MapPin size={16} className="text-warning" />
                    Visual Placement Preview
                    <Badge
                      variant="outline"
                      className="text-xs ml-1 bg-warning/10 text-warning border-warning/30"
                    >
                      {coordSlots.length} slot
                      {coordSlots.length !== 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="text-xs bg-warning/10 text-warning border-warning/30"
                  >
                    Coordinate Mode
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  No native form fields detected — AI has mapped where your data
                  should appear. Values are editable and only apply to this
                  document.
                </p>
              </CardHeader>
              <CardContent>
                <div
                  className="rounded-xl border border-border overflow-hidden mb-4"
                  data-ocid="upload.coord_detected.table"
                >
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-xs font-semibold text-muted-foreground w-[25%]">
                          Label
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground w-[40%]">
                          Overlay Value
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground w-[22%]">
                          Position
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground text-center w-[13%]">
                          Match
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coordSlots.map((slot, idx) => {
                        const overrideVal = coordOverrides[slot.profileKey];
                        const effectiveText =
                          overrideVal !== undefined
                            ? overrideVal
                            : slot.suggestedText;
                        const hasValue = effectiveText.trim().length > 0;

                        return (
                          <motion.tr
                            key={`coord-${slot.profileKey}-${idx}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04, duration: 0.2 }}
                            className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                          >
                            {/* Label column */}
                            <TableCell className="py-2">
                              <div className="flex flex-col gap-0.5">
                                <p className="text-sm font-medium text-foreground">
                                  {slot.label}
                                </p>
                                <MatchTypeBadge type="visual" />
                              </div>
                            </TableCell>

                            {/* Editable overlay value */}
                            <TableCell className="py-1.5">
                              <Input
                                data-ocid={`upload.coord_field_override.input.${idx + 1}`}
                                value={effectiveText}
                                onChange={(e) => {
                                  setCoordOverrides((prev) => ({
                                    ...prev,
                                    [slot.profileKey]: e.target.value,
                                  }));
                                }}
                                placeholder="—"
                                className="h-8 text-sm"
                              />
                            </TableCell>

                            {/* Position badge */}
                            <TableCell className="py-2">
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 rounded px-1.5 py-0.5 whitespace-nowrap">
                                ({Math.round(slot.x)}, {Math.round(slot.y)})
                              </span>
                            </TableCell>

                            {/* Match checkmark */}
                            <TableCell className="py-2 text-center">
                              {hasValue ? (
                                <CheckCircle2
                                  size={16}
                                  className="text-success inline-block"
                                  aria-label="Has value"
                                />
                              ) : (
                                <XCircle
                                  size={16}
                                  className="text-destructive inline-block"
                                  aria-label="Empty"
                                />
                              )}
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Button
                    data-ocid="upload.coord_review.button"
                    onClick={() => setStage("review")}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-glow"
                  >
                    <FileCheck size={16} />
                    Proceed to Review
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="gap-2"
                  >
                    <RotateCcw size={15} />
                    Start over
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* DETECTED — Field Mapping Preview TABLE */}
        {stage === "detected" && (
          <motion.div
            key="detected"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bento-card">
              {/* N-400 Smart Detection Banner */}
              <AnimatePresence>
                {showN400Banner && (
                  <motion.div
                    key="n400-banner"
                    data-ocid="upload.n400_detection.panel"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 px-5 py-3 bg-amber-500/10 border-b border-amber-500/20 flex-wrap"
                  >
                    <AlertCircle
                      size={15}
                      className="text-amber-600 dark:text-amber-400 flex-shrink-0"
                    />
                    <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                      This looks like an N-400 form. Apply N-400 Template Logic
                      for better field matching?
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        data-ocid="upload.n400_detection.apply.button"
                        size="sm"
                        className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => {
                          const profile = getProfileData();
                          const fields = buildDetectedFields(
                            pdfFieldNames,
                            profile,
                          );
                          setDetectedFields(fields);
                          setN400BannerDismissed(true);
                          toast.success("N-400 Template Logic applied");
                        }}
                      >
                        Apply
                      </Button>
                      <button
                        type="button"
                        data-ocid="upload.n400_detection.dismiss_button"
                        className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400 underline"
                        onClick={() => setN400BannerDismissed(true)}
                      >
                        Dismiss
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    Field Mapping Preview
                    <Badge variant="secondary" className="text-xs ml-1">
                      {detectedFields.length} field
                      {detectedFields.length !== 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {semanticCount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-success/10 text-success border-success/30"
                      >
                        {semanticCount} semantic
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-xs text-success border-success/30 bg-success/8"
                    >
                      {matchedFields.length} matched
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Semantic mapping understands field labels like 'Legal Name' to
                  match your profile. You can edit any value below — changes
                  only apply to this document.
                </p>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border overflow-hidden mb-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-xs font-semibold text-muted-foreground w-[30%]">
                          Form Field
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground w-[42%]">
                          Profile Value
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground text-center w-[15%]">
                          Type
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground text-center w-[13%]">
                          Match
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detectedFields.map((field, idx) => {
                        const overrideVal =
                          field.profileKey !== null
                            ? overrides[field.profileKey]
                            : undefined;
                        const effectiveValue =
                          overrideVal !== undefined
                            ? overrideVal
                            : field.profileValue;
                        const isMatched = effectiveValue.length > 0;

                        return (
                          <motion.tr
                            key={`${field.label}-${idx}`}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04, duration: 0.2 }}
                            className="border-b border-border/60 hover:bg-muted/30 transition-colors"
                          >
                            {/* Form Field column: raw PDF name + matched profile key */}
                            <TableCell className="py-2">
                              <p
                                className="text-sm font-medium text-foreground truncate max-w-[160px]"
                                title={field.label}
                              >
                                {field.label}
                              </p>
                              {field.masterLabel && (
                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[160px]">
                                  → {field.masterLabel}
                                </p>
                              )}
                            </TableCell>

                            {/* Editable Profile Value */}
                            <TableCell className="py-1.5">
                              <Input
                                data-ocid={`upload.field_override.input.${idx + 1}`}
                                value={effectiveValue}
                                onChange={(e) => {
                                  if (field.profileKey !== null) {
                                    setOverrides((prev) => ({
                                      ...prev,
                                      [field.profileKey as string]:
                                        e.target.value,
                                    }));
                                  }
                                }}
                                disabled={field.profileKey === null}
                                placeholder={
                                  field.profileKey === null
                                    ? "No profile key matched"
                                    : "—"
                                }
                                className="h-8 text-sm"
                              />
                            </TableCell>

                            {/* Match Type badge */}
                            <TableCell className="py-2 text-center">
                              <MatchTypeBadge type={field.matchType} />
                            </TableCell>

                            {/* Match checkmark / X */}
                            <TableCell className="py-2 text-center">
                              {isMatched ? (
                                <CheckCircle2
                                  size={16}
                                  className="text-success inline-block"
                                  aria-label="Matched"
                                />
                              ) : (
                                <XCircle
                                  size={16}
                                  className="text-destructive inline-block"
                                  aria-label="Missing"
                                />
                              )}
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Button
                    data-ocid="upload.review.button"
                    onClick={() => setStage("review")}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-glow"
                  >
                    <FileCheck size={16} />
                    Proceed to Review
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="gap-2"
                  >
                    <RotateCcw size={15} />
                    Start over
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* REVIEW — Review & Generate (handles both acroform + coordinate modes) */}
        {(stage === "review" || stage === "filling") && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bento-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileCheck size={16} className="text-primary" />
                      Review &amp; Generate
                      {fillMode === "coordinate" && (
                        <Badge
                          variant="outline"
                          className="text-xs ml-1 bg-warning/10 text-warning border-warning/30"
                        >
                          Coordinate Mode
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {fillMode === "coordinate"
                        ? "Confirm the data to be overlaid onto your document at the detected positions"
                        : "Confirm the data to be injected into your document"}
                    </p>
                  </div>
                  {/* Language toggle — shown only for Haitian forms */}
                  {isHaitianForm && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Globe size={13} className="text-muted-foreground" />
                      {(["en", "fr", "ht"] as ReviewLang[]).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          data-ocid={`upload.lang.${lang}.toggle`}
                          onClick={() => setReviewLang(lang)}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                            reviewLang === lang
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80",
                          )}
                        >
                          {lang === "ht" ? "Kreyòl" : lang.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* File info */}
                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-muted/40">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fillMode === "coordinate"
                        ? `${filledCoordCount} of ${coordSlots.length} slots will be overlaid`
                        : `${matchedFields.length} of ${effectiveFields.length} fields will be filled`}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-success/10 text-success border-success/20 flex-shrink-0"
                  >
                    {fillMode === "coordinate"
                      ? `${filledCoordCount} overlays`
                      : `${matchedFields.length} fills`}
                  </Badge>
                </div>

                {/* Summary table */}
                {fillMode === "coordinate" ? (
                  effectiveCoordSlots.filter((s) => s.effectiveText.trim())
                    .length > 0 ? (
                    <div className="rounded-xl border border-border overflow-hidden mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="text-xs font-semibold text-muted-foreground">
                              Field
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-muted-foreground">
                              Value
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-muted-foreground">
                              Position
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {effectiveCoordSlots
                            .filter((s) => s.effectiveText.trim())
                            .map((slot, idx) => (
                              <TableRow
                                key={`coord-review-${slot.profileKey}-${idx}`}
                                className="border-b border-border/60 hover:bg-muted/30"
                              >
                                <TableCell className="py-2.5 text-sm font-medium text-foreground">
                                  {slot.label}
                                </TableCell>
                                <TableCell className="py-2.5 text-sm text-foreground">
                                  {slot.effectiveText}
                                </TableCell>
                                <TableCell className="py-2.5">
                                  <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 rounded px-1.5 py-0.5 whitespace-nowrap">
                                    ({Math.round(slot.x)}, {Math.round(slot.y)})
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border bg-muted/20 p-6 text-center mb-4">
                      <p className="text-sm text-muted-foreground">
                        No overlay data available.{" "}
                        <span className="text-primary">
                          Complete your profile
                        </span>{" "}
                        to enable auto-fill.
                      </p>
                    </div>
                  )
                ) : matchedFields.length > 0 ? (
                  <div className="rounded-xl border border-border overflow-hidden mb-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs font-semibold text-muted-foreground">
                            Field
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground">
                            Value
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matchedFields.map((field, idx) => {
                          const displayLabel = field.masterLabel ?? field.label;
                          const translatedLabel =
                            reviewLang !== "en" && field.masterLabel
                              ? (FIELD_LABEL_TRANSLATIONS[reviewLang]?.[
                                  field.masterLabel
                                ] ?? displayLabel)
                              : displayLabel;
                          return (
                            <TableRow
                              key={`review-${field.label}-${idx}`}
                              className="border-b border-border/60 hover:bg-muted/30"
                            >
                              <TableCell className="py-2.5 text-sm font-medium text-foreground">
                                <span title={field.label}>
                                  {translatedLabel}
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5 text-sm text-foreground">
                                {field.profileKey === "dob" &&
                                field.effectiveValue
                                  ? (() => {
                                      try {
                                        return new Date(
                                          field.effectiveValue,
                                        ).toLocaleDateString();
                                      } catch {
                                        return field.effectiveValue;
                                      }
                                    })()
                                  : field.effectiveValue}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/20 p-6 text-center mb-4">
                    <p className="text-sm text-muted-foreground">
                      No profile data available to fill.{" "}
                      <span className="text-primary">
                        Complete your profile
                      </span>{" "}
                      to enable auto-fill.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 flex-wrap">
                  <Button
                    data-ocid="upload.generate.button"
                    onClick={handleAutoFill}
                    disabled={stage === "filling"}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-glow"
                  >
                    {stage === "filling" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    {stage === "filling"
                      ? "Filling PDF..."
                      : "Generate & Download"}
                  </Button>
                  <Button
                    data-ocid="upload.review.back.button"
                    variant="outline"
                    onClick={() =>
                      setStage(
                        fillMode === "coordinate"
                          ? "coord_detected"
                          : "detected",
                      )
                    }
                    disabled={stage === "filling"}
                    className="gap-2"
                  >
                    <RotateCcw size={15} />
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* COMPLETE */}
        {stage === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, type: "spring" }}
          >
            <Card
              className="bento-card border-success/30 overflow-hidden"
              data-ocid="upload.success_state"
            >
              <div className="h-1 bg-gradient-to-r from-success via-success/60 to-success/20" />
              <CardContent className="py-10 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={32} className="text-success" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-xl mb-2">
                  Document Filled &amp; Downloaded!
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  <strong className="text-foreground">{file?.name}</strong> has
                  been filled with your profile data and downloaded to your
                  device.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    data-ocid="upload.new_upload.button"
                    variant="outline"
                    onClick={handleReset}
                    className="gap-2"
                  >
                    <Upload size={15} />
                    Upload another
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How it works — only on idle */}
      {stage === "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          <Card className="bento-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                  {
                    step: "1",
                    icon: Upload,
                    title: "Upload PDF",
                    desc: "Drag and drop or select any PDF — fillable forms or flat documents",
                  },
                  {
                    step: "2",
                    icon: Brain,
                    title: "AI Detection",
                    desc: "AI maps field labels using semantic understanding, or detects placement coordinates for flat documents.",
                  },
                  {
                    step: "3",
                    icon: FileCheck,
                    title: "Review & Edit",
                    desc: "Preview data, override any values for this document",
                  },
                  {
                    step: "4",
                    icon: Download,
                    title: "Download",
                    desc: "Filled PDF is generated and downloaded to your device",
                  },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.step} className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm font-display">
                        {s.step}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon size={13} className="text-primary" />
                          <p className="text-sm font-semibold text-foreground">
                            {s.title}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
