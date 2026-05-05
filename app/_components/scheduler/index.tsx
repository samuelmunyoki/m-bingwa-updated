"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  CalendarClock,
  Loader2,
  Phone,
  Package,
  Trash2,
  Pencil,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Timer,
} from "lucide-react";
import { IconCalendarTime } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DbUser {
  _id: Id<"users">;
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
  profileImage: string;
  suspended: boolean;
  phoneNumber?: string;
}

interface SchedulerProps {
  user: DbUser;
}

type ScheduledEvent = {
  _id: Id<"scheduled_events">;
  ussdCode: string;
  userId: string;
  status: string;
  scheduledTimeStamp: number;
  repeatDaily: boolean;
  repeatDays?: number;
  offerName: string;
  offerDuration: string;
  offerPrice: number;
  offerNum: string;
  offerId: string;
  dialingSim?: string;
  isMultiSession?: boolean;
  isSimpleUSSD?: boolean;
  responseValidatorText?: string;
};

type Bundle = {
  _id: Id<"bundles">;
  offerName: string;
  duration: string;
  price: number;
  bundlesUSSD: string;
  status: string;
  dialingSIM: string;
  isMultiSession: boolean;
  isSimpleUSSD: boolean;
  responseValidatorText?: string;
};

type FormValues = {
  selectedBundle: Bundle;
  offerNum: string;
  selectedDateTime: Date | undefined;
  isRepeat: boolean;
  repeatDays: number | string;
};

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  PENDING:   { label: "Pending",   className: "bg-amber-50 text-amber-700 border-amber-200",     icon: <Timer className="w-3 h-3" /> },
  EXECUTED:  { label: "Executed",  className: "bg-green-50 text-green-700 border-green-200",     icon: <CheckCircle2 className="w-3 h-3" /> },
  SUCCESS:   { label: "Success",   className: "bg-green-50 text-green-700 border-green-200",     icon: <CheckCircle2 className="w-3 h-3" /> },
  FAILED:    { label: "Failed",    className: "bg-red-50 text-red-700 border-red-200",           icon: <XCircle className="w-3 h-3" /> },
  ERRORED:   { label: "Errored",   className: "bg-red-50 text-red-700 border-red-200",           icon: <XCircle className="w-3 h-3" /> },
  CANCELLED: { label: "Cancelled", className: "bg-neutral-100 text-neutral-500 border-neutral-200", icon: <XCircle className="w-3 h-3" /> },
  QUEUED:    { label: "Queued",    className: "bg-blue-50 text-blue-700 border-blue-200",        icon: <RefreshCw className="w-3 h-3" /> },
};

// ─── Reusable form (used for both create and edit) ───────────────────────────

