import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarDays, User } from "lucide-react";

interface DateAmbiguityDialogProps {
  open: boolean;
  fieldLabel: string;
  onChoice: (choice: "dob" | "today") => void;
  onClose: () => void;
}

export function DateAmbiguityDialog({
  open,
  fieldLabel,
  onChoice,
  onClose,
}: DateAmbiguityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-ocid="date_ambiguity.dialog"
        className="max-w-sm bento-card"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Date Field Clarification
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            We couldn&apos;t determine the type of this date field from its
            label. Please choose what data to fill in.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 mb-4 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-muted-foreground mb-0.5">Field label</p>
          <p className="text-sm font-semibold text-foreground">{fieldLabel}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            data-ocid="date_ambiguity.dob.button"
            variant="outline"
            className="flex-col h-auto py-4 gap-2 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-600 transition-all"
            onClick={() => onChoice("dob")}
          >
            <User size={20} className="text-emerald-500" />
            <span className="text-sm font-medium">Date of Birth</span>
            <span className="text-xs text-muted-foreground">
              From your profile
            </span>
          </Button>

          <Button
            data-ocid="date_ambiguity.today.button"
            variant="outline"
            className="flex-col h-auto py-4 gap-2 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-600 transition-all"
            onClick={() => onChoice("today")}
          >
            <CalendarDays size={20} className="text-emerald-500" />
            <span className="text-sm font-medium">Today&apos;s Date</span>
            <span className="text-xs text-muted-foreground">Current date</span>
          </Button>
        </div>

        <button
          type="button"
          data-ocid="date_ambiguity.cancel_button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground text-center w-full mt-1 transition-colors"
        >
          Leave blank
        </button>
      </DialogContent>
    </Dialog>
  );
}
