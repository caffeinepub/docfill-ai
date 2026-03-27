import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type DocRecord, useDocumentStore } from "@/hooks/useDocumentStore";
import { useDeleteFileReference } from "@/hooks/useQueries";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileSearch,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

type Page = "dashboard" | "profile" | "upload" | "documents" | "appointments";

interface DocumentsPageProps {
  onNavigate: (page: Page) => void;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; icon: React.ElementType; className: string }
  > = {
    uploaded: {
      label: "Uploaded",
      icon: Clock,
      className: "bg-secondary text-secondary-foreground",
    },
    processing: {
      label: "Processing",
      icon: RefreshCw,
      className: "bg-warning/15 text-warning-foreground",
    },
    filled: {
      label: "Auto-Filled",
      icon: CheckCircle2,
      className: "bg-success/15 text-success",
    },
  };
  const s = map[status] ?? map.uploaded;
  const Icon = s.icon;
  return (
    <Badge
      variant="outline"
      className={`text-xs border-0 gap-1 ${s.className}`}
    >
      <Icon size={10} />
      {s.label}
    </Badge>
  );
}

function DocumentCard({
  doc,
  index,
  onDelete,
  onBookNotary,
}: {
  doc: DocRecord;
  index: number;
  onDelete: (id: string) => void;
  onBookNotary: () => void;
}) {
  const handleDownload = () => {
    if (doc.downloadUrl) {
      window.open(doc.downloadUrl, "_blank");
    } else {
      toast.info("Download URL not available for this document");
    }
  };

  return (
    <motion.div
      data-ocid={`documents.item.${index + 1}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.97 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bento-card card-hover"
    >
      <div className="flex items-center gap-4 p-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText size={22} className="text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate mb-1">
            {doc.name}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-muted-foreground/30 text-xs">·</span>
            <StatusBadge status={doc.status} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 h-8 px-2.5"
            onClick={onBookNotary}
            title="Book a Notary"
            data-ocid={`documents.secondary_button.${index + 1}`}
          >
            <CalendarDays size={13} />
            <span className="hidden sm:inline">Book Notary</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={handleDownload}
            title="Download"
          >
            <Download size={15} />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                data-ocid={`documents.delete_button.${index + 1}`}
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete"
              >
                <Trash2 size={15} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-ocid="documents.dialog">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{doc.name}</strong>?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-ocid="documents.cancel_button">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  data-ocid="documents.confirm_button"
                  onClick={() => onDelete(doc.id)}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  );
}

export function DocumentsPage({ onNavigate }: DocumentsPageProps) {
  const { documents, removeDocument } = useDocumentStore();
  const { mutateAsync: deleteFileRef } = useDeleteFileReference();
  const [filter, setFilter] = useState<"all" | "uploaded" | "filled">("all");

  const filtered = documents.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteFileRef(id);
    } catch {
      // Ignore backend errors — still remove locally
    }
    removeDocument(id);
    toast.success("Document deleted");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
              Documents
            </h1>
            <p className="text-muted-foreground text-sm">
              {documents.length} document{documents.length !== 1 ? "s" : ""}{" "}
              stored
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              data-ocid="documents.secondary_button"
              variant="outline"
              onClick={() => onNavigate("appointments")}
              className="gap-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 hidden sm:flex"
            >
              <CalendarDays size={15} />
              Book a Notary
            </Button>
            <Button
              onClick={() => onNavigate("upload")}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-glow"
            >
              <Upload size={15} />
              <span className="hidden sm:inline">Upload PDF</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "uploaded", "filled"] as const).map((f) => (
          <button
            type="button"
            key={f}
            data-ocid="documents.filter.tab"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {f === "all" ? "All" : f === "filled" ? "Auto-Filled" : "Uploaded"}
            <span className="ml-1.5 text-xs opacity-60">
              (
              {f === "all"
                ? documents.length
                : documents.filter((d) => d.status === f).length}
              )
            </span>
          </button>
        ))}
      </div>

      {/* Documents list */}
      <div data-ocid="documents.list" className="space-y-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div
              data-ocid="documents.empty_state"
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="bento-card">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <FileSearch
                      size={28}
                      className="text-muted-foreground/40"
                    />
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-1">
                    No documents found
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {filter !== "all"
                      ? `No ${filter === "filled" ? "auto-filled" : "uploaded"} documents yet`
                      : "Upload a PDF to get started with DocFill AI"}
                  </p>
                  <Button
                    onClick={() => onNavigate("upload")}
                    variant="outline"
                    className="gap-2 text-primary border-primary/30 hover:bg-primary/5"
                  >
                    <Upload size={14} />
                    Upload your first PDF
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filtered.map((doc, idx) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                index={idx}
                onDelete={handleDelete}
                onBookNotary={() => onNavigate("appointments")}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Stats footer */}
      {documents.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bento-card">
            <CardContent className="py-4 px-6">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">
                    Total:{" "}
                    <strong className="text-foreground">
                      {documents.length}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-muted-foreground">
                    Filled:{" "}
                    <strong className="text-foreground">
                      {documents.filter((d) => d.status === "filled").length}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  <span className="text-muted-foreground">
                    Uploaded:{" "}
                    <strong className="text-foreground">
                      {documents.filter((d) => d.status === "uploaded").length}
                    </strong>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