function ScheduleForm({
  user,
  bundles,
  onSubmit,
  isLoading,
  initialValues,
  submitLabel = "Schedule",
}: {
  user: DbUser;
  bundles: Bundle[];
  onSubmit: (values: FormValues) => void;
  isLoading: boolean;
  initialValues?: {
    bundleId?: string;
    offerNum?: string;
    scheduledDateTime?: Date;
    repeatDaily?: boolean;
    repeatDays?: number;
  };
  submitLabel?: string;
}) {
  const availableBundles = bundles.filter((b) => b.status === "available");

  const [selectedBundleId, setSelectedBundleId] = useState(initialValues?.bundleId ?? "");
  const [offerNum, setOfferNum] = useState(initialValues?.offerNum ?? "");
  const [selectedDateTime, setSelectedDateTime] = useState<Date | undefined>(
    initialValues?.scheduledDateTime
  );
  const [isRepeat, setIsRepeat] = useState(initialValues?.repeatDaily ?? false);
  const [repeatDays, setRepeatDays] = useState<number | string>(initialValues?.repeatDays ?? 1);

  const selectedBundle = availableBundles.find(
    (b) => b._id.toString() === selectedBundleId
  );

  const handleSubmit = () => {
    if (!selectedBundle) {
      toast.warning("Please select an offer");
      return;
    }
    if (!offerNum.trim()) {
      toast.warning("Please enter a phone number");
      return;
    }
    if (!user.phoneNumber) {
      toast.error("Please set your agent number under Settings.");
      return;
    }
    onSubmit({ selectedBundle, offerNum, selectedDateTime, isRepeat, repeatDays });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Offer picker */}
      <div className="flex flex-col gap-1.5">
        <Label>Select Offer</Label>
        <Select
          value={selectedBundleId}
          onValueChange={setSelectedBundleId}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose an offer…" />
          </SelectTrigger>
          <SelectContent>
            {availableBundles.length === 0 ? (
              <SelectItem value="_none" disabled>
                No available offers
              </SelectItem>
            ) : (
              availableBundles.map((bundle) => (
                <SelectItem key={bundle._id.toString()} value={bundle._id.toString()}>
                  {bundle.offerName} · {bundle.duration} · KSh {bundle.price}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Phone number */}
      <div className="flex flex-col gap-1.5">
        <Label>Phone Number</Label>
        <Input
          type="tel"
          placeholder="e.g. 0712345678"
          value={offerNum}
          onChange={(e) => {
            if (e.target.value === "" || /^\d+$/.test(e.target.value)) {
              setOfferNum(e.target.value);
            }
          }}
          disabled={isLoading}
        />
      </div>

      {/* Date & time */}
      <div className="flex flex-col gap-1.5">
        <Label>Schedule Time</Label>
        <DateTimePicker
          initialDate={selectedDateTime ?? new Date()}
          onDateTimeChange={setSelectedDateTime}
        />
        {selectedDateTime && (
          <p className="text-xs text-muted-foreground">
            {selectedDateTime.toLocaleString()}
          </p>
        )}
      </div>

      {/* Repeat */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="repeat-check"
            checked={isRepeat}
            onCheckedChange={(v) => setIsRepeat(Boolean(v))}
            disabled={isLoading || !selectedDateTime}
          />
          <label
            htmlFor="repeat-check"
            className="text-sm font-medium leading-none peer-disabled:opacity-70"
          >
            Repeat every day
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className={!isRepeat ? "opacity-40" : ""}>
            Number of Repeats (max 7)
          </Label>
          <Input
            type="number"
            min={1}
            max={7}
            value={repeatDays}
            onChange={(e) => {
              const v = e.target.value;
              setRepeatDays(v === "" ? "" : Math.max(1, Math.min(7, Number(v))));
            }}
            disabled={isLoading || !isRepeat}
          />
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={isLoading || !selectedBundle} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <IconCalendarTime className="mr-2 h-4 w-4" />
            {submitLabel}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        If no time is set, the event will be sent immediately.
      </p>
    </div>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({
  event,
  onEdit,
  onDelete,
  isDeleting,
}: {
  event: ScheduledEvent;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}) {
  const status = statusConfig[event.status] ?? statusConfig.PENDING;
  const isPending = event.status === "PENDING";

  return (
    <div className="border border-neutral-200 rounded-lg p-4 bg-white flex flex-col gap-2.5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Package className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-neutral-800">
            {event.offerName || "—"}
          </span>
          {event.offerDuration && (
            <>
              <span className="text-xs text-neutral-300">·</span>
              <span className="text-xs text-neutral-500">{event.offerDuration}</span>
            </>
          )}
          {event.offerPrice > 0 && (
            <>
              <span className="text-xs text-neutral-300">·</span>
              <span className="text-xs text-neutral-500">KSh {event.offerPrice}</span>
            </>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${status.className}`}
        >
          {status.icon}
          {status.label}
        </span>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1 text-xs text-neutral-500">
        <div className="flex items-center gap-1.5">
          <Phone className="w-3 h-3 flex-shrink-0" />
          <span>{event.offerNum || "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>
            {event.scheduledTimeStamp
              ? new Date(event.scheduledTimeStamp * 1000).toLocaleString()
              : "Immediate"}
          </span>
        </div>
        {event.repeatDaily && (
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 flex-shrink-0" />
            <span>
              {event.repeatDays != null
                ? `${event.repeatDays} repeat${event.repeatDays !== 1 ? "s" : ""} remaining`
                : "Daily repeat"}
            </span>
          </div>
        )}
      </div>

      {/* Actions — only for pending */}
      {isPending && (
        <div className="flex items-center gap-2 pt-1.5 border-t border-neutral-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-7 text-xs gap-1"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
            className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            {isDeleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const SchedularMain = ({ user }: SchedulerProps) => {
  const createScheduledEvent = useMutation(api.features.scheduled_events.createScheduledEvent);
  const updateScheduledEvent = useMutation(api.features.scheduled_events.updateScheduledEvent);
  const deleteScheduledEvent = useMutation(api.features.scheduled_events.deleteScheduledEvent);

  const bundles = (useQuery(api.features.bundles.getAllBundles, { userId: user.userId }) ?? []) as Bundle[];
  const scheduledEvents = useQuery(api.features.scheduled_events.getScheduledEvents, { userId: user.userId });

  const [isCreating, setIsCreating] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pendingEvents = (scheduledEvents?.filter((e) => e.status === "PENDING") ?? []) as ScheduledEvent[];
  const processedEvents = (scheduledEvents?.filter((e) => e.status !== "PENDING") ?? []) as ScheduledEvent[];

  const buildUssdCode = (bundle: Bundle, timestamp: number) => {
    const raw = bundle.bundlesUSSD;
    return raw.startsWith("SE|D|") ? raw : `SE|D|${raw}|${timestamp}`;
  };

  const handleCreate = async ({ selectedBundle, offerNum, selectedDateTime, isRepeat, repeatDays }: FormValues) => {
    setIsCreating(true);
    try {
      const timestamp = selectedDateTime
        ? Math.floor(selectedDateTime.getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      const res = await createScheduledEvent({
        userId: user.userId,
        ussdCode: buildUssdCode(selectedBundle, timestamp),
        scheduledTimeStamp: timestamp,
        repeatDaily: isRepeat,
        repeatDays: isRepeat ? Number(repeatDays) : undefined,
        status: "PENDING",
        messageId: `msg_${Date.now()}_${Math.floor(Math.random() * 9000 + 1000)}`,
        offerId: selectedBundle._id.toString(),
        offerName: selectedBundle.offerName,
        offerDuration: selectedBundle.duration,
        offerPrice: selectedBundle.price,
        offerNum,
        dialingSim: selectedBundle.dialingSIM,
        isMultiSession: selectedBundle.isMultiSession,
        isSimpleUSSD: selectedBundle.isSimpleUSSD,
        responseValidatorText: selectedBundle.responseValidatorText,
      });

      if (res.status === "success") {
        toast.success("Event scheduled successfully");
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("An error occurred while scheduling");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = async ({ selectedBundle, offerNum, selectedDateTime, isRepeat, repeatDays }: FormValues) => {
    if (!editingEvent) return;
    setIsEditing(true);
    try {
      const timestamp = selectedDateTime
        ? Math.floor(selectedDateTime.getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      const res = await updateScheduledEvent({
        id: editingEvent._id.toString(),
        ussdCode: buildUssdCode(selectedBundle, timestamp),
        scheduleTime: timestamp,
        isRepetitive: isRepeat,
        repeatDays: isRepeat ? Number(repeatDays) : undefined,
        offerId: selectedBundle._id.toString(),
        offerName: selectedBundle.offerName,
        offerDuration: selectedBundle.duration,
        offerPrice: selectedBundle.price,
        offerNum,
        dialingSim: selectedBundle.dialingSIM,
        isMultiSession: selectedBundle.isMultiSession,
        isSimpleUSSD: selectedBundle.isSimpleUSSD,
        responseValidatorText: selectedBundle.responseValidatorText,
      });

      if (res.status === "success") {
        toast.success("Schedule updated");
        setEditingEvent(null);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to update schedule");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async (event: ScheduledEvent) => {
    setDeletingId(event._id.toString());
    try {
      await deleteScheduledEvent({ id: event._id });
      toast.success("Schedule deleted");
    } catch {
      toast.error("Failed to delete schedule");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="p-6 md:p-5 md:pl-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-4 flex-1 w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg text-neutral-600 font-medium">Scheduler</h2>
        </div>
        <div className="border-b border-neutral-200" />

        <ScrollArea className="flex-1 pr-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
            {/* ── Create form ── */}
            <Card>
              <CardContent className="pt-5">
                <p className="text-sm font-semibold text-neutral-700 mb-4">New Schedule</p>
                <ScheduleForm
                  user={user}
                  bundles={bundles}
                  onSubmit={handleCreate}
                  isLoading={isCreating}
                />
              </CardContent>
            </Card>

            {/* ── Events panel ── */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Upcoming */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-amber-500" />
                  <p className="text-sm font-semibold text-neutral-700">
                    Upcoming
                    {pendingEvents.length > 0 && (
                      <span className="ml-1.5 text-xs font-normal text-neutral-400">
                        ({pendingEvents.length})
                      </span>
                    )}
                  </p>
                </div>

                {scheduledEvents === undefined ? (
                  <div className="flex items-center gap-2 text-neutral-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </div>
                ) : pendingEvents.length === 0 ? (
                  <div className="border border-dashed border-neutral-200 rounded-lg p-6 text-center text-sm text-neutral-400">
                    No upcoming schedules
                  </div>
                ) : (
                  pendingEvents.map((ev) => (
                    <EventCard
                      key={ev._id}
                      event={ev}
                      onEdit={() => setEditingEvent(ev)}
                      onDelete={() => handleDelete(ev)}
                      isDeleting={deletingId === ev._id.toString()}
                    />
                  ))
                )}
              </div>

              {/* Past */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neutral-400" />
                  <p className="text-sm font-semibold text-neutral-700">
                    Past
                    {processedEvents.length > 0 && (
                      <span className="ml-1.5 text-xs font-normal text-neutral-400">
                        ({processedEvents.length})
                      </span>
                    )}
                  </p>
                </div>

                {scheduledEvents === undefined ? null : processedEvents.length === 0 ? (
                  <div className="border border-dashed border-neutral-200 rounded-lg p-6 text-center text-sm text-neutral-400">
                    No past events
                  </div>
                ) : (
                  <>
                    {processedEvents.slice(0, 10).map((ev) => (
                      <EventCard key={ev._id} event={ev} />
                    ))}
                    {processedEvents.length > 10 && (
                      <p className="text-xs text-neutral-400 text-center pt-1">
                        +{processedEvents.length - 10} more past events
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* ── Edit dialog ── */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => { if (!open) setEditingEvent(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <ScheduleForm
              key={editingEvent._id.toString()}
              user={user}
              bundles={bundles}
              onSubmit={handleEdit}
              isLoading={isEditing}
              submitLabel="Save Changes"
              initialValues={{
                bundleId: editingEvent.offerId,
                offerNum: editingEvent.offerNum,
                scheduledDateTime: new Date(editingEvent.scheduledTimeStamp * 1000),
                repeatDaily: editingEvent.repeatDaily,
                repeatDays: editingEvent.repeatDays,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedularMain;
