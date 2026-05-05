import React from "react";
import { StoreDashboard } from "./store-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Store } from "lucide-react";

const StoreMain = ({ userId }: { userId: string }) => {
  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="p-6 md:p-5 md:pl-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Store className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg text-neutral-600 font-medium">Store Management</h2>
        </div>
        <div className="border-b border-neutral-200 mb-2" />
        <ScrollArea className="flex-1">
          <StoreDashboard userId={userId} />
        </ScrollArea>
      </div>
    </div>
  );
};

export default StoreMain;
