import { DataMappingPanel } from "@/components/DataMappingPanel";
import { MissingInfoDrawer } from "@/components/MissingInfoDrawer";
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
import { diffFieldsAgainstProfile } from "@/utils/fieldDiscovery";
import type { MappedField } from "@/utils/fieldDiscovery";
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
  ExternalLink,
  FileCheck,
  FileText,
  Globe,
  Loader2,
  MapPin,
  RotateCcw,
  Shield,
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
  const referees = JSON.parse(
    localStorage.getItem("docfill_referees") || "{}",
  ) as RefereeData;
  const privacyMode = localStorage.getItem("docfill_privacy_mode") === "on";
  if (privacyMode) return {} as Record<string, string>;

  return {
    name: profile.name || "",
    email: profile.email || "",
    phone: extra.phone || "",
    street: extra.street || "",
    city: extra.city || "",
    state: extra.state || "",
    zip: extra.zip || "",
    dob: extra.dob || "",
    idNumber: extra.idNumber || "",
    employer: extra.employer || "",
    jobTitle: extra.jobTitle || "",
    referee1Name: referees.referee1Name || "",
    referee1Phone: referees.referee1Phone || "",
    referee1Address: referees.referee1Address || "",
    referee2Name: referees.referee2Name || "",
    referee2Phone: referees.referee2Phone || "",
    referee2Address: referees.referee2Address || "",
  };
}

function buildDetectedFields(
  fieldNames: string[],
  profile: Record<string, string>,
): DetectedField[] {
  return fieldNames.map((raw) => {
    const { key, matchType } = semanticMap(raw);
    const profileValue = key !== null ? (profile[key] ?? "") : "";
    return {
      label: raw,
      masterLabel: key !== null ? (MASTER_PROFILE_LABELS[key] ?? null) : null,
      profileKey: key,
      profileValue,
      hasMatch: profileValue.trim().length > 0,
      matchType: key === null ? "none" : matchType,
    };
  });
}

