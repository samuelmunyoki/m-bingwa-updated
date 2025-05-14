import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { IconCalendarTime } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Checkbox } from "@/components/ui/checkbox";

interface dbUser {
  _id: Id<"users">;
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
  profileImage: string;
  suspended: boolean;
  phoneNumber?: string;
}

interface SettingsMainProps {
  user: dbUser;
}

const SchedularMain = ({ user }: SettingsMainProps) => {
  const createScheduledEvent = useMutation(
    api.features.scheduled_events.createScheduledEvent
  );
  const [ussd, setUssd] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date | undefined>(
    undefined
  );
 const [repeatDays, setRepeatDays] = useState<number | string>(1);

  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = (checked: boolean) => {
    setIsChecked(checked);
  };
  const [isDynamic, setIsDynamic] = useState(false);

  const handleDynamicCheckboxChange = (checked: boolean) => {
    setIsDynamic(checked);
  };

  const scheduledEvents = useQuery(
    api.features.scheduled_events.getScheduledEvents,
    {
      userId: user.userId,
    }
  );

  const pendingEvents =
    scheduledEvents?.filter((event) => event.status === "PENDING") || [];
  const processedEvents =
    scheduledEvents?.filter((sms) => sms.status !== "PENDING") || [];

  // const handleSchedule = async () => {
  //   if (ussd === "") {
  //     toast.warning("Please enter a USSD code");
  //     return;
  //   }

  //   const ussdRegex = /^\*.*#$/;

  //   if (!ussdRegex.test(ussd)) {
  //     toast.error("Invalid USSD code. It must start with * and end with #");
  //     return;
  //   }
  //   if (user.phoneNumber == undefined || user.phoneNumber == null) {
  //     toast.error("Please set your agent number under settings.");
  //     return;
  //   }

  //   setIsLoading(true);

  //   try {
  //     let timestamp: number;
  //     if (selectedDateTime) {
  //       timestamp = Math.floor(selectedDateTime.getTime() / 1000);
  //     } else {
  //       timestamp = Math.floor(Date.now() / 1000);
  //     }
  //     let dymanicString = "";
  //     if (isDynamic) {
  //       dymanicString = "D";
  //     } else {
  //       dymanicString = "S";
  //     }
  //     const res = await createScheduledEvent({
  //       userId: user.userId,
  //       repeatDaily: isChecked,
  //       scheduledTimeStamp: timestamp,
  //       status: "PENDING",
  //       ussdCode: `SE|${dymanicString}|${ussd}|${timestamp}`,
  //     });

  //     if (res.status == "success") {
  //       toast.success(res.message);
  //     } else {
  //       toast.error(res.message);
  //     }
  //   } catch (error) {
  //     toast.error("An error occurred while scheduling the event");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };


  const handleSchedule = async () => {
    if (ussd === "") {
      toast.warning("Please enter a USSD code");
      return;
    }

    const ussdRegex = /^\*.*#$/;

    if (!ussdRegex.test(ussd)) {
      toast.error("Invalid USSD code. It must start with * and end with #");
      return;
    }
    if (user.phoneNumber == undefined || user.phoneNumber == null) {
      toast.error("Please set your agent number under settings.");
      return;
    }

    setIsLoading(true);

    try {
      let timestamp: number;
      if (selectedDateTime) {
        timestamp = Math.floor(selectedDateTime.getTime() / 1000);
      } else {
        timestamp = Math.floor(Date.now() / 1000);
      }

      let dynamicString = isDynamic ? "D" : "S";

      const res = await createScheduledEvent({
        userId: user.userId,
        repeatDaily: isChecked,
        repeatDays: isChecked ? Number(repeatDays) : undefined, // Ensure repeatDays is stored if repeatDaily is checked
        scheduledTimeStamp: timestamp,
        status: "PENDING",
        ussdCode: `SE|${dynamicString}|${ussd}|${timestamp}`,
      });

      if (res.status == "success") {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("An error occurred while scheduling the event");
    } finally {
      setIsLoading(false);
    }
  };

  const renderSMSTable = (data: any[]) => (
    <Table className="h-full">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">USSD Code</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Scheduled Time</TableHead>
          <TableHead className="hidden lg:table-cell">On Repeat</TableHead>
          <TableHead className="hidden lg:table-cell">
            Repeats Remaining
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((ev) => (
          <TableRow key={ev._id}>
            <TableCell className="font-medium">
              <div
                className="truncate max-w-[80px] lg:max-w-[200px]"
                title={ev.ussdCode.split("|")[2]}
              >
                {ev.ussdCode.split("|")[2]}
              </div>
            </TableCell>
            <TableCell>{ev.status}</TableCell>
            <TableCell>
              {ev.scheduledTimeStamp
                ? new Date(ev.scheduledTimeStamp * 1000).toLocaleString()
                : "N/A"}
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              {ev.repeatDaily ? "Yes" : "No"}
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              {ev.repeatDays ? ev.repeatDays : "N/A"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-1 w-full h- pb-4">
      <div className="p-6 md:p-5 md:pl-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-6 flex-1 w-full h-full">
        <h2 className="text-lg text-neutral-600 dark:text-neutral-300 font-medium">
          Scheduler
        </h2>
        <ScrollArea className="w-full h-full pr-4 lg:overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pb-4">
            <Card className="flex flex-col mb-3">
              {/* <CardHeader className="border-b border-gray-100">
                <CardTitle className="font-normal">
                  USSD Code Scheduler
                </CardTitle>
              </CardHeader> */}
              <CardContent className="flex-grow pt-3">
                <form className=" flex flex-col">
                  <div className="flex-grow">
                    <Label htmlFor="ussdcode">USSD Code</Label>
                    <Input
                      required
                      id="ussdcode"
                      placeholder="*180*5*2*0711223344*1*1#"
                      value={ussd}
                      onChange={(e) => setUssd(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2 my-3">
                    <Checkbox
                      id="everyday"
                      checked={isDynamic}
                      onCheckedChange={handleDynamicCheckboxChange}
                      disabled={!ussd}
                    />

                    <label
                      htmlFor="everyday"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Dynamic USSD
                    </label>
                  </div>
                  <div className="flex-grow my-2">
                    <Label htmlFor="dateTime">Schedule time</Label>
                    <DateTimePicker
                      initialDate={new Date()}
                      onDateTimeChange={(dateTime) =>
                        setSelectedDateTime(dateTime)
                      }
                    />
                    {selectedDateTime && (
                      <p className="text-sm text-muted-foreground my-1">
                        Selected: {selectedDateTime.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 my-2">
                    <Checkbox
                      id="everyday"
                      checked={isChecked}
                      onCheckedChange={handleCheckboxChange}
                      disabled={!selectedDateTime} // Disable the checkbox if selectedDateTime is undefined
                    />

                    <label
                      htmlFor="everyday"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Repeat everyday
                    </label>
                  </div>
                  <div className="flex-grow my-2">
                    <Label htmlFor="dateTime">Number of Repeats</Label>
                    <Input
                      required
                      id="repeatDays"
                      min={1}
                      max={7}
                      placeholder="1"
                      value={repeatDays}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRepeatDays(
                          value === ""
                            ? ""
                            : Math.max(1, Math.min(7, Number(value)))
                        );
                      }}
                      disabled={!isChecked}
                    />
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col">
                <Button
                  className="w-full"
                  onClick={handleSchedule}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <IconCalendarTime className="mr-2 h-4 w-4" />
                      Schedule
                    </>
                  )}
                </Button>
                <p className="mt-2 text-sm text-muted-foreground">
                  Note: When scheduled time is not set, schedule ussd code will
                  be sent immediately.
                </p>
              </CardFooter>
            </Card>
            <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-y-scroll">
              <Card className="flex-1 h-1/2">
                <CardHeader>
                  <CardTitle className="font-normal">
                    Upcoming Scheduled Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[148px] w-full">
                    {pendingEvents == null ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2 text-neutral-500">
                          Loading ...
                        </span>
                      </div>
                    ) : pendingEvents.length > 0 ? (
                      renderSMSTable(pendingEvents)
                    ) : (
                      <p>No scheduled events available.</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
              <Card className="flex-1 h-1/2">
                <CardHeader>
                  <CardTitle className="font-normal">
                    Past Scheduled Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[150px] w-full">
                    {processedEvents == null ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2 text-neutral-500">
                          Loading ...
                        </span>
                      </div>
                    ) : processedEvents.length > 0 ? (
                      renderSMSTable(processedEvents)
                    ) : (
                      <p>No past scheduled events.</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default SchedularMain;
