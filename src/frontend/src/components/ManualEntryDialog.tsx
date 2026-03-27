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
import { Separator } from "@/components/ui/separator";
import type { MappedField } from "@/utils/fieldDiscovery";
import type { MismatchWarning } from "@/utils/labelValidator";
import { inferFieldType, inferValueType } from "@/utils/labelValidator";
import { AlertTriangle, EyeOff, Pencil } from "lucide-react";
import { useState } from "react";

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

function inlineConflictWarning(
  value: string,
  profileKey: string | null,
): string | null {
  if (!value.trim() || !profileKey) return null;
  const expectedType = inferFieldType(profileKey);
  const actualType = inferValueType(value);
  if (expectedType === "generic" || actualType === "generic") return null;
  if (expectedType === actualType) return null;
  return `Expected ${TYPE_NAMES[expectedType] ?? expectedType}, got ${TYPE_NAMES[actualType] ?? actualType}`;
}

interface EntryState {
  value: string;
  leaveBlank: boolean;
}

export interface ManualEntryDialogProps {
  open: boolean;
  unmatchedFields: MappedField[];
  mismatchFields: MismatchWarning[];
  onConfirm: (values: Record<string, string>) => void;
  onCancel: () => void;
}

export function ManualEntryDialog({
  open,
  unmatchedFields,
  mismatchFields,
  onConfirm,
  onCancel,
}: ManualEntryDialogProps) {
  const [entries, setEntries] = useState<Record<string, EntryState>>(() => {
    const init: Record<string, EntryState> = {};
    for (const f of unmatchedFields) {
      init[f.label] = { value: "", leaveBlank: false };
    }
    for (const w of mismatchFields) {
      // Only init if not already set by unmatchedFields
      if (!init[w.fieldLabel]) {
        init[w.fieldLabel] = { value: w.value, leaveBlank: false };
      }
    }
    return init;
  });

  const setEntryValue = (label: string, value: string) => {
    setEntries((prev) => ({ ...prev, [label]: { ...prev[label], value } }));
  };

  const toggleLeaveBlank = (label: string) => {
    setEntries((prev) => ({
      ...prev,
      [label]: { ...prev[label], leaveBlank: !prev[label]?.leaveBlank },
    }));
  };

  const handleConfirm = () => {
    const result: Record<string, string> = {};
    for (const [label, state] of Object.entries(entries)) {
      result[label] = state.leaveBlank ? "" : state.value;
    }
    onConfirm(result);
  };

  const hasFields = unmatchedFields.length > 0 || mismatchFields.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        data-ocid="manual.dialog"
        className="max-w-lg bg-slate-900/95 backdrop-blur-xl border-white/10 text-foreground"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil size={16} className="text-emerald-400" />
            Manual Field Entry
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            These fields couldn&apos;t be auto-filled. Enter values before
            generating your PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {unmatchedFields.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Unmatched Fields
              </p>
              {unmatchedFields.map((field, idx) => {
                const state = entries[field.label] ?? {
                  value: "",
                  leaveBlank: false,
                };
                const conflict = inlineConflictWarning(
                  state.value,
                  field.profileKey,
                );
                return (
                  <div
                    key={field.label}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {field.label}
                        </p>
                        {field.profileLabel && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Maps to: {field.profileLabel}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        data-ocid={`manual.field.${idx + 1}.leave_blank`}
                        onClick={() => toggleLeaveBlank(field.label)}
                        className={`shrink-0 text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          state.leaveBlank
                            ? "border-slate-500 bg-slate-700 text-slate-300"
                            : "border-white/10 bg-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <EyeOff size={10} className="inline mr-1" />
                        Leave Blank
                      </button>
                    </div>
                    <Input
                      data-ocid={`manual.field.${idx + 1}.input`}
                      placeholder={field.label}
                      value={state.value}
                      disabled={state.leaveBlank}
                      onChange={(e) =>
                        setEntryValue(field.label, e.target.value)
                      }
                      className={`h-8 text-sm bg-slate-800/60 border-white/10 ${
                        state.leaveBlank ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    />
                    {conflict && !state.leaveBlank && (
                      <p className="text-[11px] text-amber-300/80 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        {conflict}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {unmatchedFields.length > 0 && mismatchFields.length > 0 && (
            <Separator className="bg-white/10" />
          )}

          {mismatchFields.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Conflicted Fields
              </p>
              {mismatchFields.map((w, idx) => {
                const fieldIdx = unmatchedFields.length + idx + 1;
                const state = entries[w.fieldLabel] ?? {
                  value: w.value,
                  leaveBlank: false,
                };
                const conflict = inlineConflictWarning(
                  state.value,
                  w.profileKey,
                );
                return (
                  <div
                    key={w.fieldLabel}
                    className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {w.fieldLabel}
                        </p>
                        <p className="text-[11px] text-amber-300/80 mt-0.5">
                          {humanExplain(w)}
                        </p>
                      </div>
                      <button
                        type="button"
                        data-ocid={`manual.field.${fieldIdx}.leave_blank`}
                        onClick={() => toggleLeaveBlank(w.fieldLabel)}
                        className={`shrink-0 text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          state.leaveBlank
                            ? "border-slate-500 bg-slate-700 text-slate-300"
                            : "border-white/10 bg-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <EyeOff size={10} className="inline mr-1" />
                        Leave Blank
                      </button>
                    </div>
                    <Input
                      data-ocid={`manual.field.${fieldIdx}.input`}
                      placeholder={w.fieldLabel}
                      value={state.value}
                      disabled={state.leaveBlank}
                      onChange={(e) =>
                        setEntryValue(w.fieldLabel, e.target.value)
                      }
                      className={`h-8 text-sm bg-slate-800/60 border-white/10 ${
                        state.leaveBlank ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    />
                    {conflict && !state.leaveBlank && (
                      <p className="text-[11px] text-amber-300/80 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        {conflict}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!hasFields && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No fields require manual entry.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            data-ocid="manual.cancel_button"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            data-ocid="manual.confirm_button"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleConfirm}
          >
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
