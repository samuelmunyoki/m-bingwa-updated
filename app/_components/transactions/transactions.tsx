"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare,
  PhoneCall,
  CalendarClock,
  Search,
  Trash2,
  X,
  History,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type TxType = "sms" | "dialer" | "scheduled";
type TxStatus = "successful" | "failed" | "pending" | "unavailable" | "cancelled";

interface UnifiedTransaction {
  id: string;
  type: TxType;
  title: string;
  subtitle: string;
  status: TxStatus;
  timestampMs: number;
  rawId: Id<"mpesaMessages"> | Id<"ussdHistory"> | Id<"scheduled_events">;
  raw: Record<string, unknown>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSmsStatus(processed: string | undefined | null): TxStatus {
  switch (processed) {
    case "successful": return "successful";
    case "failed": return "failed";
    case "not-viable":
    case "disabled": return "unavailable";
    default: return "pending";
  }
}

function parseDialerStatus(status: string | undefined): TxStatus {
  switch ((status ?? "").toLowerCase()) {
    case "success": return "successful";
    case "failed": return "failed";
    case "timeout":
    case "validation failed": return "unavailable";
    default: return "pending";
  }
}

function parseScheduledStatus(status: string | undefined): TxStatus {
  switch ((status ?? "").toUpperCase()) {
    case "EXECUTED":
    case "SUCCESS": return "successful";
    case "FAILED":
    case "ERRORED": return "failed";
    case "CANCELLED": return "cancelled";
    default: return "pending";
  }
}

function parseDialerTimestamp(ts: string | undefined): number {
  if (!ts) return 0;
  // "yyyy-MM-dd HH:mm:ss"
  return new Date(ts.replace(" ", "T")).getTime();
}

function formatTs(ms: number): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-KE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TxType, { label: string; icon: React.ReactNode; pill: string; circle: string }> = {
  sms: {
    label: "SMS",
    icon: <MessageSquare className="w-4 h-4 text-green-600" />,
    pill: "bg-green-50 text-green-700 border-green-200",
    circle: "bg-green-50",
  },
  dialer: {
    label: "Dialer",
    icon: <PhoneCall className="w-4 h-4 text-blue-600" />,
    pill: "bg-blue-50 text-blue-700 border-blue-200",
    circle: "bg-blue-50",
  },
  scheduled: {
    label: "Scheduled",
    icon: <CalendarClock className="w-4 h-4 text-purple-600" />,
    pill: "bg-purple-50 text-purple-700 border-purple-200",
    circle: "bg-purple-50",
  },
};

const STATUS_CONFIG: Record<TxStatus, { label: string; className: string }> = {
  successful: { label: "Successful", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700 border-red-200" },
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  unavailable: { label: "Unavailable", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
  cancelled: { label: "Cancelled", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

// ─── Detail Dialog ────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-neutral-100 last:border-0">
      <span className="text-xs text-neutral-400 font-medium uppercase tracking-wide">{label}</span>
      <span className="text-sm text-neutral-800 break-words">{value ?? "—"}</span>
    </div>
  );
}

function MonoBlock({ value }: { value: string | undefined }) {
  if (!value) return <span className="text-sm text-neutral-400">—</span>;
  return (
    <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded-md p-3 whitespace-pre-wrap break-words font-mono mt-1">
      {value}
    </pre>
  );
}

function SmsDetail({ tx }: { tx: UnifiedTransaction }) {
  const r = tx.raw as {
    name?: string; amount?: number; phoneNumber?: string;
    transactionId?: string; time?: number; offerName?: string;
    processResponse?: string; fullMessage?: string; processedUSSD?: string;
  };
  return (
    <div className="flex flex-col">
      <DetailRow label="Sender" value={r.name} />
      <DetailRow label="Amount" value={r.amount !== undefined ? `KES ${r.amount}` : undefined} />
      <DetailRow label="Phone Number" value={r.phoneNumber} />
      <DetailRow label="M-Pesa Code" value={r.transactionId} />
      <DetailRow label="Time" value={formatTs(r.time ?? 0)} />
      <DetailRow label="Offer" value={r.offerName} />
      <DetailRow label="Processed USSD" value={r.processedUSSD} />
      <div className="py-2.5">
        <span className="text-xs text-neutral-400 font-medium uppercase tracking-wide">Process Response</span>
        <MonoBlock value={r.processResponse} />
      </div>
      <div className="py-2.5">
        <span className="text-xs text-neutral-400 font-medium uppercase tracking-wide">Full SMS</span>
        <MonoBlock value={r.fullMessage} />
      </div>
    </div>
  );
}

function DialerDetail({ tx }: { tx: UnifiedTransaction }) {
  const r = tx.raw as {
    offerName?: string; targetNumber?: string; ussdCode?: string;
    timeStamp?: string; timeTaken?: string; ussdResponse?: string;
  };
  return (
    <div className="flex flex-col">
      <DetailRow label="Offer" value={r.offerName} />
      <DetailRow label="Target Number" value={r.targetNumber} />
      <DetailRow label="USSD Code" value={r.ussdCode} />
      <DetailRow label="Time" value={r.timeStamp} />
      <DetailRow label="Time Taken" value={r.timeTaken} />
      <div className="py-2.5">
        <span className="text-xs text-neutral-400 font-medium uppercase tracking-wide">USSD Response</span>
        <MonoBlock value={r.ussdResponse} />
      </div>
    </div>
  );
}

function ScheduledDetail({ tx }: { tx: UnifiedTransaction }) {
  const r = tx.raw as {
    offerName?: string; offerDuration?: string; offerPrice?: number;
    offerNum?: string; scheduledTimeStamp?: number; dialingSim?: string;
    isRepeat?: boolean; repeatInterval?: number; repeatUnit?: string;
    status?: string;
  };
  return (
    <div className="flex flex-col">
      <DetailRow label="Offer" value={r.offerName} />
      <DetailRow label="Duration" value={r.offerDuration} />
      <DetailRow label="Price" value={r.offerPrice !== undefined ? `KES ${r.offerPrice}` : undefined} />
      <DetailRow label="Recipient Phone" value={r.offerNum} />
      <DetailRow label="Scheduled Time" value={r.scheduledTimeStamp ? formatTs(r.scheduledTimeStamp * 1000) : undefined} />
      <DetailRow label="Dialing SIM" value={r.dialingSim} />
      <DetailRow label="Repeat" value={r.isRepeat ? `Every ${r.repeatInterval} ${r.repeatUnit}` : "No"} />
      <DetailRow label="Status" value={r.status} />
    </div>
  );
}

function TransactionDetailDialog({
  tx,
  open,
  onClose,
}: {
  tx: UnifiedTransaction | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!tx) return null;
  const typeConf = TYPE_CONFIG[tx.type];
  const statusConf = STATUS_CONFIG[tx.status];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${typeConf.circle}`}>
              {typeConf.icon}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold text-neutral-800 truncate">{tx.title}</DialogTitle>
              <p className="text-xs text-neutral-400 truncate mt-0.5">{tx.subtitle}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeConf.pill}`}>
                {typeConf.label}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusConf.className}`}>
                {statusConf.label}
              </span>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 px-5 py-1">
          {tx.type === "sms" && <SmsDetail tx={tx} />}
          {tx.type === "dialer" && <DialerDetail tx={tx} />}
          {tx.type === "scheduled" && <ScheduledDetail tx={tx} />}
          <div className="h-4" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Transaction Card ─────────────────────────────────────────────────────────

function TransactionCard({
  tx,
  selected,
  selectionMode,
  onSelect,
  onClick,
}: {
  tx: UnifiedTransaction;
  selected: boolean;
  selectionMode: boolean;
  onSelect: (id: string) => void;
  onClick: (tx: UnifiedTransaction) => void;
}) {
  const [hovered, setHovered] = React.useState(false);
  const typeConf = TYPE_CONFIG[tx.type];
  const statusConf = STATUS_CONFIG[tx.status];
  const showCheckbox = hovered || selected || selectionMode;

  return (
    <div
      className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer
        ${selected
          ? "border-neutral-400 bg-neutral-50 dark:bg-neutral-800"
          : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-300 hover:shadow-sm"
        }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (selectionMode) { onSelect(tx.id); return; }
        onClick(tx);
      }}
    >
      {/* Checkbox */}
      <div
        className={`shrink-0 transition-all duration-150 ${showCheckbox ? "opacity-100 w-5" : "opacity-0 w-0 overflow-hidden"}`}
        onClick={(e) => { e.stopPropagation(); onSelect(tx.id); }}
      >
        <Checkbox checked={selected} className="border-neutral-300" />
      </div>

      {/* Type icon */}
      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${typeConf.circle}`}>
        {typeConf.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{tx.title}</p>
        <p className="text-xs text-neutral-400 truncate mt-0.5">{tx.subtitle}</p>
      </div>

      {/* Right side */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeConf.pill}`}>
            {typeConf.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusConf.className}`}>
            {statusConf.label}
          </span>
        </div>
        <span className="text-xs text-neutral-400">{formatTs(tx.timestampMs)}</span>
      </div>
    </div>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-neutral-800 text-white border-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
          : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 dark:bg-neutral-900 dark:text-neutral-400"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TypeFilter = "all" | TxType;
type StatusFilter = "all" | TxStatus;

export function TransactionsMain({ userId }: { userId: string }) {
  // Queries
  const smsData = useQuery(api.features.mpesaMessages.getMpesaMessagesByUserId, { userId });
  const dialerData = useQuery(api.features.ussdHistory.getUSSDHistory, { userId });
  const scheduledData = useQuery(api.features.scheduled_events.getScheduledEvents, { userId });

  // Mutations
  const deleteSms = useMutation(api.features.mpesaMessages.deleteMpesaMessage);
  const deleteDialer = useMutation(api.features.ussdHistory.deleteUSSDHistory);
  const deleteScheduled = useMutation(api.features.scheduled_events.deleteScheduledEvent);

  // UI state
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [detailTx, setDetailTx] = React.useState<UnifiedTransaction | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const loading = smsData === undefined || dialerData === undefined || scheduledData === undefined;

  // Merge all sources
  const allTransactions = React.useMemo<UnifiedTransaction[]>(() => {
    const result: UnifiedTransaction[] = [];

    (smsData ?? []).forEach((m) => {
      result.push({
        id: `sms_${m._id}`,
        type: "sms",
        title: m.name || "Unknown Sender",
        subtitle: m.amount ? `KES ${m.amount} · ${m.phoneNumber}` : m.phoneNumber || "",
        status: parseSmsStatus(m.processed),
        timestampMs: m.time,
        rawId: m._id,
        raw: m as unknown as Record<string, unknown>,
      });
    });

    (dialerData ?? []).forEach((d) => {
      result.push({
        id: `dialer_${d._id}`,
        type: "dialer",
        title: d.offerName || "USSD Execution",
        subtitle: d.targetNumber ? `${d.targetNumber} · ${d.timeStamp ?? ""}` : (d.timeStamp ?? ""),
        status: parseDialerStatus(d.status),
        timestampMs: parseDialerTimestamp(d.timeStamp),
        rawId: d._id,
        raw: d as unknown as Record<string, unknown>,
      });
    });

    (scheduledData ?? []).forEach((s) => {
      result.push({
        id: `scheduled_${s._id}`,
        type: "scheduled",
        title: (s as unknown as { offerName?: string }).offerName || "Scheduled Event",
        subtitle: (s as unknown as { offerNum?: string }).offerNum || "",
        status: parseScheduledStatus((s as unknown as { status?: string }).status),
        timestampMs: ((s as unknown as { scheduledTimeStamp?: number }).scheduledTimeStamp ?? 0) * 1000,
        rawId: s._id,
        raw: s as unknown as Record<string, unknown>,
      });
    });

    return result.sort((a, b) => b.timestampMs - a.timestampMs);
  }, [smsData, dialerData, scheduledData]);

  // Filtered list
  const filtered = React.useMemo(() => {
    return allTransactions.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!tx.title.toLowerCase().includes(q) && !tx.subtitle.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allTransactions, typeFilter, statusFilter, search]);

  const selectionMode = selected.size > 0;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((tx) => tx.id)));
  const clearSelection = () => setSelected(new Set());

  const handleBulkDelete = async () => {
    setDeleting(true);
    const toDelete = filtered.filter((tx) => selected.has(tx.id));
    await Promise.allSettled(
      toDelete.map((tx) => {
        if (tx.type === "sms") return deleteSms({ messageId: tx.rawId as Id<"mpesaMessages"> });
        if (tx.type === "dialer") return deleteDialer({ historyId: tx.rawId as Id<"ussdHistory">, userId });
        return deleteScheduled({ id: tx.rawId as Id<"scheduled_events"> });
      })
    );
    setSelected(new Set());
    setDeleting(false);
    setShowDeleteAlert(false);
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="p-6 md:p-5 md:pl-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900 flex flex-col gap-3 flex-1 w-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg text-neutral-600 font-medium">Transaction History</h2>
        </div>
        <div className="border-b border-neutral-200 dark:border-neutral-700" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-neutral-50 border-neutral-200"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <FilterChip label="All Types" active={typeFilter === "all"} onClick={() => setTypeFilter("all")} />
          <FilterChip label="SMS" active={typeFilter === "sms"} onClick={() => setTypeFilter("sms")} />
          <FilterChip label="Dialer" active={typeFilter === "dialer"} onClick={() => setTypeFilter("dialer")} />
          <FilterChip label="Scheduled" active={typeFilter === "scheduled"} onClick={() => setTypeFilter("scheduled")} />
          <div className="w-px bg-neutral-200 mx-1" />
          <FilterChip label="All Status" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
          <FilterChip label="Successful" active={statusFilter === "successful"} onClick={() => setStatusFilter("successful")} />
          <FilterChip label="Failed" active={statusFilter === "failed"} onClick={() => setStatusFilter("failed")} />
          <FilterChip label="Pending" active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} />
        </div>

        {/* Selection bar */}
        {selectionMode && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl">
            <span className="text-sm font-medium text-neutral-700">{selected.size} selected</span>
            <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Select all ({filtered.length})</button>
            <button onClick={clearSelection} className="text-xs text-neutral-400 hover:text-neutral-600 flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDeleteAlert(true)}
              className="h-7 text-xs gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              Delete {selected.size}
            </Button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex items-center gap-2">
              <svg aria-hidden="true" className="w-7 h-7 text-gray-200 animate-spin dark:text-gray-600 fill-neutral-500" viewBox="0 0 100 101" fill="none">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
              </svg>
              <span className="text-neutral-500 text-sm">Loading transactions...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center">
              <History className="w-6 h-6 text-neutral-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600">No transactions found</p>
              <p className="text-xs text-neutral-400 mt-1">
                {allTransactions.length === 0 ? "No execution history yet." : "Try adjusting your filters."}
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-2">
            <div className="flex flex-col gap-2 pb-4">
              {filtered.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  tx={tx}
                  selected={selected.has(tx.id)}
                  selectionMode={selectionMode}
                  onSelect={toggleSelect}
                  onClick={setDetailTx}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Detail Dialog */}
      <TransactionDetailDialog
        tx={detailTx}
        open={detailTx !== null}
        onClose={() => setDetailTx(null)}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} transaction{selected.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TransactionsMain;
