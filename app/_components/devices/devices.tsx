import React from "react";

const DevicesMain = () => {
  return (
    <div className="flex flex-1">
      <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-2">
        <h2 className="text-lg text-neutral-600 font-medium">
          Devices Management
        </h2>
        <div className="flex gap-2">
          <h3>Devices Table</h3>
        </div>
      </div>
    </div>
  );
};

export default DevicesMain;
