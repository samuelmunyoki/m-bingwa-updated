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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Id } from "@/convex/_generated/dataModel";
import { IconPhone } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery, usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/convex/_generated/api";
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

const USSD_DialerMain = ({ user }: SettingsMainProps) => {
  const createSMS = useMutation(api.features.sms.createSMS);
  const [ussd, setUssd] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = (checked: boolean) => {
    setIsChecked(checked);
  };

  const smsHistory = useQuery(api.features.sms.getSMSHistory, {
    userId: user.userId,
    service: "USSD",
  });

  const handleDial = async () => {
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
      let dymanicString = ""
      if(isChecked){
        dymanicString = "D"
      }else{
        dymanicString = "S";
      }

   
      const timestamp = Math.floor(new Date().getTime() / 1000);
      const res = await createSMS({
        userId: user.userId,
        smsContent: `RD|${dymanicString}|${ussd}|${timestamp}`,
        smsReciepient: user.phoneNumber,
        service: "USSD",
      });

      if (res.status == "success") {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("An error occurred while sending the SMS");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 w-full">
      <div className="p-6 md:p-5  md:pl-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full">
        <h2 className="text-lg text-neutral-600 dark:text-neutral-300 font-medium mb-4">
          USSD Dialer
        </h2>
        <div className="flex flex-col lg:flex-row items-start lg:justify-start space-y-6 lg:space-y-0 lg:space-x-6 w-full">
          <Card className="w-full lg:max-w-[350px]">
            <CardHeader>
              <CardTitle className="font-normal">USSD Dialer</CardTitle>
              <CardDescription>
                Dial an USSD remotely in one-click.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form>
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-3">
                    <Label htmlFor="ussdcode">USSD Code</Label>
                    <Input
                      required
                      id="ussdcode"
                      placeholder="*180*5*2*0711223344*1*1#"
                      value={ussd}
                      onChange={(e) => setUssd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2 my-3">
                  <Checkbox
                    id="everyday"
                    checked={isChecked}
                    onCheckedChange={handleCheckboxChange}
                    disabled={!ussd} // Disable the checkbox if selectedDateTime is undefined
                  />

                  <label
                    htmlFor="everyday"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Dynamic USSD
                  </label>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                className="w-full"
                onClick={handleDial}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Dialing...
                  </>
                ) : (
                  <>
                    <IconPhone className="mr-2 h-4 w-4" />
                    Dial
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="font-normal">USSD Remote History</CardTitle>
              <CardDescription>
                {smsHistory
                  ? `Showing ${smsHistory.length} records`
                  : "No records yet."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {smsHistory == null || smsHistory == undefined ? (
                <div className="flex flex-col justify-center items-center w-full h-[200px]">
                  <div className="flex flex-row gap-2 justify-center h-full items-center">
                    <svg
                      aria-hidden="true"
                      className="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-neutral-500"
                      viewBox="0 0 100 101"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"
                      />
                      <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentFill"
                      />
                    </svg>
                    <span className="text-neutral-500 ">Loading ...</span>
                  </div>
                </div>
              ) : (
                <>
                  {smsHistory && smsHistory.length > 0 ? (
                    <ScrollArea className="h-[300px] w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[200px]">
                              USSD Code
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Time Taken</TableHead>
                            <TableHead className="hidden lg:flex">
                              Time Stamp
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {smsHistory.map((sms) => (
                            <TableRow key={sms._id}>
                              <TableCell className="font-medium">
                                <div
                                  className="truncate max-w-[80px]  lg:max-w-[200px]"
                                  title={sms.smsContent.split("|")[2]}
                                >
                                  {sms.smsContent.split("|")[2]}
                                </div>
                              </TableCell>
                              <TableCell>{sms.status || "Pending"}</TableCell>
                              <TableCell>{sms.timeTaken || "N/A"}</TableCell>
                              <TableCell className="hidden lg:flex">
                                {sms.timeStamp || "N/A"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <p>No Remote USSD history available.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default USSD_DialerMain;
