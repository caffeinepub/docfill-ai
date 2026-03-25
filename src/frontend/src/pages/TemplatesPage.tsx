import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JSZip from "@/lib/jszip-stub";
import { PDFDocument, StandardFonts, rgb } from "@/lib/pdf-lib-stub";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BookOpen,
  Camera,
  Check,
  DollarSign,
  ExternalLink,
  FileDown,
  Info,
  Loader2,
  Package,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

type Page = "dashboard" | "profile" | "upload" | "documents" | "templates";

interface TemplatesPageProps {
  onNavigate: (page: Page, templateId?: string) => void;
}

interface Template {
  id: string;
  code: string;
  name: string;
  category: "us" | "jamaica" | "haiti";
  description: string;
  fee: string;
  feeNote?: string;
  checklistUrl?: string;
  photoRequired: boolean;
  isNaturalization: boolean;
  batchable?: boolean;
}

const TEMPLATES: Template[] = [
  {
    id: "n400",
    code: "N-400",
    name: "Application for Naturalization",
    category: "us",
    description:
      "Apply for U.S. citizenship after meeting residency requirements.",
    fee: "$725 USD",
    feeNote: "Biometrics included",
    checklistUrl:
      "https://www.uscis.gov/sites/default/files/document/guides/M-477.pdf",
    photoRequired: true,
    isNaturalization: true,
    batchable: true,
  },
  {
    id: "n600",
    code: "N-600",
    name: "Application for Certificate of Citizenship",
    category: "us",
    description:
      "Obtain a Certificate of Citizenship for those who acquired or derived citizenship.",
    fee: "$1,170 USD",
    checklistUrl: "https://www.uscis.gov/n-600",
    photoRequired: false,
    isNaturalization: true,
    batchable: false,
  },
  {
    id: "g1145",
    code: "G-1145",
    name: "E-Notification of Application/Petition Acceptance",
    category: "us",
    description:
      "Request email/text notification when USCIS accepts your application.",
    fee: "Free",
    photoRequired: false,
    isNaturalization: false,
    batchable: true,
  },
  {
    id: "n1-jamaica",
    code: "Form N1",
    name: "Application for Jamaican Naturalization",
    category: "jamaica",
    description:
      "Apply for Jamaican citizenship through the Passport, Immigration and Citizenship Agency (PICA).",
    fee: "JMD ~$50,000",
    checklistUrl: "https://www.pica.gov.jm/naturalisation/",
    photoRequired: true,
    isNaturalization: true,
    batchable: false,
  },
  {
    id: "r1-jamaica",
    code: "Form R1",
    name: "Marriage Registration (Jamaica)",
    category: "jamaica",
    description:
      "Register a marriage with the Registrar General's Department of Jamaica.",
    fee: "JMD ~$5,000",
    checklistUrl: "https://www.rgd.gov.jm",
    photoRequired: false,
    isNaturalization: false,
    batchable: false,
  },
  {
    id: "ds2029",
    code: "DS-2029",
    name: "Consular Report of Birth Abroad",
    category: "haiti",
    description:
      "Document the birth of a U.S. citizen abroad, issued by a U.S. embassy or consulate.",
    fee: "$100 USD",
    checklistUrl:
      "https://travel.state.gov/content/travel/en/records-and-authentications/requesting-a-vital-record-overseas/crba.html",
    photoRequired: true,
    isNaturalization: false,
    batchable: false,
  },
  {
    id: "i821",
    code: "I-821",
    name: "Application for Temporary Protected Status",
    category: "haiti",
    description:
      "Apply for TPS for Haitian nationals due to ongoing crisis conditions.",
    fee: "$50 USD (renewal) / $0 (initial)",
    feeNote: "Fee waiver available",
    checklistUrl: "https://www.uscis.gov/i-821",
    photoRequired: false,
    isNaturalization: false,
    batchable: false,
  },
];

// ---------------------------------------------------------------------------
// Batch PDF generation
// ---------------------------------------------------------------------------

