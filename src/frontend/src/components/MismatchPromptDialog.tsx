import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MismatchWarning } from "@/utils/labelValidator";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

type Resolution = { action: "keep" | "blank" | "edit"; value?: string };

interface MismatchPromptDialogProps {
  open: boolean;
  mismatches: MismatchWarning[];
  onResolve: (resolutions: Record<string, Resolution>) => void;
  onCancel: () => void;
}

const TYPE_NAMES: Record<string, string> = {
  name: "a name",
  ssn: "a Social Security Number",
  dob: "a date of birth",
  phone: "a phone number",
  email: "an email address",
  zip: "a ZIP code",
  street: "a street address",
  generic: "an unknown type",
};

function humanExplain(w: MismatchWarning): string {
  return `${TYPE_NAMES[w.actualType] ?? "a value"} ("${w.value}") was mapped to a "${w.fieldLabel}" field that expects ${TYPE_NAMES[w.expectedType] ?? "a different type"}.`;
}

export function MismatchPromptDialog({
  open,
  mismatches,
  onResolve,
  onCancel,
}: MismatchPromptDialogProps) {
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>(
    () =>
      Object.fromEntries(
        mismatches.map((m) => [
          m.fieldLabel,
          { action: "keep" as const, value: m.value },
        ]),
      ),
  );

  const setAction = (
    label: string,
    action: Resolution["action"],
    value?: string,
  ) => {
    setResolutions((prev) => ({
      ...prev,
      [label]: { action, value: value ?? prev[label]?.value ?? "" },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        data-ocid="mismatch.dialog"
        className="max-w-lg bg-slate-900/95 backdrop-blur-xl border-white/10 text-foreground"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle size={18} className="text-amber-400" />
            Field Validation Conflicts
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            The following fields have data type mismatches. Choose how to handle
            each one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {mismatches.map((w, idx) => {
            const res = resolutions[w.fieldLabel] ?? {
              action: "keep",
              value: w.value,
            };
            return (
              <div
                key={w.fieldLabel}
                data-ocid={`mismatch.item.${idx + 1}`}
                className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 space-y-2"
              >
                <p className="text-xs font-semibold text-foreground">
                  {w.fieldLabel}
                </p>
                <p className="text-[11px] text-amber-300/80">
                  {humanExplain(w)}
                </p>

                <div className="flex gap-1.5 flex-wrap">
                  {(["keep", "blank", "edit"] as const).map((action) => (
                    <button
                      type="button"
                      key={action}
                      data-ocid={`mismatch.toggle.${idx + 1}`}
                      onClick={() => setAction(w.fieldLabel, action, w.value)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all font-medium cursor-pointer ${
                        res.action === action
                          ? "bg-primary/20 border-primary/60 text-slate-300"
                          : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground bg-white/5"
                      }`}
                    >
                      {action === "keep"
                        ? "Keep Anyway"
                        : action === "blank"
                          ? "Leave Blank"
                          : "Edit Value"}
                    </button>
                  ))}
                </div>

                {res.action === "edit" && (
                  <Input
                    data-ocid={`mismatch.input.${idx + 1}`}
                    value={res.value ?? w.value}
                    onChange={(e) =>
                      setAction(w.fieldLabel, "edit", e.target.value)
                    }
                    className="h-7 text-xs bg-white/5 border-white/15 focus:border-primary/50"
                    placeholder="Enter corrected value…"
                  />
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button
            data-ocid="mismatch.cancel_button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            data-ocid="mismatch.confirm_button"
            size="sm"
            onClick={() => onResolve(resolutions)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Proceed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
