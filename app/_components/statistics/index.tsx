import React from "react";

const StatisticsMain = () => {
  return (
    <div className="flex flex-1">
      <div className="p-6 md:p-10 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white -m-[1px] dark:bg-neutral-900 flex flex-col gap-2 flex-1 w-full">
        <h2 className="text-lg text-neutral-600 font-medium">
          Devices Management
        </h2>
        <div className="flex gap-2">
          <h3>STATS SUMMARY</h3>
        </div>
      </div>
    </div>
  );
};

export default StatisticsMain;