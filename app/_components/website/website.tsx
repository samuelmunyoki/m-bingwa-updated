import React from "react";
import { BundlesTable } from "./website-table";

const WebsiteMain = ({ userId }: { userId: string }) => {
  return (
    <div className="flex flex-1 h-full overflow-hidden px-1.5 md:px-0">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-2 overflow-hidden">
        <h2 className="text-lg text-neutral-600 font-medium">
          Website Management
        </h2>
        {/* Plain scroll div, not Radix ScrollArea: ScrollArea's Viewport wraps children in a
            display:table element to measure overflow, which forces itself as wide as the offers
            table's full unwrapped column width — then Root's overflow-hidden clips everything
            past that (toolbar's Columns button, Add Bundle button) with no way to reach it. */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          <BundlesTable userId={userId} />
        </div>
      </div>
    </div>
  );
};

export default WebsiteMain;
