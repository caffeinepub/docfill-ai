import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shield } from "lucide-react";

interface OfficialForm {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string;
}

const OFFICIAL_FORMS: OfficialForm[] = [
  {
    id: "w9",
    name: "IRS W-9",
    description: "Request for Taxpayer Identification",
    category: "IRS",
    url: "https://www.irs.gov/pub/irs-pdf/fw9.pdf",
  },
  {
    id: "w4",
    name: "IRS W-4",
    description: "Employee's Withholding Certificate",
    category: "IRS",
    url: "https://www.irs.gov/pub/irs-pdf/fw4.pdf",
  },
  {
    id: "i9",
    name: "I-9 Form",
    description: "Employment Eligibility Verification",
    category: "USCIS",
    url: "https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf",
  },
];

interface FormLibraryProps {
  searchQuery: string;
  onSelect: (file: File, meta: { formName: string; domain: string }) => void;
  isLoading: string | null;
}

export function FormLibrary({
  searchQuery,
  onSelect,
  isLoading,
}: FormLibraryProps) {
  const filtered = OFFICIAL_FORMS.filter((form) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      form.name.toLowerCase().includes(q) ||
      form.description.toLowerCase().includes(q) ||
      form.category.toLowerCase().includes(q)
    );
  });

  const handleUseForm = async (form: OfficialForm) => {
    if (isLoading) return;
    try {
      const response = await fetch(form.url);
      if (!response.ok) throw new Error("Failed to fetch form");
      const blob = await response.blob();
      const file = new File([blob], `${form.id}.pdf`, {
        type: "application/pdf",
      });
      onSelect(file, {
        formName: form.name,
        domain: new URL(form.url).hostname,
      });
    } catch {
      // Error handled by parent via toast
    }
  };

  if (filtered.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
        Form Library
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {filtered.map((form, i) => {
          const ocidIndex = (i + 1) as 1 | 2 | 3;
          const loading = isLoading === form.id;
          return (
            <Card
              key={form.id}
              data-ocid={`form_library.item.${ocidIndex}`}
              className="bento-card border border-border/60 hover:border-primary/30 transition-all duration-200"
            >
              <CardContent className="p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {form.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${
                          form.category === "IRS"
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {form.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {form.description}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 shrink-0"
                    title="Source Verified"
                  >
                    <Shield size={12} />
                    <span className="text-[10px] font-medium">Official</span>
                  </div>
                </div>
                <Button
                  data-ocid={`form_library.button.${ocidIndex}`}
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
                  onClick={() => handleUseForm(form)}
                  disabled={!!isLoading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={11} className="animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    "Use Form"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
