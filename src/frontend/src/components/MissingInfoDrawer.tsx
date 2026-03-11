/**
 * MissingInfoDrawer — Right-side Sheet that auto-opens when unmatched
 * (discovered) fields are found after scanning a PDF.
 * v7.5: Exact PDF label as primary title; semantic subtext; dynamic placeholder;
 *       correct profile key used when saving.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { MappedField } from "@/utils/fieldDiscovery";
import { AlertTriangle, Save } from "lucide-react";
import { toast } from "sonner";

interface MissingInfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discovered: MappedField[];
  values: Record<string, string>;
  onValueChange: (label: string, value: string) => void;
  saveChecked: Record<string, boolean>;
  onSaveCheckedChange: (label: string, checked: boolean) => void;
  onApply: (
    toSave: Array<{ key: string; label: string; value: string }>,
  ) => void;
}

export function MissingInfoDrawer({
  open,
  onOpenChange,
  discovered,
  values,
  onValueChange,
  saveChecked,
  onSaveCheckedChange,
  onApply,
}: MissingInfoDrawerProps) {
  const handleApply = () => {
    const toSave = discovered
      .filter((f) => saveChecked[f.label] && (values[f.label] ?? "").trim())
      .map((f) => ({
        // v7.5: use the matched profileKey when available so data lands on the
        // correct Master Profile JSON key regardless of display label.
        key:
          f.profileKey !== null
            ? f.profileKey
            : f.label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        label: f.label,
        value: values[f.label] ?? "",
      }));

    onApply(toSave);
    onOpenChange(false);

    if (toSave.length > 0) {
      toast.success(
        `${toSave.length} field${toSave.length > 1 ? "s" : ""} saved to Master Profile`,
        { id: "profile-save" },
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        data-ocid="missing_info.drawer"
        side="right"
        className="w-[380px] sm:w-[420px] p-0 flex flex-col bg-[oklch(0.13_0.03_255)] border-l border-white/10 backdrop-blur-xl"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={15} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                Missing Information Found
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 h-5 bg-amber-500/15 text-amber-400 border-amber-500/30"
                >
                  {discovered.length}
                </Badge>
              </SheetTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                These PDF fields aren't in your Master Profile.
              </p>
            </div>
          </div>
        </SheetHeader>

        {/* Field list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
            {discovered.map((field, idx) => {
              const value = values[field.label] ?? "";
              const checked = saveChecked[field.label] ?? false;

              return (
                <div
                  key={`drawer-${field.label}-${idx}`}
                  className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3.5 space-y-2"
                >
                  {/* v7.5: exact PDF label as primary title */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 h-5 bg-amber-500/10 text-amber-400 border-amber-500/30 flex-shrink-0"
                      >
                        New Field
                      </Badge>
                      <p
                        className="text-xs font-semibold text-foreground truncate"
                        title={field.label}
                      >
                        {field.label}
                      </p>
                    </div>
                    {/* Semantic subtext */}
                    {field.profileLabel ? (
                      <p className="text-[10px] text-amber-400/60 pl-0.5">
                        Maps to: {field.profileLabel}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50 pl-0.5">
                        No profile mapping found
                      </p>
                    )}
                  </div>

                  {/* v7.5: placeholder = exact PDF label */}
                  <Input
                    data-ocid={`field.input.${idx + 1}`}
                    value={value}
                    onChange={(e) => onValueChange(field.label, e.target.value)}
                    placeholder={field.label}
                    className="h-8 text-xs bg-white/5 border-white/10 focus:border-amber-500/40"
                  />

                  <div className="flex items-center gap-2">
                    <Checkbox
                      data-ocid={`field.save_checkbox.${idx + 1}`}
                      id={`drawer-save-${idx}`}
                      checked={checked}
                      onCheckedChange={(c) =>
                        onSaveCheckedChange(field.label, c === true)
                      }
                      className="h-3.5 w-3.5 border-amber-500/40 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <Label
                      htmlFor={`drawer-save-${idx}`}
                      className="text-[11px] text-amber-300/80 cursor-pointer"
                    >
                      Save to Master Profile
                      {/* Show target key as hint when a profile mapping exists */}
                      {field.profileKey && (
                        <span className="ml-1 text-amber-400/50">
                          ({field.profileKey})
                        </span>
                      )}
                    </Label>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10 flex-shrink-0 bg-white/2">
          <div data-ocid="profile.update_success_state" className="hidden" />
          <Button
            data-ocid="missing_info.apply_button"
            onClick={handleApply}
            className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium h-9 text-sm"
          >
            <Save size={14} />
            Apply Changes
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Checked fields will be permanently added to your profile
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
