import React from "react";
import { BundlesTable } from "./website-table";
import { ScrollArea } from "@/components/ui/scroll-area";

const WebsiteMain = ({ userId }: { userId: string }) => {
  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="p-6 md:p-5 md:pl-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full overflow-hidden">
        <h2 className="text-lg text-neutral-600 font-medium">
          Website Management
        </h2>
        <ScrollArea className="flex-1">
          <BundlesTable userId={userId} />
        </ScrollArea>
      </div>
    </div>
  );
};

export default WebsiteMain;
