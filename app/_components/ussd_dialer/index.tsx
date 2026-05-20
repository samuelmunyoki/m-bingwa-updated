"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";
import { Phone, Loader2, CheckCircle2, XCircle, Timer, Smartphone, Globe } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";

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

interface Props {
  user: DbUser;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  Success:          { label: "Success",    className: "bg-green-50 text-green-700 border border-green-200",     icon: <CheckCircle2 className="w-3 h-3" /> },
  EXECUTED:         { label: "Executed",   className: "bg-green-50 text-green-700 border border-green-200",     icon: <CheckCircle2 className="w-3 h-3" /> },
  PENDING:          { label: "Pending",    className: "bg-amber-50 text-amber-700 border border-amber-200",     icon: <Timer className="w-3 h-3" /> },
  Failed:           { label: "Failed",     className: "bg-red-50 text-red-700 border border-red-200",           icon: <XCircle className="w-3 h-3" /> },
  FAILED:           { label: "Failed",     className: "bg-red-50 text-red-700 border border-red-200",           icon: <XCircle className="w-3 h-3" /> },
  Timeout:          { label: "Timeout",    className: "bg-orange-50 text-orange-700 border border-orange-200",  icon: <Timer className="w-3 h-3" /> },
  Cancelled:        { label: "Cancelled",  className: "bg-neutral-100 text-neutral-500 border border-neutral-200", icon: <XCircle className="w-3 h-3" /> },
  "Validation Failed": { label: "Invalid", className: "bg-red-50 text-red-700 border border-red-200",           icon: <XCircle className="w-3 h-3" /> },
};

const USSD_DialerMain = ({ user }: Props) => {
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [offerNum, setOfferNum] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const bundles = useQuery(api.features.bundles.getAllBundles, { userId: user.userId });
  const ussdHistory = useQuery(api.features.ussdHistory.getUSSDHistory, { userId: user.userId });
  const createScheduledEvent = useMutation(api.features.scheduled_events.createScheduledEvent);

  const availableBundles = (bundles ?? []).filter((b) => b.status === "available");
  const selectedBundle = availableBundles.find((b) => b._id.toString() === selectedBundleId);

  const handleDial = async () => {
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

    setIsLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      await createScheduledEvent({
        userId: user.userId,
        ussdCode: selectedBundle.bundlesUSSD,
        scheduledTimeStamp: now,
        repeatDaily: false,
        repeatDays: 1,
        offerId: selectedBundle._id.toString(),
        offerName: selectedBundle.offerName,
        offerDuration: selectedBundle.duration,
        offerPrice: selectedBundle.price,
        offerNum: offerNum.trim(),
        dialingSim: selectedBundle.dialingSIM,
        isMultiSession: selectedBundle.isMultiSession,
        isSimpleUSSD: selectedBundle.isSimpleUSSD,
        responseValidatorText: selectedBundle.responseValidatorText,
        source: "web",
        localId: `web_dial_${user.userId}_${now}`,
      });
      toast.success("Dial request sent — Android will execute shortly");
      setOfferNum("");
      setSelectedBundleId("");
    } catch (error) {
      toast.error("Failed to send dial request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 w-full">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-2">
        <h2 className="text-lg text-neutral-600 dark:text-neutral-300 font-medium mb-4">
          USSD Dialer
        </h2>
        <div className="flex flex-col lg:flex-row items-start lg:justify-start space-y-6 lg:space-y-0 lg:space-x-6 w-full">

          {/* Dial Form */}
          <Card className="w-full lg:max-w-[350px]">
            <CardHeader>
              <CardTitle className="font-normal">Dial Now</CardTitle>
              <CardDescription>Select an offer and enter a phone number.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Select Offer</Label>
                <Select value={selectedBundleId} onValueChange={setSelectedBundleId} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an offer…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {availableBundles.length === 0 ? (
                      <SelectItem value="_none" disabled>No available offers</SelectItem>
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

              <div className="flex flex-col gap-1.5">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={offerNum}
                  disabled={isLoading}
                  onChange={(e) => {
                    if (e.target.value === "" || /^\d+$/.test(e.target.value)) {
                      setOfferNum(e.target.value);
                    }
                  }}
                />
              </div>

              <Button className="w-full" onClick={handleDial} disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                ) : (
                  <><Phone className="mr-2 h-4 w-4" />Dial</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* History */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="font-normal">USSD History</CardTitle>
              <CardDescription>
                {ussdHistory ? `${ussdHistory.length} records` : "Loading…"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ussdHistory === undefined ? (
                <div className="flex items-center justify-center h-[200px] gap-2 text-neutral-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading…</span>
                </div>
              ) : ussdHistory.length === 0 ? (
                <p className="text-sm text-neutral-400">No USSD history yet.</p>
              ) : (
                <ScrollArea className="h-[300px] w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Offer</TableHead>
                        <TableHead>Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time Taken</TableHead>
                        <TableHead className="hidden lg:table-cell">Timestamp</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ussdHistory.map((item) => {
                        const cfg = statusConfig[item.status] ?? {
                          label: item.status,
                          className: "bg-neutral-100 text-neutral-500 border border-neutral-200",
                          icon: null,
                        };
                        return (
                          <TableRow key={item._id}>
                            <TableCell className="font-medium max-w-[140px] truncate">
                              {item.offerName ?? item.ussdCode}
                            </TableCell>
                            <TableCell>{item.targetNumber ?? "—"}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
                                {cfg.icon}{cfg.label}
                              </span>
                            </TableCell>
                            <TableCell>{item.timeTaken}s</TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-neutral-400">
                              {item.timeStamp}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                                {item.source === "web"
                                  ? <><Globe className="w-3 h-3" />Web</>
                                  : <><Smartphone className="w-3 h-3" />Android</>
                                }
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default USSD_DialerMain;
