import { ExternalBlob } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDocumentStore } from "@/hooks/useDocumentStore";
import { useSaveFileReference } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  CloudUpload,
  Download,
  FileText,
  Loader2,
  MinusCircle,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface DetectedField {
  name: string;
  key: keyof ExtraProfile | "name" | "email";
  confidence: number;
  matchStatus: "matched" | "partial" | "not-found";
  profileValue?: string;
}

interface ExtraProfile {
  phone: string;
  address: string;
  dob: string;
  idNumber: string;
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

const FIELD_DEFS: { label: string; key: string }[] = [
  { label: "Full Name", key: "name" },
  { label: "Email Address", key: "email" },
  { label: "Phone Number", key: "phone" },
  { label: "Mailing Address", key: "address" },
  { label: "Date of Birth", key: "dob" },
  { label: "ID / Passport Number", key: "idNumber" },
];

function simulateDetection(
  profileData: Record<string, string | undefined>,
): DetectedField[] {
  return FIELD_DEFS.map((field) => {
    const confidence = Math.floor(Math.random() * 15) + 85; // 85-99
    const val = profileData[field.key];
    let matchStatus: "matched" | "partial" | "not-found" = "not-found";
    if (val && val.trim().length > 0) {
      matchStatus = confidence >= 92 ? "matched" : "partial";
    }
    return {
      name: field.label,
      key: field.key as keyof ExtraProfile | "name" | "email",
      confidence,
      matchStatus,
      profileValue: val || undefined,
    };
  });
}

type Stage =
  | "idle"
  | "dropped"
  | "processing"
  | "detected"
  | "filling"
  | "complete";

export function UploadPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: saveFileRef } = useSaveFileReference();
  const { addDocument, updateDocument } = useDocumentStore();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      setStage("dropped");
    } else {
      toast.error("Please upload a PDF file");
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile?.type === "application/pdf") {
        setFile(selectedFile);
        setStage("dropped");
      } else {
        toast.error("Please upload a PDF file");
      }
    },
    [],
  );

  const handleProcess = useCallback(() => {
    if (!file) return;
    setStage("processing");
    setUploadProgress(0);

    // Simulate AI processing
    const interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + Math.random() * 15;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      const profile = getProfileData();
      const fields = simulateDetection(profile);
      setDetectedFields(fields);
      setStage("detected");
    }, 2500);
  }, [file]);

  const handleAutoFill = useCallback(async () => {
    if (!file) return;
    setStage("filling");

    try {
      const docId = crypto.randomUUID();
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(bytes);

      const fileRef = { id: docId, blob, name: file.name };
      await saveFileRef(fileRef);

      addDocument({
        id: docId,
        name: file.name,
        uploadedAt: new Date().toISOString(),
        status: "filled",
        downloadUrl: blob.getDirectURL(),
      });

      updateDocument(docId, {
        status: "filled",
        downloadUrl: blob.getDirectURL(),
      });
      setStage("complete");
      toast.success("Document auto-filled and saved!");
    } catch {
      toast.error("Failed to save document. Please try again.");
      setStage("detected");
    }
  }, [file, saveFileRef, addDocument, updateDocument]);

  const handleReset = useCallback(() => {
    setStage("idle");
    setFile(null);
    setDetectedFields([]);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

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

      {/* Upload Zone */}
      <AnimatePresence mode="wait">
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
                    or click to browse files
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
                    Supports PDF files up to 50MB
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

        {stage === "dropped" && (
          <motion.div
            key="dropped"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bento-card">
              <CardContent className="py-8 px-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={28} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {file?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {file
                        ? `${(file.size / 1024).toFixed(1)} KB · PDF Document`
                        : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="flex-shrink-0">
                    Ready
                  </Badge>
                </div>
                <div className="flex gap-3">
                  <Button
                    data-ocid="upload.process.button"
                    onClick={handleProcess}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-glow"
                  >
                    <Brain size={16} />
                    Process Document
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleReset}
                    className="gap-2"
                  >
                    <RotateCcw size={15} />
                    Change file
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stage === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bento-card">
              <CardContent className="py-10 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 relative">
                  <Brain size={28} className="text-primary" />
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-pulse-ring" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">
                  Analyzing Document
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  AI is scanning for form fields and detecting patterns…
                </p>
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {Math.min(Math.round(uploadProgress), 100)}% complete
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {(stage === "detected" || stage === "filling") && (
          <motion.div
            key="detected"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bento-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    Detected Fields ({detectedFields.length})
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-success inline-block" />
                    Matched
                    <span className="w-2 h-2 rounded-full bg-warning inline-block" />
                    Partial
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30 inline-block" />
                    Not found
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {detectedFields.map((field, idx) => (
                  <motion.div
                    key={field.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06, duration: 0.25 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                  >
                    <MatchIcon status={field.matchStatus} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {field.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {field.confidence}%
                        </span>
                      </div>
                      {field.profileValue ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {field.key === "dob"
                            ? new Date(field.profileValue).toLocaleDateString()
                            : field.profileValue}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/50 italic">
                          No data in profile
                        </p>
                      )}
                    </div>
                    <ConfidenceBar value={field.confidence} />
                  </motion.div>
                ))}

                <div className="pt-3 flex gap-3 flex-wrap">
                  <Button
                    data-ocid="upload.autofill.button"
                    onClick={handleAutoFill}
                    disabled={stage === "filling"}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-glow"
                  >
                    {stage === "filling" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    {stage === "filling"
                      ? "Auto-filling..."
                      : "Auto-Fill & Save"}
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

        {stage === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, type: "spring" }}
          >
            <Card className="bento-card border-success/30 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-success via-success/60 to-success/20" />
              <CardContent className="py-10 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 size={32} className="text-success" />
                </div>
                <h3 className="font-display font-semibold text-foreground text-xl mb-2">
                  Document Auto-Filled!
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  <strong className="text-foreground">{file?.name}</strong> has
                  been processed and saved to your documents.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="gap-2"
                  >
                    <Upload size={15} />
                    Upload another
                  </Button>
                  <Button className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
                    <Download size={15} />
                    View in Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How it works */}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    step: "1",
                    icon: Upload,
                    title: "Upload PDF",
                    desc: "Drag and drop or select your form PDF",
                  },
                  {
                    step: "2",
                    icon: Brain,
                    title: "AI Detection",
                    desc: "AI scans and identifies all form fields",
                  },
                  {
                    step: "3",
                    icon: Sparkles,
                    title: "Auto-Fill",
                    desc: "Profile data is matched and filled automatically",
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

function MatchIcon({
  status,
}: { status: "matched" | "partial" | "not-found" }) {
  if (status === "matched")
    return <CheckCircle2 size={18} className="text-success flex-shrink-0" />;
  if (status === "partial")
    return <AlertCircle size={18} className="text-warning flex-shrink-0" />;
  return (
    <MinusCircle size={18} className="text-muted-foreground/40 flex-shrink-0" />
  );
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="w-16 flex-shrink-0">
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
