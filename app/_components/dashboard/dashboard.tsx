import MyChart from "@/components/ui/mychart";
import MyMessages from "@/components/ui/mymessages";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from "react";

const DashboardMain = () => {
  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="flex flex-col w-full h-full overflow-hidden p-6 md:p-5  md:pl-10  rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900">
        <h2 className="text-lg text-neutral-600 font-medium mb-4 flex-shrink-0">
          Admin Dashboard
        </h2>
        <ScrollArea className="w-full h-[80%] lg:h-auto">
          <div className="flex flex-col h-full items-center min-h-[80%] overflow-hidden px-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full min-h-[80%] lg:h-[80%]">
              <div className="w-full h-full min-h-[300px] md:min-h-[300px]">
                <MyChart />
              </div>
              <div className="w-full h-full min-h-[300px] md:min-h-[300px]">
                <MyMessages />
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default DashboardMain;
