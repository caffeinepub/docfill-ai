/**
 * DataMappingPanel — Split-screen right panel.
 * v7.5: Primary label = exact PDF field label; semantic subtext beneath.
 */
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MappedField } from "@/utils/fieldDiscovery";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { motion } from "motion/react";

interface DataMappingPanelProps {
  matched: MappedField[];
  discovered: MappedField[];
  onOverrideChange: (profileKey: string, value: string) => void;
  onSaveToProfile: (key: string, value: string) => void;
  overrides: Record<string, string>;
  discoveredValues: Record<string, string>;
  onDiscoveredValueChange: (label: string, value: string) => void;
  saveChecked: Record<string, boolean>;
  onSaveCheckedChange: (label: string, checked: boolean) => void;
}

export function DataMappingPanel({
  matched,
  discovered,
  onOverrideChange,
  overrides,
  discoveredValues,
  onDiscoveredValueChange,
  saveChecked,
  onSaveCheckedChange,
}: DataMappingPanelProps) {
  return (
    <div data-ocid="mapping.panel" className="flex flex-col h-full min-h-0">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-primary" />
          <span className="text-sm font-semibold text-foreground font-display">
            Data Mapping
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 h-5 bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          >
            {matched.length} matched
          </Badge>
          {discovered.length > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 h-5 bg-amber-500/15 text-amber-400 border-amber-500/30"
            >
              {discovered.length} new
            </Badge>
          )}
        </div>
      </div>

      {/* Scrollable field list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-1.5">
          {/* Matched fields */}
          {matched.map((field, idx) => {
            const effectiveValue =
              field.profileKey !== null &&
              overrides[field.profileKey] !== undefined
                ? overrides[field.profileKey]
                : field.profileValue;

            return (
              <motion.div
                key={`matched-${field.label}-${idx}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.22 }}
                className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-3 py-2.5 group"
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <CheckCircle2
                    size={14}
                    className="text-emerald-400 flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    {/* v7.5: exact PDF label is primary */}
                    <p
                      className="text-xs font-semibold text-foreground truncate leading-tight"
                      title={field.label}
                    >
                      {field.label}
                    </p>
                    {/* Semantic subtext */}
                    {field.profileLabel && (
                      <p className="text-[10px] text-emerald-400/60 truncate mt-0.5">
                        Maps to: {field.profileLabel}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 h-4 flex-shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  >
                    {field.matchType === "semantic" ? "Semantic" : "Keyword"}
                  </Badge>
                </div>
                <Input
                  data-ocid={`field.input.${idx + 1}`}
                  value={effectiveValue}
                  onChange={(e) => {
                    if (field.profileKey !== null) {
                      onOverrideChange(field.profileKey, e.target.value);
                    }
                  }}
                  disabled={field.profileKey === null}
                  className="h-7 text-xs bg-white/5 border-white/10 focus:border-emerald-500/40 focus:ring-emerald-500/20"
                />
              </motion.div>
            );
          })}

          {/* Discovered (unmatched) fields */}
          {discovered.map((field, idx) => {
            const value = discoveredValues[field.label] ?? "";
            const checked = saveChecked[field.label] ?? false;
            const globalIdx = matched.length + idx;

            return (
              <motion.div
                key={`discovered-${field.label}-${idx}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: globalIdx * 0.03, duration: 0.22 }}
                className="rounded-xl bg-amber-500/8 border border-amber-500/25 px-3 py-2.5"
              >
                <div className="flex items-start gap-2 mb-1.5">
                  <XCircle
                    size={14}
                    className="text-amber-400 flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    {/* v7.5: exact PDF label is primary */}
                    <p
                      className="text-xs font-semibold text-foreground truncate leading-tight"
                      title={field.label}
                    >
                      {field.label}
                    </p>
                    {/* Semantic subtext if a partial match exists */}
                    {field.profileLabel ? (
                      <p className="text-[10px] text-amber-400/60 mt-0.5">
                        Maps to: {field.profileLabel}
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-400/50 mt-0.5">
                        Not in Master Profile
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 h-4 flex-shrink-0 bg-amber-500/10 text-amber-400 border-amber-500/30"
                  >
                    New Field
                  </Badge>
                </div>
                {/* v7.5: placeholder = exact PDF label */}
                <Input
                  data-ocid={`field.input.${globalIdx + 1}`}
                  value={value}
                  onChange={(e) =>
                    onDiscoveredValueChange(field.label, e.target.value)
                  }
                  placeholder={field.label}
                  className="h-7 text-xs bg-white/5 border-white/10 focus:border-amber-500/40 focus:ring-amber-500/20 mb-2"
                />
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    data-ocid={`field.save_checkbox.${idx + 1}`}
                    id={`save-profile-${idx}`}
                    checked={checked}
                    onCheckedChange={(c) =>
                      onSaveCheckedChange(field.label, c === true)
                    }
                    className="h-3.5 w-3.5 border-amber-500/40 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <Label
                    htmlFor={`save-profile-${idx}`}
                    className="text-[10px] text-amber-400/80 cursor-pointer"
                  >
                    Save to Master Profile
                  </Label>
                </div>
              </motion.div>
            );
          })}

          {/* Empty state */}
          {matched.length === 0 && discovered.length === 0 && (
            <div data-ocid="mapping.empty_state" className="py-12 text-center">
              <p className="text-xs text-muted-foreground">
                No fields detected
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
