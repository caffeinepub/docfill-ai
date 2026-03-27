import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookOpen, Filter, Lock, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

export interface JournalEntry {
  id: string;
  name: string;
  date: string;
  actType: "RON" | "Mobile Notary";
  idMethod: "Driver's License" | "Passport" | "Credible Witness";
  fee: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface NotaryJournalPageProps {
  onLockAdmin: () => void;
}

export function NotaryJournalPage({ onLockAdmin }: NotaryJournalPageProps) {
  const [filterActType, setFilterActType] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const rawEntries: JournalEntry[] = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("docfill_journal_entries") ?? "[]",
      );
    } catch {
      return [];
    }
  }, []);

  const entries = useMemo(() => {
    return rawEntries.filter((e) => {
      if (filterActType !== "all" && e.actType !== filterActType) return false;
      if (filterFrom) {
        const entryDate = new Date(e.date);
        const from = new Date(filterFrom);
        if (entryDate < from) return false;
      }
      if (filterTo) {
        const entryDate = new Date(e.date);
        const to = new Date(filterTo);
        to.setHours(23, 59, 59, 999);
        if (entryDate > to) return false;
      }
      return true;
    });
  }, [rawEntries, filterActType, filterFrom, filterTo]);

  const handleLock = () => {
    localStorage.removeItem("docfill_admin_mode");
    onLockAdmin();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  Notary Journal
                </h1>
                <Badge
                  variant="outline"
                  className="text-xs border-amber-500/40 text-amber-600 bg-amber-500/10"
                >
                  <Shield size={10} className="mr-1" />
                  Admin Only
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Electronic notarial record — read-only audit log
              </p>
            </div>
          </div>
          <Button
            data-ocid="journal.lock.button"
            variant="outline"
            size="sm"
            onClick={handleLock}
            className="gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/40"
          >
            <Lock size={14} />
            Lock Admin
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <Card className="bento-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Filter size={14} className="text-primary" />
              Filter Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Act Type</Label>
                <Select value={filterActType} onValueChange={setFilterActType}>
                  <SelectTrigger
                    data-ocid="journal.act_type.select"
                    className="text-sm"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="RON">RON (Remote Online)</SelectItem>
                    <SelectItem value="Mobile Notary">Mobile Notary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">From Date</Label>
                <Input
                  data-ocid="journal.date_from.input"
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To Date</Label>
                <Input
                  data-ocid="journal.date_to.input"
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Journal Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <Card className="bento-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Journal Entries</span>
              <span className="text-xs font-normal text-muted-foreground">
                {entries.length} record{entries.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div
                data-ocid="journal.empty_state"
                className="py-16 flex flex-col items-center gap-3 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                  <BookOpen size={22} className="text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground">
                  No journal entries yet
                </p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Completed notary sessions will be automatically logged here
                  after payment confirmation.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="journal.table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Signer Name</TableHead>
                      <TableHead className="text-xs">Date &amp; Time</TableHead>
                      <TableHead className="text-xs">Act Type</TableHead>
                      <TableHead className="text-xs">ID Method</TableHead>
                      <TableHead className="text-xs text-right">Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, i) => (
                      <TableRow
                        key={entry.id}
                        data-ocid={`journal.item.${i + 1}`}
                      >
                        <TableCell className="text-sm font-medium">
                          {entry.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              entry.actType === "RON"
                                ? "text-violet-600 border-violet-500/30 bg-violet-500/10 text-xs"
                                : "text-emerald-600 border-emerald-500/30 bg-emerald-500/10 text-xs"
                            }
                          >
                            {entry.actType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {entry.idMethod}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-right">
                          {formatCurrency(entry.fee)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