function buildFillMapping(
  fieldNames: string[],
  overrides: Record<string, string>,
  profile: Record<string, string>,
): PdfFillEntry[] {
  const result: PdfFillEntry[] = [];
  for (const pdfName of fieldNames) {
    const { key } = semanticMap(pdfName);
    if (key === null) continue;
    const value =
      overrides[key] !== undefined ? overrides[key] : (profile[key] ?? "");
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
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [pdfFieldNames, setPdfFieldNames] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Split-screen state
  const [mappedMatched, setMappedMatched] = useState<MappedField[]>([]);
  const [mappedDiscovered, setMappedDiscovered] = useState<MappedField[]>([]);
  const [discoveredValues, setDiscoveredValues] = useState<
    Record<string, string>
  >({});
  const [saveChecked, setSaveChecked] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

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
  const [publicFormMeta, setPublicFormMeta] = useState<{
    formName: string;
    domain: string;
    isVerified: boolean;
  } | null>(null);

  // Language toggle for Haitian forms
  const [reviewLang, setReviewLang] = useState<ReviewLang>("en");

  const isHaitianForm = templateId === "ds2029" || templateId === "i821";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Revoke object URL on cleanup
  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

  // Check sessionStorage for public form fetched from dashboard
  useEffect(() => {
    const stored = sessionStorage.getItem("docfill_public_form");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        base64: string;
        fileName: string;
        formName: string;
        domain: string;
        isVerified: boolean;
        fromPublicLibrary: boolean;
      };
      sessionStorage.removeItem("docfill_public_form");
      if (!parsed.fromPublicLibrary) return;

      setPublicFormMeta({
        formName: parsed.formName,
        domain: parsed.domain,
        isVerified: parsed.isVerified,
      });

      // Reconstruct Blob from base64
      const byteChars = atob(parsed.base64);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNums);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const reconstructedFile = new File([blob], parsed.fileName, {
        type: "application/pdf",
      });

      // Auto-trigger recognition after short delay
      setTimeout(() => {
        triggerExtraction(reconstructedFile);
      }, 300);
    } catch {
      // Silently ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if the detected fields suggest an N-400
  const isLikelyN400 = useCallback(
    (fileName: string, fieldNames: string[]): boolean => {
      if (templateId === "n400") return false;
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
  const triggerExtraction = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setStage("extracting");
    setExtractionProgress(0);
    setOverrides({});
    setCoordOverrides({});
    setN400BannerDismissed(false);
    setDiscoveredValues({});
    setSaveChecked({});
    setDrawerOpen(false);

    // Create PDF preview URL
    const objUrl = URL.createObjectURL(selectedFile);
    setPdfObjectUrl(objUrl);

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

      const realFieldNames = await getPdfFieldNames(selectedFile);

      if (realFieldNames.length === 0) {
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

      // Compute split-screen buckets
      const rawDetected = realFieldNames.map((l) => ({ label: l }));
      const { matched, discovered } = diffFieldsAgainstProfile(
        rawDetected,
        profile,
      );
      setMappedMatched(matched);
      setMappedDiscovered(discovered);

      setStage("detected");

      // Auto-open drawer if discovered fields exist
      if (discovered.length > 0) {
        setTimeout(() => setDrawerOpen(true), 400);
      }
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
    if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    setStage("idle");
    setFile(null);
    setPdfObjectUrl(null);
    setDetectedFields([]);
    setExtractionProgress(0);
    setPdfFieldNames([]);
    setOverrides({});
    setCoordSlots([]);
    setCoordOverrides({});
    setFillMode("acroform");
    setN400BannerDismissed(false);
    setReviewLang("en");
    setMappedMatched([]);
    setMappedDiscovered([]);
    setDiscoveredValues({});
    setSaveChecked({});
    setDrawerOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [pdfObjectUrl]);

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
  const _semanticCount = detectedFields.filter(
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

  // Save discovered fields to Master Profile
  const handleSaveToProfile = useCallback(
    (toSave: Array<{ key: string; label: string; value: string }>) => {
      if (toSave.length === 0) return;
      const extra = JSON.parse(
        localStorage.getItem("docfill_profile_extra") || "{}",
      ) as Record<string, string>;
      for (const item of toSave) {
        extra[item.key] = item.value;
      }
      localStorage.setItem("docfill_profile_extra", JSON.stringify(extra));
    },
    [],
  );

  // Split-screen is active in "detected" stage
  const isSplitScreen = stage === "detected";

  return (
    <div
      className={cn("space-y-4", isSplitScreen ? "max-w-none" : "max-w-2xl")}
    >
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
          {isSplitScreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 text-xs"
            >
              <RotateCcw size={12} />
              New Upload
            </Button>
          )}
        </div>
      </motion.div>

      {/* Source Verified banner for public library forms */}
      {publicFormMeta && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
          data-ocid="upload.success_state"
        >
          <Shield size={18} className="text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Source Verified &middot; {publicFormMeta.domain}
            </p>
            <p className="text-xs text-emerald-600/80">
              {publicFormMeta.formName} &mdash; fetched from an official
              government source
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-600 text-xs gap-1 flex-shrink-0"
          >
            <Shield size={10} />
            Official
          </Badge>
        </motion.div>
      )}

      {/* Condensed drop zone when in split-screen */}
      {isSplitScreen && (
        <motion.div
          key="condensed-dropzone"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <label
            data-ocid="upload.dropzone"
            htmlFor="pdf-file-input-mini"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl border border-dashed cursor-pointer transition-all duration-200",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border/60 hover:border-primary/40 hover:bg-muted/20",
            )}
          >
            <CloudUpload size={16} className="text-primary/70 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {file?.name}
                </span>
                {" — "}
                drop a new PDF to replace
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] flex-shrink-0">
              Replace
            </Badge>
            <input
              id="pdf-file-input-mini"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </motion.div>
      )}

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
            <Card className="bento-card" data-ocid="scan.loading_state">
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
                            <TableCell className="py-2">
                              <div className="flex flex-col gap-0.5">
                                <p className="text-sm font-medium text-foreground">
                                  {slot.label}
                                </p>
                                <MatchTypeBadge type="visual" />
                              </div>
                            </TableCell>

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

                            <TableCell className="py-2">
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 rounded px-1.5 py-0.5 whitespace-nowrap">
                                ({Math.round(slot.x)}, {Math.round(slot.y)})
                              </span>
                            </TableCell>

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

        {/* DETECTED — Split-Screen: PDF Preview + Data Mapping Panel */}
        {stage === "detected" && (
          <motion.div
            key="detected-split"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* N-400 Smart Detection Banner */}
            <AnimatePresence>
              {showN400Banner && (
                <motion.div
                  key="n400-banner"
                  data-ocid="upload.n400_detection.panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3 flex-wrap"
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

            {/* Split-screen container */}
            <div className="flex gap-4 h-[70vh] min-h-[520px]">
              {/* LEFT PANEL — PDF Preview (55%) */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="flex-[55] min-w-0 flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl overflow-hidden"
              >
                {/* PDF panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-primary" />
                    <span
                      className="text-xs font-medium text-foreground truncate max-w-[200px]"
                      title={file?.name}
                    >
                      {file?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 h-5 bg-success/10 text-emerald-400 border-emerald-500/30"
                    >
                      {matchedFields.length}/{detectedFields.length} matched
                    </Badge>
                    {pdfObjectUrl && (
                      <a
                        href={pdfObjectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                      >
                        <ExternalLink size={11} />
                        Full PDF
                      </a>
                    )}
                  </div>
                </div>

                {/* PDF iframe */}
                <div className="flex-1 min-h-0 bg-gray-900/50">
                  {pdfObjectUrl ? (
                    <iframe
                      src={pdfObjectUrl}
                      title="PDF Preview"
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <FileText
                          size={40}
                          className="text-muted-foreground/40 mx-auto mb-3"
                        />
                        <p className="text-xs text-muted-foreground">
                          PDF preview unavailable
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* PDF panel footer with action buttons */}
                <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 bg-white/5 flex-shrink-0">
                  <Button
                    data-ocid="upload.review.button"
                    onClick={() => setStage("review")}
                    size="sm"
                    className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-glow flex-1"
                  >
                    <FileCheck size={13} />
                    Review & Generate
                  </Button>
                  {mappedDiscovered.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDrawerOpen(true)}
                      className="gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 flex-shrink-0"
                    >
                      <AlertCircle size={12} />
                      {mappedDiscovered.length} missing
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* RIGHT PANEL — Data Mapping (45%) */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
                className="flex-[45] min-w-0 flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl overflow-hidden"
              >
                <DataMappingPanel
                  matched={mappedMatched}
                  discovered={mappedDiscovered}
                  overrides={overrides}
                  onOverrideChange={(key, val) =>
                    setOverrides((prev) => ({ ...prev, [key]: val }))
                  }
                  onSaveToProfile={(key, val) => {
                    handleSaveToProfile([{ key, label: key, value: val }]);
                  }}
                  discoveredValues={discoveredValues}
                  onDiscoveredValueChange={(label, val) =>
                    setDiscoveredValues((prev) => ({ ...prev, [label]: val }))
                  }
                  saveChecked={saveChecked}
                  onSaveCheckedChange={(label, checked) =>
                    setSaveChecked((prev) => ({ ...prev, [label]: checked }))
                  }
                />
              </motion.div>
            </div>

            {/* Missing Info Drawer */}
            <MissingInfoDrawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              discovered={mappedDiscovered}
              values={discoveredValues}
              onValueChange={(label, val) =>
                setDiscoveredValues((prev) => ({ ...prev, [label]: val }))
              }
              saveChecked={saveChecked}
              onSaveCheckedChange={(label, checked) =>
                setSaveChecked((prev) => ({ ...prev, [label]: checked }))
              }
              onApply={handleSaveToProfile}
            />
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
                      No matched fields.{" "}
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
                    disabled={
                      stage === "filling" ||
                      (fillMode === "acroform" && matchedFields.length === 0) ||
                      (fillMode === "coordinate" && filledCoordCount === 0)
                    }
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-glow"
                  >
                    {stage === "filling" ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download size={15} />
                        Generate &amp; Download
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setStage("detected")}
                    className="gap-2"
                    disabled={stage === "filling"}
                  >
                    ← Back to Mapping
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="gap-2"
                    disabled={stage === "filling"}
                  >
                    <RotateCcw size={15} />
                    Start over
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
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bento-card border-success/30 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-success via-success/60 to-success/20" />
              <CardContent className="py-12 px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={40} className="text-success" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-xl mb-2">
                  Document Ready!
                </h3>
                <p className="text-sm text-muted-foreground mb-8">
                  Your filled document has been downloaded successfully.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button
                    data-ocid="upload.complete.new_button"
                    onClick={handleReset}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Upload size={15} />
                    Upload Another PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
