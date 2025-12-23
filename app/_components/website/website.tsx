import React from "react";
import { BundlesTable } from "./website-table";

const WebsiteMain = ({ userId }: { userId: string }) => {
  return (
    <div className="flex flex-1">
      <div className="p-6 md:p-5  md:pl-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full">
        <h2 className="text-lg text-neutral-600 font-medium">
          Website Management
        </h2>
        <div className="flex gap-2">
          <BundlesTable userId={userId} />
        </div>
      </div>
    </div>
  );
};

export default WebsiteMain;
