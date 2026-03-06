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
  type PdfFillEntry,
  fillAndDownloadPdf,
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
  CheckCircle2,
  CloudUpload,
  Download,
  FileCheck,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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

function getProfileData() {
  const extra = JSON.parse(
    localStorage.getItem("docfill_profile_extra") || "{}",
  ) as ExtraProfile;
  const profile = JSON.parse(
    localStorage.getItem("docfill_user_profile") || "{}",
  ) as { name?: string; email?: string };
  return { ...profile, ...extra };
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

function MatchTypeBadge({ type }: { type: DetectedField["matchType"] }) {
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
  | "review"
  | "filling"
  | "complete";

export function UploadPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [pdfFieldNames, setPdfFieldNames] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Auto-trigger extraction when file is dropped/selected
  const triggerExtraction = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setStage("extracting");
    setExtractionProgress(0);
    setOverrides({});

    const startTime = Date.now();
    const duration = 3000;

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
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
        setStage("no_fields");
        return;
      }

      setPdfFieldNames(realFieldNames);
      const profile = getProfileData();
      const fields = buildDetectedFields(realFieldNames, profile);
      setDetectedFields(fields);
      setStage("detected");
    }, 3000);
  }, []);

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
      setStage("review");
    }
  }, [file, pdfFieldNames, overrides]);

  const handleReset = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setStage("idle");
    setFile(null);
    setDetectedFields([]);
    setExtractionProgress(0);
    setPdfFieldNames([]);
    setOverrides({});
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

  const matchedFields = effectiveFields.filter((f) => f.hasMatch);
  const semanticCount = detectedFields.filter(
    (f) => f.matchType === "semantic",
  ).length;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
          Upload Portal
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload a PDF to detect fields and auto-fill from your profile
        </p>
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
                    Supports fillable PDF forms up to 50MB
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
                      label: "Semantic Mapping",
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

        {/* NO FIELDS — Error State */}
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
                  No fillable fields detected. Please upload a fillable PDF
                  form.
                </p>
                <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-left mb-6 text-xs text-muted-foreground max-w-sm mx-auto">
                  <p className="font-medium text-foreground mb-1">Tip</p>
                  <p>
                    A fillable PDF is a form with interactive text fields.
                    Scanned PDFs or flat documents do not have fillable fields.
                    Look for PDFs labeled as "fillable form" or "interactive
                    form."
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

        {/* REVIEW — Review & Generate */}
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
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileCheck size={16} className="text-primary" />
                  Review &amp; Generate
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Confirm the data to be injected into your document
                </p>
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
                      {matchedFields.length} of {effectiveFields.length} fields
                      will be filled
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-success/10 text-success border-success/20 flex-shrink-0"
                  >
                    {matchedFields.length} fills
                  </Badge>
                </div>

                {/* Summary table — only matched fields with effective values */}
                {matchedFields.length > 0 ? (
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
                        {matchedFields.map((field, idx) => (
                          <TableRow
                            key={`review-${field.label}-${idx}`}
                            className="border-b border-border/60 hover:bg-muted/30"
                          >
                            <TableCell className="py-2.5 text-sm font-medium text-foreground">
                              <span title={field.label}>
                                {field.masterLabel ?? field.label}
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
                        ))}
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
                    onClick={() => setStage("detected")}
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
                    desc: "Drag and drop or select your fillable PDF form",
                  },
                  {
                    step: "2",
                    icon: Brain,
                    title: "Semantic Mapping",
                    desc: "Semantic mapping understands field labels like 'Legal Name' to match your profile",
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