async function generateBatchZip(
  templateIds: string[],
  profileData: Record<string, string>,
): Promise<void> {
  const zip = new JSZip();
  for (const id of templateIds) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const tpl = TEMPLATES.find((t) => t.id === id)!;
    page.drawText(`${tpl.code} — ${tpl.name}`, {
      x: 50,
      y: 740,
      size: 14,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    const fields: [string, string][] = [
      ["Full Name", profileData.name ?? ""],
      ["Email", profileData.email ?? ""],
      ["Phone", profileData.phone ?? ""],
      ["Address", profileData.street ?? ""],
      ["City", profileData.city ?? ""],
      ["State", profileData.state ?? ""],
      ["Zip", profileData.zip ?? ""],
      ["Date of Birth", profileData.dob ?? ""],
      ["ID / A-Number", profileData.idNumber ?? ""],
      ["Employer", profileData.employer ?? ""],
      ["Job Title", profileData.jobTitle ?? ""],
    ];
    let y = 700;
    for (const [label, value] of fields) {
      page.drawText(`${label}: ${value}`, {
        x: 50,
        y,
        size: 10,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 22;
    }
    const pdfBytes = await pdfDoc.save();
    zip.file(`${id}_filled.pdf`, pdfBytes);
  }
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = "docfill_package.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG = {
  us: {
    label: "🇺🇸 United States",
    color: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
    accentBg: "bg-blue-500/5",
    accentBorder: "border-blue-500/20",
    badgeBg:
      "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  },
  jamaica: {
    label: "🇯🇲 Jamaica",
    color:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
    accentBg: "bg-emerald-500/5",
    accentBorder: "border-emerald-500/20",
    badgeBg:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
  },
  haiti: {
    label: "🇭🇹 Haiti",
    color: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
    accentBg: "bg-red-500/5",
    accentBorder: "border-red-500/20",
    badgeBg: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400",
  },
};

// ---------------------------------------------------------------------------
// Template Card
// ---------------------------------------------------------------------------

interface TemplateCardProps {
  template: Template;
  index: number;
  isSelected: boolean;
  isBatchChecked: boolean;
  showBatchCheckbox: boolean;
  onSelect: (template: Template) => void;
  onBatchToggle: (id: string, checked: boolean) => void;
}

function TemplateCard({
  template,
  index,
  isSelected,
  isBatchChecked,
  showBatchCheckbox,
  onSelect,
  onBatchToggle,
}: TemplateCardProps) {
  const catConfig = CATEGORY_CONFIG[template.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
    >
      <Card
        data-ocid={`templates.card.${index + 1}`}
        className={cn(
          "bento-card relative cursor-pointer transition-all duration-200 hover:shadow-md",
          isSelected
            ? "ring-2 ring-primary ring-offset-1"
            : "hover:ring-1 hover:ring-border",
        )}
        onClick={() => onSelect(template)}
      >
        {/* Batch checkbox (top-right for batchable US forms) */}
        {showBatchCheckbox && (
          <div
            className="absolute top-3 right-3 z-10"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              data-ocid={`templates.batch.checkbox.${index + 1}`}
              checked={isBatchChecked}
              onCheckedChange={(checked) =>
                onBatchToggle(template.id, checked as boolean)
              }
              aria-label={`Include ${template.code} in batch`}
              className="w-4 h-4"
            />
          </div>
        )}

        <CardHeader className="pb-2 pr-10">
          {/* Form code badge */}
          <div className="flex items-start gap-2 flex-wrap mb-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-mono font-bold px-2 py-0.5",
                catConfig.badgeBg,
              )}
            >
              {template.code}
            </Badge>
            {template.isNaturalization && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400"
              >
                Naturalization
              </Badge>
            )}
            {template.photoRequired && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 gap-1 bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400"
              >
                <Camera size={9} />
                Photo Req.
              </Badge>
            )}
          </div>
          <CardTitle className="text-sm font-semibold leading-snug">
            {template.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <CardDescription className="text-xs leading-relaxed">
            {template.description}
          </CardDescription>

          {/* Fee chip */}
          <div className="flex items-center gap-1.5">
            <DollarSign size={12} className="text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              {template.fee}
            </span>
            {template.feeNote && (
              <span className="text-[10px] text-muted-foreground">
                · {template.feeNote}
              </span>
            )}
          </div>

          <Button
            data-ocid={`templates.use_template.button.${index + 1}`}
            size="sm"
            className={cn(
              "w-full gap-1.5 text-xs h-8",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20",
            )}
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(template);
            }}
          >
            {isSelected ? <Check size={12} /> : <FileDown size={12} />}
            {isSelected ? "Selected" : "Use Template"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function TemplatesPage({ onNavigate }: TemplatesPageProps) {
  const [activeTab, setActiveTab] = useState<"us" | "jamaica" | "haiti">("us");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [batchChecked, setBatchChecked] = useState<Set<string>>(new Set());
  const [proTipDismissed, setProTipDismissed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredTemplates = TEMPLATES.filter((t) => t.category === activeTab);
  const batchableInTab = filteredTemplates.filter((t) => t.batchable);
  const checkedBatchIds = [...batchChecked].filter((id) =>
    batchableInTab.some((t) => t.id === id),
  );

  const showProTip =
    !proTipDismissed &&
    selectedTemplate?.isNaturalization === true &&
    selectedTemplate?.checklistUrl != null;

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate((prev) => (prev?.id === template.id ? null : template));
    setProTipDismissed(false);
  };

  const handleUseTemplate = (template: Template) => {
    onNavigate("upload", template.id);
  };

  const handleBatchToggle = (id: string, checked: boolean) => {
    setBatchChecked((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleGeneratePackage = async () => {
    if (checkedBatchIds.length === 0) return;
    setIsGenerating(true);
    try {
      const extra = JSON.parse(
        localStorage.getItem("docfill_profile_extra") || "{}",
      ) as Record<string, string>;
      const profile = JSON.parse(
        localStorage.getItem("docfill_user_profile") || "{}",
      ) as Record<string, string>;
      await generateBatchZip(checkedBatchIds, { ...profile, ...extra });
      toast.success(
        `Package generated! ${checkedBatchIds.length} form${checkedBatchIds.length > 1 ? "s" : ""} downloaded as ZIP.`,
      );
    } catch {
      toast.error("Failed to generate package. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
              <BookOpen size={26} className="text-primary" />
              Template Library
            </h1>
            <p className="text-muted-foreground text-sm">
              Pre-mapped form templates with automatic field logic and smart
              matching
            </p>
          </div>
          <Badge
            variant="secondary"
            className="text-xs px-2 py-1 bg-primary/10 text-primary border-primary/20"
          >
            v6.5
          </Badge>
        </div>
      </motion.div>

      {/* Pro Tip Panel */}
      <AnimatePresence>
        {showProTip && (
          <motion.div
            key="protip"
            data-ocid="templates.protip.panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3.5">
              <AlertTriangle
                size={16}
                className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-0.5">
                  Pro Tip — Naturalization Form
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Make sure you have all required supporting documents before
                  filing.{" "}
                  {selectedTemplate?.checklistUrl && (
                    <a
                      href={selectedTemplate.checklistUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
                    >
                      View Official Checklist
                      <ExternalLink size={11} />
                    </a>
                  )}
                </p>
              </div>
              <button
                type="button"
                data-ocid="templates.protip.close_button"
                onClick={() => setProTipDismissed(true)}
                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 flex-shrink-0 p-0.5 rounded"
                aria-label="Dismiss pro tip"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "us" | "jamaica" | "haiti")}
      >
        <TabsList className="grid w-full grid-cols-3 h-11">
          <TabsTrigger
            value="us"
            data-ocid="templates.us.tab"
            className="text-sm"
          >
            🇺🇸 United States
          </TabsTrigger>
          <TabsTrigger
            value="jamaica"
            data-ocid="templates.jamaica.tab"
            className="text-sm"
          >
            🇯🇲 Jamaica
          </TabsTrigger>
          <TabsTrigger
            value="haiti"
            data-ocid="templates.haiti.tab"
            className="text-sm"
          >
            🇭🇹 Haiti
          </TabsTrigger>
        </TabsList>

        {/* US Templates */}
        <TabsContent value="us" className="space-y-5 mt-4">
          {/* Batch Generation Panel */}
          <AnimatePresence>
            {checkedBatchIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bento-card border-primary/30 bg-primary/5">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                          <Package size={16} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Batch Package
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {checkedBatchIds
                              .map(
                                (id) =>
                                  TEMPLATES.find((t) => t.id === id)?.code,
                              )
                              .join(" + ")}{" "}
                            — will be bundled into one ZIP
                          </p>
                        </div>
                      </div>
                      <Button
                        data-ocid="templates.generate_package.button"
                        onClick={handleGeneratePackage}
                        disabled={isGenerating}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary-glow"
                        size="sm"
                      >
                        {isGenerating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Package size={14} />
                        )}
                        {isGenerating
                          ? "Generating..."
                          : "Generate Package (ZIP)"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.filter((t) => t.category === "us").map((tpl, i) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                index={i}
                isSelected={selectedTemplate?.id === tpl.id}
                isBatchChecked={batchChecked.has(tpl.id)}
                showBatchCheckbox={!!tpl.batchable}
                onSelect={handleUseTemplate}
                onBatchToggle={handleBatchToggle}
              />
            ))}
          </div>
        </TabsContent>

        {/* Jamaica Templates */}
        <TabsContent value="jamaica" className="space-y-5 mt-4">
          <div className="flex items-start gap-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-4 py-3">
            <Info
              size={15}
              className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5"
            />
            <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
              Jamaica PICA forms include Referee/Sponsor field mapping. Make
              sure to fill in your <strong>Referees / Sponsors</strong> section
              in the Master Profile for accurate auto-fill.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.filter((t) => t.category === "jamaica").map((tpl, i) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                index={i}
                isSelected={selectedTemplate?.id === tpl.id}
                isBatchChecked={batchChecked.has(tpl.id)}
                showBatchCheckbox={!!tpl.batchable}
                onSelect={(t) => {
                  handleSelectTemplate(t);
                  handleUseTemplate(t);
                }}
                onBatchToggle={handleBatchToggle}
              />
            ))}
          </div>
        </TabsContent>

        {/* Haiti Templates */}
        <TabsContent value="haiti" className="space-y-5 mt-4">
          <div className="flex items-start gap-3 rounded-xl bg-red-500/8 border border-red-500/20 px-4 py-3">
            <Info
              size={15}
              className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
            />
            <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
              Haitian Diaspora Suite — these forms support{" "}
              <strong>French</strong> and <strong>Haitian Creole</strong> field
              label display in the Review step. Select a template to get
              started.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.filter((t) => t.category === "haiti").map((tpl, i) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                index={i}
                isSelected={selectedTemplate?.id === tpl.id}
                isBatchChecked={batchChecked.has(tpl.id)}
                showBatchCheckbox={!!tpl.batchable}
                onSelect={(t) => {
                  handleSelectTemplate(t);
                  handleUseTemplate(t);
                }}
                onBatchToggle={handleBatchToggle}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Fee Calculator Card */}
      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            key="fee-calc"
            data-ocid="templates.fee_calculator.card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="bento-card border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign size={15} className="text-primary" />
                  Fee Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">
                          Form
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">
                          Filing Fee
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/60">
                        <td className="px-3 py-2.5 font-mono text-xs font-bold text-foreground">
                          {selectedTemplate.code}
                        </td>
                        <td className="px-3 py-2.5 text-sm font-medium text-foreground">
                          {selectedTemplate.fee}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {selectedTemplate.feeNote ?? "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Info size={10} />
                  Fees shown are estimates. Verify current fees at the official
                  agency website before filing.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
