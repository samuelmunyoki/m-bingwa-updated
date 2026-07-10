"use client";

import React from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
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
  CheckCircle,
  XCircle,
  Clock,
  SlidersHorizontal,
  MinusCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type TxType = "sms" | "dialer" | "scheduled";
type TxStatus = "successful" | "failed" | "pending" | "unavailable" | "cancelled" | "disabled";
type PeriodFilter = "all" | "today" | "yesterday" | "last7" | "last30";

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
    case "not-viable": return "unavailable";
    case "disabled": return "disabled";
    default: return "pending";
  }
}

function parseDialerStatus(status: string | undefined): TxStatus {
  switch ((status ?? "").toLowerCase()) {
    case "success": return "successful";
    // Timeout & Cancelled count as failed — matches the Failed counter (getTodayCounts) and the
    // app's failed list. "Validation Failed" stays under Unavailable (not counted as failed).
    case "failed":
    case "timeout":
    case "cancelled": return "failed";
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

// Start-of-day in Africa/Nairobi (UTC+3, no DST) as a UTC-ms timestamp. Used so the web "today"
// window matches the Android device's day boundary regardless of the web client's own timezone.
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;
function nairobiStartOfDay(atMs: number = Date.now()): number {
  const shifted = new Date(atMs + NAIROBI_OFFSET_MS);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - NAIROBI_OFFSET_MS;
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
    label: "M-Pesa",
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

const STATUS_CONFIG: Record<TxStatus, { label: string; className: string; icon: React.ReactNode }> = {
  successful: { label: "Successful", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> },
  failed:     { label: "Failed",     className: "bg-red-50 text-red-700 border-red-200",             icon: <XCircle className="w-3.5 h-3.5 text-red-500" /> },
  pending:    { label: "Pending",    className: "bg-amber-50 text-amber-700 border-amber-200",        icon: <Clock className="w-3.5 h-3.5 text-amber-500" /> },
  unavailable:{ label: "Unavailable",className: "bg-neutral-100 text-neutral-500 border-neutral-200",icon: <MinusCircle className="w-3.5 h-3.5 text-neutral-400" /> },
  cancelled:  { label: "Cancelled",  className: "bg-neutral-100 text-neutral-500 border-neutral-200",icon: <MinusCircle className="w-3.5 h-3.5 text-neutral-400" /> },
  disabled:   { label: "Disabled",   className: "bg-orange-50 text-orange-600 border-orange-200",    icon: <AlertCircle className="w-3.5 h-3.5 text-orange-500" /> },
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
  onDelete,
  onRetry,
  actionLoading,
}: {
  tx: UnifiedTransaction | null;
  open: boolean;
  onClose: () => void;
  onDelete: (tx: UnifiedTransaction) => void;
  onRetry: (tx: UnifiedTransaction) => void;
  actionLoading: boolean;
}) {
  if (!tx) return null;
  const typeConf = TYPE_CONFIG[tx.type];
  const statusConf = STATUS_CONFIG[tx.status];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-neutral-100 shrink-0">
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
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-1">
          {tx.type === "sms" && <SmsDetail tx={tx} />}
          {tx.type === "dialer" && <DialerDetail tx={tx} />}
          {tx.type === "scheduled" && <ScheduledDetail tx={tx} />}
          <div className="h-4" />
        </div>
        <div className="px-5 py-4 border-t border-neutral-100 flex gap-2">
          {tx.type === "sms" && (
            <Button
              variant="outline"
              className="flex-1 gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
              disabled={actionLoading}
              onClick={() => onRetry(tx)}
            >
              <RefreshCw className={`w-4 h-4 ${actionLoading ? "animate-spin" : ""}`} />
              Retry Processing
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 gap-1.5 text-red-500 border-red-200 hover:bg-red-50"
            disabled={actionLoading}
            onClick={() => onDelete(tx)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Retry Countdown Hook ────────────────────────────────────────────────────

function useRetryCountdown(scheduledRetryAt: number | null | undefined): string | null {
  const [label, setLabel] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!scheduledRetryAt) { setLabel(null); return; }

    const update = () => {
      const diff = scheduledRetryAt - Date.now();
      if (diff <= 0) { setLabel(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(h > 0 ? `Retrying in ${h}h ${m}m` : m > 0 ? `Retrying in ${m}m ${s}s` : `Retrying in ${s}s`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [scheduledRetryAt]);

  return label;
}

// ─── Transaction Card ─────────────────────────────────────────────────────────

function TransactionCard({
  tx,
  selected,
  selectionMode,
  onSelect,
  onClick,
  onDelete,
  onRetry,
  actionLoading,
}: {
  tx: UnifiedTransaction;
  selected: boolean;
  selectionMode: boolean;
  onSelect: (id: string) => void;
  onClick: (tx: UnifiedTransaction) => void;
  onDelete: (tx: UnifiedTransaction) => void;
  onRetry: (tx: UnifiedTransaction) => void;
  actionLoading: boolean;
}) {
  const [hovered, setHovered] = React.useState(false);
  const typeConf = TYPE_CONFIG[tx.type];
  const statusConf = STATUS_CONFIG[tx.status];
  const showCheckbox = hovered || selected || selectionMode;
  const scheduledRetryAt = (() => {
    if (tx.type === "sms" && tx.status === "pending")
      return (tx.raw.scheduledRetryAt as number | undefined) ?? null;
    if (tx.type === "scheduled" && (tx.raw.status === "PENDING" || tx.raw.status === "RETRY_PENDING")) {
      const ts = tx.raw.scheduledTimeStamp as number | undefined;
      return ts ? ts * 1000 : null;
    }
    return null;
  })();
  const retryCountdown = useRetryCountdown(scheduledRetryAt);

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
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusConf.className}`}>
            {statusConf.icon}
            {statusConf.label}
          </span>
        </div>
        <span className="text-xs text-neutral-400">{formatTs(tx.timestampMs)}</span>
        {retryCountdown && (
          <span className="text-xs text-amber-500 font-medium">{retryCountdown}</span>
        )}
        {/* Inline action buttons — shown on hover or when not in selection mode */}
        {!selectionMode && (hovered || actionLoading) && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {tx.type === "sms" && (
              <button
                disabled={actionLoading}
                onClick={() => onRetry(tx)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${actionLoading ? "animate-spin" : ""}`} />
                Retry
              </button>
            )}
            <button
              disabled={actionLoading}
              onClick={() => onDelete(tx)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
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

// Auto-retry error boundary. A Convex useQuery THROWS on error (e.g. the 1s server-side timeout
// when the backend is overloaded). With no boundary, that throw unmounts the whole React tree →
// Next.js shows "Application error: a client-side exception has occurred" (the white screen).
// This catches it, shows a light fallback, and auto-retries every few seconds — so the dashboard
// self-heals the instant the backend answers again, no manual reload. (Whole-dashboard scope:
// under load every query times out together, so widgets fail/recover together anyway.)
class AutoRetryBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    // Re-mount children after a short delay — a fresh Convex subscription retries the query.
    this.retryTimer = setTimeout(() => this.setState({ hasError: false }), 4000);
  }
  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }
  private retryNow = () => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.setState({ hasError: false });
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-sm text-neutral-500 dark:text-neutral-400">
          <span>Couldn&apos;t load transactions — the server is busy. Retrying&hellip;</span>
          <button
            onClick={this.retryNow}
            className="px-4 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Retry now
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrapped export: the dashboard body runs INSIDE the boundary, so a slow/failed query degrades
// gracefully instead of white-screening the whole page. The queries live in the inner component,
// so their throws are caught here (a boundary only catches errors from its children).
export function TransactionsMain(props: { userId: string }) {
  return (
    <AutoRetryBoundary>
      <TransactionsMainInner {...props} />
    </AutoRetryBoundary>
  );
}

function TransactionsMainInner({ userId }: { userId: string }) {
  // ── UI state — declared first so computed values below can reference them ──
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = React.useState<PeriodFilter>("all");
  const [verifiedFilter, setVerifiedFilter] = React.useState<"all" | "verified" | "unverified">("all");
  const [offerFilter, setOfferFilter] = React.useState<string>("all");
  const [showFilterPanel, setShowFilterPanel] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [detailTx, setDetailTx] = React.useState<UnifiedTransaction | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);

  // ── Period time ranges — for server-side filters ────────────────────────────
  const periodTimes = React.useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const todayStart = nairobiStartOfDay(now); // Nairobi day boundary, matches Android
    switch (periodFilter) {
      case "today":     return { startTime: todayStart,         endTime: now };
      case "yesterday": return { startTime: todayStart - dayMs, endTime: todayStart - 1 };
      case "last7":     return { startTime: now - 7  * dayMs, endTime: now };
      case "last30":    return { startTime: now - 30 * dayMs, endTime: now };
      default:          return {};
    }
  }, [periodFilter]);

  // ── Paginated M-Pesa — server-side status + period filters, 50 at a time ───
  const smsPaginatedArgs = {
    userId,
    // "unavailable" & "disabled" are NOT sent to the server — the server only knows `processed`,
    // but the app defines these by offerName / processResponse. So (like "pending") we fetch rows and
    // sort them client-side below to mirror the app exactly. Period stays server-side either way.
    ...(statusFilter !== "all" && statusFilter !== "pending" && statusFilter !== "unavailable" && statusFilter !== "disabled" && (typeFilter === "all" || typeFilter === "sms")
      ? { statusFilter }
      : {}),
    ...periodTimes,
  };
  const { results: smsResults, loadMore: loadMoreSms, status: smsLoadStatus } = usePaginatedQuery(
    api.features.mpesaMessages.getMpesaMessagesPaginated,
    smsPaginatedArgs,
    { initialNumItems: 50 }
  );

  // ── Small datasets — fully loaded ──────────────────────────────────────────
  const dialerData = useQuery(api.features.ussdHistory.getUSSDHistory, { userId });
  const scheduledData = useQuery(api.features.scheduled_events.getScheduledEvents, { userId });
  const bundlesData = useQuery(api.features.bundles.getAllBundles, { userId });

  // ── Today counts — server-side, no limit, resets at midnight ───────────────
  const todayMsStart = React.useMemo(() => nairobiStartOfDay(), []);
  const todayMsEnd   = React.useMemo(() => nairobiStartOfDay() + 24 * 60 * 60 * 1000 - 1, []);
  const mpesaTodayCounts     = useQuery(api.features.mpesaMessages.getTodayCounts,     { userId, startTime: todayMsStart, endTime: todayMsEnd });
  const dialerTodayCounts    = useQuery(api.features.ussdHistory.getTodayCounts,       { userId, startTime: todayMsStart });
  const scheduledTodayCounts = useQuery(api.features.scheduled_events.getTodayCounts,  { userId, startTime: todayMsStart });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const deleteSms = useMutation(api.features.mpesaMessages.deleteMpesaMessage);
  const deleteDialer = useMutation(api.features.ussdHistory.deleteUSSDHistory);
  const deleteScheduled = useMutation(api.features.scheduled_events.deleteScheduledEvent);
  const resetForWebRetry = useMutation(api.features.mpesaMessages.resetMessageForWebRetry);
  const bulkResetForWebRetry = useMutation(api.features.mpesaMessages.bulkResetMessagesForWebRetry);

  const [deleting, setDeleting] = React.useState(false);
  const [bulkRetrying, setBulkRetrying] = React.useState(false);
  const [cardActionId, setCardActionId] = React.useState<string | null>(null);

  const loading = smsLoadStatus === "LoadingFirstPage" || dialerData === undefined || scheduledData === undefined;

  // Merge all sources — M-Pesa is paginated (server-filtered), dialer/scheduled fully loaded
  const allTransactions = React.useMemo<UnifiedTransaction[]>(() => {
    const result: UnifiedTransaction[] = [];

    const now = Date.now();
    (smsResults ?? []).forEach((m) => {
      // Failed-retries only: "Scheduled" means a pending message waiting on a future retry. A
      // 'successful' message awaiting verification can also carry scheduledRetryAt but must stay under
      // Successful, so require pending here.
      const isAutoScheduled =
        (!m.processed || m.processed === "pending") &&
        m.scheduledRetryAt != null &&
        (m.scheduledRetryAt as number) > now;
      if (typeFilter === "scheduled" && !isAutoScheduled) return;
      // SMS shows ALL M-Pesa messages, including auto-rescheduled (failed-retry) ones — matches the
      // app, where such a message appears under both M-Pesa and Scheduled (not only Scheduled).
      if (typeFilter === "dialer") return;
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

    (typeFilter === "all" || typeFilter === "dialer" ? dialerData ?? [] : []).forEach((d) => {
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

    (typeFilter === "all" || typeFilter === "scheduled" ? scheduledData ?? [] : []).forEach((s) => {
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
  }, [smsResults, dialerData, scheduledData, typeFilter]);

  // All offer names from bundles (not from transactions)
  const offerNames = React.useMemo(() => {
    return (bundlesData ?? [])
      .map((b: Record<string, unknown>) => b.offerName as string)
      .filter(Boolean)
      .sort();
  }, [bundlesData]);

  // Filtered list
  // M-Pesa: status + period already filtered server-side. Apply remaining client-side filters.
  // Dialer/Scheduled: apply all filters client-side (fully loaded).
  const filtered = React.useMemo(() => {
    const now = Date.now();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(); yesterdayStart.setDate(yesterdayStart.getDate() - 1); yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(); yesterdayEnd.setDate(yesterdayEnd.getDate() - 1); yesterdayEnd.setHours(23, 59, 59, 999);

    return allTransactions.filter((tx) => {
      // Type already handled in allTransactions useMemo

      const raw = tx.raw as Record<string, unknown>;

      // ── Status ──────────────────────────────────────────────────────────────
      // Unavailable & Disabled mirror the APP exactly (the server can't express these):
      //   Unavailable = offerName === "unavailable"  (M-Pesa or dialer; never scheduled)
      //   Disabled    = M-Pesa `not-viable` + processResponse === "Offer Disabled" (never dialer/scheduled)
      if (statusFilter === "unavailable") {
        if (tx.type === "scheduled") return false;
        if (raw.offerName !== "unavailable") return false;
      } else if (statusFilter === "disabled") {
        if (tx.type !== "sms") return false;
        if (raw.processed !== "not-viable" || raw.processResponse !== "Offer Disabled") return false;
      } else if (tx.type !== "sms") {
        // Dialer + Scheduled, other statuses. Pending is M-Pesa only, so exclude them there.
        if (statusFilter === "pending") return false;
        if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      } else if (statusFilter === "pending") {
        // M-Pesa pending — client-side (exclude future scheduled-retries). Other sms statuses are
        // filtered server-side in the paginated query.
        if (tx.status !== "pending") return false;
        const scheduledRetryAt = raw.scheduledRetryAt as number | undefined | null;
        if (scheduledRetryAt && scheduledRetryAt > now) return false;
      }

      // ── Period ──────────────────────────────────────────────────────────────
      // M-Pesa period is applied server-side (periodTimes); dialer/scheduled client-side here.
      if (tx.type !== "sms") {
        if (periodFilter === "today"     && tx.timestampMs < todayStart.getTime()) return false;
        if (periodFilter === "yesterday" && (tx.timestampMs < yesterdayStart.getTime() || tx.timestampMs > yesterdayEnd.getTime())) return false;
        if (periodFilter === "last7"     && tx.timestampMs < now - 7  * 24 * 60 * 60 * 1000) return false;
        if (periodFilter === "last30"    && tx.timestampMs < now - 30 * 24 * 60 * 60 * 1000) return false;
      }

      // Offer filter (all types, client-side)
      if (offerFilter !== "all") {
        const txOffer = (tx.raw as Record<string, unknown>).offerName as string | undefined;
        if (txOffer !== offerFilter) return false;
      }

      // Verified filter — only meaningful for M-Pesa, and only among Successful. Mirror the app:
      // "Verified" keeps dialer/scheduled; "Unverified" hides them (they have no verified state).
      if (verifiedFilter !== "all" && tx.status === "successful") {
        if (tx.type === "sms") {
          const isVerified = !!raw.verified;
          if (verifiedFilter === "verified" && !isVerified) return false;
          if (verifiedFilter === "unverified" && isVerified) return false;
        } else if (verifiedFilter === "unverified") {
          return false;
        }
      }

      // Search — mirror the APP's per-type fields (not just the display title/subtitle), so the
      // M-Pesa transaction ID and dialer USSD code are searchable too. (M-Pesa only scans loaded
      // pages, since it's paginated — same Load-More limitation as elsewhere.)
      if (search.trim()) {
        const q = search.toLowerCase();
        const has = (v: unknown) => typeof v === "string" && v.toLowerCase().includes(q);
        const match =
          tx.type === "sms"    ? has(raw.name) || has(raw.phoneNumber) || has(raw.transactionId) :
          tx.type === "dialer" ? has(raw.ussdCode) || has(raw.targetNumber) || has(raw.offerName) :
          /* scheduled */        has(raw.offerName) || has(raw.offerNum);
        if (!match) return false;
      }

      return true;
    });
  }, [allTransactions, typeFilter, statusFilter, periodFilter, offerFilter, verifiedFilter, search]);

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

  const handleBulkRetry = async () => {
    setBulkRetrying(true);
    const smsIds = filtered
      .filter((tx) => selected.has(tx.id) && tx.type === "sms")
      .map((tx) => tx.rawId as Id<"mpesaMessages">);
    if (smsIds.length > 0) {
      await bulkResetForWebRetry({ messageIds: smsIds });
    }
    setSelected(new Set());
    setBulkRetrying(false);
  };

  const handleCardDelete = async (tx: UnifiedTransaction) => {
    setCardActionId(tx.id);
    if (tx.type === "sms") await deleteSms({ messageId: tx.rawId as Id<"mpesaMessages"> });
    else if (tx.type === "dialer") await deleteDialer({ historyId: tx.rawId as Id<"ussdHistory">, userId });
    else await deleteScheduled({ id: tx.rawId as Id<"scheduled_events"> });
    setCardActionId(null);
    if (detailTx?.id === tx.id) setDetailTx(null);
  };

  const handleCardRetry = async (tx: UnifiedTransaction) => {
    if (tx.type !== "sms") return;
    setCardActionId(tx.id);
    await resetForWebRetry({ messageId: tx.rawId as Id<"mpesaMessages"> });
    setCardActionId(null);
    setDetailTx(null);
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="p-3 md:p-3 md:pl-6 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg text-neutral-600 font-medium">Transaction History</h2>
        </div>
        <div className="border-b border-neutral-200 dark:border-neutral-700" />

        {/* Today's counters — server-side counts, no limit */}
        {(() => {
          const successful = (mpesaTodayCounts?.successful ?? 0) + (dialerTodayCounts?.successful ?? 0) + (scheduledTodayCounts?.successful ?? 0);
          const failed     = (mpesaTodayCounts?.failed     ?? 0) + (dialerTodayCounts?.failed     ?? 0) + (scheduledTodayCounts?.failed     ?? 0);
          // Pending mirrors the app: M-Pesa only. Dialer PENDING/EXECUTING and scheduled PENDING/QUEUED
          // (which includes future-dated schedules) are not pending transactions, so they're excluded —
          // this is why the web read e.g. 22 while the app correctly showed 0.
          const pending    = mpesaTodayCounts?.pending    ?? 0;
          return (
            <div className="flex items-center gap-2">
              {/* Successful */}
              <button
                onClick={() => {
                  const next = statusFilter === "successful" ? "all" : "successful";
                  setStatusFilter(next);
                  // Scope the list to today when selecting (matches the counter, which is today-only);
                  // reset to all-time when deselecting. Mirrors the Android behaviour.
                  setPeriodFilter(next === "all" ? "all" : "today");
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all ${
                  statusFilter === "successful"
                    ? "bg-emerald-700 ring-2 ring-emerald-400 ring-offset-1"
                    : "bg-emerald-700 dark:bg-emerald-800 hover:bg-emerald-600"
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
                <span className="text-sm font-bold text-white">{successful}</span>
                <span className="text-xs font-semibold text-emerald-200">Successful</span>
              </button>
              {/* Failed */}
              <button
                onClick={() => {
                  const next = statusFilter === "failed" ? "all" : "failed";
                  setStatusFilter(next);
                  setPeriodFilter(next === "all" ? "all" : "today");
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border transition-all ${
                  statusFilter === "failed"
                    ? "bg-red-100 border-red-400 ring-2 ring-red-300 ring-offset-1 dark:bg-red-900/40"
                    : "bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800/40"
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{failed}</span>
                <span className="text-xs font-semibold text-red-500 dark:text-red-400">Failed</span>
              </button>
              {/* Pending */}
              <button
                onClick={() => {
                  const next = statusFilter === "pending" ? "all" : "pending";
                  setStatusFilter(next);
                  // Scope the list to today when selecting (matches the counter, which is today-only);
                  // reset to all-time when deselecting. Mirrors Success/Failed and the app.
                  setPeriodFilter(next === "all" ? "all" : "today");
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border transition-all ${
                  statusFilter === "pending"
                    ? "bg-amber-100 border-amber-400 ring-2 ring-amber-300 ring-offset-1 dark:bg-amber-900/40"
                    : "bg-amber-50 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800/40"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{pending}</span>
                <span className="text-xs font-semibold text-amber-500 dark:text-amber-400">Pending</span>
              </button>
              <span className="text-[10px] text-neutral-400 ml-1">Today</span>
            </div>
          );
        })()}

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

        {/* Filter button */}
        {(() => {
          const activeCount = [
            typeFilter !== "all",
            statusFilter !== "all",
            periodFilter !== "all",
            offerFilter !== "all",
            verifiedFilter !== "all",
          ].filter(Boolean).length;
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilterPanel(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white dark:bg-neutral-900 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 transition-all"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeCount > 0 && (
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 text-[10px] font-bold">{activeCount}</span>
                )}
              </button>
              {activeCount > 0 && (
                <button
                  onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setPeriodFilter("all"); setOfferFilter("all"); setVerifiedFilter("all"); }}
                  className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Clear all
                </button>
              )}
              {/* Active filter pills */}
              {typeFilter !== "all" && <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-700 border border-neutral-200">{TYPE_CONFIG[typeFilter as TxType].label}</span>}
              {statusFilter !== "all" && <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-700 border border-neutral-200">{STATUS_CONFIG[statusFilter as TxStatus].label}</span>}
              {periodFilter !== "all" && <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-700 border border-neutral-200">{{ today: "Today", yesterday: "Yesterday", last7: "Last 7 days", last30: "Last 30 days" }[periodFilter]}</span>}
              {offerFilter !== "all" && <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-700 border border-neutral-200">{offerFilter}</span>}
              {verifiedFilter !== "all" && <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-700 border border-neutral-200">{verifiedFilter === "verified" ? "Verified" : "Unverified"}</span>}
            </div>
          );
        })()}

        {/* Filter Panel */}
        <Dialog open={showFilterPanel} onOpenChange={setShowFilterPanel}>
          <DialogContent className="max-w-sm max-h-[85vh] flex flex-col gap-0 p-0">
            <DialogHeader className="px-5 pt-5 pb-4 border-b border-neutral-100">
              <DialogTitle className="text-base font-semibold">Filter Transactions</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              {/* Transaction Type */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Transaction Type</p>
                <div className="flex flex-wrap gap-2">
                  {([["all", "All"], ["sms", "M-Pesa"], ["dialer", "Dialer"], ["scheduled", "Scheduled"]] as const).map(([val, label]) => (
                    <FilterChip key={val} label={label} active={typeFilter === val} onClick={() => setTypeFilter(val)} />
                  ))}
                </div>
              </div>
              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {([["all", "All"], ["successful", "Successful"], ["failed", "Failed"], ["pending", "Pending"], ["unavailable", "Unavailable"], ["disabled", "Disabled"]] as const).map(([val, label]) => (
                    <FilterChip key={val} label={label} active={statusFilter === val} onClick={() => setStatusFilter(val)} />
                  ))}
                </div>
              </div>
              {/* Verified — only when status=successful and type≠dialer */}
              {statusFilter === "successful" && typeFilter !== "dialer" && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Verified Status</p>
                  <div className="flex flex-wrap gap-2">
                    {([["all", "All"], ["verified", "Verified"], ["unverified", "Unverified"]] as const).map(([val, label]) => (
                      <FilterChip key={val} label={label} active={verifiedFilter === val} onClick={() => setVerifiedFilter(val)} />
                    ))}
                  </div>
                </div>
              )}
              {/* Time Period */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Time Period</p>
                <div className="flex flex-wrap gap-2">
                  {([["all", "All Time"], ["today", "Today"], ["yesterday", "Yesterday"], ["last7", "Last 7 days"], ["last30", "Last 30 days"]] as const).map(([val, label]) => (
                    <FilterChip key={val} label={label} active={periodFilter === val} onClick={() => setPeriodFilter(val)} />
                  ))}
                </div>
              </div>
              {/* Offer Name */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Offer Name</p>
                <select
                  value={offerFilter}
                  onChange={(e) => setOfferFilter(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  <option value="all">All Offers</option>
                  {offerNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-neutral-100 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setPeriodFilter("all"); setOfferFilter("all"); setVerifiedFilter("all"); }}>
                Clear All
              </Button>
              <Button className="flex-1" onClick={() => setShowFilterPanel(false)}>
                Apply
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
              variant="outline"
              disabled={bulkRetrying}
              onClick={handleBulkRetry}
              className="h-7 text-xs gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              <RefreshCw className={`w-3 h-3 ${bulkRetrying ? "animate-spin" : ""}`} />
              Retry {[...selected].filter(id => filtered.find(tx => tx.id === id)?.type === "sms").length}
            </Button>
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
                  onDelete={handleCardDelete}
                  onRetry={handleCardRetry}
                  actionLoading={cardActionId === tx.id}
                />
              ))}
              {/* Load More — only shown when M-Pesa has more pages */}
              {(typeFilter === "all" || typeFilter === "sms") && smsLoadStatus !== "Exhausted" && (
                <div className="flex justify-center pt-2 pb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadMoreSms(50)}
                    disabled={smsLoadStatus === "LoadingMore"}
                    className="text-xs px-6"
                  >
                    {smsLoadStatus === "LoadingMore" ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Detail Dialog */}
      <TransactionDetailDialog
        tx={detailTx}
        open={detailTx !== null}
        onClose={() => setDetailTx(null)}
        onDelete={handleCardDelete}
        onRetry={handleCardRetry}
        actionLoading={detailTx ? cardActionId === detailTx.id : false}
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
